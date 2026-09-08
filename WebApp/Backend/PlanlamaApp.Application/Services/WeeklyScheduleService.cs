using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Services
{
    public class WeeklyScheduleService : IWeeklyScheduleService
    {
        private readonly IWeeklyScheduleRepository _repository;

        public WeeklyScheduleService(IWeeklyScheduleRepository repository)
        {
            _repository = repository;
        }

        public async Task<WeeklyScheduleDto?> GetLatestScheduleAsync(string studentId)
        {
            var schedule = await _repository.GetLatestByStudentAsync(studentId);
            if (schedule == null) return null;

            var blocks = await _repository.GetBlocksAsync(schedule.Id);
            
            var dto = new WeeklyScheduleDto
            {
                Id = schedule.Id,
                StudentId = schedule.StudentId,
                Version = schedule.Version,
                IsLatest = schedule.IsLatest,
                UpdatedByUserId = schedule.UpdatedByUserId,
                CreatedAt = schedule.CreatedAt,
                Blocks = blocks.Select(b => new WeeklyScheduleBlockDto
                {
                    Id = b.Id,
                    DayOfWeek = b.DayOfWeek,
                    StartTime = b.StartTime.ToString(@"hh\:mm"),
                    EndTime = b.EndTime.ToString(@"hh\:mm"),
                    Label = b.Label,
                    BlockType = b.BlockType,
                    IsLockedByCoach = b.IsLockedByCoach
                }).ToList()
            };

            return dto;
        }

        public async Task<WeeklyScheduleDto> SaveScheduleAsync(string studentId, string updatedByUserId, List<WeeklyScheduleBlockDto> blockDtos)
        {
            var latest = await _repository.GetLatestByStudentAsync(studentId);
            
            if (latest != null)
            {
                latest.IsLatest = false;
                await _repository.UpdateAsync(latest);
            }

            var newVersion = (latest?.Version ?? 0) + 1;
            
            var newSchedule = new WeeklySchedule
            {
                TenantId = "todo-inject",
                StudentId = studentId,
                Version = newVersion,
                IsLatest = true,
                UpdatedByUserId = updatedByUserId,
                CreatedAt = DateTime.UtcNow
            };

            var id = await _repository.CreateAsync(newSchedule);
            newSchedule.Id = id;

            var blocks = blockDtos.Select(b => new WeeklyScheduleBlock
            {
                TenantId = "todo-inject",
                WeeklyScheduleId = id,
                DayOfWeek = b.DayOfWeek,
                StartTime = TimeSpan.Parse(b.StartTime),
                EndTime = TimeSpan.Parse(b.EndTime),
                Label = b.Label,
                BlockType = b.BlockType,
                IsLockedByCoach = b.IsLockedByCoach
            }).ToList();

            await _repository.CreateBlocksAsync(blocks);

            // Trigger background prune
            _ = PruneOldVersionsAsync(studentId);

            return await GetLatestScheduleAsync(studentId) ?? new WeeklyScheduleDto();
        }

        public async Task<IEnumerable<WeeklyScheduleDto>> GetHistoryAsync(string studentId, int limit = 10)
        {
            var schedules = await _repository.GetHistoryByStudentAsync(studentId, limit);
            // This is simplified, normally we'd map all blocks too if needed.
            return schedules.Select(s => new WeeklyScheduleDto
            {
                Id = s.Id,
                StudentId = s.StudentId,
                Version = s.Version,
                IsLatest = s.IsLatest,
                UpdatedByUserId = s.UpdatedByUserId,
                CreatedAt = s.CreatedAt
            });
        }

        public async Task<bool> RollbackToVersionAsync(int scheduleId, string updatedByUserId)
        {
            var targetSchedule = await _repository.GetByIdAsync(scheduleId);
            if (targetSchedule == null) return false;

            var blocks = await _repository.GetBlocksAsync(scheduleId);
            
            var blockDtos = blocks.Select(b => new WeeklyScheduleBlockDto
            {
                DayOfWeek = b.DayOfWeek,
                StartTime = b.StartTime.ToString(@"hh\:mm"),
                EndTime = b.EndTime.ToString(@"hh\:mm"),
                Label = b.Label,
                BlockType = b.BlockType,
                IsLockedByCoach = b.IsLockedByCoach
            }).ToList();

            await SaveScheduleAsync(targetSchedule.StudentId, updatedByUserId, blockDtos);
            return true;
        }

        public async Task PruneOldVersionsAsync(string studentId)
        {
            await _repository.DeleteOldVersionsAsync(studentId, 10);
        }
    }
}
