using PlanlamaApp.Domain.Entities;
using PlanlamaApp.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;

namespace PlanlamaApp.Application.Services
{
    public interface ITaskGeneratorService
    {
        Task GenerateTasksForUserAsync(string userId);
    }

    public class TaskGeneratorService : ITaskGeneratorService
    {
        private readonly IChainTemplateRepository _chainTemplateRepository;
        private readonly ITaskRepository _taskRepository;
        private readonly IUserRepository _userRepository;

        public TaskGeneratorService(
            IChainTemplateRepository chainTemplateRepository,
            ITaskRepository taskRepository,
            IUserRepository userRepository)
        {
            _chainTemplateRepository = chainTemplateRepository;
            _taskRepository = taskRepository;
            _userRepository = userRepository;
        }

        public async Task GenerateTasksForUserAsync(string userId)
        {
            var user = await _userRepository.GetUserByIdAsync(userId);
            if (user == null) return;

            // TODO: In a real app, User should have a timezone preference. We default to UTC for now, 
            // but you could add a 'Timezone' column to AppUser if not present.
            var tz = TimeZoneInfo.Utc; 
            try {
                // If user has a preference, parse it.
                // tz = TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");
            } catch {}

            var today = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz).Date;
            var targetEnd = today.AddDays(30);

            var templates = await _chainTemplateRepository.GetByUserIdAsync(userId);

            foreach (var t in templates)
            {
                var startDate = t.StartDate?.Date ?? today;
                var lastGen = t.LastGeneratedDate?.Date ?? startDate.AddDays(-1);
                
                if (t.EndDate.HasValue && targetEnd > t.EndDate.Value.Date)
                {
                    targetEnd = t.EndDate.Value.Date;
                }

                if (lastGen >= targetEnd) continue;

                var currentGenDate = lastGen.AddDays(1);
                if (currentGenDate < startDate) currentGenDate = startDate;

                var daysOfWeek = new List<DayOfWeek>();
                if (!string.IsNullOrEmpty(t.DaysOfWeek))
                {
                    try {
                        var ints = JsonSerializer.Deserialize<List<int>>(t.DaysOfWeek);
                        if (ints != null) daysOfWeek = ints.Select(i => (DayOfWeek)i).ToList();
                    } catch {}
                }

                var customDates = new List<DateTime>();
                if (!string.IsNullOrEmpty(t.CustomDates))
                {
                    try {
                        var dates = JsonSerializer.Deserialize<List<string>>(t.CustomDates);
                        if (dates != null) customDates = dates.Select(d => DateTime.Parse(d).Date).ToList();
                    } catch {}
                }

                while (currentGenDate <= targetEnd)
                {
                    bool shouldGenerate = false;

                    if (t.RecurrenceType == "Daily")
                    {
                        shouldGenerate = true;
                    }
                    else if (t.RecurrenceType == "Weekly")
                    {
                        shouldGenerate = daysOfWeek.Contains(currentGenDate.DayOfWeek);
                    }
                    else if (t.RecurrenceType == "Custom")
                    {
                        shouldGenerate = customDates.Contains(currentGenDate);
                    }

                    if (shouldGenerate)
                    {
                        // Convert back to UTC for saving in DB
                        var deadlineUtc = TimeZoneInfo.ConvertTimeToUtc(currentGenDate.AddHours(23).AddMinutes(59), tz);
                        
                        var taskItem = new TaskItem
                        {
                            UserId = userId,
                            Title = t.Title,
                            Description = t.Description,
                            TaskType = t.TaskType,
                            CategoryId = t.CategoryId,
                            TargetCount = t.TargetCount,
                            Deadline = deadlineUtc,
                            OriginalDeadline = deadlineUtc,
                            ChainTemplateId = t.Id,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        try
                        {
                            // DB Unique Index (ChainTemplateId, Deadline) will prevent duplicates!
                            await _taskRepository.CreateAsync(taskItem);
                        }
                        catch
                        {
                            // Ignore unique constraint violations
                        }
                    }

                    currentGenDate = currentGenDate.AddDays(1);
                }

                t.LastGeneratedDate = targetEnd;
                t.UpdatedAt = DateTime.UtcNow;
                await _chainTemplateRepository.UpdateAsync(t);
            }
        }
    }
}
