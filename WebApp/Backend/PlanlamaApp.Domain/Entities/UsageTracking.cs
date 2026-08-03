using System;

namespace PlanlamaApp.Domain.Entities
{
    public class UsageTracking
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string TenantId { get; set; } = string.Empty; // UserId
        public string ResourceType { get; set; } = string.Empty; // e.g., "AiTaskCreation", "FileStorage"
        public int UsedAmount { get; set; } = 0;
        public int MaxLimit { get; set; } = 0;
        public int EarnedLimit { get; set; } = 0;
        public DateTime ResetDate { get; set; } = DateTime.UtcNow.Date.AddDays(1);
        public DateTime? EarnedLimitExpiration { get; set; }
    }
}
