using System.Threading.Tasks;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<bool> DeleteAllUserDataAsync(string userId);
        Task<PlanlamaApp.Domain.Entities.User?> GetUserByEmailAsync(string email);
        Task<PlanlamaApp.Domain.Entities.User?> GetUserByGoogleIdAsync(string googleId);
        Task<PlanlamaApp.Domain.Entities.User?> GetUserByIdAsync(string id);
        Task<string> CreateUserAsync(PlanlamaApp.Domain.Entities.User user);
        Task<System.Collections.Generic.IEnumerable<PlanlamaApp.Domain.Entities.User>> GetPendingUsersAsync();
        Task ApproveUserAsPremiumAsync(string userId, int? customAiLimit, int? customStorageLimit);
        Task<System.Collections.Generic.IEnumerable<PlanlamaApp.Domain.Entities.User>> SearchUsersByEmailAsync(string email);
        Task<bool> UpdateUserLimitsAsync(string userId, string subscriptionPlan, int? customAiLimit, int? customStorageLimit, int? customWorkspaceLimit);
    }
}
