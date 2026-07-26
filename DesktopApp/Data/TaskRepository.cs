using System;
using System.Threading.Tasks;
using Dapper;
using planlama_app.Models;

namespace planlama_app.Data
{
    /// <summary>
    /// Tasks tablosu için veri erişim (Repository) katmanı.
    /// </summary>
    public class TaskRepository
    {
        // ---------------------------------------------------------------
        // 0. GÖREV EKLEME
        // ---------------------------------------------------------------

        /// <summary>
        /// Yeni bir görevi veritabanına ekler.
        /// </summary>
        public async Task<int> AddAsync(TaskItem task)
        {
            const string sql = """
                INSERT INTO Tasks (CategoryId, ResourceId, Title, DueDate, IsCompleted, TaskType, ChainId, OrderIndex, EstimatedTime)
                VALUES (@CategoryId, @ResourceId, @Title, @DueDate, @IsCompleted, @TaskType, @ChainId, @OrderIndex, @EstimatedTime);
                SELECT last_insert_rowid();
                """;

            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteScalarAsync<int>(sql, task);
        }

        public async Task<int> RestoreAsync(TaskItem task)
        {
            const string sql = """
                INSERT INTO Tasks (Id, CategoryId, ResourceId, Title, DueDate, IsCompleted, TaskType, ChainId, OrderIndex, EstimatedTime)
                VALUES (@Id, @CategoryId, @ResourceId, @Title, @DueDate, @IsCompleted, @TaskType, @ChainId, @OrderIndex, @EstimatedTime);
                """;

            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, task);
        }

        public async Task<int> RestoreMultipleAsync(System.Collections.Generic.IEnumerable<TaskItem> tasks)
        {
            const string sql = """
                INSERT INTO Tasks (Id, CategoryId, ResourceId, Title, DueDate, IsCompleted, TaskType, ChainId, OrderIndex, EstimatedTime)
                VALUES (@Id, @CategoryId, @ResourceId, @Title, @DueDate, @IsCompleted, @TaskType, @ChainId, @OrderIndex, @EstimatedTime);
                """;

            using var connection = DatabaseHelper.GetConnection();
            int count = 0;
            foreach(var task in tasks)
            {
                count += await connection.ExecuteAsync(sql, task);
            }
            return count;
        }

        public async Task<System.Collections.Generic.IEnumerable<TaskItem>> GetAllTasksAsync()
        {
            const string sql = """
                SELECT t.*, c.Name AS CategoryName, r.Title AS ResourceTitle, r.Url AS ResourceUrl 
                FROM Tasks t 
                LEFT JOIN Categories c ON t.CategoryId = c.Id 
                LEFT JOIN Resources r ON t.ResourceId = r.Id
                ORDER BY t.TaskType, t.ChainId, t.OrderIndex, t.DueDate;
                """;
            using var connection = DatabaseHelper.GetConnection();
            return await connection.QueryAsync<TaskItem>(sql);
        }

        /// <summary>
        /// Belirli bir kategoriye ait tüm görevlerin ResourceId değerini toplu günceller.
        /// </summary>
        public async Task<int> AssignResourceToCategoryAsync(int categoryId, int? resourceId)
        {
            const string sql = "UPDATE Tasks SET ResourceId = @ResourceId WHERE CategoryId = @CategoryId;";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, new { CategoryId = categoryId, ResourceId = resourceId });
        }

        // ---------------------------------------------------------------
        // 1. BAĞIMSIZ GÖREV ERTELEME: +1 Gün
        // ---------------------------------------------------------------

        public async Task<int> PostponeIndependentTaskAsync(int taskId)
        {
            const string sql = """
                UPDATE Tasks
                SET    DueDate = datetime(
                                    COALESCE(DueDate, datetime('now', 'localtime')),
                                    '+1 day'
                                )
                WHERE  Id      = @TaskId
                  AND  TaskType = 0;   -- 0 = Bağımsız
                """;

            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, new { TaskId = taskId });
        }

        // ---------------------------------------------------------------
        // 2. ZİNCİRLEME GÖREV ERTELEME (CASCADE): +1 Gün
        // ---------------------------------------------------------------

        public async Task<int> PostponeChainTaskCascadeAsync(int taskId)
        {
            const string selectSql = """
                SELECT Id, TaskType, ChainId, OrderIndex
                FROM   Tasks
                WHERE  Id = @TaskId;
                """;

            const string updateSql = """
                UPDATE Tasks
                SET    DueDate = datetime(
                                    COALESCE(DueDate, datetime('now', 'localtime')),
                                    '+1 day'
                                )
                WHERE  ChainId    = @ChainId
                  AND  OrderIndex >= @OrderIndex
                  AND  TaskType   = 1;   -- 1 = Zincirleme
                """;

            using var connection = DatabaseHelper.GetConnection();

            using var transaction = connection.BeginTransaction();

            try
            {
                var target = await connection.QuerySingleOrDefaultAsync<TaskItem>(
                    selectSql,
                    new { TaskId = taskId },
                    transaction);

                if (target is null || target.TaskType != TaskType.Zincirleme)
                    return 0;

                if (string.IsNullOrWhiteSpace(target.ChainId))
                    return 0;

                int updatedRows = await connection.ExecuteAsync(
                    updateSql,
                    new
                    {
                        target.ChainId,
                        target.OrderIndex
                    },
                    transaction);

                transaction.Commit();
                return updatedRows;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        // ---------------------------------------------------------------
        // 3. GÜNCELLEME VE SİLME
        // ---------------------------------------------------------------

        public async Task<int> UpdateAsync(TaskItem task)
        {
            const string sql = """
                UPDATE Tasks
                SET    CategoryId = @CategoryId,
                       ResourceId = @ResourceId,
                       Title = @Title,
                       DueDate = @DueDate,
                       IsCompleted = @IsCompleted,
                       TaskType = @TaskType,
                       ChainId = @ChainId,
                       OrderIndex = @OrderIndex,
                       EstimatedTime = @EstimatedTime
                WHERE  Id = @Id;
                """;

            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, task);
        }

        public async Task<int> DeleteAsync(int id)
        {
            const string sql = "DELETE FROM Tasks WHERE Id = @Id;";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, new { Id = id });
        }

        public async Task<int> DeleteMultipleAsync(System.Collections.Generic.IEnumerable<int> ids)
        {
            const string sql = "DELETE FROM Tasks WHERE Id IN @Ids;";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, new { Ids = ids });
        }
    }
}
