using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Api.Controllers
{
    /// <summary>
    /// Kategori (Ders / Alt Konu) yönetimi uçları.
    /// Tüm uçlar [Authorize] ile JWT doğrulaması gerektirir.
    /// Veri değiştiren uçlar (POST/PUT) [ServiceFilter(IdempotencyFilter)] ile korunur.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryRepository _categoryRepository;

        public CategoriesController(ICategoryRepository categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        // ── GET ──────────────────────────────────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var all = await _categoryRepository.GetAllAsync();
            return Ok(all);
        }

        /// <summary>Tüm kök (ders) kategorilerini listeler (ParentId = null).</summary>
        [HttpGet("roots")]
        public async Task<IActionResult> GetRoots()
        {
            var roots = await _categoryRepository.GetRootCategoriesAsync();
            return Ok(roots);
        }

        /// <summary>Belirli bir kategorinin alt konularını listeler.</summary>
        [HttpGet("{parentId:int}/children")]
        public async Task<IActionResult> GetChildren(int parentId)
        {
            var children = await _categoryRepository.GetChildrenAsync(parentId);
            return Ok(children);
        }

        /// <summary>Tek bir kategoriyi Id ile getirir.</summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category is null)
                return NotFound($"Id={id} olan kategori bulunamadı.");
            return Ok(category);
        }

        // ── POST / PUT ───────────────────────────────────────────────────────────

        /// <summary>Yeni kategori (ders veya alt konu) oluşturur. Idempotency-Key header zorunludur.</summary>
        [HttpPost]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Create([FromBody] Category category)
        {
            try 
            {
                category.CreatedAt = DateTime.UtcNow;
                category.UpdatedAt = DateTime.UtcNow;
                var newId = await _categoryRepository.CreateAsync(category);
                return CreatedAtAction(nameof(GetById), new { id = newId }, new { Id = newId });
            }
            catch (Exception ex)
            {
                var errorMsg = $"[Category Create Error - {DateTime.UtcNow}]\n{ex}\n----------------------------------\n";
                System.IO.File.AppendAllText("CATEGORY_ERROR_LOG.txt", errorMsg);
                return StatusCode(500, new { Message = "Kategori eklenirken sunucu hatası oluştu.", ErrorDetails = ex.Message });
            }
        }

        /// <summary>Mevcut kategoriyi günceller. Idempotency-Key header zorunludur.</summary>
        [HttpPut("{id:int}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Update(int id, [FromBody] Category category)
        {
            category.Id = id;
            category.UpdatedAt = DateTime.UtcNow;
            var success = await _categoryRepository.UpdateAsync(category);
            if (!success)
                return NotFound($"Id={id} olan kategori bulunamadı veya güncellenemedi.");
            return NoContent();
        }

        /// <summary>
        /// Onboarding sihirbazı: Seçilen eğitim şablonunu kullanıcı profiline klonlar.
        /// </summary>
        [HttpPost("clone-template")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> CloneTemplate([FromBody] CloneTemplateRequest request)
        {
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == null) return Unauthorized();

            if (request.TemplateCategories is null || !request.TemplateCategories.Any())
                return BadRequest("Klonlanacak şablon kategori listesi boş olamaz.");

            await _categoryRepository.CloneTemplateAsync(request.TemplateCategories);
            return Ok(new { Message = "Eğitim şablonu başarıyla profilinize kopyalandı." });
        }

        // ── DELETE ───────────────────────────────────────────────────────────────

        /// <summary>Kategoriyi siler. Alt kategorisi olan kayıtları silmeden önce kontrol edin.</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _categoryRepository.DeleteAsync(id);
            if (!success)
                return NotFound($"Id={id} olan kategori bulunamadı.");
            return NoContent();
        }
    }

    // ── Request DTO (Ayrı dosyaya taşınabilir, şimdilik burada) ─────────────────
    public record CloneTemplateRequest(IEnumerable<Category> TemplateCategories);
}
