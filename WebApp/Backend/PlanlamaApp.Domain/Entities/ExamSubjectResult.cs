namespace PlanlamaApp.Domain.Entities
{
    public class ExamSubjectResult
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public int ExamRecordId { get; set; }
        public int? CategoryId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public int Correct { get; set; } = 0;
        public int Wrong { get; set; } = 0;
        public int Empty { get; set; } = 0;
        public decimal Net { get; set; } = 0;
        public int? QuestionCount { get; set; }
    }
}
