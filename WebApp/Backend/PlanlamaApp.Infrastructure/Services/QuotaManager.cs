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
        private readonly IUserRepository _userRepository;

        public QuotaManager(IUsageTrackingRepository usageTrackingRepository, ISettingsService settingsService, IUserRepository userRepository)
        {
            _usageTrackingRepository = usageTrackingRepository;
            _settingsService = settingsService;
            _userRepository = userRepository;
        }

        public async Task<bool> TryDeductAsync(string tenantId, string plan, string resourceType, System.Data.IDbTransaction? transaction = null)
        {
            var user = await _userRepository.GetUserByIdAsync(tenantId);
            int maxLimit = 0;
            bool hasCustomLimit = false;

            if (user != null)
            {
                if (resourceType.Equals("AiTaskCreation", StringComparison.OrdinalIgnoreCase) || resourceType.Equals("AiCommand", StringComparison.OrdinalIgnoreCase))
                {
                    if (user.CustomAiLimit.HasValue)
                    {
                        maxLimit = user.CustomAiLimit.Value;
                        hasCustomLimit = true;
                    }
                }
                else if (resourceType.Equals("FileStorage", StringComparison.OrdinalIgnoreCase))
                {
                    if (user.CustomStorageLimit.HasValue)
                    {
                        maxLimit = user.CustomStorageLimit.Value;
                        hasCustomLimit = true;
                    }
                }
            }

            if (!hasCustomLimit)
            {
                // Premium ise sınırsız, kotayı düşmeye gerek yok
                if (plan.Equals("premium", StringComparison.OrdinalIgnoreCase))
                    return true;

                // Ayarları DB'den (veya Cache'den) oku
                maxLimit = await _settingsService.GetSettingAsIntAsync(resourceType, 0);
            }

            // Eğer ayar hiç girilmemişse AiCommand için varsayılan bir limit verelim ki sistem kilitlenmesin (Bulgu 4)
            if (maxLimit == 0 && resourceType.Equals("AiCommand", StringComparison.OrdinalIgnoreCase) && !hasCustomLimit)
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
