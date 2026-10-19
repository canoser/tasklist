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
        public Guid? StudentId { get; set; }
        public string? StudentName { get; set; }
    }

    public class PersonalEventDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Title { get; set; } = "";
        public string EventType { get; set; } = "PERSONAL_BLOCK";
        public string? Category { get; set; }
        public DateTime StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public bool CheckedIn { get; set; }
        public int? ActualMinutes { get; set; }
    }

    public class CreatePersonalEventRequest
    {
        public string? Title { get; set; }
        public string EventType { get; set; } = "PERSONAL_BLOCK";
        public string? Category { get; set; }
        public DateTime StartAt { get; set; }
        public DateTime? EndAt { get; set; }
    }

    public class CheckinEventRequest
    {
        public bool CheckedIn { get; set; }
        public int? ActualMinutes { get; set; }
    }

    public class CoachingSessionDto
    {
        public Guid Id { get; set; }
        public Guid CoachId { get; set; }
        public Guid StudentId { get; set; }
        public DateTime? SessionDate { get; set; }
        public string Title { get; set; } = "";
        public string? Notes { get; set; }
        public string? ActionItems { get; set; }
        public string? PrepNotes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateCoachingSessionRequest
    {
        public DateTime? SessionDate { get; set; }
        public string? Title { get; set; }
        public string? Notes { get; set; }
        public string? ActionItems { get; set; }
    }

    public class UpdateSessionPrepRequest
    {
        public string? PrepNotes { get; set; }
    }
}
