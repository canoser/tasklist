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

        // --- Öğretmen kendi profili (Aşama 5) ---
        public async Task<TeacherProfileDto?> GetTeacherProfileAsync(Guid teacherId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var profile = await conn.QuerySingleOrDefaultAsync<TeacherProfileDto>(@"
                SELECT u.id, u.full_name AS FullName, u.email AS Email, u.avatar_url AS AvatarUrl
                FROM users u
                WHERE u.id = @TeacherId AND u.is_active = 1",
                new { TeacherId = teacherId });

            if (profile == null) return null;

            var programs = await conn.QueryAsync<string>(@"
                SELECT cp.name
                FROM program_teachers pt
                JOIN coaching_programs cp ON cp.id = pt.program_id
                WHERE pt.teacher_id = @TeacherId AND pt.is_active = 1 AND cp.is_active = 1",
                new { TeacherId = teacherId });
            profile.Programs = programs.ToList();

            var courses = await conn.QueryAsync<TeacherCourseInfoDto>(@"
                SELECT c.id, c.name, c.type
                FROM courses c
                WHERE c.teacher_id = @TeacherId AND c.is_active = 1
                ORDER BY c.name",
                new { TeacherId = teacherId });
            profile.Courses = courses.ToList();

            return profile;
        }

        // --- Koç için öğretmen detayı (Aşama 5) ---
        public async Task<TeacherDetailDto?> GetTeacherDetailAsync(Guid programId, Guid teacherId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var teacher = await conn.QuerySingleOrDefaultAsync<TeacherDetailDto>(@"
                SELECT t.id, u.full_name AS FullName, u.email AS Email, u.avatar_url AS AvatarUrl,
                       t.is_active AS IsActive, t.created_at AS CreatedAt
                FROM teachers t
                JOIN users u ON u.id = t.id
                WHERE t.id = @TeacherId AND t.program_id = @ProgramId
                  AND EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = @ProgramId AND pc.coach_id = @CoachId)",
                new { ProgramId = programId, TeacherId = teacherId, CoachId = coachId });

            if (teacher == null) return null;

            var courses = await conn.QueryAsync<TeacherCourseInfoDto>(@"
                SELECT c.id, c.name, c.type
                FROM courses c
                WHERE c.teacher_id = @TeacherId AND c.program_id = @ProgramId AND c.is_active = 1
                ORDER BY c.name",
                new { TeacherId = teacherId, ProgramId = programId });
            teacher.Courses = courses.ToList();

            teacher.StudentCount = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(DISTINCT sid) FROM (
                    SELECT cs.student_id AS sid FROM course_students cs
                    JOIN courses c ON c.id = cs.course_id
                    WHERE c.teacher_id = @TeacherId AND c.program_id = @ProgramId AND cs.is_active = 1
                    UNION
                    SELECT sgm.student_id FROM course_groups cg
                    JOIN courses c ON c.id = cg.course_id
                    JOIN student_group_members sgm ON sgm.group_id = cg.group_id
                    WHERE c.teacher_id = @TeacherId AND c.program_id = @ProgramId
                ) t",
                new { TeacherId = teacherId, ProgramId = programId });

            return teacher;
        }
    }
}
