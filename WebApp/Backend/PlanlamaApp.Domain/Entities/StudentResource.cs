using System;

namespace PlanlamaApp.Domain.Entities
{
    public class StudentResource
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string CoachUserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
