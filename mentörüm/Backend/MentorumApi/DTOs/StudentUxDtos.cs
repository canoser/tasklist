using System.Text.Json.Serialization;

namespace MentorumApi.DTOs
{
    public class StudentCheckinDto
    {
        public Guid Id { get; set; }
        public DateTime CheckinDate { get; set; }
        public string Mood { get; set; } = "";
        public string? Note { get; set; }
    }

    public class UpsertCheckinRequest
    {
        public string Mood { get; set; } = "";
        public string? Note { get; set; }
    }

    public class StudentPersonalNoteDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = "";
        public string Content { get; set; } = "";
        public string Visibility { get; set; } = "PRIVATE";
        public bool IsPinned { get; set; }
        public DateTime? EventDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreatePersonalNoteRequest
    {
        public string Title { get; set; } = "";
        public string Content { get; set; } = "";
        public string Visibility { get; set; } = "PRIVATE";
        public DateTime? EventDate { get; set; }
    }

    public class UpdatePersonalNoteRequest
    {
        public string Title { get; set; } = "";
        public string Content { get; set; } = "";
        public string Visibility { get; set; } = "PRIVATE";
        public bool IsPinned { get; set; }
        public DateTime? EventDate { get; set; }
    }

    public class StudentQuestionDto
    {
        public Guid Id { get; set; }
        public string TopicText { get; set; } = "";
        public string Status { get; set; } = "OPEN";
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public Guid? UploadId { get; set; }
        public string? CoachReply { get; set; }
        public DateTime? RepliedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateStudentQuestionRequest
    {
        public string TopicText { get; set; } = "";
        public Guid? SubjectId { get; set; }
        public Guid? UploadId { get; set; }
    }

    [JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
    public class CoachReplyQuestionRequest
    {
        public string? Reply { get; set; }
        public string? Status { get; set; } = "RESOLVED";
    }

    public class SchoolScheduleDto
    {
        public Guid Id { get; set; }
        public int DayOfWeek { get; set; }
        public string StartTime { get; set; } = "";
        public string EndTime { get; set; } = "";
        public string Label { get; set; } = "Okul";
    }

    public class CreateSchoolScheduleRequest
    {
        public int DayOfWeek { get; set; }
        public string StartTime { get; set; } = "";
        public string EndTime { get; set; } = "";
        public string Label { get; set; } = "Okul";
    }

    public class HomeworkExtensionRequest
    {
        public string Reason { get; set; } = "";
        public DateTime? RequestedDueDate { get; set; }
    }

    public class StreakDto
    {
        public int CurrentStreak { get; set; }
        public int TotalStudyDays { get; set; }
    }

    public class CoachStudentToolsResponseDto
    {
        public Guid StudentId { get; set; }
        public string SwotData { get; set; } = "{}";
        public string WheelData { get; set; } = "{}";
        public string HabitsData { get; set; } = "[]";
        public AutoSwotSummaryDto AutoSwot { get; set; } = new();
        public DateTime? UpdatedAt { get; set; }
    }

    public class AutoSwotSummaryDto
    {
        public List<string> Strengths { get; set; } = new();
        public List<string> Weaknesses { get; set; } = new();
        public List<string> Opportunities { get; set; } = new();
        public List<string> Threats { get; set; } = new();
    }

    [JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
    public class UpdateCoachingToolsRequest
    {
        public string? SwotData { get; set; }
        public string? WheelData { get; set; }
        public string? HabitsData { get; set; }
    }

    public class StudentCoachingHabitsDto
    {
        public Guid StudentId { get; set; }
        public string HabitsData { get; set; } = "[]";
        public string? MonthlyMilestone { get; set; }
        public int? WeeklyTargetMinutes { get; set; }
        public int? WeeklyTargetQuestions { get; set; }
    }

    [JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
    public class ToggleHabitRequest
    {
        public string HabitId { get; set; } = "";
        public bool Completed { get; set; }
        public string? Date { get; set; }
    }
}
