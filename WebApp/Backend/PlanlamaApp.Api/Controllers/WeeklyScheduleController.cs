using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/weekly-schedule")]
    [Authorize]
    public class WeeklyScheduleController : ControllerBase
    {
        private readonly IWeeklyScheduleService _service;

        public WeeklyScheduleController(IWeeklyScheduleService service)
        {
            _service = service;
        }

        [HttpGet("{studentId}")]
        public async Task<IActionResult> GetLatest(string studentId)
        {
            var schedule = await _service.GetLatestScheduleAsync(studentId);
            if (schedule == null) return NotFound();
            return Ok(schedule);
        }

        [HttpPut("{studentId}")]
        public async Task<IActionResult> SaveSchedule(string studentId, [FromBody] List<WeeklyScheduleBlockDto> blocks)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var newSchedule = await _service.SaveScheduleAsync(studentId, userId, blocks);
            return Ok(newSchedule);
        }

        [HttpGet("{studentId}/history")]
        public async Task<IActionResult> GetHistory(string studentId)
        {
            var history = await _service.GetHistoryAsync(studentId);
            return Ok(history);
        }

        [HttpPost("{studentId}/rollback/{scheduleId}")]
        public async Task<IActionResult> Rollback(string studentId, int scheduleId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _service.RollbackToVersionAsync(scheduleId, userId);
            if (!result) return BadRequest();
            return Ok();
        }
    }
}
