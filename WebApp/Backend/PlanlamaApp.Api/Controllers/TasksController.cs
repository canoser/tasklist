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

        private string? GetCurrentUserId()
        {
            return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        }

        // ── GET ──────────────────────────────────────────────────────────────────

        /// <summary>Belirli bir kullanıcının tüm görevlerini listeler. URL'deki userId ezilir.</summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUser(string userId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            // Sadece kendi görevlerini alabilir
            var tasks = await _taskRepository.GetByUserIdAsync(currentUserId);
            return Ok(tasks);
        }

        /// <summary>Belirli bir kategoriye ait görevleri listeler.</summary>
        [HttpGet("category/{categoryId:int}")]
        public async Task<IActionResult> GetByCategory(int categoryId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var tasks = await _taskRepository.GetByCategoryIdAsync(categoryId);
            // Kendi görevleri olmayanları filtrele
            var userTasks = tasks.Where(t => t.UserId == currentUserId).ToList();
            
            return Ok(userTasks);
        }

        /// <summary>
        /// Zaman Çizelgesi (Timeline) için belirtilen tarih aralığındaki görevleri getirir.
        /// </summary>
        [HttpGet("user/{userId}/timeline")]
        public async Task<IActionResult> GetTimeline(string userId, [FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            if (start >= end)
                return BadRequest("Başlangıç tarihi bitiş tarihinden önce olmalıdır.");

            // Sadece kendi timeline'ını görebilir
            var tasks = await _taskRepository.GetByDateRangeAsync(currentUserId, start, end);
            return Ok(tasks);
        }

        /// <summary>Tek bir görevi Id ile getirir.</summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var task = await _taskRepository.GetByIdAsync(id);
            if (task is null)
                return NotFound(); // IDOR protection: Avoid exposing existence if not owned? Actually NotFound is standard.
                
            var currentUserId = GetCurrentUserId();
            if (task.UserId != currentUserId)
                return NotFound(); // Sahiplik kontrolü - IDOR koruması

            return Ok(task);
        }

        // ── POST / PUT / PATCH ───────────────────────────────────────────────────

        /// <summary>Yeni görev oluşturur. Idempotency-Key header zorunludur.</summary>
        [HttpPost]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Create([FromBody] TaskItem task)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            task.UserId = currentUserId; // Her zaman JWT'den alır
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
            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null) return NotFound();

            var currentUserId = GetCurrentUserId();
            if (existingTask.UserId != currentUserId) return NotFound(); // IDOR koruması

            task.Id = id;
            task.UserId = currentUserId; // Kimliği manipüle edememesi için sabitliyoruz
            task.UpdatedAt = DateTime.UtcNow;
            
            var success = await _taskRepository.UpdateAsync(task);
            if (!success)
                return NotFound();
            return NoContent();
        }

        /// <summary>
        /// Görevi tamamlandı olarak işaretler ve Detay Kartı'nda skor girişine hazır hale getirir.
        /// </summary>
        [HttpPatch("{id:int}/complete")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> MarkComplete(int id)
        {
            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null) return NotFound();

            var currentUserId = GetCurrentUserId();
            if (existingTask.UserId != currentUserId) return NotFound(); // IDOR koruması

            var success = await _taskRepository.MarkAsCompletedAsync(id, DateTime.UtcNow);
            if (!success)
                return NotFound();
            return NoContent();
        }

        // ── DELETE ───────────────────────────────────────────────────────────────

        /// <summary>Görevi siler.</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null) return NotFound();

            var currentUserId = GetCurrentUserId();
            if (existingTask.UserId != currentUserId) return NotFound(); // IDOR koruması

            var success = await _taskRepository.DeleteAsync(id);
            if (!success)
                return NotFound();
            return NoContent();
        }
    }
}
