using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IStudentProfileRepository
    {
        Task<StudentProfile?> GetByStudentIdAsync(string studentId);
        Task<StudentProfile?> GetByIdAsync(int id);
        Task<IEnumerable<StudentProfile>> GetByCoachAsync(string coachUserId);
        Task<int> CreateAsync(StudentProfile profile);
        Task<bool> UpdateAsync(StudentProfile profile);
        Task<bool> DeleteAsync(int id);
    }
}
