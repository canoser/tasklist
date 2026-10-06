namespace MentorumApi.DTOs
{
    public class CourseResourceDto
    {
        public Guid Id { get; set; }
        public Guid CourseId { get; set; }
        public required string Title { get; set; }
        public string? Type { get; set; }
        public string? ResourceRef { get; set; }
        public int SortOrder { get; set; }
        public int? Progress { get; set; }   // öğrenci görünümünde dolu
        public int? IsDone { get; set; }     // öğrenci görünümünde dolu
    }

    public class CreateCourseResourceRequest
    {
        public required string Title { get; set; }
        public string? Type { get; set; }
        public string? ResourceRef { get; set; }
        public int? SortOrder { get; set; }
    }

    public class UpdateCourseResourceRequest
    {
        public string? Title { get; set; }
        public string? Type { get; set; }
        public string? ResourceRef { get; set; }
        public int? SortOrder { get; set; }
    }

    public class UpdateResourceProgressRequest
    {
        public int? Progress { get; set; }
        public bool? IsDone { get; set; }
    }
}
