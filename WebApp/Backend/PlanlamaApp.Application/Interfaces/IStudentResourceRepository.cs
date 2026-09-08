using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IStudentResourceRepository
    {
        Task<StudentResource?> GetByIdAsync(int id);
        Task<IEnumerable<StudentResource>> GetByStudentAsync(string studentId);
        Task<int> CreateAsync(StudentResource resource);
        Task<bool> DeleteAsync(int id);
    }
}
