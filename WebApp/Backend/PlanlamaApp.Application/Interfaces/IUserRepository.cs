using System.Threading.Tasks;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<bool> DeleteAllUserDataAsync(string userId);
        Task<PlanlamaApp.Domain.Entities.User?> GetUserByEmailAsync(string email);
        Task<PlanlamaApp.Domain.Entities.User?> GetUserByGoogleIdAsync(string googleId);
        Task<string> CreateUserAsync(PlanlamaApp.Domain.Entities.User user);
    }
}
