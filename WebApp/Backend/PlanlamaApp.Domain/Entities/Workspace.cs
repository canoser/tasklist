using PlanlamaApp.Domain.Common;

namespace PlanlamaApp.Domain.Entities
{
    public class Workspace : ISoftDeletable
    {
        public int Id { get; set; }
        public string? TenantId { get; set; }
        public string? OwnerId { get; set; }      // Workspace'i oluşturan kullanıcı
        public string Name { get; set; } = string.Empty;          // "9-A Sınıfı", "Yazılım Ekibi"
        public string? Description { get; set; }
        public string? InviteCode { get; set; }    // Davet kodu (6 hane rastgele)
        public string Type { get; set; } = "Group";               // "Personal", "Group", "Class"
        public string? Settings { get; set; }                     // JSON settings
        public bool IsActive { get; set; } = true;
        public DateTime? DeletedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
