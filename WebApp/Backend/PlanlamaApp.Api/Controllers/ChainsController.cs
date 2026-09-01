using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Security.Claims;
using System;
using System.Threading.Tasks;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChainsController : ControllerBase
    {
        private readonly IChainTemplateRepository _chainTemplateRepository;

        public ChainsController(IChainTemplateRepository chainTemplateRepository)
        {
            _chainTemplateRepository = chainTemplateRepository;
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var templates = await _chainTemplateRepository.GetByUserIdAsync(userId);
            return Ok(templates);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var template = await _chainTemplateRepository.GetByIdAsync(id);
            if (template == null) return NotFound();

            var userId = GetCurrentUserId();
            if (template.UserId != userId) return NotFound();

            return Ok(template);
        }

        [HttpPost]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Create([FromBody] ChainTemplate template)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            template.UserId = userId;
            template.CreatedAt = DateTime.UtcNow;
            template.UpdatedAt = DateTime.UtcNow;
            
            var newId = await _chainTemplateRepository.CreateAsync(template);
            return CreatedAtAction(nameof(GetById), new { id = newId }, new { Id = newId });
        }

        [HttpPut("{id:int}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Update(int id, [FromBody] ChainTemplate template)
        {
            var existing = await _chainTemplateRepository.GetByIdAsync(id);
            if (existing == null) return NotFound();

            var userId = GetCurrentUserId();
            if (existing.UserId != userId) return NotFound();

            template.Id = id;
            template.UserId = userId; 
            template.CreatedAt = existing.CreatedAt;
            template.UpdatedAt = DateTime.UtcNow;

            var success = await _chainTemplateRepository.UpdateAsync(template);
            if (!success) return NotFound();

            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _chainTemplateRepository.GetByIdAsync(id);
            if (existing == null) return NotFound();

            var userId = GetCurrentUserId();
            if (existing.UserId != userId) return NotFound();

            var success = await _chainTemplateRepository.DeleteAsync(id);
            if (!success) return NotFound();

            return NoContent();
        }

        [HttpPost("generate")]
        public async Task<IActionResult> GenerateTasks([FromServices] PlanlamaApp.Application.Services.ITaskGeneratorService generatorService)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            await generatorService.GenerateTasksForUserAsync(userId);
            return Ok(new { Message = "Görevler başarıyla oluşturuldu." });
        }
    }
}
