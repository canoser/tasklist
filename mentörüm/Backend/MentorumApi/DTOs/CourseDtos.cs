namespace MentorumApi.DTOs
{
    /// <summary>
    /// Öğretmenin bir derse erişim izinlerini taşır (Aşama 1.5).
    /// GetCourseAccessAsync yalnızca dersin sahibi öğretmene bu nesneyi döner.
    /// </summary>
    public class CourseAccessDto
    {
        public Guid CourseId { get; set; }
        public Guid? TeacherId { get; set; }
        public Guid ProgramId { get; set; }
        public string? Name { get; set; }
        public string? Type { get; set; }
        public string? Color { get; set; }
        public bool CanViewProfile { get; set; }
        public bool CanViewContact { get; set; }
        public bool CanViewHomework { get; set; }
        public bool CanManageHomework { get; set; }
        public bool CanViewExams { get; set; }
        public bool CanManageExams { get; set; }
        public bool CanViewNotes { get; set; }
        public bool CanAddNotes { get; set; }
        public bool CanViewSchedule { get; set; }
        public bool CanManageSchedule { get; set; }
    }

    /// <summary>
    /// Öğretmenin izinlerine göre maskelenmiş öğrenci görünümü.
    /// Kapalı izin alanları null döner (Aşama 6 DTO maskeleme).
    /// </summary>
    public class StudentTeacherViewDto
    {
        public Guid Id { get; set; }
        public required string FullName { get; set; }
        public string? Email { get; set; }
        public string? AvatarUrl { get; set; }
        public int? Grade { get; set; }
        public string? Track { get; set; }
        public string? TargetUniversity { get; set; }
        public string? TargetDepartment { get; set; }
        public float? TargetScore { get; set; }
        public DateTime? CoachingStartDate { get; set; }
    }
}
