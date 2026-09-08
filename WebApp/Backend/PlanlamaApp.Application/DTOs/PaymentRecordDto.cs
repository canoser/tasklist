using System;

namespace PlanlamaApp.Application.DTOs
{
    public class PaymentRecordDto
    {
        public int Id { get; set; }
        public string StudentId { get; set; } = string.Empty;
        public string CoachUserId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "TRY";
        public string PaymentType { get; set; } = string.Empty;
        public string Status { get; set; } = "Planned";
        public DateTime DueDate { get; set; }
        public DateTime? PaidDate { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Notes { get; set; }
    }
}
