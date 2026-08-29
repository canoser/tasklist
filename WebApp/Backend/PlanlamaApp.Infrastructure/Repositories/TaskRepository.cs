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

        public async Task<IEnumerable<TaskItem>> GetChainTasksByUserIdAsync(string userId)
        {
            var sql = @"SELECT * FROM TaskItems
                        WHERE UserId = @UserId
                          AND ChainId IS NOT NULL
                        ORDER BY ChainId ASC, ChainOrder ASC";
            return await QueryAsync<TaskItem>(sql, new { UserId = userId });
        }

        public async Task<TaskItem?> GetByIdAsync(int id)
        {
            var sql = @"SELECT * FROM TaskItems WHERE Id = @Id";
            return await QueryFirstOrDefaultAsync<TaskItem>(sql, new { Id = id });
        }

        public async Task<IEnumerable<TaskItem>> GetByAssignedWorkspaceIdAsync(int workspaceId)
        {
            var sql = @"SELECT * FROM TaskItems WHERE AssignedByWorkspaceId = @WorkspaceId ORDER BY CreatedAt DESC";
            // Workspace görevlerinin herkes tarafından görülebilmesi için BaseRepository'nin 
            // TenantId filtresini (QueryAsync) by-pass ediyoruz.
            return await _dbConnection.QueryAsync<TaskItem>(sql, new { WorkspaceId = workspaceId });
        }

        public async Task<int> CreateAsync(TaskItem task, System.Data.IDbTransaction? transaction = null)
        {
            // Eğer görev başkasına atanmışsa (Workspace), TenantId o kişinin UserId'si olmalı!
            task.TenantId = task.UserId;

            // INSERT: TenantId kolonu sorguda bulunmak zorunda.
            var sql = @"INSERT INTO TaskItems 
                            (TenantId, UserId, CategoryId, Title, Description, TaskType, 
                             Deadline, IsTeacherAssigned, IsCompleted, CompletedAt, TargetCount, Metadata, 
                             WorkspaceId, ChainId, ChainOrder, OriginalDeadline, IsHomework, AssignedBy,
                             AssignedByWorkspaceId, AssignedByUserId, UserTaskSnapshot, CreatedAt, UpdatedAt)
                        VALUES 
                            (@TenantId, @UserId, @CategoryId, @Title, @Description, @TaskType,
                             @Deadline, @IsTeacherAssigned, @IsCompleted, @CompletedAt, @TargetCount, @Metadata,
                             @WorkspaceId, @ChainId, @ChainOrder, @OriginalDeadline, @IsHomework, @AssignedBy,
                             @AssignedByWorkspaceId, @AssignedByUserId, @UserTaskSnapshot, @CreatedAt, @UpdatedAt)
                        RETURNING Id;";
            
            // BaseRepository'nin "TenantId = CallerId" ezmesini engellemek için doğrudan _dbConnection kullanıyoruz
            return await _dbConnection.ExecuteScalarAsync<int>(sql, task, transaction);
        }

        public async Task<bool> UpdateAsync(TaskItem task, System.Data.IDbTransaction? transaction = null)
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
                            WorkspaceId = @WorkspaceId,
                            ChainId = @ChainId,
                            ChainOrder = @ChainOrder,
                            OriginalDeadline = @OriginalDeadline,
                            IsHomework = @IsHomework,
                            AssignedBy = @AssignedBy,
                            AssignedByWorkspaceId = @AssignedByWorkspaceId,
                            AssignedByUserId = @AssignedByUserId,
                            UserTaskSnapshot = @UserTaskSnapshot,
                            UpdatedAt = @UpdatedAt
                        WHERE Id = @Id AND TenantId = @TenantId";
            var affected = await ExecuteAsync(sql, task, transaction);
            return affected > 0;
        }

        public async Task<bool> UpdateByAssignerAsync(TaskItem task, System.Data.IDbTransaction? transaction = null)
        {
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
                            WorkspaceId = @WorkspaceId,
                            ChainId = @ChainId,
                            ChainOrder = @ChainOrder,
                            OriginalDeadline = @OriginalDeadline,
                            IsHomework = @IsHomework,
                            AssignedBy = @AssignedBy,
                            AssignedByWorkspaceId = @AssignedByWorkspaceId,
                            AssignedByUserId = @AssignedByUserId,
                            UserTaskSnapshot = @UserTaskSnapshot,
                            UpdatedAt = @UpdatedAt
                        WHERE Id = @Id";
            var affected = await _dbConnection.ExecuteAsync(sql, task, transaction);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id, System.Data.IDbTransaction? transaction = null)
        {
            // Cascade silmelerde TenantId bypass'ını önlemek için doğrudan tenantId içeren SQL yazıyoruz.
            // (Bulgu 10)
            var deletePerf = "DELETE FROM PerformanceRecords WHERE TaskItemId = @Id AND TenantId = @TenantId";
            await ExecuteAsync(deletePerf, new { Id = id }, transaction);

            var deleteAssign = "DELETE FROM TaskAssignments WHERE TaskItemId = @Id AND TenantId = @TenantId";
            await ExecuteAsync(deleteAssign, new { Id = id }, transaction);

            var sql = @"DELETE FROM TaskItems WHERE Id = @Id";
            var affected = await ExecuteAsync(sql, new { Id = id }, transaction);
            return affected > 0;
        }

        public async Task<bool> MarkAsCompletedAsync(int id, DateTime completedAt, System.Data.IDbTransaction? transaction = null)
        {
            var sql = @"UPDATE TaskItems 
                        SET IsCompleted = TRUE, 
                            CompletedAt = @CompletedAt,
                            UpdatedAt = @UpdatedAt
                        WHERE Id = @Id AND TenantId = @TenantId";
            var affected = await ExecuteAsync(sql, new { Id = id, CompletedAt = completedAt, UpdatedAt = DateTime.UtcNow }, transaction);
            return affected > 0;
        }

        public async Task<bool> MarkAsCompletedByAssignerAsync(int id, DateTime completedAt, System.Data.IDbTransaction? transaction = null)
        {
            var sql = @"UPDATE TaskItems 
                        SET IsCompleted = TRUE, 
                            CompletedAt = @CompletedAt,
                            UpdatedAt = @UpdatedAt
                        WHERE Id = @Id";
            var affected = await _dbConnection.ExecuteAsync(sql, new { Id = id, CompletedAt = completedAt, UpdatedAt = DateTime.UtcNow }, transaction);
            return affected > 0;
        }

        public async Task<bool> PostponeChainAsync(string chainId, string userId, int minOrder, int daysToShift, System.Data.IDbTransaction? transaction = null)
        {
            var sql = @"SELECT * FROM TaskItems 
                        WHERE ChainId = @ChainId 
                          AND UserId = @UserId
                          AND ChainOrder >= @MinOrder 
                          AND IsCompleted = FALSE"; 

            var tasks = await QueryAsync<TaskItem>(sql, new { ChainId = chainId, UserId = userId, MinOrder = minOrder }, transaction);

            var updateSql = @"UPDATE TaskItems 
                              SET Deadline = @Deadline, 
                                  UpdatedAt = @UpdatedAt 
                              WHERE Id = @Id AND TenantId = @TenantId";

            foreach (var task in tasks)
            {
                if (task.Deadline.HasValue)
                {
                    task.Deadline = task.Deadline.Value.AddDays(daysToShift);
                    // OriginalDeadline ellenmez! (Bulgu 3)
                }
                await ExecuteAsync(updateSql, new { Deadline = task.Deadline, UpdatedAt = DateTime.UtcNow, Id = task.Id }, transaction);
            }
            return tasks.Any();
        }

        public async Task<bool> PostponeChainByAssignerAsync(string chainId, string userId, int minOrder, int daysToShift, System.Data.IDbTransaction? transaction = null)
        {
            var sql = @"SELECT * FROM TaskItems 
                        WHERE ChainId = @ChainId 
                          AND UserId = @UserId
                          AND ChainOrder >= @MinOrder 
                          AND IsCompleted = FALSE"; 

            // BaseRepository sorgusu yerine doğrudan connection kullanıyoruz
            var tasks = await _dbConnection.QueryAsync<TaskItem>(sql, new { ChainId = chainId, UserId = userId, MinOrder = minOrder }, transaction);

            var updateSql = @"UPDATE TaskItems 
                              SET Deadline = @Deadline, 
                                  UpdatedAt = @UpdatedAt 
                              WHERE Id = @Id";

            foreach (var task in tasks)
            {
                if (task.Deadline.HasValue)
                {
                    task.Deadline = task.Deadline.Value.AddDays(daysToShift);
                }
                await _dbConnection.ExecuteAsync(updateSql, new { Deadline = task.Deadline, UpdatedAt = DateTime.UtcNow, Id = task.Id }, transaction);
            }
            return tasks.Any();
        }

        public async Task<bool> HandleWorkspaceLeaveAsync(int workspaceId, string userId, System.Data.IDbTransaction? transaction = null)
        {
            var selectSql = "SELECT * FROM TaskItems WHERE UserId = @UserId AND AssignedByWorkspaceId = @WorkspaceId";
            var tasks = await QueryAsync<TaskItem>(selectSql, new { UserId = userId, WorkspaceId = workspaceId }, transaction);
            
            foreach(var task in tasks)
            {
                if(task.IsCompleted)
                {
                    var updateSql = @"UPDATE TaskItems 
                                      SET AssignedByWorkspaceId = NULL, 
                                          UserTaskSnapshot = @Snapshot 
                                      WHERE Id = @Id AND TenantId = @TenantId";
                    var snapshot = System.Text.Json.JsonSerializer.Serialize(new { 
                        WorkspaceId = workspaceId, 
                        LeftAt = DateTime.UtcNow,
                        Note = "Kullanıcı çalışma alanından ayrıldı, bu görev performans kayıtları için korundu."
                    });
                    await ExecuteAsync(updateSql, new { Snapshot = snapshot, Id = task.Id }, transaction);
                }
                else
                {
                    await DeleteAsync(task.Id, transaction);
                }
            }
            return true;
        }

        public async Task<bool> HasIncompletePreviousChainTaskAsync(string chainId, string userId, int currentOrder)
        {
            var sql = @"SELECT COUNT(1) FROM TaskItems 
                        WHERE ChainId = @ChainId 
                          AND UserId = @UserId 
                          AND ChainOrder < @CurrentOrder 
                          AND IsCompleted = FALSE";
            
            var count = await QueryFirstOrDefaultAsync<int>(sql, new { ChainId = chainId, UserId = userId, CurrentOrder = currentOrder });
            return count > 0;
        }
    }
}
