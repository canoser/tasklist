using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Api.Controllers
{
    /// <summary>
    /// Performans kaydı yönetimi uçları.
    /// Öğrencinin görev sonrası girdiği Doğru/Yanlış/Boş/Net değerlerini yönetir.
    /// Tüm uçlar [Authorize] ile JWT doğrulaması gerektirir.
    /// Veri değiştiren uçlar (POST/PUT) [ServiceFilter(IdempotencyFilter)] ile korunur.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PerformanceController : ControllerBase
    {
        private readonly IPerformanceRepository _performanceRepository;
        private readonly IWorkspaceRepository _workspaceRepository;

        public PerformanceController(IPerformanceRepository performanceRepository, IWorkspaceRepository workspaceRepository)
        {
            _performanceRepository = performanceRepository;
            _workspaceRepository = workspaceRepository;
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        }

        private async Task<bool> HasAccessToUserAsync(string requestedUserId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return false;
            if (currentUserId == requestedUserId) return true;

            // Check if current user is an observer of the requested user
            return await _workspaceRepository.IsObserverAsync(currentUserId, requestedUserId);
        }

        // ── GET ──────────────────────────────────────────────────────────────────

        /// <summary>Belirli bir kullanıcının tüm performans kayıtlarını listeler.</summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUser(string userId)
        {
            if (!await HasAccessToUserAsync(userId))
                return Forbid();

            var records = await _performanceRepository.GetByUserIdAsync(userId);
            return Ok(records);
        }

        /// <summary>
        /// Belirli bir göreve ait performans kaydını getirir.
        /// Detay Kartı'nda skor gösterimi için kullanılır.
        /// </summary>
        [HttpGet("task/{taskItemId:int}")]
        public async Task<IActionResult> GetByTask(int taskItemId)
        {
            var record = await _performanceRepository.GetByTaskItemIdAsync(taskItemId);
            if (record is null)
                return NotFound($"TaskItemId={taskItemId} için performans kaydı bulunamadı.");
            
            if (!await HasAccessToUserAsync(record.UserId))
                return Forbid();

            return Ok(record);
        }

        /// <summary>Belirli bir ders/konuya ait tüm performans kayıtlarını getirir (konu analizi).</summary>
        [HttpGet("user/{userId}/category/{categoryId:int}")]
        public async Task<IActionResult> GetByCategory(string userId, int categoryId)
        {
            if (!await HasAccessToUserAsync(userId))
                return Forbid();

            var records = await _performanceRepository.GetByCategoryIdAsync(categoryId);
            records = records.Where(r => r.UserId == userId).ToList();

            return Ok(records);
        }

        /// <summary>
        /// Haftalık / Aylık rapor için belirtilen tarih aralığındaki performans kayıtlarını getirir.
        /// </summary>
        [HttpGet("user/{userId}/report")]
        public async Task<IActionResult> GetReport(string userId, [FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            if (start >= end)
                return BadRequest("Başlangıç tarihi bitiş tarihinden önce olmalıdır.");

            if (!await HasAccessToUserAsync(userId))
                return Forbid();

            var records = await _performanceRepository.GetByDateRangeAsync(userId, start, end);
            return Ok(records);
        }

        /// <summary>Tek bir performans kaydını Id ile getirir.</summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var record = await _performanceRepository.GetByIdAsync(id);
            if (record is null)
                return NotFound($"Id={id} olan performans kaydı bulunamadı.");

            if (!await HasAccessToUserAsync(record.UserId))
                return Forbid();

            return Ok(record);
        }

        // ── POST / PUT ───────────────────────────────────────────────────────────

        /// <summary>
        /// Görev tamamlandıktan sonra Doğru/Yanlış/Boş ve Net skoru kaydeder.
        /// Idempotency-Key header zorunludur.
        /// </summary>
        [HttpPost]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Create([FromBody] PerformanceRecord record)
        {
            if (string.IsNullOrEmpty(record.UserId))
                record.UserId = GetCurrentUserId() ?? string.Empty;

            if (!await HasAccessToUserAsync(record.UserId))
                return Forbid();

            record.NetScore = record.CorrectCount - (record.WrongCount / 4.0m);
            record.RecordedAt = DateTime.UtcNow;
            record.UpdatedAt = DateTime.UtcNow;
            var newId = await _performanceRepository.CreateAsync(record);
            return CreatedAtAction(nameof(GetById), new { id = newId }, new { Id = newId });
        }

        /// <summary>
        /// Mevcut performans kaydını günceller (örn. öğrenci skoru düzeltmek istedi).
        /// Idempotency-Key header zorunludur.
        /// </summary>
        [HttpPut("{id:int}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Update(int id, [FromBody] PerformanceRecord record)
        {
            var existingRecord = await _performanceRepository.GetByIdAsync(id);
            if (existingRecord == null) return NotFound();

            if (!await HasAccessToUserAsync(existingRecord.UserId))
                return Forbid();

            var currentUserId = GetCurrentUserId();
            if (currentUserId != null && currentUserId != existingRecord.UserId)
            {
                // Gözlemci/Öğretmen sadece geri bildirim yazabilir
                existingRecord.TeacherFeedback = record.TeacherFeedback;
            }
            else
            {
                // Öğrenci kendi verilerini güncelleyebilir
                existingRecord.CorrectCount = record.CorrectCount;
                existingRecord.WrongCount = record.WrongCount;
                existingRecord.EmptyCount = record.EmptyCount;
                existingRecord.NetScore = record.CorrectCount - (record.WrongCount / 4.0m);
                existingRecord.StudyDurationMinutes = record.StudyDurationMinutes;
                existingRecord.ExpectedDurationMinutes = record.ExpectedDurationMinutes;
                existingRecord.Notes = record.Notes;
            }

            existingRecord.UpdatedAt = DateTime.UtcNow;
            var success = await _performanceRepository.UpdateAsync(existingRecord);
            if (!success)
                return NotFound($"Id={id} olan performans kaydı bulunamadı veya güncellenemedi.");
            return NoContent();
        }

        // ── DELETE ───────────────────────────────────────────────────────────────

        /// <summary>Performans kaydını siler.</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existingRecord = await _performanceRepository.GetByIdAsync(id);
            if (existingRecord == null) return NotFound();

            if (!await HasAccessToUserAsync(existingRecord.UserId))
                return Forbid();

            var success = await _performanceRepository.DeleteAsync(id);
            if (!success)
                return NotFound($"Id={id} olan performans kaydı bulunamadı.");
            return NoContent();
        }
    }
}
