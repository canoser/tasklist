using System;

namespace PlanlamaApp.Domain.Entities
{
    public class StudentProfile
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string CoachUserId { get; set; } = string.Empty;
        public int? WorkspaceId { get; set; }
        public string? TargetExam { get; set; }
        public int? TargetYear { get; set; }
        public decimal? TargetScore { get; set; }
        public string? SchoolName { get; set; }
        public string? Grade { get; set; }
        public string? ParentName { get; set; }
        public string? ParentPhone { get; set; }
        public string? CoachNotes { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
