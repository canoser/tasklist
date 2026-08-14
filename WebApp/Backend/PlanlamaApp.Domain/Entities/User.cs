using System;

namespace PlanlamaApp.Domain.Entities
{
    public class User
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? PasswordHash { get; set; }
        public string? GoogleId { get; set; }
        public string SubscriptionPlan { get; set; } = "free";
        public int? CustomAiLimit { get; set; }
        public int? CustomStorageLimit { get; set; }
        public int? CustomWorkspaceLimit { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
