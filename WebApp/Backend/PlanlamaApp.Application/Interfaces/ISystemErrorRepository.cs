using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface ISystemErrorRepository
    {
        Task LogErrorAsync(SystemError error);
        Task<IEnumerable<SystemError>> GetRecentErrorsAsync(int limit = 50);
    }
}
