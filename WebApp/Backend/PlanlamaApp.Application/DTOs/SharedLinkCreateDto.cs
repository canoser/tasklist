namespace PlanlamaApp.Application.DTOs
{
    public class SharedLinkCreateDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string LinkType { get; set; } = string.Empty; // 'Parent' or 'Teacher'
        public string? Scope { get; set; }
        public int? ScopeCategoryId { get; set; }
    }
}
