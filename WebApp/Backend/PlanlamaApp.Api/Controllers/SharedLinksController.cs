using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Security.Claims;
using System.Threading.Tasks;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SharedLinksController : ControllerBase
    {
        private readonly ISharedLinkRepository _repository;
        private readonly ISharedLinkService _service;

        public SharedLinksController(ISharedLinkRepository repository, ISharedLinkService service)
        {
            _repository = repository;
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyLinks()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var links = await _repository.GetByCreatedUserAsync(userId);
            return Ok(links);
        }

        [HttpPost]
        public async Task<IActionResult> CreateLink([FromBody] SharedLinkCreateDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var link = new SharedLink
            {
                CreatedByUserId = userId,
                StudentId = dto.StudentId,
                LinkType = dto.LinkType,
                Scope = dto.Scope,
                ScopeCategoryId = dto.ScopeCategoryId,
                Token = await _service.GenerateTokenAsync()
            };

            var pin = _service.GeneratePin();
            link.PinHash = _service.HashPin(pin);

            var id = await _repository.CreateAsync(link);

            // We return the raw PIN only once upon creation.
            return Ok(new { Id = id, Token = link.Token, Pin = pin });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLink(int id)
        {
            var result = await _repository.DeleteAsync(id);
            if (!result) return NotFound();
            return Ok();
        }
    }
}
