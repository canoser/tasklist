using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ExamsController : ControllerBase
    {
        private readonly IExamRepository _repository;

        public ExamsController(IExamRepository repository)
        {
            _repository = repository;
        }

        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudentExams(string studentId, [FromQuery] string? examType, [FromQuery] int? limit)
        {
            var exams = await _repository.GetByStudentAsync(studentId, examType, limit);
            return Ok(exams);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetExam(int id)
        {
            var exam = await _repository.GetByIdAsync(id);
            if (exam == null) return NotFound();
            
            exam.SubjectResults = (await _repository.GetSubjectResultsAsync(id)).ToList();
            return Ok(exam);
        }

        [HttpPost]
        public async Task<IActionResult> CreateExam([FromBody] ExamRecord exam)
        {
            var coachId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(coachId)) return Unauthorized();
            exam.CoachUserId = coachId;

            var id = await _repository.CreateAsync(exam);
            
            foreach(var sub in exam.SubjectResults)
            {
                sub.ExamRecordId = id;
                await _repository.AddSubjectResultAsync(sub);
            }

            return Ok(new { Id = id });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExam(int id)
        {
            var result = await _repository.DeleteAsync(id);
            if (!result) return NotFound();
            return Ok();
        }
    }
}
