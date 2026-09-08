using System;

namespace PlanlamaApp.Domain.Entities
{
    public class SharedLinkAccessLog
    {
        public int Id { get; set; }
        public int SharedLinkId { get; set; }
        public DateTime AccessedAt { get; set; } = DateTime.UtcNow;
        public string? IPAddress { get; set; }
        public bool Success { get; set; }
        public string? UserAgent { get; set; }
    }
}
