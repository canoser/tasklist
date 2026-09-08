using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using System.Security.Claims;
using System.Threading.Tasks;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/student-stats")]
    [Authorize]
    public class StudentStatsController : ControllerBase
    {
        private readonly ITrendAnalysisService _trendAnalysisService;

        public StudentStatsController(ITrendAnalysisService trendAnalysisService)
        {
            _trendAnalysisService = trendAnalysisService;
        }

        [HttpGet("{id}/summary")]
        public async Task<IActionResult> GetSummary(string id)
        {
            // Dummy for now
            var summary = new StudentStatsSummaryDto
            {
                StudentId = id,
                TotalStudyHours = 120,
                TotalQuestionsSolved = 4500,
                CompletedTasksCount = 45,
                CurrentStreak = 5,
                TrendResult = _trendAnalysisService.AnalyzeNetTrend(new System.Collections.Generic.List<decimal> { 60, 65, 62, 70 })
            };
            
            return Ok(summary);
        }
    }
}
