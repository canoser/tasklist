using System.Data;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class IdempotencyRepository : BaseRepository, IIdempotencyRepository
    {
        public IdempotencyRepository(IDbConnection dbConnection, ITenantProvider tenantProvider) 
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<bool> ExistsAsync(string key)
        {
            // GÜVENLİK: Sadece son 24 saat içinde oluşturulmuş key'leri geçerli kabul ediyoruz (Replay Attack Expiry)
            var threshold = DateTime.UtcNow.AddDays(-1);
            var sql = "SELECT COUNT(1) FROM IdempotencyKeys WHERE Key = @Key AND CreatedAt > @Threshold";
            // BaseRepository will safely inject 'AND TenantId = @TenantId' to the end.
            var count = await QueryFirstOrDefaultAsync<int>(sql, new { Key = key, Threshold = threshold });
            return count > 0;
        }

        public async Task SaveAsync(IdempotencyKey idempotencyKey)
        {
            var sql = @"INSERT INTO IdempotencyKeys (Key, TenantId, RequestPath, CreatedAt) 
                        VALUES (@Key, @TenantId, @RequestPath, @CreatedAt)";
            // BaseRepository allows this because 'TenantId' is present in the INSERT string.
            await ExecuteAsync(sql, idempotencyKey);
        }
    }
}
