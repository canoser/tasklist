using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Geçici olarak auth istiyoruz, ileride guest desteği gelirse AllowAnonymous vb. yapılabilir.
    public class QuotaController : ControllerBase
    {
        private readonly IUsageTrackingRepository _usageTrackingRepository;
        private readonly IQuotaManager _quotaManager;
        private readonly ISettingsService _settingsService;
        private readonly IRewardValidator _rewardValidator;

        public QuotaController(
            IUsageTrackingRepository usageTrackingRepository, 
            IQuotaManager quotaManager, 
            ISettingsService settingsService,
            IRewardValidator rewardValidator)
        {
            _usageTrackingRepository = usageTrackingRepository;
            _quotaManager = quotaManager;
            _settingsService = settingsService;
            _rewardValidator = rewardValidator;
        }

        private string? GetCurrentTenantId()
        {
            return User.FindFirst("TenantId")?.Value;
        }

        private string GetSubscriptionPlan()
        {
            return User.FindFirst("subscription_plan")?.Value ?? "free";
        }

        [HttpGet("status/{resourceType}")]
        public async Task<IActionResult> GetStatus(string resourceType)
        {
            var tenantId = GetCurrentTenantId();
            if (string.IsNullOrEmpty(tenantId)) return Unauthorized();

            var plan = GetSubscriptionPlan();
            if (plan.Equals("premium", StringComparison.OrdinalIgnoreCase))
            {
                return Ok(new {
                    IsPremium = true,
                    Remaining = -1, // Sınırsız
                    AdsEnabled = false // Premium'da reklama gerek yok
                });
            }

            // Free plan için durumu getir
            var usage = await _usageTrackingRepository.GetUsageAsync(tenantId, resourceType);
            
            int maxLimit = 0;
            if (usage != null && usage.ResetDate >= DateTime.UtcNow)
            {
                maxLimit = usage.MaxLimit;
            }
            else
            {
                // Ayarları veritabanından / önbellekten al
                maxLimit = await _settingsService.GetSettingAsIntAsync(resourceType, 0);
            }

            int used = usage != null && usage.ResetDate >= DateTime.UtcNow ? usage.UsedAmount : 0;
            
            // Kazanılmış krediyi hesapla
            int earned = 0;
            if (usage != null && usage.EarnedLimitExpiration != null && usage.EarnedLimitExpiration >= DateTime.UtcNow)
            {
                earned = usage.EarnedLimit;
            }

            int remaining = (maxLimit + earned) - used;
            if (remaining < 0) remaining = 0;

            // Geo-IP Bazlı Strateji
            // Cloudflare üzerinden geliyorsa CF-IPCountry header'ı okunabilir.
            // Örnek: "TR", "US", "GB"
            var country = Request.Headers["CF-IPCountry"].ToString();
            
            // Eğer header yoksa veya TR ise reklam ver. ABD ve Avrupa (US, GB, DE vs) ise verme.
            bool adsEnabled = string.IsNullOrEmpty(country) || country.Equals("TR", StringComparison.OrdinalIgnoreCase);

            return Ok(new {
                IsPremium = false,
                Used = used,
                BaseLimit = maxLimit,
                EarnedLimit = earned,
                Remaining = remaining,
                AdsEnabled = adsEnabled,
                Region = string.IsNullOrEmpty(country) ? "Unknown" : country
            });
        }

        public class RewardRequest
        {
            public string ResourceType { get; set; } = string.Empty;
            public string AdToken { get; set; } = string.Empty; // S2S İmza veya Frontend Bileti
        }

        [HttpPost("reward")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> GrantReward([FromBody] RewardRequest request)
        {
            var tenantId = GetCurrentTenantId();
            if (string.IsNullOrEmpty(tenantId)) return Unauthorized();

            var plan = GetSubscriptionPlan();
            if (plan.Equals("premium", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Premium kullanıcıların reklama ihtiyacı yoktur.");
            }

            // Geo-IP Bazlı Strateji kontrolü
            var country = Request.Headers["CF-IPCountry"].ToString();
            bool adsEnabled = string.IsNullOrEmpty(country) || country.Equals("TR", StringComparison.OrdinalIgnoreCase);

            if (!adsEnabled)
            {
                return Forbid("Bulunduğunuz bölge için ödüllü reklam hizmeti (rewarded ads) aktif değildir. Lütfen Premium plana geçiniz.");
            }

            // 1. S2S Veya Kriptografik İmza Doğrulaması (Sahte İstek Koruması)
            bool isAdValid = await _rewardValidator.ValidateAsync(request.AdToken);
            if (!isAdValid)
            {
                return Unauthorized(new { Message = "Geçersiz veya sahte reklam jetonu (AdToken). İşlem reddedildi." });
            }

            // 2. Günlük Reklam İzleme Limiti (Farming Koruması)
            bool hasAdQuota = await _quotaManager.TryDeductAsync(tenantId, plan, "RewardedAdWatches");
            if (!hasAdQuota)
            {
                // Günlük limiti dolduysa reklamı izlese bile ödül vermiyoruz.
                // Not: Arayüz zaten kotayı status'ten okuyup butonu saklamalıdır.
                return StatusCode(429, new { Message = "Günlük reklam izleme limitinizi doldurdunuz. Lütfen yarına kadar bekleyin veya Premium'a geçin." });
            }

            // Kullanıcı saat kaçta izlerse izlesin 3 saatlik (veya gece 12'ye kadar olan süreden hangisi büyükse) kredi verelim.
            // Sizin isteğinize uygun olarak 23:50'de izlenirse 3 saat (02:50'ye kadar) geçerli olsun.
            var resetDate = DateTime.UtcNow.Date.AddDays(1); // Gece 12
            var threeHoursLater = DateTime.UtcNow.AddHours(3);
            
            // Hangi süre daha uzunsa onu kullan (Örneğin sabah 10'da izlerse gece 12'ye kadar geçerli olsun, gece 23'te izlerse gece 2'ye kadar geçerli olsun).
            var expirationDate = threeHoursLater > resetDate ? threeHoursLater : resetDate;

            // Ödül: 5 Kredi
            var success = await _quotaManager.GrantRewardAsync(tenantId, request.ResourceType, 5, expirationDate);

            if (success)
            {
                return Ok(new { Message = "Tebrikler! 5 Ekstra kullanım hakkı kazandınız.", Expiration = expirationDate });
            }

            return StatusCode(500, "Ödül verilirken bir hata oluştu.");
        }
#if DEBUG
        /// <summary>
        /// SADECE GELİŞTİRME ORTAMINDA AKTİFTİR.
        /// Kota sistemini test etmek için manuel bir şekilde 1 birim kullanım simüle eder.
        /// </summary>
        [HttpPost("simulate-deduct")]
        public async Task<IActionResult> SimulateDeduct([FromBody] string resourceType)
        {
            var tenantId = GetCurrentTenantId();
            if (string.IsNullOrEmpty(tenantId)) return Unauthorized();

            var plan = GetSubscriptionPlan();

            // Sadece çağıran tenant'ın kotasından düşer (Tenant Context kalkanı)
            bool success = await _quotaManager.TryDeductAsync(tenantId, plan, resourceType);

            if (success)
            {
                return Ok(new { Message = $"Simülasyon Başarılı: {resourceType} için 1 kullanım hakkı düşüldü." });
            }
            else
            {
                return StatusCode(429, new { Message = $"Simülasyon Başarısız: {resourceType} için kullanım hakkınız (kotanız) dolmuştur!" });
            }
        }
#endif
    }
}
