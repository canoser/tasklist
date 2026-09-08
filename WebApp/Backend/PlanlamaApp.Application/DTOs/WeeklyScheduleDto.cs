using System;
using System.Collections.Generic;

namespace PlanlamaApp.Application.DTOs
{
    public class WeeklyScheduleDto
    {
        public int Id { get; set; }
        public string StudentId { get; set; } = string.Empty;
        public int Version { get; set; }
        public bool IsLatest { get; set; }
        public string UpdatedByUserId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        public List<WeeklyScheduleBlockDto> Blocks { get; set; } = new List<WeeklyScheduleBlockDto>();
    }

    public class WeeklyScheduleBlockDto
    {
        public int Id { get; set; }
        public int DayOfWeek { get; set; }
        public string StartTime { get; set; } = string.Empty; // HH:mm format expected
        public string EndTime { get; set; } = string.Empty; // HH:mm format expected
        public string Label { get; set; } = string.Empty;
        public string BlockType { get; set; } = "Study";
        public bool IsLockedByCoach { get; set; } = false;
    }
}
