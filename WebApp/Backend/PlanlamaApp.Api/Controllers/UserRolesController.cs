using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Api.Controllers
{
    /// <summary>
    /// Kullanıcı rolleri (UserRole) yönetim uçları.
    /// Soft-delete, hard-delete ve restore işlemlerini destekler.
    ///
    /// Karar Modalı akışı (frontend tarafından yönetilir):
    ///   1. GET  .../roles/{roleId}/task-count  → Görev sayısını öğren
    ///   2a. count == 0 → DELETE .../roles/{roleId}?mode=soft  (doğrudan soft-delete)
    ///   2b. count  > 0 → Kullanıcıdan karar al:
    ///         "Görevleri Tut (Rolsüz Bırak)" → DELETE .../roles/{roleId}?mode=soft
    ///         "Görevleri de Tamamen Sil"      → DELETE .../roles/{roleId}?mode=hard
    ///
    /// "Diğer" kategorisi: ASLA oluşturulmaz. Rolsüz bırakma = RoleId → NULL.
    /// </summary>
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UserRolesController : ControllerBase
    {
        private readonly IUserRoleRepository _roleRepository;
        private readonly ITaskAssignmentRepository _assignmentRepository;

        public UserRolesController(
            IUserRoleRepository roleRepository,
            ITaskAssignmentRepository assignmentRepository)
        {
            _roleRepository = roleRepository;
            _assignmentRepository = assignmentRepository;
        }

        // ── GET ──────────────────────────────────────────────────────────────────

        /// <summary>Kullanıcının aktif rollerini listeler.</summary>
        [HttpGet("{userId}/roles")]
        public async Task<IActionResult> GetActiveRoles(string userId)
        {
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == null) return Unauthorized();
            if (currentUserId != userId) return Forbid();

            var roles = await _roleRepository.GetActiveTagsAsync(currentUserId);
            return Ok(roles);
        }

        /// <summary>
        /// Belirtilen role bağlı görev sayısını döner.
        /// Frontend, Karar Modalı'nı açmadan önce bu değeri kontrol eder.
        /// </summary>
        [HttpGet("roles/{roleId:int}/task-count")]
        public async Task<IActionResult> GetTaskCount(int roleId)
        {
            var count = await _roleRepository.GetTaskCountByRoleIdAsync(roleId);
            return Ok(new { Count = count });
        }

        // ── POST ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// Yeni rol ekler veya daha önce silinmiş aynı isimli rolü geri getirir (AddOrRestore).
        /// Restore durumunda eski Id korunur — TaskAssignment.RoleId referansları geçerli kalır.
        /// </summary>
        [HttpPost("{userId}/roles")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> AddRole(string userId, [FromBody] AddRoleRequest request)
        {
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == null) return Unauthorized();
            if (currentUserId != userId) return Forbid();

            if (string.IsNullOrWhiteSpace(request.RoleName))
                return BadRequest("RoleName boş olamaz.");

            var role = new UserRole
            {
                UserId = currentUserId,
                RoleName = request.RoleName.Trim()
            };

            var id = await _roleRepository.AddOrRestoreTagAsync(role);
            return CreatedAtAction(nameof(GetActiveRoles), new { userId = currentUserId }, new { Id = id, role.RoleName });
        }

        // ── DELETE ───────────────────────────────────────────────────────────────

        /// <summary>
        /// Rolü siler.
        /// mode=soft → Soft-delete + (görev bağlantısı varsa) RoleId'leri NULL'a çeker.
        ///             Frontend, önce task-count'u kontrol edip kullanıcıdan onay almalıdır.
        /// mode=hard → Önce RoleId'leri NULL'a çeker, sonra kaydı fiziksel olarak siler.
        /// </summary>
        [HttpDelete("roles/{roleId:int}")]
        public async Task<IActionResult> DeleteRole(int roleId, [FromQuery] string mode = "soft")
        {
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == null) return Unauthorized();

            var role = await _roleRepository.GetByIdAsync(roleId);
            if (role == null) return NotFound();
            if (role.UserId != currentUserId) return Forbid();

            // Her iki modda da önce atama bağlantılarını kopar
            await _assignmentRepository.RemoveRoleFromAssignmentsAsync(roleId);

            bool success;
            if (mode == "hard")
            {
                success = await _roleRepository.HardDeleteTagAsync(roleId);
            }
            else
            {
                // Varsayılan: soft-delete
                success = await _roleRepository.SoftDeleteTagAsync(roleId);
            }

            if (!success)
                return NotFound($"Id={roleId} olan rol bulunamadı veya zaten silinmiş.");

            return NoContent();
        }

        // ── PATCH ────────────────────────────────────────────────────────────────

        /// <summary>
        /// Soft-deleted rolü geri getirir.
        /// Not: AddOrRestore aynı sonucu verir; bu endpoint explicit restore için ayrılmıştır.
        /// </summary>
        [HttpPatch("roles/{roleId:int}/restore")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> RestoreRole(int roleId)
        {
            var success = await _roleRepository.RestoreTagAsync(roleId);
            if (!success)
                return NotFound($"Id={roleId} olan rol bulunamadı.");
            return NoContent();
        }
    }

    /// <summary>POST /api/users/{userId}/roles için istek gövdesi.</summary>
    public record AddRoleRequest(string RoleName);
}
