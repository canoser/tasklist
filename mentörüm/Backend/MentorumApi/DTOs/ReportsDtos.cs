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
}
