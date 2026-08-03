using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;

using Microsoft.Extensions.Configuration;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class SystemSettingsRepository : ISystemSettingsRepository
    {
        private readonly System.Data.IDbConnection _connection;

        public SystemSettingsRepository(System.Data.IDbConnection connection)
        {
            _connection = connection;
        }

        public async Task<SystemSetting?> GetSettingAsync(string key)
        {
            return await _connection.QuerySingleOrDefaultAsync<SystemSetting>(
                "SELECT * FROM SystemSettings WHERE Key = @Key",
                new { Key = key }
            );
        }

        public async Task<IEnumerable<SystemSetting>> GetAllSettingsAsync()
        {
            return await _connection.QueryAsync<SystemSetting>("SELECT * FROM SystemSettings");
        }

        public async Task UpdateSettingAsync(string key, string value, string description)
        {
            await _connection.ExecuteAsync(@"
                INSERT INTO SystemSettings (Key, Value, Description, UpdatedAt)
                VALUES (@Key, @Value, @Description, @UpdatedAt)
                ON CONFLICT(Key) DO UPDATE SET 
                    Value = @Value,
                    Description = @Description,
                    UpdatedAt = @UpdatedAt
            ", new { Key = key, Value = value, Description = description, UpdatedAt = DateTime.UtcNow.ToString("O") });
        }
    }
}
