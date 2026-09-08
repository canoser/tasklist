using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.DTOs;
using System.Security.Claims;
using System.Threading.Tasks;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/coach/dashboard")]
    [Authorize]
    public class CoachDashboardController : ControllerBase
    {
        // This will inject some summary services later.

        [HttpGet]
        public async Task<IActionResult> GetDashboardSummary()
        {
            var coachId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(coachId)) return Unauthorized();

            // Dummy for now
            var dto = new CoachDashboardDto
            {
                TotalStudents = 5,
                ActiveTasks = 12,
                UnpaidPayments = 2,
                TodayLessons = 1
            };

            return Ok(dto);
        }

        [HttpGet("alerts")]
        public async Task<IActionResult> GetAlerts()
        {
            var coachId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(coachId)) return Unauthorized();

            // Dummy for now
            var alerts = new[] { new { Type = "Payment", Message = "Ahmet Yılmaz gecikmiş ödeme." } };
            return Ok(alerts);
        }
    }
}
