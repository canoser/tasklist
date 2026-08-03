using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IWorkspaceRepository
    {
        // Sahip olduğu çalışma alanları
        Task<IEnumerable<Workspace>> GetOwnedAsync(string ownerId);
        // Üye olduğu çalışma alanları
        Task<IEnumerable<Workspace>> GetMemberOfAsync(string userId);
        Task<Workspace?> GetByIdAsync(int id);
        Task<Workspace?> GetByInviteCodeAsync(string code);
        Task<int> CreateAsync(Workspace workspace);
        Task<bool> UpdateAsync(Workspace workspace);
        Task<bool> DeleteAsync(int id);

        // Üye işlemleri
        Task<IEnumerable<WorkspaceMember>> GetMembersAsync(int workspaceId);
        Task<WorkspaceMember?> GetMemberByIdAsync(int memberId);
        Task<bool> IsObserverAsync(string observerId, string linkedUserId);
        Task<int> AddMemberAsync(WorkspaceMember member);
        Task<bool> UpdateMemberDisplayNameAsync(int memberId, string displayName);
        Task<bool> RemoveMemberAsync(int workspaceId, string userId);
    }
}
