using System;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

using System.Collections.Generic;

namespace PlanlamaApp.Application.Interfaces
{
    public class UsageMetric
    {
        public string ResourceType { get; set; } = string.Empty;
        public int TotalUsedAmount { get; set; }
        public int TotalUsers { get; set; }
    }

    public interface IUsageTrackingRepository
    {
        Task<bool> IncrementUsageAsync(string tenantId, string resourceType, int maxLimit, DateTime resetDate, System.Data.IDbTransaction? transaction = null);
        Task<bool> DecrementUsageAsync(string tenantId, string resourceType, System.Data.IDbTransaction? transaction = null);
        Task<bool> AddEarnedLimitAsync(string tenantId, string resourceType, int amount, DateTime expirationDate);
        Task<UsageTracking?> GetUsageAsync(string tenantId, string resourceType);
        
        /// <summary>
        /// Admin Dashboard için tüm kullanıcıların toplam kullanımlarını (ResourceType bazında) getirir.
        /// </summary>
        Task<IEnumerable<UsageMetric>> GetGlobalUsageMetricsAsync();
    }
}
