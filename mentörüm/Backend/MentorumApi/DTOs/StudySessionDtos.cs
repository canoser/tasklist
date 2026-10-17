using System;

namespace MentorumApi.DTOs
{
    public class CreateStudySessionRequest
    {
        public Guid? SubjectId { get; set; }
        public Guid? CurriculumTopicId { get; set; }
        public int Minutes { get; set; }
        public int QuestionCount { get; set; }
        public int Correct { get; set; }
        public int Wrong { get; set; }
        public int Blank { get; set; }
        public string SourceType { get; set; } = "MANUAL";
        public DateTime? StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
    }

    public class StudySessionDto
    {
        public Guid Id { get; set; }
        public Guid ProgramId { get; set; }
        public Guid StudentId { get; set; }
        public Guid? SubjectId { get; set; }
        public Guid? CurriculumTopicId { get; set; }
        public string? SubjectName { get; set; }
        public string? TopicName { get; set; }
        public int Minutes { get; set; }
        public int QuestionCount { get; set; }
        public int Correct { get; set; }
        public int Wrong { get; set; }
        public int Blank { get; set; }
        public decimal Net { get; set; }
        public decimal SuccessRate { get; set; }
        public string SourceType { get; set; } = "MANUAL";
        public DateTime? StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
