using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class TeacherRepository
    {
        private readonly DbConnectionFactory _connectionFactory;
        public TeacherRepository(DbConnectionFactory connectionFactory) { _connectionFactory = connectionFactory; }

        public async Task<IEnumerable<TeacherDto>> GetTeachersAsync(Guid programId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<TeacherDto>(@"
                SELECT t.id, u.full_name AS FullName, u.email AS Email, u.avatar_url AS AvatarUrl,
                       t.is_active AS IsActive, t.created_at AS CreatedAt
                FROM teachers t
                JOIN users u ON u.id = t.id
                WHERE t.program_id = @ProgramId
                  AND EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = @ProgramId AND pc.coach_id = @CoachId)
                ORDER BY u.full_name",
                new { ProgramId = programId, CoachId = coachId });
        }

        public async Task<TeacherDto?> GetTeacherAsync(Guid programId, Guid teacherId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<TeacherDto>(@"
                SELECT t.id, u.full_name AS FullName, u.email AS Email, u.avatar_url AS AvatarUrl,
                       t.is_active AS IsActive, t.created_at AS CreatedAt
                FROM teachers t
                JOIN users u ON u.id = t.id
                WHERE t.id = @TeacherId AND t.program_id = @ProgramId
                  AND EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = @ProgramId AND pc.coach_id = @CoachId)",
                new { ProgramId = programId, TeacherId = teacherId, CoachId = coachId });
        }

        public async Task<string> DeactivateTeacherAsync(Guid programId, Guid teacherId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var owned = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM teachers t
                    WHERE t.id = @TeacherId AND t.program_id = @ProgramId
                      AND EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = @ProgramId AND pc.coach_id = @CoachId)",
                    new { ProgramId = programId, TeacherId = teacherId, CoachId = coachId }, tx);
                if (owned == null) return "NOT_FOUND";

                await conn.ExecuteAsync("UPDATE teachers SET is_active = 0 WHERE id = @TeacherId", new { TeacherId = teacherId }, tx);
                await conn.ExecuteAsync("UPDATE program_teachers SET is_active = 0 WHERE teacher_id = @TeacherId AND program_id = @ProgramId", new { TeacherId = teacherId, ProgramId = programId }, tx);
                await conn.ExecuteAsync("UPDATE courses SET teacher_id = NULL WHERE teacher_id = @TeacherId AND program_id = @ProgramId", new { TeacherId = teacherId, ProgramId = programId }, tx);

                tx.Commit();
                return "OK";
            }
            catch { tx.Rollback(); throw; }
        }
    }
}
