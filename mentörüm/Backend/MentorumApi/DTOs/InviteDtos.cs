using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class InviteRequest
    {
        [Required, EmailAddress]
        public required string Email { get; set; }
        
        [Required]
        public required string Role { get; set; } // "Student" or "Parent"

        // StudentId for parent invite, or CoachId for student invite
        public Guid? RelatedId { get; set; }
    }

    public class InviteAcceptRequest
    {
        [Required, MinLength(6)]
        public required string Password { get; set; }
        
        [Required]
        public required string FullName { get; set; }
    }
}
