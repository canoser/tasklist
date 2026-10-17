namespace MentorumApi.DTOs
{
    public class ReportsOverviewDto
    {
        public int TotalStudents { get; set; }
        public int CompletedToday { get; set; }
        public int TotalOverdue { get; set; }
        public int AssignedThisWeek { get; set; }
        public double SuccessRate { get; set; }
    }

    public class ReportsDetailDto
    {
        public List<SubjectBreakdownItemDto> SubjectBreakdown { get; set; } = new();
        public List<RecentHomeworkItemDto> RecentHomework { get; set; } = new();
        public List<OverdueHomeworkItemDto> OverdueHomework { get; set; } = new();
        public List<WeeklyTrendItemDto> WeeklyTrend { get; set; } = new();
    }

    public class SubjectBreakdownItemDto
    {
        public string SubjectName { get; set; } = "";
        public int Completed { get; set; }
        public int Total { get; set; }
        public int SuccessRate { get; set; }
    }

    public class RecentHomeworkItemDto
    {
        public string StudentName { get; set; } = "";
        public string Title { get; set; } = "";
        public DateTime? CompletedAt { get; set; }
        public string Status { get; set; } = "";
    }

    public class OverdueHomeworkItemDto
    {
        public string StudentName { get; set; } = "";
        public string Title { get; set; } = "";
        public DateTime DueDate { get; set; }
    }

    public class WeeklyTrendItemDto
    {
        public DateTime WeekStart { get; set; }
        public int Completed { get; set; }
    }

    public class StudentReportDto
    {
        public int TotalCompleted { get; set; }
        public int TotalOverdue { get; set; }
        public int TotalAssigned { get; set; }
        public double SuccessRate { get; set; }
    }

    public class StudentSubjectStatDto
    {
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public Guid? CurriculumTopicId { get; set; }
        public string? TopicName { get; set; }
        public int TotalMinutes { get; set; }
        public int TotalQuestions { get; set; }
        public int TotalCorrect { get; set; }
        public int TotalWrong { get; set; }
        public int TotalBlank { get; set; }
        public decimal TotalNet { get; set; }
        public decimal SuccessRate { get; set; }
    }

    public class WeeklyTimeBudgetItemDto
    {
        public string Category { get; set; } = "";
        public int TotalMinutes { get; set; }
        public double Percentage { get; set; }
    }

    public class WeeklyTimeBudgetDto
    {
        public int TotalStudyMinutes { get; set; }
        public int TotalPersonalMinutes { get; set; }
        public int TotalTrackedMinutes { get; set; }
        public List<WeeklyTimeBudgetItemDto> Categories { get; set; } = new();
    }
}
