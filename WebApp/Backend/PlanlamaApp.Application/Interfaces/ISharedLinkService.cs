using System.Threading.Tasks;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface ISharedLinkService
    {
        Task<string> GenerateTokenAsync();
        string GeneratePin();
        string HashPin(string pin);
        bool VerifyPin(string pin, string hash);
        bool IsLocked(SharedLink link);
        Task<SharedLinkViewDto> BuildScopedDataAsync(SharedLink link);
    }
}
