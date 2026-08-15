using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class SystemErrorRepository : ISystemErrorRepository
    {
        private readonly IDbConnection _dbConnection;

        // BaseRepository'den miras ALMIYORUZ çünkü hatalar Global'dir.
        // Hatalar tenant-bağımsız kaydedilebilir (Örn: auth aşamasındaki hatalar).
        public SystemErrorRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task LogErrorAsync(SystemError error)
        {
            var sql = @"
                INSERT INTO SystemErrors (TenantId, UserId, Path, HttpMethod, ErrorMessage, StackTrace, CreatedAt)
                VALUES (@TenantId, @UserId, @Path, @HttpMethod, @ErrorMessage, @StackTrace, @CreatedAt)
            ";
            await _dbConnection.ExecuteAsync(sql, error);
        }

        public async Task<IEnumerable<SystemError>> GetRecentErrorsAsync(int limit = 50)
        {
            var sql = @"
                SELECT * FROM SystemErrors
                ORDER BY CreatedAt DESC
                LIMIT @Limit
            ";
            return await _dbConnection.QueryAsync<SystemError>(sql, new { Limit = limit });
        }
    }
}
