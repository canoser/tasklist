using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Api.Hubs
{
    [Authorize]
    public class AppHub : Hub
    {
        private readonly IWorkspaceRepository _workspaceRepository;
        private readonly IUserRepository _userRepository;
        private readonly ITenantProvider _tenantProvider;

        public AppHub(IWorkspaceRepository workspaceRepository, IUserRepository userRepository, ITenantProvider tenantProvider)
        {
            _workspaceRepository = workspaceRepository;
            _userRepository = userRepository;
            _tenantProvider = tenantProvider;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var email = Context.User?.FindFirst(ClaimTypes.Email)?.Value;

            if (userId != null)
            {
                // [SCALE_TODO]: 1000'lerce kullanıcı olduğunda, OnConnectedAsync veritabanı 
                // çağrıları (GetMemberOfAsync) yük yaratabilir. İleride bu bilgileri 
                // Token Claim'lerinden veya In-Memory Cache'ten okumayı değerlendirin.

                // Admin yetkisi varsa AdminGroup'a ekle
                if (email == "canoser@gmail.com")
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, "AdminGroup");
                }

                // [SCALE_TODO]: Redis Backplane eklendiğinde TenantId izolasyonu kesinlikle 
                // Hub grubu isimlerine yansıtılmalıdır. Örn: $"Workspace_{tenantId}_{workspace.Id}"
                var tenantId = _tenantProvider.GetTenantId();

                // Üye olduğu çalışma alanları gruplarına ekle
                var workspaces = await _workspaceRepository.GetMemberOfAsync(userId);
                foreach (var workspace in workspaces)
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, $"Workspace_{workspace.Id}");
                }

                // Kendisine ait (Owner) olduğu alanlara da ekle
                var ownedWorkspaces = await _workspaceRepository.GetOwnedAsync(userId);
                foreach (var workspace in ownedWorkspaces)
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, $"Workspace_{workspace.Id}");
                }
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }

        // İstemciden (Frontend) belirli bir alana katılma isteği geldiğinde kullanılabilir
        public async Task JoinWorkspaceGroup(int workspaceId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId != null)
            {
                // Sadece yetkili ise katılmasına izin ver
                var members = await _workspaceRepository.GetMembersAsync(workspaceId);
                var workspace = await _workspaceRepository.GetByIdAsync(workspaceId);
                
                if ((workspace != null && workspace.OwnerId == userId) || members.Any(m => m.UserId == userId))
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, $"Workspace_{workspaceId}");
                }
            }
        }
        
        public async Task LeaveWorkspaceGroup(int workspaceId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Workspace_{workspaceId}");
        }
    }
}
