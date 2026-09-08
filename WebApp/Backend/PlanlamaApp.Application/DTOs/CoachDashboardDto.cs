using System.Collections.Generic;

namespace PlanlamaApp.Application.DTOs
{
    public class CoachDashboardDto
    {
        public int TotalStudents { get; set; }
        public int ActiveTasks { get; set; }
        public int UnpaidPayments { get; set; }
        public int TodayLessons { get; set; }
        
        public List<object> UpcomingLessons { get; set; } = new List<object>();
        public List<object> Alerts { get; set; } = new List<object>(); // Overdue tasks, missed payments etc.
    }
}
