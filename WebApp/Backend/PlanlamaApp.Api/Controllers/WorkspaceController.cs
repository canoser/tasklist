using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class WorkspaceController : ControllerBase
    {
        private readonly IWorkspaceRepository _workspaceRepository;
        private readonly ITaskAssignmentRepository _taskAssignmentRepository;

        public WorkspaceController(
            IWorkspaceRepository workspaceRepository,
            ITaskAssignmentRepository taskAssignmentRepository)
        {
            _workspaceRepository = workspaceRepository;
            _taskAssignmentRepository = taskAssignmentRepository;
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

            workspace.OwnerId = currentUserId; // IDOR Protection: Ignore provided OwnerId
            workspace.CreatedAt = DateTime.UtcNow;
            workspace.UpdatedAt = DateTime.UtcNow;

            var id = await _workspaceRepository.CreateAsync(workspace);
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

            return Ok(members);
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
            if (members.Any(m => m.UserId == currentUserId))
                return BadRequest("Bu gruba zaten üyesiniz.");

            var role = string.IsNullOrEmpty(request.LinkedUserId) ? "Member" : "Observer";

            var newMember = new WorkspaceMember
            {
                WorkspaceId = workspace.Id,
                UserId = currentUserId,
                DisplayName = request.DisplayName,
                Role = role,
                ObserverLinkedUserId = request.LinkedUserId
            };

            await _workspaceRepository.AddMemberAsync(newMember);
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

            await _workspaceRepository.AddMemberAsync(member);
            return Ok(member);
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

            var tasks = await _taskAssignmentRepository.GetByWorkspaceIdAsync(workspaceId);
            return Ok(tasks);
        }
    }
}
