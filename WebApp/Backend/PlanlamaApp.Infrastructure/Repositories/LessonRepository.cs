using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class LessonRepository : BaseRepository, ILessonRepository
    {
        public LessonRepository(IDbConnection dbConnection, ITenantProvider tenantProvider) 
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<LessonRecord?> GetByIdAsync(int id)
        {
            var sql = "SELECT * FROM LessonRecords WHERE Id = @id LIMIT 1";
            return await QueryFirstOrDefaultAsync<LessonRecord>(sql, new { id });
        }

        public async Task<IEnumerable<LessonRecord>> GetByCoachAsync(string coachUserId)
        {
            var sql = "SELECT * FROM LessonRecords WHERE CoachUserId = @coachUserId ORDER BY LessonDate DESC";
            return await QueryAsync<LessonRecord>(sql, new { coachUserId });
        }

        public async Task<IEnumerable<LessonRecord>> GetByStudentAsync(string studentId)
        {
            var sql = "SELECT * FROM LessonRecords WHERE StudentId = @studentId ORDER BY LessonDate DESC";
            return await QueryAsync<LessonRecord>(sql, new { studentId });
        }

        public async Task<int> CreateAsync(LessonRecord lesson)
        {
            var sql = @"
                INSERT INTO LessonRecords 
                (TenantId, CoachUserId, StudentId, WorkspaceId, CategoryId, SubjectName, LessonDate, DurationMinutes, Status, CoachNote, CreatedAt, UpdatedAt)
                VALUES 
                (@TenantId, @CoachUserId, @StudentId, @WorkspaceId, @CategoryId, @SubjectName, @LessonDate, @DurationMinutes, @Status, @CoachNote, @CreatedAt, @UpdatedAt)
                RETURNING Id;
            ";
            lesson.TenantId = _tenantId;
            return await ExecuteScalarAsync<int>(sql, lesson);
        }

        public async Task<bool> UpdateAsync(LessonRecord lesson)
        {
            var sql = @"
                UPDATE LessonRecords SET
                    StudentId = @StudentId,
                    CategoryId = @CategoryId,
                    SubjectName = @SubjectName,
                    LessonDate = @LessonDate,
                    DurationMinutes = @DurationMinutes,
                    Status = @Status,
                    CoachNote = @CoachNote,
                    UpdatedAt = @UpdatedAt
                WHERE Id = @Id;
            ";
            var affected = await ExecuteAsync(sql, lesson);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var sql = "DELETE FROM LessonRecords WHERE Id = @id";
            var affected = await ExecuteAsync(sql, new { id });
            return affected > 0;
        }
    }
}
