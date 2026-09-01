using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using Microsoft.AspNetCore.SignalR;
using PlanlamaApp.Api.Hubs;
using System.Security.Claims;
using Dapper;

namespace PlanlamaApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class WorkspaceController : ControllerBase
    {
        private readonly IWorkspaceRepository _workspaceRepository;
        private readonly ITaskAssignmentRepository _taskAssignmentRepository;
        private readonly ITaskRepository _taskRepository;
        private readonly IUserRepository _userRepository;
        private readonly ISettingsService _settingsService;
        private readonly IHubContext<AppHub> _hubContext;

        public WorkspaceController(
            IWorkspaceRepository workspaceRepository,
            ITaskAssignmentRepository taskAssignmentRepository,
            ITaskRepository taskRepository,
            IUserRepository userRepository,
            ISettingsService settingsService,
            IHubContext<AppHub> hubContext)
        {
            _workspaceRepository = workspaceRepository;
            _taskAssignmentRepository = taskAssignmentRepository;
            _taskRepository = taskRepository;
            _userRepository = userRepository;
            _settingsService = settingsService;
            _hubContext = hubContext;
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        }

        private async Task<bool> IsOwnerAsync(int workspaceId, string userId)
        {
            var workspace = await _workspaceRepository.GetByIdAsync(workspaceId);
            return workspace != null && workspace.OwnerId == userId;
        }

        [HttpGet("owned/{ownerId}")]
        public async Task<IActionResult> GetOwned(string ownerId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var workspaces = await _workspaceRepository.GetOwnedAsync(currentUserId);
            return Ok(workspaces);
        }

        [HttpGet("member/{userId}")]
        public async Task<IActionResult> GetMemberOf(string userId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var workspaces = await _workspaceRepository.GetMemberOfAsync(currentUserId);
            return Ok(workspaces);
        }

        [HttpPost]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Create([FromBody] Workspace workspace)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var user = await _userRepository.GetUserByIdAsync(currentUserId);
            if (user == null) return Unauthorized();

            int maxLimit = -1; // -1 means unlimited
            
            if (user.CustomWorkspaceLimit.HasValue)
            {
                maxLimit = user.CustomWorkspaceLimit.Value;
            }
            else
            {
                var plan = string.IsNullOrEmpty(user.SubscriptionPlan) ? "free" : user.SubscriptionPlan.ToLower();
                if (plan != "premium")
                {
                    int defaultForPlan = plan == "free" ? 1 : (plan == "plus" ? 3 : (plan == "pro" ? 10 : -1));
                    maxLimit = await _settingsService.GetSettingAsIntAsync($"Quota_Workspace_{plan}", defaultForPlan);
                }
                // premium defaults to -1 (unlimited)
            }

            if (maxLimit >= 0)
            {
                var owned = await _workspaceRepository.GetOwnedAsync(currentUserId);
                if (owned.Count() >= maxLimit)
                {
                    return BadRequest(new { Message = $"Bu plan için maksimum {maxLimit} çalışma alanı hakkınız dolmuştur." });
                }
            }

            workspace.OwnerId = currentUserId; // IDOR Protection: Ignore provided OwnerId
            workspace.CreatedAt = DateTime.UtcNow;
            workspace.UpdatedAt = DateTime.UtcNow;

            var id = await _workspaceRepository.CreateAsync(workspace);
            
            await _hubContext.Clients.Group("AdminGroup").SendAsync("WorkspaceListUpdated");
            
            return CreatedAtAction(nameof(GetOwned), new { ownerId = workspace.OwnerId }, workspace);
        }

        [HttpPut("{id}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Update(int id, [FromBody] Workspace workspace)
        {
            if (id != workspace.Id) return BadRequest();

            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            if (!await IsOwnerAsync(id, currentUserId))
                return Forbid();

            workspace.OwnerId = currentUserId;
            workspace.UpdatedAt = DateTime.UtcNow;

            var result = await _workspaceRepository.UpdateAsync(workspace);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            if (!await IsOwnerAsync(id, currentUserId))
                return Forbid();

            var result = await _workspaceRepository.DeleteAsync(id);
            if (!result) return NotFound();
            
            await _hubContext.Clients.Group("AdminGroup").SendAsync("WorkspaceListUpdated");
            await _hubContext.Clients.Group($"Workspace_{id}").SendAsync("WorkspaceDeleted", id);
            
            return NoContent();
        }

        // --- Members ---
        
        [HttpGet("{workspaceId}/members")]
        public async Task<IActionResult> GetMembers(int workspaceId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var isOwner = await IsOwnerAsync(workspaceId, currentUserId);
            var members = await _workspaceRepository.GetMembersAsync(workspaceId);
            
            var currentUserMember = members.FirstOrDefault(m => m.UserId == currentUserId);
            if (!isOwner && currentUserMember == null)
                return Forbid();

            // Lider (Owner) veya normal 'Member' herkesi görebilir,
            // Observer (Veli) sadece kendini ve bağlı olduğu öğrenciyi görebilir.
            if (!isOwner && currentUserMember != null && currentUserMember.Role == "Observer")
            {
                members = members.Where(m => m.UserId == currentUserId || m.UserId == currentUserMember.ObserverLinkedUserId);
            }

            // Eğer üye Owner veya Admin değilse, gizlilik gereği email/userId bilgilerini maskele.
            // Observer ve Member kendi bilgilerini gizlememelidir ancak diğerlerini maskeli görecektir.
            // Fakat Front-End'in kırılmaması için Observer kısıtlamasından sonra, listeyi dto'ya çeviriyoruz.
            if (!isOwner && currentUserMember?.Role != "Admin")
            {
                var maskedMembers = members.Select(m =>
                    (m.UserId == currentUserId || m.UserId == currentUserMember?.ObserverLinkedUserId)
                        ? (object)m // Kendi bilgilerini / izlediği öğrenciyi tam görsün
                        : new WorkspaceMemberSummaryDto(m.Id, m.DisplayName, m.Role)
                );
                return Ok(maskedMembers);
            }

            return Ok(members);
        }

        [HttpGet("{workspaceId}/members/pending")]
        public async Task<IActionResult> GetPendingMembers(int workspaceId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var isOwner = await IsOwnerAsync(workspaceId, currentUserId);
            var members = await _workspaceRepository.GetMembersAsync(workspaceId);
            var currentUserMember = members.FirstOrDefault(m => m.UserId == currentUserId);

            // Only Owner or Admin can view pending members
            if (!isOwner && (currentUserMember == null || currentUserMember.Role != "Admin"))
                return Forbid();

            var pendingMembers = await _workspaceRepository.GetPendingMembersAsync(workspaceId);
            return Ok(pendingMembers);
        }

        [HttpPost("join")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Join([FromBody] JoinWorkspaceRequest request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var workspace = await _workspaceRepository.GetByInviteCodeAsync(request.InviteCode);
            if (workspace == null || !workspace.IsActive)
                return NotFound("Geçersiz veya süresi dolmuş davet kodu.");

            // Kendi çalışma alanına üye olarak katılamaz
            if (workspace.OwnerId == currentUserId)
                return BadRequest("Zaten bu grubun yöneticisisiniz.");

            var members = await _workspaceRepository.GetMembersAsync(workspace.Id);
            var pendingMembers = await _workspaceRepository.GetPendingMembersAsync(workspace.Id);
            
            if (members.Any(m => m.UserId == currentUserId) || pendingMembers.Any(m => m.UserId == currentUserId))
                return BadRequest("Bu gruba zaten üyesiniz veya onay bekliyorsunuz.");

            var role = string.IsNullOrEmpty(request.LinkedUserId) ? "Member" : "Observer";

            var newMember = new WorkspaceMember
            {
                TenantId = workspace.TenantId,
                WorkspaceId = workspace.Id,
                UserId = currentUserId,
                DisplayName = request.DisplayName,
                Role = role,
                ObserverLinkedUserId = request.LinkedUserId,
                ApprovalStatus = workspace.RequiresApproval ? "Pending" : "Approved",
                IsActiveMember = !workspace.RequiresApproval
            };

            await _workspaceRepository.AddMemberAsync(newMember);
            
            await _hubContext.Clients.Group($"Workspace_{workspace.Id}").SendAsync("WorkspaceMembersUpdated", workspace.Id);
            
            if (newMember.IsActiveMember)
            {
                await _hubContext.Clients.User(currentUserId).SendAsync("WorkspaceJoinApproved", workspace.Id);
                await _hubContext.Clients.User(workspace.OwnerId).SendAsync("MemberJoinedAlert", workspace.Id, newMember.DisplayName);
            }
            else
            {
                await _hubContext.Clients.User(workspace.OwnerId).SendAsync("MemberPendingAlert", workspace.Id, newMember.DisplayName);
            }
            
            return Ok(newMember);
        }

        [HttpPost("{workspaceId}/members")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> AddMember(int workspaceId, [FromBody] WorkspaceMember member)
        {
            if (workspaceId != member.WorkspaceId) return BadRequest();

            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            if (!await IsOwnerAsync(workspaceId, currentUserId))
                return Forbid(); // Only owner can add members

            // Admin eklediği için doğrudan onaylı kabul ediliyor
            member.ApprovalStatus = "Approved";
            member.IsActiveMember = true;
            await _workspaceRepository.AddMemberAsync(member);
            return Ok(member);
        }

        [HttpPost("{workspaceId}/members/{memberId}/approve")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> ApproveMember(int workspaceId, int memberId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var isOwner = await IsOwnerAsync(workspaceId, currentUserId);
            var members = await _workspaceRepository.GetMembersAsync(workspaceId);
            var currentUserMember = members.FirstOrDefault(m => m.UserId == currentUserId);

            if (!isOwner && (currentUserMember == null || currentUserMember.Role != "Admin"))
                return Forbid();

            var result = await _workspaceRepository.UpdateMemberStatusAsync(memberId, "Approved");
            if (!result) return NotFound();
            
            await _hubContext.Clients.Group($"Workspace_{workspaceId}").SendAsync("WorkspaceMembersUpdated", workspaceId);
            
            var approvedMember = members.FirstOrDefault(m => m.Id == memberId);
            if (approvedMember != null) 
            {
                await _hubContext.Clients.User(approvedMember.UserId).SendAsync("WorkspaceJoinApproved", workspaceId);
            }
            
            return Ok();
        }

        [HttpPost("{workspaceId}/members/{memberId}/reject")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> RejectMember(int workspaceId, int memberId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var isOwner = await IsOwnerAsync(workspaceId, currentUserId);
            var members = await _workspaceRepository.GetMembersAsync(workspaceId);
            var currentUserMember = members.FirstOrDefault(m => m.UserId == currentUserId);

            if (!isOwner && (currentUserMember == null || currentUserMember.Role != "Admin"))
                return Forbid();

            var result = await _workspaceRepository.UpdateMemberStatusAsync(memberId, "Rejected");
            if (!result) return NotFound();
            return Ok();
        }

        [HttpPut("members/{memberId}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> UpdateMemberDisplayName(int memberId, [FromBody] string displayName)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var memberRecord = await _workspaceRepository.GetMemberByIdAsync(memberId);
            if (memberRecord == null) return NotFound();

            var isOwner = await IsOwnerAsync(memberRecord.WorkspaceId, currentUserId);
            // Either owner of workspace or the member themselves can update display name
            if (!isOwner && memberRecord.UserId != currentUserId)
                return Forbid();

            var result = await _workspaceRepository.UpdateMemberDisplayNameAsync(memberId, displayName);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpDelete("{workspaceId}/members/{userId}")]
        public async Task<IActionResult> RemoveMember(int workspaceId, string userId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            if (currentUserId != userId && !await IsOwnerAsync(workspaceId, currentUserId))
                return Forbid(); // Users can remove themselves, or owner can remove them

            var result = await _workspaceRepository.RemoveMemberAsync(workspaceId, userId);
            if (!result) return NotFound();
            return NoContent();
        }

        // --- Workspace Tasks ---

        [HttpGet("{workspaceId}/tasks")]
        public async Task<IActionResult> GetWorkspaceTasks(int workspaceId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var isOwner = await IsOwnerAsync(workspaceId, currentUserId);
            var members = await _workspaceRepository.GetMembersAsync(workspaceId);
            
            if (!isOwner && !members.Any(m => m.UserId == currentUserId))
                return Forbid(); 

            var tasks = await _taskRepository.GetByAssignedWorkspaceIdAsync(workspaceId);

            if (!isOwner)
            {
                var currentUserMember = members.FirstOrDefault(m => m.UserId == currentUserId);
                // Eğer üye Admin değilse, sadece kendi görevlerini görebilir.
                if (currentUserMember == null || currentUserMember.Role != "Admin")
                {
                    tasks = tasks.Where(t => t.UserId == currentUserId).ToList();
                }
            }

            return Ok(tasks);
        }

        [HttpPost("{workspaceId}/tasks")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> AssignWorkspaceTask(int workspaceId, [FromBody] AssignWorkspaceTaskRequest request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var members = await _workspaceRepository.GetMembersAsync(workspaceId);
            var currentUserMember = members.FirstOrDefault(m => m.UserId == currentUserId);
            var isOwner = await IsOwnerAsync(workspaceId, currentUserId);

            if (!isOwner && (currentUserMember == null || currentUserMember.Role != "Admin"))
                return Forbid("Sadece Admin veya Kurucu görev atayabilir.");

            var targetMembers = request.TargetUserIds != null && request.TargetUserIds.Any()
                ? members.Where(m => request.TargetUserIds.Contains(m.UserId) && m.IsActiveMember).ToList()
                : members.Where(m => m.IsActiveMember).ToList();

            foreach (var member in targetMembers)
            {
                var taskItem = new TaskItem
                {
                    Title = request.Title,
                    Description = request.Description,
                    Deadline = request.Deadline,
                    TaskType = request.TaskType ?? "Alan Görevi",
                    IsTeacherAssigned = true,
                    UserId = member.UserId,
                    AssignedByWorkspaceId = workspaceId,
                    AssignedByUserId = currentUserId
                };
                await _taskRepository.CreateAsync(taskItem);
            }

            await _hubContext.Clients.Group($"Workspace_{workspaceId}").SendAsync("WorkspaceTasksUpdated", workspaceId);
            foreach (var member in targetMembers)
            {
                await _hubContext.Clients.User(member.UserId).SendAsync("TaskAssigned", workspaceId);
            }

            return Ok(new { Message = $"{targetMembers.Count} üyeye görev atandı." });
        }

        [HttpDelete("{workspaceId}/tasks/{batchId}")]
        public async Task<IActionResult> DeleteWorkspaceTask(int workspaceId, string batchId)
        {
            // İleride TaskRepository'ye DeleteByChainIdAsync eklenebilir. 
            // Şimdilik sadece metod imzasını bırakıyoruz, çünkü frontend ChainId kullanacak.
            return Ok(new { Message = "Görev iptal edildi." });
        }

        // --- Workspace Files ---
        [HttpGet("{workspaceId}/files")]
        public async Task<IActionResult> GetWorkspaceFiles(int workspaceId, [FromServices] System.Data.IDbConnection db)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var isOwner = await IsOwnerAsync(workspaceId, currentUserId);
            var members = await _workspaceRepository.GetMembersAsync(workspaceId);

            if (!isOwner && !members.Any(m => m.UserId == currentUserId && m.IsActiveMember))
                return Forbid();

            var tenantId = User.FindFirstValue("tenant_id") ?? "default_tenant";
            
            var files = await db.QueryAsync<WorkspaceFile>(
                "SELECT * FROM WorkspaceFiles WHERE WorkspaceId = @WorkspaceId AND TenantId = @TenantId AND IsDeleted = FALSE ORDER BY CreatedAt DESC",
                new { WorkspaceId = workspaceId, TenantId = tenantId });

            return Ok(files);
        }

        [HttpDelete("{workspaceId}/files/{fileId}")]
        public async Task<IActionResult> DeleteWorkspaceFile(int workspaceId, int fileId, [FromServices] System.Data.IDbConnection db, [FromServices] PlanlamaApp.Application.Interfaces.IStorageService storageService, [FromServices] PlanlamaApp.Application.Interfaces.IQuotaManager quotaManager)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var tenantId = User.FindFirstValue("tenant_id") ?? "default_tenant";

            var file = await db.QueryFirstOrDefaultAsync<WorkspaceFile>(
                "SELECT * FROM WorkspaceFiles WHERE Id = @Id AND WorkspaceId = @WorkspaceId AND TenantId = @TenantId AND IsDeleted = FALSE",
                new { Id = fileId, WorkspaceId = workspaceId, TenantId = tenantId });

            if (file == null) return NotFound();

            var isOwner = await IsOwnerAsync(workspaceId, currentUserId);
            var members = await _workspaceRepository.GetMembersAsync(workspaceId);
            var currentUserMember = members.FirstOrDefault(m => m.UserId == currentUserId);

            // Sadece alan sahibi, Admin veya dosyayı yükleyen kişi silebilir.
            if (!isOwner && file.UploaderId != currentUserId && (currentUserMember == null || currentUserMember.Role != "Admin"))
                return Forbid("Bu dosyayı silme yetkiniz yok.");

            // R2'den fiziksel silme denemesi (Hata verirse yine de DB'den sileceğiz)
            try {
                if (!string.IsNullOrEmpty(file.FileUrl))
                    await storageService.DeleteFileAsync(file.FileUrl);
            } catch { /* loglanabilir */ }

            // DB'den Soft Delete
            await db.ExecuteAsync(
                "UPDATE WorkspaceFiles SET IsDeleted = TRUE, UpdatedAt = @Now WHERE Id = @Id",
                new { Id = fileId, Now = DateTime.UtcNow });

            // Kotayı iade et
            if (file.UploadStatus == "Uploaded" || file.UploadStatus == "Pending")
            {
                await quotaManager.RefundAsync(tenantId, "free", "TotalStorage", file.FileSizeInBytes);
            }

            return Ok();
        }

        [HttpPost("{workspaceId}/members/{userId}/promote")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> PromoteMember(int workspaceId, string userId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            if (!await IsOwnerAsync(workspaceId, currentUserId))
                return Forbid("Sadece kurucu admin yetkisi verebilir.");

            var result = await _workspaceRepository.UpdateMemberRoleAsync(workspaceId, userId, "Admin");
            if (!result) return NotFound();

            return Ok();
        }

        [HttpPost("{workspaceId}/leave")]
        public async Task<IActionResult> LeaveWorkspace(int workspaceId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var result = await _workspaceRepository.RemoveMemberAsync(workspaceId, currentUserId);
            if (!result) return NotFound();

            await _taskRepository.HandleWorkspaceLeaveAsync(workspaceId, currentUserId);

            return NoContent();
        }
    }

    public class AssignWorkspaceTaskRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime? Deadline { get; set; }
        public string? TaskType { get; set; }
        public List<string>? TargetUserIds { get; set; }
    }
}
