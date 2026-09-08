using System;

namespace PlanlamaApp.Domain.Entities
{
    public class LessonRecord
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string CoachUserId { get; set; } = string.Empty;
        public string? StudentId { get; set; }
        public int? WorkspaceId { get; set; }
        public int? CategoryId { get; set; }
        public string? SubjectName { get; set; }
        public DateTime LessonDate { get; set; }
        public int DurationMinutes { get; set; } = 60;
        public string Status { get; set; } = "Planned";
        public string? CoachNote { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
