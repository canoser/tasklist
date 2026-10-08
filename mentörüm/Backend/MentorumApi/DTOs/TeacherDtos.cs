using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class TeacherDto
    {
        public Guid Id { get; set; }
        public required string FullName { get; set; }
        public required string Email { get; set; }
        public string? AvatarUrl { get; set; }
        public int IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class TeacherCourseInfoDto
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public string? Type { get; set; }
    }

    public class TeacherProfileDto
    {
        public Guid Id { get; set; }
        public required string FullName { get; set; }
        public required string Email { get; set; }
        public string? AvatarUrl { get; set; }
        public List<string> Programs { get; set; } = new();
        public List<TeacherCourseInfoDto> Courses { get; set; } = new();
    }

    public class TeacherDetailDto : TeacherDto
    {
        public List<TeacherCourseInfoDto> Courses { get; set; } = new();
        public int StudentCount { get; set; }
    }

    public class TeacherCreateHomeworkRequest
    {
        [Required]
        public Guid StudentId { get; set; }

        public Guid? SubjectId { get; set; }
        public Guid? CurriculumTopicId { get; set; }
        public string? FreeTopic { get; set; }

        [Required]
        public required string Title { get; set; }

        public string? Description { get; set; }

        [Required]
        public DateTime DueDate { get; set; }
    }

    public class TeacherCreateExamRequest
    {
        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public DateTime ExamDate { get; set; }

        public string? ExamName { get; set; }
        public string? ExamType { get; set; }
        public float TotalNet { get; set; }
    }
}
