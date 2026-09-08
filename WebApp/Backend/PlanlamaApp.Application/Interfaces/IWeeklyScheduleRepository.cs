using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IWeeklyScheduleRepository
    {
        Task<WeeklySchedule?> GetLatestByStudentAsync(string studentId);
        Task<IEnumerable<WeeklySchedule>> GetHistoryByStudentAsync(string studentId, int limit);
        Task<WeeklySchedule?> GetByIdAsync(int id);
        Task<int> CreateAsync(WeeklySchedule schedule);
        Task<bool> UpdateAsync(WeeklySchedule schedule);
        Task<bool> DeleteOldVersionsAsync(string studentId, int keepCount);
        
        Task<IEnumerable<WeeklyScheduleBlock>> GetBlocksAsync(int scheduleId);
        Task<bool> CreateBlocksAsync(IEnumerable<WeeklyScheduleBlock> blocks);
    }
}
