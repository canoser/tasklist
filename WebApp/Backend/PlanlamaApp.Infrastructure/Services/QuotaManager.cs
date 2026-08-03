using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Infrastructure.Services
{
    public class QuotaManager : IQuotaManager
    {
        private readonly IUsageTrackingRepository _usageTrackingRepository;
        private readonly ISettingsService _settingsService;

        public QuotaManager(IUsageTrackingRepository usageTrackingRepository, ISettingsService settingsService)
        {
            _usageTrackingRepository = usageTrackingRepository;
            _settingsService = settingsService;
        }

        public async Task<bool> TryDeductAsync(string tenantId, string plan, string resourceType, System.Data.IDbTransaction? transaction = null)
        {
            // Premium ise sınırsız, kotayı düşmeye gerek yok
            if (plan.Equals("premium", StringComparison.OrdinalIgnoreCase))
                return true;

            // Ayarları DB'den (veya Cache'den) oku
            int maxLimit = await _settingsService.GetSettingAsIntAsync(resourceType, 0);

            // Eğer ayar hiç girilmemişse AiCommand için varsayılan bir limit verelim ki sistem kilitlenmesin (Bulgu 4)
            if (maxLimit == 0 && resourceType.Equals("AiCommand", StringComparison.OrdinalIgnoreCase))
            {
                maxLimit = 15; // Günde 15 komut ücretsiz
            }

            // Sınırsız planı veya limiti özel olarak belirlemişse (-1 = limitsiz, 0 = hak yok)
            if (maxLimit == 0)
                return false;
            
            // Eğer maxLimit < 0 ise (-1 vs) limitsiz anlamına gelir (premium gibi)
            if (maxLimit < 0)
                return true;

            var resetDate = DateTime.UtcNow.Date.AddDays(1);

            // DB'de atomik düş (eğer limit elveriyorsa)
            return await _usageTrackingRepository.IncrementUsageAsync(tenantId, resourceType, maxLimit, resetDate, transaction);
        }

        public async Task<bool> RefundAsync(string tenantId, string plan, string resourceType, System.Data.IDbTransaction? transaction = null)
        {
            // Premium zaten düşülmemişti, iadeye gerek yok
            if (plan.Equals("premium", StringComparison.OrdinalIgnoreCase))
                return true;

            return await _usageTrackingRepository.DecrementUsageAsync(tenantId, resourceType, transaction);
        }

        public async Task<bool> GrantRewardAsync(string tenantId, string resourceType, int amount, DateTime expirationDate)
        {
            return await _usageTrackingRepository.AddEarnedLimitAsync(tenantId, resourceType, amount, expirationDate);
        }
    }
}
