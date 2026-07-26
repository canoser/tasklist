using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Api.Controllers
{
    /// <summary>
    /// Görev (TaskItem) yönetimi uçları.
    /// Tüm uçlar [Authorize] ile JWT doğrulaması gerektirir.
    /// Veri değiştiren uçlar (POST/PUT) [ServiceFilter(IdempotencyFilter)] ile mükerrer işleme karşı korunur.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TasksController : ControllerBase
    {
        private readonly ITaskRepository _taskRepository;

        public TasksController(ITaskRepository taskRepository)
        {
            _taskRepository = taskRepository;
        }

        // ── GET ──────────────────────────────────────────────────────────────────

        /// <summary>Belirli bir kullanıcının tüm görevlerini listeler.</summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUser(string userId)
        {
            var tasks = await _taskRepository.GetByUserIdAsync(userId);
            return Ok(tasks);
        }

        /// <summary>Belirli bir kategoriye ait görevleri listeler.</summary>
        [HttpGet("category/{categoryId:int}")]
        public async Task<IActionResult> GetByCategory(int categoryId)
        {
            var tasks = await _taskRepository.GetByCategoryIdAsync(categoryId);
            return Ok(tasks);
        }

        /// <summary>
        /// Zaman Çizelgesi (Timeline) için belirtilen tarih aralığındaki görevleri getirir.
        /// </summary>
        [HttpGet("user/{userId}/timeline")]
        public async Task<IActionResult> GetTimeline(string userId, [FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            if (start >= end)
                return BadRequest("Başlangıç tarihi bitiş tarihinden önce olmalıdır.");

            var tasks = await _taskRepository.GetByDateRangeAsync(userId, start, end);
            return Ok(tasks);
        }

        /// <summary>Tek bir görevi Id ile getirir.</summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var task = await _taskRepository.GetByIdAsync(id);
            if (task is null)
                return NotFound($"Id={id} olan görev bulunamadı.");
            return Ok(task);
        }

        // ── POST / PUT / PATCH ───────────────────────────────────────────────────

        /// <summary>Yeni görev oluşturur. Idempotency-Key header zorunludur.</summary>
        [HttpPost]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Create([FromBody] TaskItem task)
        {
            task.CreatedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;
            var newId = await _taskRepository.CreateAsync(task);
            return CreatedAtAction(nameof(GetById), new { id = newId }, new { Id = newId });
        }

        /// <summary>Mevcut görevi günceller. Idempotency-Key header zorunludur.</summary>
        [HttpPut("{id:int}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Update(int id, [FromBody] TaskItem task)
        {
            task.Id = id;
            task.UpdatedAt = DateTime.UtcNow;
            var success = await _taskRepository.UpdateAsync(task);
            if (!success)
                return NotFound($"Id={id} olan görev bulunamadı veya güncellenemedi.");
            return NoContent();
        }

        /// <summary>
        /// Görevi tamamlandı olarak işaretler ve Detay Kartı'nda skor girişine hazır hale getirir.
        /// </summary>
        [HttpPatch("{id:int}/complete")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> MarkComplete(int id)
        {
            var success = await _taskRepository.MarkAsCompletedAsync(id, DateTime.UtcNow);
            if (!success)
                return NotFound($"Id={id} olan görev bulunamadı.");
            return NoContent();
        }

        // ── DELETE ───────────────────────────────────────────────────────────────

        /// <summary>Görevi siler.</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _taskRepository.DeleteAsync(id);
            if (!success)
                return NotFound($"Id={id} olan görev bulunamadı.");
            return NoContent();
        }
    }
}
