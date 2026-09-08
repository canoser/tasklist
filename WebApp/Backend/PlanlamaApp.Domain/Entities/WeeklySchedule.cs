using System;
using System.Collections.Generic;

namespace PlanlamaApp.Domain.Entities
{
    public class WeeklySchedule
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public int? WorkspaceId { get; set; }
        public int Version { get; set; } = 1;
        public bool IsLatest { get; set; } = true;
        public string UpdatedByUserId { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<WeeklyScheduleBlock> Blocks { get; set; } = new List<WeeklyScheduleBlock>();
    }
}
