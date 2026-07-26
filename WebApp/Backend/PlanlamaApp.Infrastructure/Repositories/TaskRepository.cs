using System.Data;
using Dapper;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    /// <summary>
    /// ITaskRepository'nin Dapper + SQLite üzerinde çalışan somut implementasyonu.
    /// BaseRepository'nin TenantId filtre zırhı sayesinde tüm sorgular otomatik
    /// olarak aktif kiracıya izole edilir.
    /// </summary>
    public class TaskRepository : BaseRepository, ITaskRepository
    {
        public TaskRepository(IDbConnection dbConnection, ITenantProvider tenantProvider)
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<IEnumerable<TaskItem>> GetByUserIdAsync(string userId)
        {
            // BaseRepository, sorgunun sonuna otomatik "AND TenantId = @TenantId" ekler.
            var sql = @"SELECT * FROM TaskItems WHERE UserId = @UserId ORDER BY Deadline ASC";
            return await QueryAsync<TaskItem>(sql, new { UserId = userId });
        }

        public async Task<IEnumerable<TaskItem>> GetByCategoryIdAsync(int categoryId)
        {
            var sql = @"SELECT * FROM TaskItems WHERE CategoryId = @CategoryId ORDER BY Deadline ASC";
            return await QueryAsync<TaskItem>(sql, new { CategoryId = categoryId });
        }

        public async Task<IEnumerable<TaskItem>> GetByDateRangeAsync(string userId, DateTime start, DateTime end)
        {
            // Tarih aralığı filtresi: WHERE içinde UserId ve tarih filtresi zaten var,
            // BaseRepository "AND TenantId = @TenantId" ekler. Güvenlik zırhı aktif.
            var sql = @"SELECT * FROM TaskItems 
                        WHERE UserId = @UserId 
                          AND Deadline >= @Start 
                          AND Deadline <= @End
                        ORDER BY Deadline ASC";
            return await QueryAsync<TaskItem>(sql, new { UserId = userId, Start = start, End = end });
        }

        public async Task<TaskItem?> GetByIdAsync(int id)
        {
            var sql = @"SELECT * FROM TaskItems WHERE Id = @Id";
            return await QueryFirstOrDefaultAsync<TaskItem>(sql, new { Id = id });
        }

        public async Task<int> CreateAsync(TaskItem task)
        {
            // INSERT: TenantId kolonu sorguda bulunmak zorunda (BaseRepository kural).
            var sql = @"INSERT INTO TaskItems 
                            (TenantId, UserId, CategoryId, Title, Description, TaskType, 
                             Deadline, IsTeacherAssigned, IsCompleted, CompletedAt, TargetCount, Metadata, CreatedAt, UpdatedAt)
                        VALUES 
                            (@TenantId, @UserId, @CategoryId, @Title, @Description, @TaskType,
                             @Deadline, @IsTeacherAssigned, @IsCompleted, @CompletedAt, @TargetCount, @Metadata, @CreatedAt, @UpdatedAt);
                        SELECT last_insert_rowid();";
            return await _dbConnection.ExecuteScalarAsync<int>(sql, task);
        }

        public async Task<bool> UpdateAsync(TaskItem task)
        {
            // UPDATE: TenantId filtresi hem WHERE şartında hem de BaseRepository tarafından
            // çift güvenlik olarak eklenir (BaseRepository, TenantId içerdiğinden müdahale etmez).
            var sql = @"UPDATE TaskItems 
                        SET Title = @Title,
                            Description = @Description,
                            TaskType = @TaskType,
                            CategoryId = @CategoryId,
                            Deadline = @Deadline,
                            IsTeacherAssigned = @IsTeacherAssigned,
                            IsCompleted = @IsCompleted,
                            CompletedAt = @CompletedAt,
                            TargetCount = @TargetCount,
                            Metadata = @Metadata,
                            UpdatedAt = @UpdatedAt
                        WHERE Id = @Id AND TenantId = @TenantId";
            var affected = await ExecuteAsync(sql, task);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var sql = @"DELETE FROM TaskItems WHERE Id = @Id";
            var affected = await ExecuteAsync(sql, new { Id = id });
            return affected > 0;
        }

        public async Task<bool> MarkAsCompletedAsync(int id, DateTime completedAt)
        {
            var sql = @"UPDATE TaskItems 
                        SET IsCompleted = 1, 
                            CompletedAt = @CompletedAt,
                            UpdatedAt = @UpdatedAt
                        WHERE Id = @Id AND TenantId = @TenantId";
            var affected = await ExecuteAsync(sql, new { Id = id, CompletedAt = completedAt, UpdatedAt = DateTime.UtcNow });
            return affected > 0;
        }
    }
}
