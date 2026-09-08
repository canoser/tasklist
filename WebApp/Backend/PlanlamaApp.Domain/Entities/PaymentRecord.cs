using System;

namespace PlanlamaApp.Domain.Entities
{
    public class PaymentRecord
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string CoachUserId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public int? WorkspaceId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "TRY";
        public string PaymentType { get; set; } = string.Empty;
        public string Status { get; set; } = "Planned";
        public DateTime DueDate { get; set; }
        public DateTime? PaidDate { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Notes { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
