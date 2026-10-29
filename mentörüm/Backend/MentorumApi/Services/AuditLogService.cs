using MentorumApi.Data;
using Serilog;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace MentorumApi.Services
{
    public class AuditLogService
    {
        private readonly AuditLogRepository _repo;

        public AuditLogService(AuditLogRepository repo)
        {
            _repo = repo;
        }

        public async Task LogAsync(Guid? programId, Guid actorId, string action, string resourceType, Guid resourceId, object? details = null)
        {
            try
            {
                string? detailsJson = null;
                if (details != null)
                {
                    detailsJson = details is string s ? s : JsonSerializer.Serialize(details);
                }

                await _repo.InsertAsync(programId, actorId, action, resourceType, resourceId, detailsJson);
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "AuditLogService: Log kaydı yazılırken hata oluştu. Eylem: {Action}, Kaynak: {ResourceType}:{ResourceId}", action, resourceType, resourceId);
            }
        }
    }
}
