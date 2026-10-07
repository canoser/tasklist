namespace MentorumApi.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public required string Email { get; set; }
        public string? PasswordHash { get; set; }
        public string? GoogleId { get; set; }
        public required string Role { get; set; } // Coach, Student, Parent, Teacher, Admin
        public required string FullName { get; set; }
        public string? AvatarUrl { get; set; }
        public int IsActive { get; set; } = 1;
        public bool IsAdmin { get; set; }
        public string ApprovalStatus { get; set; } = "APPROVED";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
