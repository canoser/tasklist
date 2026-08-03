using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Services
{
    public class SettingsService : ISettingsService
    {
        private readonly ISystemSettingsRepository _repository;
        private readonly IMemoryCache _cache;
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

        public SettingsService(ISystemSettingsRepository repository, IMemoryCache cache)
        {
            _repository = repository;
            _cache = cache;
        }

        public async Task<string> GetSettingAsStringAsync(string key, string defaultValue = "")
        {
            string cacheKey = $"SystemSetting_{key}";

            if (!_cache.TryGetValue(cacheKey, out string? cachedValue))
            {
                var setting = await _repository.GetSettingAsync(key);
                cachedValue = setting?.Value ?? defaultValue;

                var cacheEntryOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(CacheDuration);
                
                _cache.Set(cacheKey, cachedValue, cacheEntryOptions);
            }

            return cachedValue ?? defaultValue;
        }

        public async Task<int> GetSettingAsIntAsync(string key, int defaultValue = 0)
        {
            var stringValue = await GetSettingAsStringAsync(key);
            if (int.TryParse(stringValue, out int intValue))
            {
                return intValue;
            }
            return defaultValue;
        }

        public async Task<IEnumerable<SystemSetting>> GetAllSettingsAsync()
        {
            // Yönetici paneli için her zaman DB'den taze veri çekiyoruz.
            return await _repository.GetAllSettingsAsync();
        }

        public async Task UpdateSettingAsync(string key, string value, string description)
        {
            await _repository.UpdateSettingAsync(key, value, description);
            
            // Güncelleme yapıldığında cache'i temizle
            _cache.Remove($"SystemSetting_{key}");
        }
    }
}
