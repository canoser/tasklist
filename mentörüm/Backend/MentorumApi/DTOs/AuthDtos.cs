using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class RegisterRequest
    {
        [Required, EmailAddress]
        public required string Email { get; set; }
        
        [Required, MinLength(6)]
        public required string Password { get; set; }
        
        [Required]
        public required string FullName { get; set; }

        // Öğrenci / Veli / Koç — kayıt olan kullanıcının seçtiği rol
        public string? Role { get; set; }
    }

    public class LoginRequest
    {
        [Required, EmailAddress]
        public required string Email { get; set; }
        
        [Required]
        public required string Password { get; set; }
    }

    public class GoogleLoginRequest
    {
        [Required]
        public required string IdToken { get; set; }
    }

    public class AuthResponse
    {
        public required string AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public required UserDto User { get; set; }
    }

    public class RefreshRequest
    {
        public string? RefreshToken { get; set; }
    }

    public class ForgotPasswordRequest
    {
        public string? Email { get; set; }
    }

    public class ResetPasswordRequest
    {
        public string? Token { get; set; }
        public string? NewPassword { get; set; }
    }

    public class UserDto
    {
        public Guid Id { get; set; }
        public required string Email { get; set; }
        public required string Role { get; set; }
        public required string FullName { get; set; }
        public string? AvatarUrl { get; set; }
        public bool IsAdmin { get; set; }
    }
}
