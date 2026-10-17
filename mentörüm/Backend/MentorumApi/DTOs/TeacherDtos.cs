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
        // Boş bırakılırsa dersin TÜM öğrencilerine toplu atanır.
        public Guid? StudentId { get; set; }

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

    public class TeacherReviewHomeworkRequest
    {
        [Required]
        public required string Status { get; set; } // 'DONE' | 'PENDING'

        public string? Feedback { get; set; }
    }

    public class TeacherAddNoteRequest
    {
        [Required]
        public required string Note { get; set; }
        public string? Visibility { get; set; } = "STUDENT_VISIBLE";
        public string? Summary { get; set; }
    }

    public class TeacherNoteDto
    {
        public Guid Id { get; set; }
        public string Note { get; set; } = string.Empty;
        public string? Summary { get; set; }
        public string Visibility { get; set; } = "STUDENT_VISIBLE";
        public DateTime CreatedAt { get; set; }
    }

    public class PublicTeacherNoteDto
    {
        public Guid Id { get; set; }
        public string? Summary { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
