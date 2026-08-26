using PlanlamaApp.Domain.Common;

namespace PlanlamaApp.Domain.Entities
{
    public class WorkspaceFile : ISoftDeletable
    {
        public int Id { get; set; }
        public string? TenantId { get; set; }
        public int WorkspaceId { get; set; }
        public string UploaderId { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty; // R2 Object Key
        public long FileSizeInBytes { get; set; }
        public string FileType { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string UploadStatus { get; set; } = "Pending"; // 'Pending', 'Uploaded', 'Failed'
        
        public bool IsActive { get; set; } = true;
        public DateTime? DeletedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
