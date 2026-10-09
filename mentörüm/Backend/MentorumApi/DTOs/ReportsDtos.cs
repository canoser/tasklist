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
}
