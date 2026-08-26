using System;

namespace PlanlamaApp.Domain.Entities
{
    public class TaskFileAttachment
    {
        public int Id { get; set; }
        public string? TenantId { get; set; }
        public int TaskId { get; set; }
        public int FileId { get; set; }
        public DateTime AttachedAt { get; set; } = DateTime.UtcNow;
        public string AttachedBy { get; set; } = string.Empty;
    }
}
