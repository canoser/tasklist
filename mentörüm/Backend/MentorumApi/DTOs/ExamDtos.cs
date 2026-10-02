using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class ExamScoreDto
    {
        public required string SubjectCode { get; set; }
        public float Score { get; set; }
        public float MaxScore { get; set; }
    }

    public class CreateExamResultRequest
    {
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public DateTime ExamDate { get; set; }
        
        [Required]
        public required string ExamType { get; set; }
        
        public string? ExamName { get; set; }
        public float TotalNet { get; set; }
        public string? Notes { get; set; }

        public List<ExamScoreDto> Scores { get; set; } = new();
    }
}
