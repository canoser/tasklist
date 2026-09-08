using System;

namespace PlanlamaApp.Application.DTOs
{
    public class StudentProfileDto
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string CoachUserId { get; set; } = string.Empty;
        public string? TargetExam { get; set; }
        public int? TargetYear { get; set; }
        public decimal? TargetScore { get; set; }
        public string? SchoolName { get; set; }
        public string? Grade { get; set; }
        public string? ParentName { get; set; }
        public string? ParentPhone { get; set; }
        
        // Excluded: CoachNotes from public views unless specifically requested for the coach
    }
}
