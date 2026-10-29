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
                    WHERE c.program_id = @ProgramId AND c.teacher_id IS NOT NULL AND c.is_active = 1 AND sgm.is_active = 1
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
                    JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1
                    WHERE c.teacher_id = @TeacherId AND c.program_id = @ProgramId AND c.is_active = 1
                ) t",
                new { TeacherId = teacherId, ProgramId = programId });

            return teacher;
        }

        public async Task<bool> UpdateTeacherAsync(Guid programId, Guid teacherId, UpdateTeacherRequest req, Guid coachId)
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

                if (owned == null) return false;

                var isActiveInt = req.IsActive ? 1 : 0;

                // 1. users tablosunu güncelle
                await conn.ExecuteAsync(@"
                    UPDATE users 
                    SET full_name = @FullName, is_active = @IsActive, updated_at = NOW()
                    WHERE id = @TeacherId",
                    new { FullName = req.FullName.Trim(), IsActive = isActiveInt, TeacherId = teacherId }, tx);

                // 2. teachers tablosunu güncelle
                await conn.ExecuteAsync(@"
                    UPDATE teachers
                    SET branch = @Branch, phone = @Phone, is_active = @IsActive
                    WHERE id = @TeacherId AND program_id = @ProgramId",
                    new { Branch = req.Branch?.Trim(), Phone = req.Phone?.Trim(), IsActive = isActiveInt, TeacherId = teacherId, ProgramId = programId }, tx);

                // 3. program_teachers tablosunu güncelle
                await conn.ExecuteAsync(@"
                    UPDATE program_teachers
                    SET is_active = @IsActive
                    WHERE teacher_id = @TeacherId AND program_id = @ProgramId",
                    new { IsActive = isActiveInt, TeacherId = teacherId, ProgramId = programId }, tx);

                tx.Commit();
                return true;
            }
            catch { tx.Rollback(); throw; }
        }

        public async Task<TeacherStudentsResponseDto> GetTeacherStudentsAsync(Guid programId, Guid teacherId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            
            // Program sahiplik kontrolü
            var owned = await conn.ExecuteScalarAsync<int?>(@"
                SELECT 1 FROM teachers t
                WHERE t.id = @TeacherId AND t.program_id = @ProgramId
                  AND EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = @ProgramId AND pc.coach_id = @CoachId)",
                new { ProgramId = programId, TeacherId = teacherId, CoachId = coachId });

            if (owned == null) throw new UnauthorizedAccessException("Program veya öğretmen bulunamadı.");

            var rawRows = (await conn.QueryAsync<TeacherStudentRawRow>(@"
                -- Bireysel veya doğrudan kurs kayıtları
                SELECT u.id AS StudentId, u.full_name AS StudentName, u.email AS Email, s.phone AS Phone,
                       s.track AS TargetExam, s.grade AS ClassLevel, c.name AS CourseName,
                       cs.is_active AS IsActive, cs.enrolled_at AS EnrolledAt
                FROM course_students cs
                JOIN courses c ON c.id = cs.course_id
                JOIN users u ON u.id = cs.student_id
                JOIN students s ON s.id = u.id
                WHERE c.program_id = @ProgramId AND c.teacher_id = @TeacherId

                UNION ALL

                -- Grup üzerinden gelen kayıtlar
                SELECT u.id AS StudentId, u.full_name AS StudentName, u.email AS Email, s.phone AS Phone,
                       s.track AS TargetExam, s.grade AS ClassLevel, c.name AS CourseName,
                       sgm.is_active AS IsActive, sgm.joined_at AS EnrolledAt
                FROM course_groups cg
                JOIN courses c ON c.id = cg.course_id
                JOIN student_group_members sgm ON sgm.group_id = cg.group_id
                JOIN users u ON u.id = sgm.student_id
                JOIN students s ON s.id = u.id
                WHERE c.program_id = @ProgramId AND c.teacher_id = @TeacherId",
                new { ProgramId = programId, TeacherId = teacherId })).ToList();

            var grouped = rawRows.GroupBy(r => r.StudentId).ToList();

            var result = new TeacherStudentsResponseDto();

            foreach (var g in grouped)
            {
                var first = g.First();
                var anyActive = g.Any(x => x.IsActive == 1);
                var courses = g.Select(x => x.CourseName).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList();

                var item = new TeacherStudentItemDto
                {
                    StudentId = first.StudentId,
                    StudentName = first.StudentName,
                    Email = first.Email,
                    Phone = first.Phone,
                    TargetExam = first.TargetExam,
                    ClassLevel = first.ClassLevel,
                    Courses = courses,
                    IsActive = anyActive,
                    EnrolledAt = g.Min(x => x.EnrolledAt)
                };

                if (anyActive)
                    result.ActiveStudents.Add(item);
                else
                    result.PastStudents.Add(item);
            }

            result.ActiveStudents = result.ActiveStudents.OrderBy(s => s.StudentName).ToList();
            result.PastStudents = result.PastStudents.OrderBy(s => s.StudentName).ToList();

            return result;
        }

        public async Task<TeacherHomeworkStatsDto> GetTeacherHomeworkStatsAsync(Guid programId, Guid teacherId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();

            var owned = await conn.ExecuteScalarAsync<int?>(@"
                SELECT 1 FROM teachers t
                WHERE t.id = @TeacherId AND t.program_id = @ProgramId
                  AND EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = @ProgramId AND pc.coach_id = @CoachId)",
                new { ProgramId = programId, TeacherId = teacherId, CoachId = coachId });

            if (owned == null) throw new UnauthorizedAccessException("Program veya öğretmen bulunamadı.");

            var rawRows = (await conn.QueryAsync<(Guid Id, Guid StudentId, string StudentName, string CourseTitle, string Status, DateTime? DueDate, DateTime? CompletedAt)>(@"
                SELECT ha.id AS Id, ha.student_id AS StudentId, u.full_name AS StudentName,
                       c.name AS CourseTitle, ha.status AS Status, ha.due_date AS DueDate, ha.completed_at AS CompletedAt
                FROM homework_assignments ha
                JOIN courses c ON c.id = ha.course_id
                JOIN users u ON u.id = ha.student_id
                WHERE (c.teacher_id = @TeacherId OR ha.created_by = @TeacherId)
                  AND ha.program_id = @ProgramId
                ORDER BY ha.due_date DESC",
                new { ProgramId = programId, TeacherId = teacherId })).ToList();

            var total = rawRows.Count;
            var completed = rawRows.Count(r => r.Status == "DONE" || r.Status == "LATE_DONE");
            var pending = rawRows.Count(r => r.Status == "PENDING");
            var overdue = rawRows.Count(r => r.Status == "OVERDUE");
            var returnRate = total > 0 ? Math.Round((double)completed / total * 100.0, 1) : 0.0;

            var studentSummaries = rawRows
                .GroupBy(r => new { r.StudentId, r.StudentName, r.CourseTitle })
                .Select(g =>
                {
                    var studentTotal = g.Count();
                    var studentDone = g.Count(x => x.Status == "DONE" || x.Status == "LATE_DONE");
                    var rate = studentTotal > 0 ? Math.Round((double)studentDone / studentTotal * 100.0, 1) : 0.0;
                    var latest = g.OrderByDescending(x => x.DueDate).First();

                    return new TeacherStudentHomeworkSummaryDto
                    {
                        StudentId = g.Key.StudentId,
                        StudentName = g.Key.StudentName,
                        CourseTitle = g.Key.CourseTitle,
                        TotalAssigned = studentTotal,
                        Completed = studentDone,
                        ReturnRate = rate,
                        LastStatus = latest.Status,
                        LastDueDate = latest.DueDate
                    };
                })
                .OrderByDescending(s => s.TotalAssigned)
                .ThenBy(s => s.StudentName)
                .ToList();

            return new TeacherHomeworkStatsDto
            {
                TotalHomeworks = total,
                CompletedHomeworks = completed,
                PendingHomeworks = pending,
                OverdueHomeworks = overdue,
                ReturnRate = returnRate,
                StudentSummaries = studentSummaries
            };
        }

        public async Task<TeacherExamStatsDto> GetTeacherExamStatsAsync(Guid programId, Guid teacherId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();

            var owned = await conn.ExecuteScalarAsync<int?>(@"
                SELECT 1 FROM teachers t
                WHERE t.id = @TeacherId AND t.program_id = @ProgramId
                  AND EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = @ProgramId AND pc.coach_id = @CoachId)",
                new { ProgramId = programId, TeacherId = teacherId, CoachId = coachId });

            if (owned == null) throw new UnauthorizedAccessException("Program veya öğretmen bulunamadı.");

            var rawRows = (await conn.QueryAsync<TeacherStudentExamSummaryDto>(@"
                SELECT er.id AS ExamId, COALESCE(er.exam_name, 'Deneme Sınavı') AS ExamTitle,
                       COALESCE(er.exam_type, 'Deneme') AS ExamType,
                       er.exam_date AS ExamDate, er.student_id AS StudentId, u.full_name AS StudentName,
                       COALESCE(c.name, 'Genel') AS CourseTitle, COALESCE(er.total_net, 0) AS TotalNet
                FROM exam_results er
                JOIN users u ON u.id = er.student_id
                LEFT JOIN courses c ON c.id = er.course_id
                WHERE (er.created_by = @TeacherId OR c.teacher_id = @TeacherId)
                  AND er.program_id = @ProgramId
                ORDER BY er.exam_date DESC, er.created_at DESC",
                new { ProgramId = programId, TeacherId = teacherId })).ToList();

            return new TeacherExamStatsDto
            {
                TotalExams = rawRows.Count,
                ExamResults = rawRows
            };
        }

        private sealed class TeacherStudentRawRow
        {
            public Guid StudentId { get; set; }
            public string StudentName { get; set; } = string.Empty;
            public string? Email { get; set; }
            public string? Phone { get; set; }
            public string? TargetExam { get; set; }
            public int? ClassLevel { get; set; }
            public string CourseName { get; set; } = string.Empty;
            public int IsActive { get; set; }
            public DateTime? EnrolledAt { get; set; }
        }
    }
}
