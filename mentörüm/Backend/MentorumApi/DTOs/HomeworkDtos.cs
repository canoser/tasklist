using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class CreateHomeworkTemplateRequest
    {
        [Required]
        public Guid SubjectId { get; set; }
        
        [Required]
        public required string Title { get; set; }
        
        public string? Description { get; set; }
        public string? ResourceRef { get; set; }
        public Guid? CurriculumTopicId { get; set; }
        public string? FreeTopic { get; set; }
    }

    public class AssignHomeworkRequest
    {
        public Guid? StudentId { get; set; }
        public Guid? GroupId { get; set; }
        public Guid? CourseId { get; set; }

        public Guid? SubjectId { get; set; }
        public Guid? CurriculumTopicId { get; set; }
        public string? FreeTopic { get; set; }

        [Required]
        public required string Title { get; set; }

        public string? Description { get; set; }

        [Required]
        public DateTime DueDate { get; set; }

        public string? Priority { get; set; } = "NORMAL";
    }

    public class HomeworkAttachmentDto
    {
        public Guid Id { get; set; }
        public Guid HomeworkId { get; set; }
        public string OriginalName { get; set; } = "";
        public string ContentType { get; set; } = "";
        public long SizeBytes { get; set; }
        public string? ObjectKey { get; set; }
    }

    public class CompleteHomeworkRequest
    {
        public int CompletionPercentage { get; set; } = 100;
        public string? Note { get; set; }
        public List<Guid>? AttachmentIds { get; set; }
        public int? ExpectedVersion { get; set; }
    }

    public class HomeworkItemDto
    {
        public Guid Id { get; set; }
        public string SnapshotTitle { get; set; } = "";
        public string? SnapshotDesc { get; set; }
        public DateTime DueDate { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int? CompletionPercentage { get; set; }
        public string Status { get; set; } = "";
        public string? SubjectName { get; set; }
        public string? TopicName { get; set; }
        public string? StudentNote { get; set; }
        public string? CourseType { get; set; }
        public string? CourseName { get; set; }
        public string? AssignedVia { get; set; }
        public string? Priority { get; set; }
        public List<HomeworkAttachmentDto> Attachments { get; set; } = new();
        public int Version { get; set; } = 1;
    }
}
