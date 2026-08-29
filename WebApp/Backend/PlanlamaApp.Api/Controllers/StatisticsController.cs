using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Security.Claims;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StatisticsController : ControllerBase
    {
        private readonly ITaskRepository _taskRepository;
        private readonly IPerformanceRepository _performanceRepository;
        private readonly IWorkspaceRepository _workspaceRepository;

        public StatisticsController(
            ITaskRepository taskRepository,
            IPerformanceRepository performanceRepository,
            IWorkspaceRepository workspaceRepository)
        {
            _taskRepository = taskRepository;
            _performanceRepository = performanceRepository;
            _workspaceRepository = workspaceRepository;
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserStatistics(string userId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            bool isOwner = currentUserId == userId;
            List<int>? sharedWorkspaceIds = null;

            // Güvenlik ve İzolasyon Kuralı: Observer (Öğretmen/Veli) kontrolü
            if (!isOwner)
            {
                var observerWorkspaces = await _workspaceRepository.GetMemberOfAsync(currentUserId);
                var studentWorkspaces = await _workspaceRepository.GetMemberOfAsync(userId);
                
                sharedWorkspaceIds = observerWorkspaces.Select(w => w.Id)
                    .Intersect(studentWorkspaces.Select(w => w.Id))
                    .ToList();

                if (!sharedWorkspaceIds.Any())
                {
                    return Forbid();
                }
            }

            // Görevleri Getir
            var tasks = await _taskRepository.GetByUserIdAsync(userId);

            // Observer ise sadece ortak çalışma alanlarındaki görevleri filtrele
            if (!isOwner && sharedWorkspaceIds != null)
            {
                tasks = tasks.Where(t => t.AssignedByWorkspaceId.HasValue && sharedWorkspaceIds.Contains(t.AssignedByWorkspaceId.Value)).ToList();
            }

            // Performans Kayıtlarını Getir
            var performances = await _performanceRepository.GetByUserIdAsync(userId);
            
            // Observer ise sadece filtrelenmiş görevlere ait performansları al
            if (!isOwner)
            {
                var taskIds = tasks.Select(t => t.Id).ToHashSet();
                performances = performances.Where(p => taskIds.Contains(p.TaskItemId)).ToList();
            }

            var now = DateTime.UtcNow;

            // 1. Özet Kartları Hesaplaması
            int totalAssigned = tasks.Count();
            var completedTasks = tasks.Where(t => t.IsCompleted).ToList();
            int completedCount = completedTasks.Count;
            
            int completedOnTime = completedTasks.Count(t => t.Deadline.HasValue && t.CompletedAt.HasValue && t.CompletedAt.Value <= t.Deadline.Value);
            int completedLate = completedTasks.Count - completedOnTime;
            
            // Deadline'ı geçmiş ama henüz tamamlanmamış görevler
            int missed = tasks.Count(t => !t.IsCompleted && t.Deadline.HasValue && t.Deadline.Value < now);

            double completionRate = totalAssigned > 0 ? Math.Round((double)completedCount / totalAssigned * 100, 1) : 0;
            double onTimeRate = completedCount > 0 ? Math.Round((double)completedOnTime / completedCount * 100, 1) : 0;

            // 2. Streak (Seri) Hesaplaması
            var completedDates = completedTasks
                .Where(t => t.CompletedAt.HasValue)
                .Select(t => t.CompletedAt!.Value.Date)
                .Distinct()
                .OrderByDescending(d => d)
                .ToList();

            int currentStreak = 0;
            int longestStreak = 0;
            int tempStreak = 0;
            DateTime? previousDate = null;

            // Longest Streak Hesaplaması (Eskiden Yeniye)
            var sortedDates = completedDates.OrderBy(d => d).ToList();
            foreach (var date in sortedDates)
            {
                if (previousDate == null)
                {
                    tempStreak = 1;
                }
                else
                {
                    if ((date - previousDate.Value).TotalDays == 1)
                    {
                        tempStreak++;
                    }
                    else
                    {
                        if (tempStreak > longestStreak) longestStreak = tempStreak;
                        tempStreak = 1;
                    }
                }
                previousDate = date;
            }
            if (tempStreak > longestStreak) longestStreak = tempStreak;

            // Current Streak Hesaplaması (Günden Geriye Doğru)
            var today = now.Date;
            var yesterday = today.AddDays(-1);
            
            if (completedDates.Contains(today))
            {
                currentStreak = 1;
                DateTime checkDate = yesterday;
                while (completedDates.Contains(checkDate))
                {
                    currentStreak++;
                    checkDate = checkDate.AddDays(-1);
                }
            }
            else if (completedDates.Contains(yesterday))
            {
                currentStreak = 1;
                DateTime checkDate = yesterday.AddDays(-1);
                while (completedDates.Contains(checkDate))
                {
                    currentStreak++;
                    checkDate = checkDate.AddDays(-1);
                }
            }

            // 3. Görev Tipi Dağılımı (Pie Chart)
            var taskTypeBreakdown = tasks
                .GroupBy(t => string.IsNullOrEmpty(t.TaskType) ? "Diğer" : t.TaskType)
                .ToDictionary(g => g.Key, g => g.Count());

            // 4. Zaman Yönetimi
            var timeManagement = new 
            {
                OnTime = completedOnTime,
                Late = completedLate,
                Missed = missed
            };

            // 5. Haftalık Isı Haritası (Son 12 Hafta)
            var twelveWeeksAgo = today.AddDays(-84);
            var weeklyHeatmap = completedTasks
                .Where(t => t.CompletedAt.HasValue && t.CompletedAt.Value.Date >= twelveWeeksAgo)
                .GroupBy(t => t.CompletedAt!.Value.Date.ToString("yyyy-MM-dd"))
                .ToDictionary(g => g.Key, g => g.Count());

            // 6. Net Skor Gelişim Eğrisi (Son 8 Hafta)
            var eightWeeksAgo = today.AddDays(-56);
            var recentPerformances = performances
                .Where(p => p.RecordedAt >= eightWeeksAgo)
                .GroupBy(p => GetWeekString(p.RecordedAt))
                .Select(g => new 
                {
                    Week = g.Key,
                    AverageNetScore = Math.Round(g.Average(p => (double)p.NetScore), 2),
                    TotalCorrect = g.Sum(p => p.CorrectCount),
                    TotalWrong = g.Sum(p => p.WrongCount)
                })
                .OrderBy(x => x.Week)
                .ToList();

            return Ok(new
            {
                Summary = new 
                {
                    TotalAssigned = totalAssigned,
                    CompletedCount = completedCount,
                    CompletedOnTime = completedOnTime,
                    CompletedLate = completedLate,
                    Missed = missed,
                    CompletionRate = completionRate,
                    OnTimeRate = onTimeRate,
                    CurrentStreak = currentStreak,
                    LongestStreak = longestStreak
                },
                TaskTypeBreakdown = taskTypeBreakdown,
                TimeManagement = timeManagement,
                WeeklyHeatmap = weeklyHeatmap,
                NetScoreTrend = recentPerformances
            });
        }

        private string GetWeekString(DateTime date)
        {
            var cal = System.Globalization.DateTimeFormatInfo.CurrentInfo.Calendar;
            var week = cal.GetWeekOfYear(date, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
            return $"{date.Year}-W{week:D2}";
        }
    }
}
