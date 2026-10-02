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
}
