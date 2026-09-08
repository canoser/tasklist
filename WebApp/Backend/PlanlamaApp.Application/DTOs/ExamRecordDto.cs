using System;
using System.Collections.Generic;

namespace PlanlamaApp.Application.DTOs
{
    public class ExamRecordDto
    {
        public int Id { get; set; }
        public string StudentId { get; set; } = string.Empty;
        public string ExamType { get; set; } = string.Empty;
        public string? ExamName { get; set; }
        public DateTime ExamDate { get; set; }
        public decimal? TotalNet { get; set; }
        public int? TotalCorrect { get; set; }
        public int? TotalWrong { get; set; }
        public int? TotalEmpty { get; set; }
        public string? Notes { get; set; }

        public List<ExamSubjectResultDto> SubjectResults { get; set; } = new List<ExamSubjectResultDto>();
    }

    public class ExamSubjectResultDto
    {
        public int Id { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public int Correct { get; set; }
        public int Wrong { get; set; }
        public int Empty { get; set; }
        public decimal Net { get; set; }
    }
}
