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
        [Required]
        public Guid TemplateId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public Guid StudentSubjectId { get; set; }

        [Required]
        public DateTime DueDate { get; set; }
    }

    public class CompleteHomeworkRequest
    {
        public int CompletionPercentage { get; set; } = 100;
    }
}
