using System;

namespace MentorumApi.DTOs
{
    public class CalendarEventDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public DateTime Start { get; set; }
        public DateTime End { get; set; }
        public string Type { get; set; }
        public string Color { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; }
    }
}
