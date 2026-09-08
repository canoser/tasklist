using System.Collections.Generic;

namespace PlanlamaApp.Application.DTOs
{
    public class StudentStatsSummaryDto
    {
        public string StudentId { get; set; } = string.Empty;
        public int TotalStudyHours { get; set; }
        public int TotalQuestionsSolved { get; set; }
        public int CompletedTasksCount { get; set; }
        public int CurrentStreak { get; set; }
        
        public object? TrendResult { get; set; }
    }
}
