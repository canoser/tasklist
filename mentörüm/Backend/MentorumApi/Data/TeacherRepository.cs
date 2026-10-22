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
            var teachers = (await conn.QueryAsync<TeacherDto>(@"
                SELECT t.id, u.full_name AS FullName, u.email AS Email, u.avatar_url AS AvatarUrl,
                       t.branch AS Branch, t.phone AS Phone,
                       t.is_active AS IsActive, t.created_at AS CreatedAt
                FROM teachers t
                JOIN users u ON u.id = t.id
                WHERE t.program_id = @ProgramId
                  AND EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = @ProgramId AND pc.coach_id = @CoachId)
                ORDER BY u.full_name",
                new { ProgramId = programId, CoachId = coachId })).ToList();

            if (teachers.Count == 0) return teachers;

            // Öğretmenlerin bu programdaki derslerini çek
            var courses = await conn.QueryAsync<(Guid TeacherId, Guid Id, string Name, string? Type)>(@"
                SELECT c.teacher_id AS TeacherId, c.id AS Id, c.name AS Name, c.type AS Type
                FROM courses c
                WHERE c.program_id = @ProgramId AND c.teacher_id IS NOT NULL AND c.is_active = 1
                ORDER BY c.name",
                new { ProgramId = programId });

            // Öğretmenlerin sorumlu olduğu tekil öğrenci sayılarını çek
            var studentCounts = await conn.QueryAsync<(Guid TeacherId, int Count)>(@"
                SELECT c.teacher_id AS TeacherId, COUNT(DISTINCT sid) AS Count
                FROM (
                    SELECT c.teacher_id, cs.student_id AS sid
                    FROM course_students cs
                    JOIN courses c ON c.id = cs.course_id
                    WHERE c.program_id = @ProgramId AND cs.is_active = 1 AND c.teacher_id IS NOT NULL
                    UNION
                    SELECT c.teacher_id, sgm.student_id AS sid
                    FROM course_groups cg
                    JOIN courses c ON c.id = cg.course_id
                    JOIN student_group_members sgm ON sgm.group_id = cg.group_id
                    WHERE c.program_id = @ProgramId AND c.teacher_id IS NOT NULL
                ) c
                GROUP BY c.teacher_id",
                new { ProgramId = programId });

            var courseLookup = courses.ToLookup(c => c.TeacherId, c => new TeacherCourseInfoDto { Id = c.Id, Name = c.Name, Type = c.Type });
            var countMap = studentCounts.ToDictionary(sc => sc.TeacherId, sc => sc.Count);

            foreach (var t in teachers)
            {
                t.Courses = courseLookup[t.Id].ToList();
                t.StudentCount = countMap.TryGetValue(t.Id, out var count) ? count : 0;
            }

            return teachers;
        }

        public async Task<TeacherDto?> GetTeacherAsync(Guid programId, Guid teacherId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<TeacherDto>(@"
                SELECT t.id, u.full_name AS FullName, u.email AS Email, u.avatar_url AS AvatarUrl,
                       t.branch AS Branch, t.phone AS Phone,
                       t.is_active AS IsActive, t.created_at AS CreatedAt
                FROM teachers t
                JOIN users u ON u.id = t.id
                WHERE t.id = @TeacherId AND t.program_id = @ProgramId
                  AND EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = @ProgramId AND pc.coach_id = @CoachId)",
                new { ProgramId = programId, TeacherId = teacherId, CoachId = coachId });
        }

        public async Task<Guid> DirectCreateTeacherAsync(Guid programId, DirectCreateTeacherRequest req, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var isCoach = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM program_coaches 
                    WHERE program_id = @ProgramId AND coach_id = @CoachId",
                    new { ProgramId = programId, CoachId = coachId }, tx);

                if (isCoach == null)
                    throw new UnauthorizedAccessException("Program bulunamadı veya yetkiniz yok.");

                var fullName = $"{req.FirstName.Trim()} {req.LastName.Trim()}";
                var email = !string.IsNullOrWhiteSpace(req.Email) 
                    ? req.Email.Trim().ToLowerInvariant() 
                    : $"ogretmen_{Guid.NewGuid():N}.{DateTime.UtcNow.Ticks}@mentorum.internal";

                var exists = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(1) FROM users WHERE LOWER(email) = @Email",
                    new { Email = email }, tx);

                if (exists > 0)
                    throw new InvalidOperationException("Bu e-posta adresi zaten kullanımda.");

                var rawPw = string.IsNullOrWhiteSpace(req.Password) ? "123456" : req.Password.Trim();
                var hash = BCrypt.Net.BCrypt.HashPassword(rawPw);

                var teacherId = Guid.NewGuid();

                // 1. users tablosuna ekle
                await conn.ExecuteAsync(@"
                    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
                    VALUES (@Id, @Email, @Hash, 'Teacher', @FullName, false, 'APPROVED', 1, NOW(), NOW())",
                    new { Id = teacherId, Email = email, Hash = hash, FullName = fullName }, tx);

                // 2. teachers tablosuna ekle
                await conn.ExecuteAsync(@"
                    INSERT INTO teachers (id, program_id, branch, phone, is_active, created_at)
                    VALUES (@Id, @ProgramId, @Branch, @Phone, 1, NOW())",
                    new { Id = teacherId, ProgramId = programId, Branch = req.Branch?.Trim(), Phone = req.Phone?.Trim() }, tx);

                // 3. program_teachers tablosuna ekle
                await conn.ExecuteAsync(@"
                    INSERT INTO program_teachers (id, program_id, teacher_id, is_active, added_by, created_at)
                    VALUES (@Id, @ProgramId, @TeacherId, 1, @CoachId, NOW())",
                    new { Id = Guid.NewGuid(), ProgramId = programId, TeacherId = teacherId, CoachId = coachId }, tx);

                // 4. Eğer ders atandıysa güncelle
                if (req.CourseIds != null && req.CourseIds.Count > 0)
                {
                    await conn.ExecuteAsync(@"
                        UPDATE courses 
                        SET teacher_id = @TeacherId, updated_at = NOW()
                        WHERE id = ANY(@CourseIds) AND program_id = @ProgramId",
                        new { TeacherId = teacherId, CourseIds = req.CourseIds.ToArray(), ProgramId = programId }, tx);
                }

                tx.Commit();
                return teacherId;
            }
            catch { tx.Rollback(); throw; }
        }

        public async Task<string> DeactivateTeacherAsync(Guid programId, Guid teacherId, Guid coachId, string? reason = null)
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

                await conn.ExecuteAsync(@"
                    UPDATE program_teachers 
                    SET is_active = 0, assignment_status = 'ENDED', ended_at = NOW(), end_reason = @Reason 
                    WHERE teacher_id = @TeacherId AND program_id = @ProgramId", 
                    new { TeacherId = teacherId, ProgramId = programId, Reason = reason }, tx);

                await conn.ExecuteAsync(@"
                    UPDATE courses 
                    SET teacher_id = NULL, assignment_status = 'ENDED', ended_at = NOW(), end_reason = @Reason 
                    WHERE teacher_id = @TeacherId AND program_id = @ProgramId", 
                    new { TeacherId = teacherId, ProgramId = programId, Reason = reason }, tx);

                // Öğretmenin başka aktif programı kalmadıysa global pasife al (diğer programlardaki üyeliği korunur).
                var activePrograms = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(1) FROM program_teachers WHERE teacher_id = @TeacherId AND is_active = 1",
                    new { TeacherId = teacherId }, tx);
                if (activePrograms == 0)
                    await conn.ExecuteAsync("UPDATE teachers SET is_active = 0 WHERE id = @TeacherId", new { TeacherId = teacherId }, tx);

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
                       t.branch AS Branch, t.phone AS Phone,
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
