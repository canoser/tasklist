using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Services
{
    public class SharedLinkService : ISharedLinkService
    {
        private readonly ISharedLinkRepository _sharedLinkRepository;
        private readonly ITenantProvider _tenantProvider;

        public SharedLinkService(ISharedLinkRepository sharedLinkRepository, ITenantProvider tenantProvider)
        {
            _sharedLinkRepository = sharedLinkRepository;
            _tenantProvider = tenantProvider;
        }

        public async Task<string> GenerateTokenAsync()
        {
            // Generate a 48 character cryptographically secure token
            var bytes = new byte[36];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
        }

        public string GeneratePin()
        {
            // Generate a 4 digit PIN
            var random = new Random();
            return random.Next(1000, 9999).ToString();
        }

        public string HashPin(string pin)
        {
            return BCrypt.Net.BCrypt.HashPassword(pin);
        }

        public bool VerifyPin(string pin, string hash)
        {
            return BCrypt.Net.BCrypt.Verify(pin, hash);
        }

        public bool IsLocked(SharedLink link)
        {
            if (link.LockedUntil.HasValue && link.LockedUntil.Value > DateTime.UtcNow)
            {
                return true;
            }
            return false;
        }

        public async Task<SharedLinkViewDto> BuildScopedDataAsync(SharedLink link)
        {
            // Dummy implementation for now, will be implemented fully later.
            var dto = new SharedLinkViewDto
            {
                StudentName = "Öğrenci", // This should be fetched from StudentProfile
                LinkType = link.LinkType
            };

            return dto;
        }
    }
}
