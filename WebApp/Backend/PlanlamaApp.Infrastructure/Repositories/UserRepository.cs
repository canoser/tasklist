using System;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class UserRepository : BaseRepository, IUserRepository
    {
        public UserRepository(IDbConnection dbConnection, ITenantProvider tenantProvider)
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<bool> DeleteAllUserDataAsync(string userId)
        {
            if (_dbConnection.State != ConnectionState.Open)
                _dbConnection.Open();

            using var transaction = _dbConnection.BeginTransaction();
            try
            {
                var p = new { UserId = userId, TenantId = _tenantId };

                // Dapper with transactions via BaseRepository
                await ExecuteAsync("DELETE FROM TaskItems WHERE UserId = @UserId", p, transaction);
                await ExecuteAsync("DELETE FROM PerformanceRecords WHERE UserId = @UserId", p, transaction);
                await ExecuteAsync("DELETE FROM UserRoles WHERE UserId = @UserId", p, transaction);
                await ExecuteAsync("DELETE FROM Workspaces WHERE OwnerId = @UserId", p, transaction);
                await ExecuteAsync("DELETE FROM WorkspaceMembers WHERE UserId = @UserId", p, transaction);

                transaction.Commit();
                return true;
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                Console.WriteLine($"Kullanıcı verileri silinirken hata oluştu: {ex.Message}");
                return false;
            }
        }

        public async Task<PlanlamaApp.Domain.Entities.User?> GetUserByEmailAsync(string email)
        {
            var sql = "SELECT * FROM Users WHERE Email = @Email";
            return await _dbConnection.QueryFirstOrDefaultAsync<PlanlamaApp.Domain.Entities.User>(sql, new { Email = email });
        }

        public async Task<PlanlamaApp.Domain.Entities.User?> GetUserByGoogleIdAsync(string googleId)
        {
            var sql = "SELECT * FROM Users WHERE GoogleId = @GoogleId";
            return await _dbConnection.QueryFirstOrDefaultAsync<PlanlamaApp.Domain.Entities.User>(sql, new { GoogleId = googleId });
        }

        public async Task<string> CreateUserAsync(PlanlamaApp.Domain.Entities.User user)
        {
            var sql = @"INSERT INTO Users (Id, Email, Name, PasswordHash, GoogleId, SubscriptionPlan, CreatedAt)
                        VALUES (@Id, @Email, @Name, @PasswordHash, @GoogleId, @SubscriptionPlan, @CreatedAt);";
            await _dbConnection.ExecuteAsync(sql, user);
            return user.Id;
        }
    }
}
