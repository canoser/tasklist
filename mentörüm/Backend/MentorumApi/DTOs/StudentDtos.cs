using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class StudentListDto
    {
        public Guid Id { get; set; }
        public required string FullName { get; set; }
        public string? Email { get; set; }
        public string? AvatarUrl { get; set; }
        public int? Grade { get; set; }
        public string? Track { get; set; }
        public string? TargetUniversity { get; set; }
        public int IsActive { get; set; }
        public Guid? ProgramId { get; set; }
        public string? ProgramName { get; set; }
        public string InviteStatus { get; set; } = "NOT_INVITED";
        public string? GroupName { get; set; }
        public bool HasIndividualCourse { get; set; }
        public int ActiveHomeworkCount { get; set; }
        public int CompletedHomeworkCount { get; set; }
        public int OverdueHomeworkCount { get; set; }
        public int ThisWeekStudyMinutes { get; set; }
        public int ThisWeekQuestionCount { get; set; }
        public decimal? LastExamNet { get; set; }
        public decimal? PrevExamNet { get; set; }
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

    public class ParentPermissionsDto
    {
        public bool CanViewExams { get; set; }
        public bool CanViewHomework { get; set; }
        public bool CanViewCalendar { get; set; }
        public bool CanViewStudyStats { get; set; }
        public bool CanViewPayments { get; set; }
    }

    public class UpdateParentPermissionsRequest
    {
        public bool CanViewExams { get; set; }
        public bool CanViewHomework { get; set; }
        public bool CanViewCalendar { get; set; }
        public bool CanViewStudyStats { get; set; }
        public bool CanViewPayments { get; set; }
    }

    public class RecentTeacherNoteDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = "";
        public Guid CourseId { get; set; }
        public string CourseName { get; set; } = "";
        public Guid TeacherId { get; set; }
        public string TeacherName { get; set; } = "";
        public string Note { get; set; } = "";
        public string? Summary { get; set; }
        public string Visibility { get; set; } = "";
        public DateTime CreatedAt { get; set; }
    }

    public class CreateStudentRequest
    {
        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string? Email { get; set; }
        public int? ClassLevel { get; set; }
        public string? TargetExam { get; set; }
        public Guid? GroupId { get; set; }
    }

    public class InviteStudentRequest
    {
        public string Email { get; set; } = "";
    }

    public class MoveToGroupRequest
    {
        public Guid GroupId { get; set; }
    }

    public class UpdateStudentRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public int? ClassLevel { get; set; }
        public string? TargetExam { get; set; }
    }
}
