using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class WeeklyScheduleRepository : BaseRepository, IWeeklyScheduleRepository
    {
        public WeeklyScheduleRepository(IDbConnection dbConnection, ITenantProvider tenantProvider) 
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<WeeklySchedule?> GetLatestByStudentAsync(string studentId)
        {
            var sql = "SELECT * FROM WeeklySchedules WHERE StudentId = @studentId AND IsLatest = true LIMIT 1";
            return await QueryFirstOrDefaultAsync<WeeklySchedule>(sql, new { studentId });
        }

        public async Task<IEnumerable<WeeklySchedule>> GetHistoryByStudentAsync(string studentId, int limit)
        {
            var sql = "SELECT * FROM WeeklySchedules WHERE StudentId = @studentId ORDER BY Version DESC LIMIT @limit";
            return await QueryAsync<WeeklySchedule>(sql, new { studentId, limit });
        }

        public async Task<WeeklySchedule?> GetByIdAsync(int id)
        {
            var sql = "SELECT * FROM WeeklySchedules WHERE Id = @id LIMIT 1";
            return await QueryFirstOrDefaultAsync<WeeklySchedule>(sql, new { id });
        }

        public async Task<int> CreateAsync(WeeklySchedule schedule)
        {
            var sql = @"
                INSERT INTO WeeklySchedules 
                (TenantId, StudentId, WorkspaceId, Version, IsLatest, UpdatedByUserId, CreatedAt)
                VALUES 
                (@TenantId, @StudentId, @WorkspaceId, @Version, @IsLatest, @UpdatedByUserId, @CreatedAt)
                RETURNING Id;
            ";
            schedule.TenantId = _tenantId;
            return await ExecuteScalarAsync<int>(sql, schedule);
        }

        public async Task<bool> UpdateAsync(WeeklySchedule schedule)
        {
            var sql = @"
                UPDATE WeeklySchedules SET
                    IsLatest = @IsLatest,
                    UpdatedByUserId = @UpdatedByUserId
                WHERE Id = @Id;
            ";
            var affected = await ExecuteAsync(sql, schedule);
            return affected > 0;
        }

        public async Task<bool> DeleteOldVersionsAsync(string studentId, int keepCount)
        {
            var sql = @"
                DELETE FROM WeeklySchedules 
                WHERE StudentId = @studentId 
                AND Id NOT IN (
                    SELECT Id FROM WeeklySchedules 
                    WHERE StudentId = @studentId 
                    ORDER BY Version DESC 
                    LIMIT @keepCount
                );
            ";
            var affected = await ExecuteAsync(sql, new { studentId, keepCount });
            return affected > 0;
        }

        public async Task<IEnumerable<WeeklyScheduleBlock>> GetBlocksAsync(int scheduleId)
        {
            var sql = "SELECT * FROM WeeklyScheduleBlocks WHERE WeeklyScheduleId = @scheduleId";
            return await QueryAsync<WeeklyScheduleBlock>(sql, new { scheduleId });
        }

        public async Task<bool> CreateBlocksAsync(IEnumerable<WeeklyScheduleBlock> blocks)
        {
            var sql = @"
                INSERT INTO WeeklyScheduleBlocks 
                (TenantId, WeeklyScheduleId, DayOfWeek, StartTime, EndTime, Label, BlockType, IsLockedByCoach)
                VALUES 
                (@TenantId, @WeeklyScheduleId, @DayOfWeek, @StartTime, @EndTime, @Label, @BlockType, @IsLockedByCoach);
            ";
            
            int totalAffected = 0;
            foreach(var block in blocks)
            {
                block.TenantId = _tenantId;
                totalAffected += await ExecuteAsync(sql, block);
            }
            return totalAffected > 0;
        }
    }
}
