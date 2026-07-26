namespace PlanlamaApp.Domain.Entities
{
    public class IdempotencyKey
    {
        public string Key { get; set; } = string.Empty;
        public string TenantId { get; set; } = string.Empty;
        public string RequestPath { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
