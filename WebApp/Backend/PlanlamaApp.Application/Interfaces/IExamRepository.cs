using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IExamRepository
    {
        Task<ExamRecord?> GetByIdAsync(int id);
        Task<IEnumerable<ExamRecord>> GetByStudentAsync(string studentId, string? examType, int? limit);
        Task<int> CreateAsync(ExamRecord exam);
        Task<bool> UpdateAsync(ExamRecord exam);
        Task<bool> DeleteAsync(int id);
        
        Task<IEnumerable<ExamSubjectResult>> GetSubjectResultsAsync(int examRecordId);
        Task<int> AddSubjectResultAsync(ExamSubjectResult result);
        Task<bool> UpdateSubjectResultAsync(ExamSubjectResult result);
        Task<bool> DeleteSubjectResultsAsync(int examRecordId);
    }
}
