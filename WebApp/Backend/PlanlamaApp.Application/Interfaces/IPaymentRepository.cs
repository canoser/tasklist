using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IPaymentRepository
    {
        Task<PaymentRecord?> GetByIdAsync(int id);
        Task<IEnumerable<PaymentRecord>> GetByCoachAsync(string coachUserId, string? status);
        Task<IEnumerable<PaymentRecord>> GetByStudentAsync(string studentId);
        Task<int> CreateAsync(PaymentRecord payment);
        Task<bool> UpdateAsync(PaymentRecord payment);
        Task<bool> DeleteAsync(int id);
    }
}
