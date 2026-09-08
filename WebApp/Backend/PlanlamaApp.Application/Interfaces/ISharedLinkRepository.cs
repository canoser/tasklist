using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface ISharedLinkRepository
    {
        Task<SharedLink?> GetByIdAsync(int id);
        Task<SharedLink?> GetByTokenAsync(string token);
        Task<IEnumerable<SharedLink>> GetByCreatedUserAsync(string userId);
        Task<int> CreateAsync(SharedLink link);
        Task<bool> UpdateAsync(SharedLink link);
        Task<bool> DeleteAsync(int id);
        Task<int> LogAccessAsync(SharedLinkAccessLog log);
    }
}
