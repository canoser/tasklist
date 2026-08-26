using System;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

using System.Collections.Generic;

namespace PlanlamaApp.Application.Interfaces
{
    public class UsageMetric
    {
        public string ResourceType { get; set; } = string.Empty;
        public long TotalUsedAmount { get; set; }
        public long TotalUsers { get; set; }
    }

    public interface IUsageTrackingRepository
    {
        Task<bool> IncrementUsageAsync(string tenantId, string resourceType, long maxLimit, DateTime resetDate, long amount = 1, System.Data.IDbTransaction? transaction = null);
        Task<bool> DecrementUsageAsync(string tenantId, string resourceType, long amount = 1, System.Data.IDbTransaction? transaction = null);
        Task<bool> AddEarnedLimitAsync(string tenantId, string resourceType, long amount, DateTime expirationDate);
        Task<UsageTracking?> GetUsageAsync(string tenantId, string resourceType);
        
        /// <summary>
        /// Admin Dashboard için tüm kullanıcıların toplam kullanımlarını (ResourceType bazında) getirir.
        /// </summary>
        Task<IEnumerable<UsageMetric>> GetGlobalUsageMetricsAsync();
    }
}
