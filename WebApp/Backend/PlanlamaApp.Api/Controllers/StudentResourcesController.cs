using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Security.Claims;
using System.Threading.Tasks;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/student-resources")]
    [Authorize]
    public class StudentResourcesController : ControllerBase
    {
        private readonly IStudentResourceRepository _repository;

        public StudentResourcesController(IStudentResourceRepository repository)
        {
            _repository = repository;
        }

        [HttpGet("{studentId}")]
        public async Task<IActionResult> GetStudentResources(string studentId)
        {
            var resources = await _repository.GetByStudentAsync(studentId);
            return Ok(resources);
        }

        [HttpPost]
        public async Task<IActionResult> CreateResource([FromBody] StudentResource resource)
        {
            var coachId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(coachId)) return Unauthorized();

            resource.CoachUserId = coachId;
            var id = await _repository.CreateAsync(resource);
            return Ok(new { Id = id });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteResource(int id)
        {
            var result = await _repository.DeleteAsync(id);
            if (!result) return NotFound();
            return Ok();
        }
    }
}
