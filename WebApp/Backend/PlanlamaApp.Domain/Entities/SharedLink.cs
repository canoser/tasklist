using System;

namespace PlanlamaApp.Domain.Entities
{
    public class SharedLink
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string CreatedByUserId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string PinHash { get; set; } = string.Empty;
        public string LinkType { get; set; } = string.Empty;
        public string? Scope { get; set; }
        public int? ScopeCategoryId { get; set; }
        public bool IsActive { get; set; } = true;
        public int FailedAttempts { get; set; } = 0;
        public DateTime? LockedUntil { get; set; }
        public DateTime? LastAccessedAt { get; set; }
        public string? LastAccessIP { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
