namespace MentorumApi.DTOs
{
    public class RateLimitRuleDto
    {
        public string Path { get; set; } = "";
        public int MaxAttempts { get; set; }
        public int WindowSeconds { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class RateLimitEventDto
    {
        public Guid Id { get; set; }
        public string Path { get; set; } = "";
        public string Ip { get; set; } = "";
        public int Attempts { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UpdateRateLimitRequest
    {
        public string? Path { get; set; }
        public int MaxAttempts { get; set; }
    }
}
