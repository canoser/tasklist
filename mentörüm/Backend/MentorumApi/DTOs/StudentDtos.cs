using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class StudentListDto
    {
        public Guid Id { get; set; }
        public required string FullName { get; set; }
        public required string Email { get; set; }
        public string? AvatarUrl { get; set; }
        public int? Grade { get; set; }
        public string? Track { get; set; }
        public string? TargetUniversity { get; set; }
        public int IsActive { get; set; }
    }

    public class StudentDetailDto : StudentListDto
    {
        public DateTime? CoachingStartDate { get; set; }
        public string? TargetDepartment { get; set; }
        public float? TargetScore { get; set; }
    }

    public class StudentNoteDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public required string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateStudentNoteRequest
    {
        [Required]
        public required string Content { get; set; }
    }

    public class StudentProfileDto
    {
        public Guid Id { get; set; }
        public required string FullName { get; set; }
        public required string Email { get; set; }
        public string? AvatarUrl { get; set; }
        public int? Grade { get; set; }
        public string? Track { get; set; }
        public string? TargetUniversity { get; set; }
        public string? TargetDepartment { get; set; }
        public float? TargetScore { get; set; }
        public DateTime? CoachingStartDate { get; set; }
        public List<StudentParentInfoDto> Parents { get; set; } = new();
    }

    public class StudentParentInfoDto
    {
        public Guid ParentId { get; set; }
        public string ParentName { get; set; } = string.Empty;
        public string? Relation { get; set; }
    }

    public class StudentExamDto
    {
        public Guid Id { get; set; }
        public DateTime? ExamDate { get; set; }
        public string? ExamType { get; set; }
        public string? ExamName { get; set; }
        public float? TotalNet { get; set; }
    }

    public class StudentGoalDto
    {
        public string? TargetUniversity { get; set; }
        public string? TargetDepartment { get; set; }
        public float? TargetScore { get; set; }
    }

    public class UpdateStudentGoalRequest
    {
        public string? TargetUniversity { get; set; }
        public string? TargetDepartment { get; set; }
        public float? TargetScore { get; set; }
    }

    public class StudentCurriculumTopicDto
    {
        public Guid Id { get; set; }
        public string? SubjectName { get; set; }
        public string? Grade { get; set; }
        public string? CurriculumType { get; set; }
        public int? UnitNumber { get; set; }
        public string? UnitName { get; set; }
        public string? TopicNumber { get; set; }
        public string? TopicName { get; set; }
        public bool IsCompleted { get; set; }
    }
}
