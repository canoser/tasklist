using System;

namespace PlanlamaApp.Domain.Entities
{
    public class ChainTemplate
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public int? CategoryId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string TaskType { get; set; } = "Soru Çözme";
        public int? TargetCount { get; set; }
        
        /// <summary>
        /// Daily, SpecificDays, CustomDates
        /// </summary>
        public string RecurrenceType { get; set; } = string.Empty;
        
        public string? DaysOfWeek { get; set; }
        
        /// <summary>
        /// JSON array of date strings for CustomDates recurrence
        /// </summary>
        public string? CustomDates { get; set; }
        
        public DateTime? StartDate { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime? LastGeneratedDate { get; set; }
        public DateTime? EndDate { get; set; }
        
        public bool IsDeleted { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
