using System;
using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class CreatePaymentPlanRequest
    {
        [Required]
        public Guid StudentId { get; set; }
        public Guid? ParentId { get; set; }

        [Required]
        public required string PeriodType { get; set; } // FOUR_WEEK, MONTHLY_DAY, PER_LESSON, PER_SESSION

        [Required]
        public decimal Amount { get; set; }

        public string Currency { get; set; } = "TRY";
        public int? MonthDay { get; set; } // 1-31 (MONTHLY_DAY için)

        [Required]
        public DateTime StartDate { get; set; }
    }

    public class UpdatePaymentPlanRequest
    {
        public decimal? Amount { get; set; }
        public string? Currency { get; set; }
        public int? MonthDay { get; set; }
        public bool? IsActive { get; set; }
    }

    public class PaymentPlanDto
    {
        public Guid Id { get; set; }
        public Guid ProgramId { get; set; }
        public Guid StudentId { get; set; }
        public string? StudentName { get; set; }
        public Guid? ParentId { get; set; }
        public string? ParentName { get; set; }
        public string PeriodType { get; set; } = "MONTHLY_DAY";
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "TRY";
        public int? MonthDay { get; set; }
        public DateTime StartDate { get; set; }
        public int IsActive { get; set; }
        public List<PaymentItemDto> Items { get; set; } = new();
    }

    public class PaymentItemDto
    {
        public Guid Id { get; set; }
        public Guid PlanId { get; set; }
        public DateTime DueDate { get; set; }
        public decimal BaseAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount => Math.Max(0, BaseAmount - PaidAmount);
        public string Status { get; set; } = "PENDING"; // PENDING, PARTIAL, PAID, OVERDUE, CANCELLED, ROLLED_OVER
        public string Currency { get; set; } = "TRY";
        public DateTime? PaidAt { get; set; }
        public Guid? RolledFromItemId { get; set; }
        public string? Notes { get; set; }
    }

    public class CollectPaymentRequest
    {
        [Required]
        public decimal Amount { get; set; }
        public string? Method { get; set; } // HAVALE, EFT, NAKIT, KREDI_KARTI
        public string? ReceiptUrl { get; set; }
    }

    public class CreatePaymentClaimRequest
    {
        [Required]
        public Guid ItemId { get; set; }
        public decimal? Amount { get; set; }
        public string? Notes { get; set; }
        public string? ReceiptUrl { get; set; }
    }
}
