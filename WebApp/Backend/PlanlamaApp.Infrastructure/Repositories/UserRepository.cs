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

        public async Task<PlanlamaApp.Domain.Entities.User?> GetUserByIdAsync(string id)
        {
            var sql = "SELECT * FROM Users WHERE Id = @Id";
            return await _dbConnection.QueryFirstOrDefaultAsync<PlanlamaApp.Domain.Entities.User>(sql, new { Id = id });
        }

        public async Task<string> CreateUserAsync(PlanlamaApp.Domain.Entities.User user)
        {
            var sql = @"INSERT INTO Users (Id, Email, Name, PasswordHash, GoogleId, SubscriptionPlan, CustomAiLimit, CustomStorageLimit, CreatedAt)
                        VALUES (@Id, @Email, @Name, @PasswordHash, @GoogleId, @SubscriptionPlan, @CustomAiLimit, @CustomStorageLimit, @CreatedAt);";
            await _dbConnection.ExecuteAsync(sql, user);
            return user.Id;
        }

        public async Task<System.Collections.Generic.IEnumerable<PlanlamaApp.Domain.Entities.User>> GetPendingUsersAsync()
        {
            var sql = "SELECT * FROM Users WHERE SubscriptionPlan = 'pending'";
            return await _dbConnection.QueryAsync<PlanlamaApp.Domain.Entities.User>(sql);
        }

        public async Task ApproveUserAsPremiumAsync(string userId, int? customAiLimit, int? customStorageLimit)
        {
            var sql = @"UPDATE Users 
                        SET SubscriptionPlan = 'premium', 
                            CustomAiLimit = @CustomAiLimit, 
                            CustomStorageLimit = @CustomStorageLimit 
                        WHERE Id = @Id";
            await _dbConnection.ExecuteAsync(sql, new { Id = userId, CustomAiLimit = customAiLimit, CustomStorageLimit = customStorageLimit });
        }
    }
}
