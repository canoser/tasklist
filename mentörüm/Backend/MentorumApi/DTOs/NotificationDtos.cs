using System;

namespace MentorumApi.DTOs
{
    public class NotificationDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Type { get; set; }
        public string Title { get; set; }
        public string Body { get; set; }
        public bool IsRead { get; set; }
        public string ActionUrl { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
