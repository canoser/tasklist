using System;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class UsageTrackingRepository : IUsageTrackingRepository
    {
        private readonly IDbConnection _dbConnection;

        public UsageTrackingRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<bool> IncrementUsageAsync(string tenantId, string resourceType, int maxLimit, DateTime resetDate, System.Data.IDbTransaction? transaction = null)
        {
            var now = DateTime.UtcNow;
            var p = new
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                ResourceType = resourceType,
                MaxLimit = maxLimit,
                ResetDate = resetDate,
                Now = now
            };

            var sql = @"
                INSERT INTO UsageTracking (Id, TenantId, ResourceType, UsedAmount, MaxLimit, ResetDate, EarnedLimit, EarnedLimitExpiration)
                VALUES (@Id, @TenantId, @ResourceType, 1, @MaxLimit, @ResetDate, 0, NULL)
                ON CONFLICT(TenantId, ResourceType) DO UPDATE SET 
                    UsedAmount = CASE 
                                    WHEN UsageTracking.ResetDate < @Now THEN 1 
                                    ELSE UsageTracking.UsedAmount + 1 
                                 END,
                    MaxLimit = @MaxLimit,
                    ResetDate = CASE 
                                    WHEN UsageTracking.ResetDate < @Now THEN @ResetDate 
                                    ELSE UsageTracking.ResetDate 
                                END,
                    EarnedLimit = CASE
                                    WHEN UsageTracking.EarnedLimitExpiration IS NOT NULL AND UsageTracking.EarnedLimitExpiration < @Now THEN 0
                                    ELSE UsageTracking.EarnedLimit
                                   END
                WHERE (UsageTracking.ResetDate < @Now) OR (UsageTracking.UsedAmount < (@MaxLimit + CASE WHEN UsageTracking.EarnedLimitExpiration IS NOT NULL AND UsageTracking.EarnedLimitExpiration >= @Now THEN UsageTracking.EarnedLimit ELSE 0 END));
            ";

            var rowsAffected = await _dbConnection.ExecuteAsync(sql, p, transaction);
            return rowsAffected > 0;
        }

        public async Task<bool> DecrementUsageAsync(string tenantId, string resourceType, System.Data.IDbTransaction? transaction = null)
        {
            var p = new { TenantId = tenantId, ResourceType = resourceType };
            
            var sql = @"
                UPDATE UsageTracking 
                SET UsedAmount = UsedAmount - 1
                WHERE TenantId = @TenantId AND ResourceType = @ResourceType AND UsedAmount > 0;
            ";
            
            var rowsAffected = await _dbConnection.ExecuteAsync(sql, p, transaction);
            return rowsAffected > 0;
        }

        public async Task<bool> AddEarnedLimitAsync(string tenantId, string resourceType, int amount, DateTime expirationDate)
        {
            var now = DateTime.UtcNow;
            var nextDay = now.AddDays(1);

            var sql = @"
                INSERT INTO UsageTracking (Id, TenantId, ResourceType, UsedAmount, MaxLimit, ResetDate, EarnedLimit, EarnedLimitExpiration)
                VALUES (@Id, @TenantId, @ResourceType, 0, 0, @NextDay, @Amount, @ExpirationDate)
                ON CONFLICT(TenantId, ResourceType) DO UPDATE SET 
                    EarnedLimit = CASE
                                    WHEN UsageTracking.EarnedLimitExpiration IS NOT NULL AND UsageTracking.EarnedLimitExpiration < @Now THEN @Amount
                                    ELSE UsageTracking.EarnedLimit + @Amount
                                   END,
                    EarnedLimitExpiration = CASE
                                    WHEN UsageTracking.EarnedLimitExpiration IS NOT NULL AND UsageTracking.EarnedLimitExpiration > @ExpirationDate THEN UsageTracking.EarnedLimitExpiration
                                    ELSE @ExpirationDate
                                   END;
            ";
            
            var insertP = new { 
                Id = Guid.NewGuid().ToString(), 
                TenantId = tenantId, 
                ResourceType = resourceType, 
                Amount = amount, 
                ExpirationDate = expirationDate,
                Now = now,
                NextDay = nextDay
            };

            var rowsAffected = await _dbConnection.ExecuteAsync(sql, insertP);
            return rowsAffected > 0;
        }

        public async Task<UsageTracking?> GetUsageAsync(string tenantId, string resourceType)
        {
            var sql = "SELECT * FROM UsageTracking WHERE TenantId = @TenantId AND ResourceType = @ResourceType";
            return await _dbConnection.QueryFirstOrDefaultAsync<UsageTracking>(sql, new { TenantId = tenantId, ResourceType = resourceType });
        }

        public async Task<IEnumerable<UsageMetric>> GetGlobalUsageMetricsAsync()
        {
            var sql = @"
                SELECT 
                    ResourceType, 
                    SUM(UsedAmount) as TotalUsedAmount, 
                    COUNT(DISTINCT TenantId) as TotalUsers 
                FROM UsageTracking 
                GROUP BY ResourceType;
            ";
            return await _dbConnection.QueryAsync<UsageMetric>(sql);
        }
    }
}
