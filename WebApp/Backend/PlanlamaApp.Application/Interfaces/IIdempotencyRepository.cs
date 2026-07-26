using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IIdempotencyRepository
    {
        Task<bool> ExistsAsync(string key);
        Task SaveAsync(IdempotencyKey idempotencyKey);
    }
}
