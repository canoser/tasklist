using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class ExamScoreDto
    {
        public Guid? Id { get; set; }
        public Guid? SubjectId { get; set; }
        public string? SubjectCode { get; set; }
        public Guid? CurriculumTopicId { get; set; }
        public string? SubjectName { get; set; }
        public string? UnitName { get; set; }
        public string? TopicName { get; set; }
        public int? QuestionCount { get; set; }
        public int? Correct { get; set; }
        public int? Wrong { get; set; }
        public int? Blank { get; set; }
        public decimal? Net { get; set; }
        public float? Score { get; set; }
        public float? MaxScore { get; set; }
    }

    public class ExamScoreRowDto : ExamScoreDto
    {
        public Guid ExamId { get; set; }
    }

    public class CreateExamResultRequest
    {
        public Guid? StudentId { get; set; }
        public Guid? GroupId { get; set; }
        
        [Required]
        public DateTime ExamDate { get; set; }
        
        [Required]
        public required string ExamType { get; set; }
        
        public string? ExamName { get; set; }
        public float TotalNet { get; set; }
        public string? Notes { get; set; }
        public string? ErrorReasons { get; set; }

        public List<ExamScoreDto> Scores { get; set; } = new();
    }
}
