using System.Data;
using Dapper;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    /// <summary>
    /// IPerformanceRepository'nin Dapper + SQLite üzerinde çalışan somut implementasyonu.
    /// Öğrencinin Doğru/Yanlış/Boş/Net verilerini yönetir ve analitik sorgular sunar.
    /// BaseRepository'nin TenantId filtre zırhı tüm sorgulara otomatik uygulanır.
    /// </summary>
    public class PerformanceRepository : BaseRepository, IPerformanceRepository
    {
        public PerformanceRepository(IDbConnection dbConnection, ITenantProvider tenantProvider)
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<IEnumerable<PerformanceRecord>> GetByUserIdAsync(string userId)
        {
            var sql = @"SELECT * FROM PerformanceRecords WHERE UserId = @UserId ORDER BY RecordedAt DESC";
            return await QueryAsync<PerformanceRecord>(sql, new { UserId = userId });
        }

        public async Task<PerformanceRecord?> GetByTaskItemIdAsync(int taskItemId)
        {
            var sql = @"SELECT * FROM PerformanceRecords WHERE TaskItemId = @TaskItemId";
            return await QueryFirstOrDefaultAsync<PerformanceRecord>(sql, new { TaskItemId = taskItemId });
        }

        public async Task<IEnumerable<PerformanceRecord>> GetByCategoryIdAsync(int categoryId)
        {
            var sql = @"SELECT * FROM PerformanceRecords WHERE CategoryId = @CategoryId ORDER BY RecordedAt DESC";
            return await QueryAsync<PerformanceRecord>(sql, new { CategoryId = categoryId });
        }

        public async Task<IEnumerable<PerformanceRecord>> GetByDateRangeAsync(string userId, DateTime start, DateTime end)
        {
            // Tarih aralığı bazlı analitik sorgu. BaseRepository "AND TenantId = @TenantId" ekler.
            var sql = @"SELECT * FROM PerformanceRecords 
                        WHERE UserId = @UserId 
                          AND RecordedAt >= @Start 
                          AND RecordedAt <= @End
                        ORDER BY RecordedAt ASC";
            return await QueryAsync<PerformanceRecord>(sql, new { UserId = userId, Start = start, End = end });
        }

        public async Task<PerformanceRecord?> GetByIdAsync(int id)
        {
            var sql = @"SELECT * FROM PerformanceRecords WHERE Id = @Id";
            return await QueryFirstOrDefaultAsync<PerformanceRecord>(sql, new { Id = id });
        }

        public async Task<int> CreateAsync(PerformanceRecord record)
        {
            // INSERT: TenantId kolonu sorguda zorunlu (BaseRepository kural).
            var sql = @"INSERT INTO PerformanceRecords 
                            (TenantId, UserId, TaskItemId, CategoryId, CorrectCount, WrongCount, EmptyCount, NetScore, Notes, TeacherFeedback, RecordedAt, StudyDurationMinutes, ExpectedDurationMinutes, UpdatedAt)
                        VALUES 
                            (@TenantId, @UserId, @TaskItemId, @CategoryId, @CorrectCount, @WrongCount, @EmptyCount, @NetScore, @Notes, @TeacherFeedback, @RecordedAt, @StudyDurationMinutes, @ExpectedDurationMinutes, @UpdatedAt)
                        RETURNING Id;";
            return await ExecuteScalarAsync<int>(sql, record);
        }

        public async Task<bool> UpdateAsync(PerformanceRecord record)
        {
            var sql = @"UPDATE PerformanceRecords 
                        SET CorrectCount = @CorrectCount,
                            WrongCount = @WrongCount,
                            EmptyCount = @EmptyCount,
                            NetScore = @NetScore,
                            Notes = @Notes,
                            TeacherFeedback = @TeacherFeedback,
                            StudyDurationMinutes = @StudyDurationMinutes,
                            ExpectedDurationMinutes = @ExpectedDurationMinutes,
                            UpdatedAt = @UpdatedAt
                        WHERE Id = @Id AND TenantId = @TenantId";
            var affected = await ExecuteAsync(sql, record);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var sql = @"DELETE FROM PerformanceRecords WHERE Id = @Id";
            var affected = await ExecuteAsync(sql, new { Id = id });
            return affected > 0;
        }
    }
}
