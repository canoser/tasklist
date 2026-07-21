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
        /// <param name="task">Eklenecek TaskItem nesnesi.</param>
        /// <returns>Eklenen satırın yeni Id'si.</returns>
        public async Task<int> AddAsync(TaskItem task)
        {
            const string sql = """
                INSERT INTO Tasks (CategoryId, Title, DueDate, IsCompleted, TaskType, ChainId, OrderIndex, EstimatedTime)
                VALUES (@CategoryId, @Title, @DueDate, @IsCompleted, @TaskType, @ChainId, @OrderIndex, @EstimatedTime);
                SELECT last_insert_rowid();
                """;

            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteScalarAsync<int>(sql, task);
        }

        public async Task<int> RestoreAsync(TaskItem task)
        {
            const string sql = """
                INSERT INTO Tasks (Id, CategoryId, Title, DueDate, IsCompleted, TaskType, ChainId, OrderIndex, EstimatedTime)
                VALUES (@Id, @CategoryId, @Title, @DueDate, @IsCompleted, @TaskType, @ChainId, @OrderIndex, @EstimatedTime);
                """;

            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, task);
        }

        public async Task<int> RestoreMultipleAsync(System.Collections.Generic.IEnumerable<TaskItem> tasks)
        {
            const string sql = """
                INSERT INTO Tasks (Id, CategoryId, Title, DueDate, IsCompleted, TaskType, ChainId, OrderIndex, EstimatedTime)
                VALUES (@Id, @CategoryId, @Title, @DueDate, @IsCompleted, @TaskType, @ChainId, @OrderIndex, @EstimatedTime);
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
                SELECT t.*, c.Name AS CategoryName 
                FROM Tasks t 
                LEFT JOIN Categories c ON t.CategoryId = c.Id 
                ORDER BY t.TaskType, t.ChainId, t.OrderIndex, t.DueDate;
                """;
            using var connection = DatabaseHelper.GetConnection();
            return await connection.QueryAsync<TaskItem>(sql);
        }

        // ---------------------------------------------------------------
        // 1. BAĞIMSIZ GÖREV ERTELEME: +1 Gün
        // ---------------------------------------------------------------

        /// <summary>
        /// Verilen Id'ye sahip bağımsız görevin DueDate'ini 1 gün ileri atar.
        /// DueDate null ise bugünün tarihini baz alır (bugün + 1 gün).
        /// </summary>
        /// <param name="taskId">Ertelenecek görevin Id'si.</param>
        /// <returns>Güncellenen satır sayısı.</returns>
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

        /// <summary>
        /// Verilen Id'ye sahip zincirleme görevin, kendisi dahil aynı zincirdeki
        /// sonraki tüm görevlerin (OrderIndex >= hedef görevin OrderIndex) DueDate'ini
        /// 1 gün ileri atar.
        /// <para>
        /// İşlem sırası:
        ///   1) Hedef görevi bul → TaskType ve OrderIndex doğrula.
        ///   2) Aynı ChainId, OrderIndex >= hedef, UPDATE CASCADE.
        /// İşlemler tek bir transaction içinde yürütülür; hata olursa
        /// hiçbir satır güncellenmez.
        /// </para>
        /// </summary>
        /// <param name="taskId">Zincirde başlangıç noktası olacak görevin Id'si.</param>
        /// <returns>
        /// Güncellenen toplam satır sayısı.
        /// Görev bulunamazsa veya Zincirleme tipinde değilse 0 döner.
        /// </returns>
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

            // Transaction: ya tümü güncellenir ya da hiçbiri
            using var transaction = connection.BeginTransaction();

            try
            {
                // Adım 1: Hedef görevi getir
                var target = await connection.QuerySingleOrDefaultAsync<TaskItem>(
                    selectSql,
                    new { TaskId = taskId },
                    transaction);

                // Görev yoksa veya Zincirleme değilse işlem yok
                if (target is null || target.TaskType != TaskType.Zincirleme)
                    return 0;

                // ChainId boş olmamalı (veri bütünlüğü koruması)
                if (string.IsNullOrWhiteSpace(target.ChainId))
                    return 0;

                // Adım 2: Cascade güncelleme
                int updatedRows = await connection.ExecuteAsync(
                    updateSql,
                    new
                    {
                        target.ChainId,
                        target.OrderIndex   // >= bu değer olan tüm görevler
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

        /// <summary>
        /// Belirtilen görevin verilerini veritabanında günceller.
        /// </summary>
        /// <param name="task">Güncellenecek TaskItem nesnesi.</param>
        /// <returns>Güncellenen satır sayısı.</returns>
        public async Task<int> UpdateAsync(TaskItem task)
        {
            const string sql = """
                UPDATE Tasks
                SET    CategoryId = @CategoryId,
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

        /// <summary>
        /// Belirtilen Id'ye sahip görevi siler.
        /// </summary>
        /// <param name="id">Silinecek görevin Id'si.</param>
        /// <returns>Silinen satır sayısı.</returns>
        public async Task<int> DeleteAsync(int id)
        {
            const string sql = "DELETE FROM Tasks WHERE Id = @Id;";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, new { Id = id });
        }

        /// <summary>
        /// Belirtilen Id listesindeki tüm görevleri tek seferde toplu siler.
        /// </summary>
        /// <param name="ids">Silinecek görevlerin Id listesi.</param>
        /// <returns>Silinen toplam satır sayısı.</returns>
        public async Task<int> DeleteMultipleAsync(System.Collections.Generic.IEnumerable<int> ids)
        {
            const string sql = "DELETE FROM Tasks WHERE Id IN @Ids;";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, new { Ids = ids });
        }
    }
}
