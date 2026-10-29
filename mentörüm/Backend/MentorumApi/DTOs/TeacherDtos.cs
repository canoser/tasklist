using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class TeacherDto
    {
        public Guid Id { get; set; }
        public required string FullName { get; set; }
        public required string Email { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Branch { get; set; }
        public string? Phone { get; set; }
        public int IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<TeacherCourseInfoDto> Courses { get; set; } = new();
        public int StudentCount { get; set; }
    }

    public class TeacherCourseInfoDto
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public string? Type { get; set; }
    }

    public class DirectCreateTeacherRequest
    {
        [Required]
        public required string FirstName { get; set; }

        [Required]
        public required string LastName { get; set; }

        public string? Branch { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
        public List<Guid>? CourseIds { get; set; }
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
    }

    public class UpdateTeacherRequest
    {
        [Required]
        public required string FullName { get; set; }
        public string? Branch { get; set; }
        public string? Phone { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class TeacherStudentItemDto
    {
        public Guid StudentId { get; set; }
        public required string StudentName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? TargetExam { get; set; }
        public int? ClassLevel { get; set; }
        public List<string> Courses { get; set; } = new();
        public bool IsActive { get; set; } = true;
        public DateTime? EnrolledAt { get; set; }
    }

    public class TeacherStudentsResponseDto
    {
        public List<TeacherStudentItemDto> ActiveStudents { get; set; } = new();
        public List<TeacherStudentItemDto> PastStudents { get; set; } = new();
    }

    public class TeacherHomeworkStatsDto
    {
        public int TotalHomeworks { get; set; }
        public int CompletedHomeworks { get; set; }
        public int PendingHomeworks { get; set; }
        public int OverdueHomeworks { get; set; }
        public double ReturnRate { get; set; }
        public List<TeacherStudentHomeworkSummaryDto> StudentSummaries { get; set; } = new();
    }

    public class TeacherStudentHomeworkSummaryDto
    {
        public Guid StudentId { get; set; }
        public required string StudentName { get; set; }
        public string CourseTitle { get; set; } = string.Empty;
        public int TotalAssigned { get; set; }
        public int Completed { get; set; }
        public double ReturnRate { get; set; }
        public string LastStatus { get; set; } = "PENDING";
        public DateTime? LastDueDate { get; set; }
    }

    public class TeacherExamStatsDto
    {
        public int TotalExams { get; set; }
        public List<TeacherStudentExamSummaryDto> ExamResults { get; set; } = new();
    }

    public class TeacherStudentExamSummaryDto
    {
        public Guid ExamId { get; set; }
        public required string ExamTitle { get; set; }
        public string ExamType { get; set; } = "Deneme";
        public DateTime? ExamDate { get; set; }
        public Guid StudentId { get; set; }
        public required string StudentName { get; set; }
        public string CourseTitle { get; set; } = string.Empty;
        public float TotalNet { get; set; }
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
        public int? ExpectedVersion { get; set; }
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
