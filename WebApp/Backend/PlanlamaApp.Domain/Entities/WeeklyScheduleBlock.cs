using System;

namespace PlanlamaApp.Domain.Entities
{
    public class WeeklyScheduleBlock
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public int WeeklyScheduleId { get; set; }
        public int DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string Label { get; set; } = string.Empty;
        public string BlockType { get; set; } = "Study";
        public bool IsLockedByCoach { get; set; } = false;
    }
}
