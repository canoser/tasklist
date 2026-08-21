using System;

namespace PlanlamaApp.Domain.Entities
{
    public class WorkspaceMember
    {
        public int Id { get; set; }
        public string? TenantId { get; set; }
        public int WorkspaceId { get; set; }
        public string? UserId { get; set; }
        // Sahibin bu üyeye verdiği takma ad. "Piyon1", "Kale", "Ali Bey" olabilir.
        // Kullanıcının gerçek adından bağımsızdır.
        public string? DisplayName { get; set; }
        public string Role { get; set; } = "Member"; // Member, Observer vs.
        public string? ObserverLinkedUserId { get; set; }
        public bool IsActiveMember { get; set; } = true;
        public string ApprovalStatus { get; set; } = "Pending";
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
