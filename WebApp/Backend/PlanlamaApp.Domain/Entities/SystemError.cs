using System;

namespace PlanlamaApp.Domain.Entities
{
    public class SystemError
    {
        public int Id { get; set; }
        public string? TenantId { get; set; }
        public string? UserId { get; set; }
        public string Path { get; set; } = string.Empty;
        public string HttpMethod { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
        public string StackTrace { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
