using Dapper;
using MentorumApi.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MentorumApi.Data
{
    public class AuditLogRepository : BaseRepository
    {
        public AuditLogRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task InsertAsync(Guid? programId, Guid actorId, string action, string resourceType, Guid resourceId, string? detailsJson)
        {
            const string sql = @"
                INSERT INTO audit_logs (id, program_id, actor_id, action, resource_type, resource_id, details, created_at)
                VALUES (gen_random_uuid(), @ProgramId, @ActorId, @Action, @ResourceType, @ResourceId, @Details::jsonb, NOW())";

            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(sql, new
            {
                ProgramId = programId,
                ActorId = actorId,
                Action = action,
                ResourceType = resourceType,
                ResourceId = resourceId,
                Details = detailsJson
            });
        }

        public async Task<IEnumerable<AuditLogItemDto>> GetByProgramAsync(Guid programId, int limit = 100)
        {
            const string sql = @"
                SELECT 
                    a.id AS Id,
                    a.program_id AS ProgramId,
                    a.actor_id AS ActorId,
                    u.full_name AS ActorName,
                    a.action AS Action,
                    a.resource_type AS ResourceType,
                    a.resource_id AS ResourceId,
                    a.details::text AS Details,
                    a.created_at AS CreatedAt
                FROM audit_logs a
                JOIN users u ON u.id = a.actor_id
                WHERE a.program_id = @ProgramId
                ORDER BY a.created_at DESC
                LIMIT @Limit";

            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<AuditLogItemDto>(sql, new { ProgramId = programId, Limit = limit });
        }
    }
}
