namespace MentorumApi.DTOs
{
    public class ScheduleSlotDto
    {
        public Guid Id { get; set; }
        public Guid ProgramId { get; set; }
        public Guid? CourseId { get; set; }
        public Guid? GroupId { get; set; }
        public Guid? StudentId { get; set; }
        public int DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public required string Title { get; set; }
        public string? Type { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public string? Color { get; set; }
        public int IsActive { get; set; }
    }

    public class CreateScheduleSlotRequest
    {
        public Guid? CourseId { get; set; }
        public Guid? GroupId { get; set; }
        public Guid? StudentId { get; set; }
        public int DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public required string Title { get; set; }
        public string? Type { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public string? Color { get; set; }
    }

    public class UpdateScheduleSlotRequest
    {
        public int? DayOfWeek { get; set; }
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        public string? Title { get; set; }
        public string? Type { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public string? Color { get; set; }
        public int? IsActive { get; set; }
    }
}
