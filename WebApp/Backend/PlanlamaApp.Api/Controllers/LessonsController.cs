using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Security.Claims;
using System.Threading.Tasks;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LessonsController : ControllerBase
    {
        private readonly ILessonRepository _repository;

        public LessonsController(ILessonRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyLessons()
        {
            var coachId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(coachId)) return Unauthorized();

            var lessons = await _repository.GetByCoachAsync(coachId);
            return Ok(lessons);
        }

        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudentLessons(string studentId)
        {
            var lessons = await _repository.GetByStudentAsync(studentId);
            return Ok(lessons);
        }

        [HttpPost]
        public async Task<IActionResult> CreateLesson([FromBody] LessonRecord lesson)
        {
            var coachId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(coachId)) return Unauthorized();

            lesson.CoachUserId = coachId;
            var id = await _repository.CreateAsync(lesson);
            return Ok(new { Id = id });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLesson(int id, [FromBody] LessonRecord lesson)
        {
            lesson.Id = id;
            var result = await _repository.UpdateAsync(lesson);
            if (!result) return NotFound();
            return Ok();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLesson(int id)
        {
            var result = await _repository.DeleteAsync(id);
            if (!result) return NotFound();
            return Ok();
        }
    }
}
