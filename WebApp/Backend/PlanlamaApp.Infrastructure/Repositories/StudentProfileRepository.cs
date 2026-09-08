using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class StudentProfileRepository : BaseRepository, IStudentProfileRepository
    {
        public StudentProfileRepository(IDbConnection dbConnection, ITenantProvider tenantProvider) 
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<StudentProfile?> GetByStudentIdAsync(string studentId)
        {
            var sql = "SELECT * FROM StudentProfiles WHERE UserId = @studentId LIMIT 1";
            return await QueryFirstOrDefaultAsync<StudentProfile>(sql, new { studentId });
        }

        public async Task<StudentProfile?> GetByIdAsync(int id)
        {
            var sql = "SELECT * FROM StudentProfiles WHERE Id = @id LIMIT 1";
            return await QueryFirstOrDefaultAsync<StudentProfile>(sql, new { id });
        }

        public async Task<IEnumerable<StudentProfile>> GetByCoachAsync(string coachUserId)
        {
            var sql = "SELECT * FROM StudentProfiles WHERE CoachUserId = @coachUserId ORDER BY CreatedAt DESC";
            return await QueryAsync<StudentProfile>(sql, new { coachUserId });
        }

        public async Task<int> CreateAsync(StudentProfile profile)
        {
            var sql = @"
                INSERT INTO StudentProfiles 
                (TenantId, UserId, CoachUserId, WorkspaceId, TargetExam, TargetYear, TargetScore, SchoolName, Grade, ParentName, ParentPhone, CoachNotes, CreatedAt, UpdatedAt)
                VALUES 
                (@TenantId, @UserId, @CoachUserId, @WorkspaceId, @TargetExam, @TargetYear, @TargetScore, @SchoolName, @Grade, @ParentName, @ParentPhone, @CoachNotes, @CreatedAt, @UpdatedAt)
                RETURNING Id;
            ";
            profile.TenantId = _tenantId; // Required for INSERT manually if not using returning in BaseRepository
            return await ExecuteScalarAsync<int>(sql, profile);
        }

        public async Task<bool> UpdateAsync(StudentProfile profile)
        {
            var sql = @"
                UPDATE StudentProfiles SET
                    TargetExam = @TargetExam,
                    TargetYear = @TargetYear,
                    TargetScore = @TargetScore,
                    SchoolName = @SchoolName,
                    Grade = @Grade,
                    ParentName = @ParentName,
                    ParentPhone = @ParentPhone,
                    CoachNotes = @CoachNotes,
                    UpdatedAt = @UpdatedAt
                WHERE Id = @Id;
            ";
            var affected = await ExecuteAsync(sql, profile);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var sql = "DELETE FROM StudentProfiles WHERE Id = @id";
            var affected = await ExecuteAsync(sql, new { id });
            return affected > 0;
        }
    }
}
