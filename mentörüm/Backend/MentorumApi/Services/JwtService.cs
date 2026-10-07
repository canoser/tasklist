using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MentorumApi.Models; // Models namespace'ini ekleyeceğiz
using Microsoft.IdentityModel.Tokens;

namespace MentorumApi.Services
{
    public class JwtService
    {
        private readonly IConfiguration _config;

        public JwtService(IConfiguration config)
        {
            _config = config;
        }

        public string GenerateAccessToken(User user)
        {
            // .env'den JWT_SECRET'ı okuruz, yoksa appsettings'den alırız. Güvenlik için daima .env olmalı.
            var secret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? _config["Jwt:Secret"];
            if (string.IsNullOrEmpty(secret) || secret.Length < 32)
                throw new InvalidOperationException("JWT Secret bulunamadı veya 32 karakterden kısa!");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role), // Coach, Student, Parent, Teacher
                new Claim("is_admin", user.IsAdmin.ToString().ToLowerInvariant()),
                new Claim("FullName", user.FullName)
            };

            var token = new JwtSecurityToken(
                issuer: Environment.GetEnvironmentVariable("JWT_ISSUER") ?? _config["Jwt:Issuer"],
                audience: Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(15), // KOD PLANI: Access token 15 dk
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateRefreshToken()
        {
            var randomNumber = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }
    }
}
