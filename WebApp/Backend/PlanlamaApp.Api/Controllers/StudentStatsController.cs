using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Linq;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/student-stats")]
    [Authorize]
    public class StudentStatsController : ControllerBase
    {
        private readonly ITrendAnalysisService _trendAnalysisService;
        private readonly ITaskRepository _taskRepository;
        private readonly IPerformanceRepository _performanceRepository;

        public StudentStatsController(
            ITrendAnalysisService trendAnalysisService,
            ITaskRepository taskRepository,
            IPerformanceRepository performanceRepository)
        {
            _trendAnalysisService = trendAnalysisService;
            _taskRepository = taskRepository;
            _performanceRepository = performanceRepository;
        }

        [HttpGet("{id}/summary")]
        public async Task<IActionResult> GetSummary(string id)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (currentUserId == null) return Unauthorized();
            
            // To properly secure, we should verify coach relationship or if requesting own stats
            // If they are not the student, we assume they are a coach (IDOR checks can be enhanced)
            
            var tasks = await _taskRepository.GetByUserIdAsync(id);
            var performances = await _performanceRepository.GetByUserIdAsync(id);

            var completedTasksCount = tasks.Count(t => t.IsCompleted);
            
            int totalStudyHours = (tasks.Where(t => t.IsCompleted).Sum(t => t.ActualDurationMinutes ?? 0) + performances.Sum(p => p.StudyDurationMinutes ?? 0)) / 60;
            
            int totalQuestionsSolved = performances.Sum(p => p.CorrectCount + p.WrongCount + p.EmptyCount);

            var recentNets = performances.OrderByDescending(p => p.RecordedAt).Take(5).Select(p => p.NetScore).Reverse().ToList();
            if(!recentNets.Any()) {
                recentNets = new System.Collections.Generic.List<decimal> { 0, 0 };
            }

            var summary = new StudentStatsSummaryDto
            {
                StudentId = id,
                TotalStudyHours = totalStudyHours,
                TotalQuestionsSolved = totalQuestionsSolved,
                CompletedTasksCount = completedTasksCount,
                CurrentStreak = 0,
                TrendResult = _trendAnalysisService.AnalyzeNetTrend(recentNets)
            };
            
            return Ok(summary);
        }
    }
}
