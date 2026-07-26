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

        public PerformanceController(IPerformanceRepository performanceRepository)
        {
            _performanceRepository = performanceRepository;
        }

        // ── GET ──────────────────────────────────────────────────────────────────

        /// <summary>Belirli bir kullanıcının tüm performans kayıtlarını listeler.</summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUser(string userId)
        {
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
            return Ok(record);
        }

        /// <summary>Belirli bir ders/konuya ait tüm performans kayıtlarını getirir (konu analizi).</summary>
        [HttpGet("category/{categoryId:int}")]
        public async Task<IActionResult> GetByCategory(int categoryId)
        {
            var records = await _performanceRepository.GetByCategoryIdAsync(categoryId);
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
            record.Id = id;
            record.UpdatedAt = DateTime.UtcNow;
            var success = await _performanceRepository.UpdateAsync(record);
            if (!success)
                return NotFound($"Id={id} olan performans kaydı bulunamadı veya güncellenemedi.");
            return NoContent();
        }

        // ── DELETE ───────────────────────────────────────────────────────────────

        /// <summary>Performans kaydını siler.</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _performanceRepository.DeleteAsync(id);
            if (!success)
                return NotFound($"Id={id} olan performans kaydı bulunamadı.");
            return NoContent();
        }
    }
}
