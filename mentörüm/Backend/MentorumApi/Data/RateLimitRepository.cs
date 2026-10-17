using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class RateLimitRepository : BaseRepository
    {
        public RateLimitRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<RateLimitRuleDto>> GetRulesAsync()
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<RateLimitRuleDto>(@"
                SELECT path AS Path, max_attempts AS MaxAttempts, window_seconds AS WindowSeconds, updated_at AS UpdatedAt
                FROM rate_limit_rules
                ORDER BY path");
        }

        public async Task<IEnumerable<RateLimitEventDto>> GetRecentEventsAsync(int limit = 100)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<RateLimitEventDto>(@"
                SELECT id AS Id, path AS Path, ip AS Ip, attempts AS Attempts, created_at AS CreatedAt
                FROM rate_limit_events
                ORDER BY created_at DESC
                LIMIT @Limit", new { Limit = limit });
        }

        public async Task<bool> UpdateRuleAsync(string path, int maxAttempts, Guid? adminId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                INSERT INTO rate_limit_rules (path, max_attempts, window_seconds, updated_at, updated_by)
                VALUES (@Path, @Max, 300, NOW(), @AdminId)
                ON CONFLICT (path) DO UPDATE SET max_attempts = @Max, updated_at = NOW(), updated_by = @AdminId",
                new { Path = path, Max = maxAttempts, AdminId = adminId });
            return rows > 0;
        }
    }
}
