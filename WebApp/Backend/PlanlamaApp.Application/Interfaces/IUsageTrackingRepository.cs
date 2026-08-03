using System;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IUsageTrackingRepository
    {
        Task<bool> IncrementUsageAsync(string tenantId, string resourceType, int maxLimit, DateTime resetDate, System.Data.IDbTransaction? transaction = null);
        Task<bool> DecrementUsageAsync(string tenantId, string resourceType, System.Data.IDbTransaction? transaction = null);
        Task<bool> AddEarnedLimitAsync(string tenantId, string resourceType, int amount, DateTime expirationDate);
        Task<UsageTracking?> GetUsageAsync(string tenantId, string resourceType);
    }
}
