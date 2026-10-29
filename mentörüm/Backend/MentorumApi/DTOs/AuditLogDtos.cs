using System;

namespace MentorumApi.DTOs
{
    public class AuditLogItemDto
    {
        public Guid Id { get; set; }
        public Guid? ProgramId { get; set; }
        public Guid ActorId { get; set; }
        public string ActorName { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string ResourceType { get; set; } = string.Empty;
        public Guid ResourceId { get; set; }
        public string? Details { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
