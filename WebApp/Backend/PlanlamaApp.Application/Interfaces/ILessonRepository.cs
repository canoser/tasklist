using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface ILessonRepository
    {
        Task<LessonRecord?> GetByIdAsync(int id);
        Task<IEnumerable<LessonRecord>> GetByCoachAsync(string coachUserId);
        Task<IEnumerable<LessonRecord>> GetByStudentAsync(string studentId);
        Task<int> CreateAsync(LessonRecord lesson);
        Task<bool> UpdateAsync(LessonRecord lesson);
        Task<bool> DeleteAsync(int id);
    }
}
