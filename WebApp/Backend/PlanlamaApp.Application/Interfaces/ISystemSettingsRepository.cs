using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface ISystemSettingsRepository
    {
        Task<SystemSetting?> GetSettingAsync(string key);
        Task<IEnumerable<SystemSetting>> GetAllSettingsAsync();
        Task UpdateSettingAsync(string key, string value, string description);
    }
}
