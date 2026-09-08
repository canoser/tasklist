using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class SharedLinkRepository : BaseRepository, ISharedLinkRepository
    {
        public SharedLinkRepository(IDbConnection dbConnection, ITenantProvider tenantProvider) 
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<SharedLink?> GetByIdAsync(int id)
        {
            var sql = "SELECT * FROM SharedLinks WHERE Id = @id LIMIT 1";
            return await QueryFirstOrDefaultAsync<SharedLink>(sql, new { id });
        }

        public async Task<SharedLink?> GetByTokenAsync(string token)
        {
            // Note: Token lookup should probably bypass Tenant filter if accessed anonymously.
            // But since BaseRepository injects it, we must be careful. For anonymous access, 
            // the system needs a way to resolve tenant from token first.
            // Assuming tenant provider handles it or this method is called from an authorized context.
            // A workaround for true anonymous token lookup is to use a direct connection query.
            var sql = "SELECT * FROM SharedLinks WHERE Token = @token LIMIT 1";
            
            // Using raw connection for anonymous token lookup as TenantId is unknown before lookup
            return await _dbConnection.QueryFirstOrDefaultAsync<SharedLink>(sql, new { token });
        }

        public async Task<IEnumerable<SharedLink>> GetByCreatedUserAsync(string userId)
        {
            var sql = "SELECT * FROM SharedLinks WHERE CreatedByUserId = @userId ORDER BY CreatedAt DESC";
            return await QueryAsync<SharedLink>(sql, new { userId });
        }

        public async Task<int> CreateAsync(SharedLink link)
        {
            var sql = @"
                INSERT INTO SharedLinks 
                (TenantId, CreatedByUserId, StudentId, Token, PinHash, LinkType, Scope, ScopeCategoryId, IsActive, FailedAttempts, LockedUntil, LastAccessedAt, LastAccessIP, CreatedAt)
                VALUES 
                (@TenantId, @CreatedByUserId, @StudentId, @Token, @PinHash, @LinkType, @Scope, @ScopeCategoryId, @IsActive, @FailedAttempts, @LockedUntil, @LastAccessedAt, @LastAccessIP, @CreatedAt)
                RETURNING Id;
            ";
            link.TenantId = _tenantId;
            return await ExecuteScalarAsync<int>(sql, link);
        }

        public async Task<bool> UpdateAsync(SharedLink link)
        {
            var sql = @"
                UPDATE SharedLinks SET
                    IsActive = @IsActive,
                    FailedAttempts = @FailedAttempts,
                    LockedUntil = @LockedUntil,
                    LastAccessedAt = @LastAccessedAt,
                    LastAccessIP = @LastAccessIP
                WHERE Id = @Id;
            ";
            // Use raw connection here if we are updating during an anonymous request (where TenantId might not be set in context)
            if (string.IsNullOrEmpty(_tenantId))
            {
                var affectedRaw = await _dbConnection.ExecuteAsync(sql, link);
                return affectedRaw > 0;
            }

            var affected = await ExecuteAsync(sql, link);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var sql = "DELETE FROM SharedLinks WHERE Id = @id";
            var affected = await ExecuteAsync(sql, new { id });
            return affected > 0;
        }

        public async Task<int> LogAccessAsync(SharedLinkAccessLog log)
        {
            var sql = @"
                INSERT INTO SharedLinkAccessLogs 
                (SharedLinkId, AccessedAt, IPAddress, Success, UserAgent)
                VALUES 
                (@SharedLinkId, @AccessedAt, @IPAddress, @Success, @UserAgent)
                RETURNING Id;
            ";
            // Access logs don't have TenantId, use raw connection
            return await _dbConnection.ExecuteScalarAsync<int>(sql, log);
        }
    }
}
