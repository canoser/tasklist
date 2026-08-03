using System.Collections.Generic;
using System.Threading.Tasks;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    public interface ISettingsService
    {
        Task<int> GetSettingAsIntAsync(string key, int defaultValue = 0);
        Task<string> GetSettingAsStringAsync(string key, string defaultValue = "");
        Task<IEnumerable<SystemSetting>> GetAllSettingsAsync();
        Task UpdateSettingAsync(string key, string value, string description);
    }
}
