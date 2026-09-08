using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IWeeklyScheduleService
    {
        Task<WeeklyScheduleDto?> GetLatestScheduleAsync(string studentId);
        Task<WeeklyScheduleDto> SaveScheduleAsync(string studentId, string updatedByUserId, List<WeeklyScheduleBlockDto> blocks);
        Task<IEnumerable<WeeklyScheduleDto>> GetHistoryAsync(string studentId, int limit = 10);
        Task<bool> RollbackToVersionAsync(int scheduleId, string updatedByUserId);
        Task PruneOldVersionsAsync(string studentId);
    }
}
