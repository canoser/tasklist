using System;
using System.Collections.Generic;

namespace PlanlamaApp.Domain.Entities
{
    public class ExamRecord
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string? CoachUserId { get; set; }
        public int? WorkspaceId { get; set; }
        public string ExamType { get; set; } = string.Empty;
        public string? ExamName { get; set; }
        public DateTime ExamDate { get; set; }
        public decimal? TotalNet { get; set; }
        public int? TotalCorrect { get; set; }
        public int? TotalWrong { get; set; }
        public int? TotalEmpty { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<ExamSubjectResult> SubjectResults { get; set; } = new List<ExamSubjectResult>();
    }
}
