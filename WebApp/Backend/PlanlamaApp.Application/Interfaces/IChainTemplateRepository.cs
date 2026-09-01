using PlanlamaApp.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Data;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IChainTemplateRepository
    {
        Task<IEnumerable<ChainTemplate>> GetByUserIdAsync(string userId);
        Task<ChainTemplate?> GetByIdAsync(int id);
        Task<int> CreateAsync(ChainTemplate template, IDbTransaction? transaction = null);
        Task<bool> UpdateAsync(ChainTemplate template, IDbTransaction? transaction = null);
        Task<bool> DeleteAsync(int id, IDbTransaction? transaction = null);
    }
}
