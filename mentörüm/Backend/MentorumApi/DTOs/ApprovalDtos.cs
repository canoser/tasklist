using System;

namespace MentorumApi.DTOs
{
    public class ApprovalItemDto
    {
        public Guid Id { get; set; }
        public Guid ProgramId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public Guid EntityId { get; set; }
        public string Payload { get; set; } = "{}";
        public string Status { get; set; } = "PENDING";
        public Guid CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public Guid? ResolvedBy { get; set; }
        public string? RejectionReason { get; set; }
    }

    public class RejectApprovalRequest
    {
        public string? Reason { get; set; }
    }
}
