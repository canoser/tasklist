using MentorumApi.DTOs;
using MentorumApi.Services;
using Dapper;

namespace MentorumApi.Data
{
    public class StudentRepository : BaseRepository
    {
        public StudentRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<StudentListDto>> GetStudentsByCoachAsync(Guid coachId)
        {
            var sql = @"
                SELECT u.id, u.full_name AS FullName, u.email, u.avatar_url AS AvatarUrl, 
                       s.grade, s.track, s.target_university AS TargetUniversity, s.is_active AS IsActive,
                       s.program_id AS ProgramId, cp.name AS ProgramName,
                       s.invite_status AS InviteStatus,
                       (SELECT g.name FROM student_group_members m JOIN student_groups g ON g.id = m.group_id WHERE m.student_id = u.id AND m.is_active = 1 LIMIT 1) AS GroupName,
                       (SELECT COUNT(1) FROM course_students cs JOIN courses c ON c.id = cs.course_id WHERE cs.student_id = u.id AND cs.is_active = 1 AND c.type = 'OZEL_DERS') > 0 AS HasIndividualCourse,
                       (SELECT COUNT(1) FROM homework_assignments ha WHERE ha.student_id = u.id AND ha.status IN ('PENDING','OVERDUE')) AS active_homework_count,
                       (SELECT COUNT(1) FROM homework_assignments ha WHERE ha.student_id = u.id AND ha.status IN ('DONE','LATE_DONE')) AS completed_homework_count,
                       (SELECT COUNT(1) FROM homework_assignments ha WHERE ha.student_id = u.id AND ha.status = 'OVERDUE') AS overdue_homework_count,
                       COALESCE((SELECT SUM(minutes) FROM study_sessions ss WHERE ss.student_id = u.id AND (ss.started_at >= date_trunc('week', CURRENT_DATE) OR (ss.started_at IS NULL AND ss.created_at >= date_trunc('week', CURRENT_DATE)))), 0) AS ThisWeekStudyMinutes,
                       COALESCE((SELECT SUM(question_count) FROM study_sessions ss WHERE ss.student_id = u.id AND (ss.started_at >= date_trunc('week', CURRENT_DATE) OR (ss.started_at IS NULL AND ss.created_at >= date_trunc('week', CURRENT_DATE)))), 0) AS ThisWeekQuestionCount,
                       (SELECT total_net FROM exam_results er WHERE er.student_id = u.id ORDER BY er.exam_date DESC LIMIT 1) AS LastExamNet,
                       (SELECT total_net FROM exam_results er WHERE er.student_id = u.id ORDER BY er.exam_date DESC OFFSET 1 LIMIT 1) AS PrevExamNet
                FROM users u 
                JOIN students s ON u.id = s.id 
                LEFT JOIN coaching_programs cp ON cp.id = s.program_id
                /**where**/ 
                ORDER BY u.full_name";
            
            return await QueryWithTenantAsync<StudentListDto>(sql, new {}, coachId, additionalWhere: "s.is_active = 1", tableAlias: "s");
        }

        public virtual async Task<StudentDetailDto?> GetStudentDetailAsync(Guid coachId, Guid studentId)
        {
            var sql = @"
                SELECT u.id, u.full_name AS FullName, u.email, u.avatar_url AS AvatarUrl, 
                       s.grade, s.track, s.target_university AS TargetUniversity, s.is_active AS IsActive,
                       s.coaching_start_date AS CoachingStartDate, s.target_department AS TargetDepartment,
                       s.target_score AS TargetScore, s.program_id AS ProgramId
                FROM users u 
                JOIN students s ON u.id = s.id 
                /**where**/";
            
            return await QuerySingleOrDefaultWithTenantAsync<StudentDetailDto>(sql, new { StudentId = studentId }, coachId, "s.id = @StudentId AND s.is_active = 1", tableAlias: "s");
        }

        public async Task<IEnumerable<StudentNoteDto>> GetStudentNotesAsync(Guid coachId, Guid studentId)
        {
            var sql = @"
                SELECT id, student_id AS StudentId, content, created_at AS CreatedAt, updated_at AS UpdatedAt
                FROM coach_notes
                /**where**/
                ORDER BY created_at DESC";

            return await QueryWithTenantAsync<StudentNoteDto>(sql, new { StudentId = studentId }, coachId, "student_id = @StudentId");
        }

        public async Task<int> AddStudentNoteAsync(Guid coachId, Guid studentId, string content)
        {
            var sql = @"
                INSERT INTO coach_notes (id, student_id, program_id, created_by, content, created_at, updated_at)
                SELECT @Id, @StudentId, program_id, @CreatedBy, @Content, @Now, @Now
                FROM students 
                WHERE id = @StudentId AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CreatedBy)";
            
            using var connection = _connectionFactory.CreateConnection();
            var rowsAffected = await connection.ExecuteAsync(sql, new { 
                Id = Guid.NewGuid(),
                StudentId = studentId,
                CreatedBy = coachId,
                Content = content,
                Now = DateTime.UtcNow
            });
            
            if (rowsAffected == 0)
                throw new UnauthorizedAccessException("Öğrenci size ait değil veya bulunamadı.");
                
            return rowsAffected;
        }

        // --- Öğrenci kendi verisi (Aşama 1) ---
        public async Task<StudentProfileDto?> GetStudentProfileAsync(Guid studentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var profile = await connection.QuerySingleOrDefaultAsync<StudentProfileDto>(@"
                SELECT u.id, u.full_name AS FullName, u.email, u.avatar_url AS AvatarUrl,
                       s.grade, s.track, s.target_university AS TargetUniversity,
                       s.target_department AS TargetDepartment, s.target_score AS TargetScore,
                       s.coaching_start_date AS CoachingStartDate
                FROM users u
                JOIN students s ON u.id = s.id
                WHERE u.id = @StudentId AND u.is_active = 1",
                new { StudentId = studentId });

            if (profile != null)
            {
                var parents = await connection.QueryAsync<StudentParentInfoDto>(@"
                    SELECT sp.parent_id AS ParentId, pu.full_name AS ParentName, sp.relation AS Relation
                    FROM student_parents sp
                    JOIN users pu ON pu.id = sp.parent_id
                    WHERE sp.student_id = @StudentId AND sp.is_accepted = 1 AND pu.is_active = 1",
                    new { StudentId = studentId });
                profile.Parents = parents.ToList();
            }

            return profile;
        }

        public async Task<IEnumerable<StudentExamDto>> GetStudentExamsAsync(Guid studentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<StudentExamDto>(@"
                SELECT id, exam_date AS ExamDate, exam_type AS ExamType, exam_name AS ExamName, total_net AS TotalNet
                FROM exam_results
                WHERE student_id = @StudentId
                ORDER BY exam_date DESC",
                new { StudentId = studentId });
        }

        public async Task<StudentGoalDto?> GetStudentGoalAsync(Guid studentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<StudentGoalDto>(@"
                SELECT target_university AS TargetUniversity, target_department AS TargetDepartment, target_score AS TargetScore
                FROM students
                WHERE id = @StudentId",
                new { StudentId = studentId });
        }

        public async Task<int> UpdateStudentGoalAsync(Guid studentId, UpdateStudentGoalRequest req)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.ExecuteAsync(@"
                UPDATE students
                SET target_university = @TargetUniversity,
                    target_department = @TargetDepartment,
                    target_score = @TargetScore,
                    updated_at = @Now
                WHERE id = @StudentId",
                new { StudentId = studentId, req.TargetUniversity, req.TargetDepartment, req.TargetScore, Now = DateTime.UtcNow });
        }

        public async Task<IEnumerable<CoachingSessionDto>> GetCoachingSessionsAsync(Guid coachId, Guid studentId)
        {
            var check = await GetStudentDetailAsync(coachId, studentId);
            if (check == null) return Array.Empty<CoachingSessionDto>();

            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CoachingSessionDto>(@"
                SELECT id AS Id, coach_id AS CoachId, student_id AS StudentId, session_date AS SessionDate, title AS Title, notes AS Notes, action_items AS ActionItems, prep_notes AS PrepNotes, created_at AS CreatedAt
                FROM coaching_sessions
                WHERE student_id = @StudentId
                ORDER BY session_date DESC NULLS LAST",
                new { StudentId = studentId });
        }

        public async Task<IEnumerable<CoachingSessionDto>> GetStudentSessionsAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CoachingSessionDto>(@"
                SELECT id AS Id, coach_id AS CoachId, student_id AS StudentId, session_date AS SessionDate, title AS Title, notes AS Notes, action_items AS ActionItems, prep_notes AS PrepNotes, created_at AS CreatedAt
                FROM coaching_sessions
                WHERE student_id = @StudentId
                ORDER BY session_date DESC NULLS LAST",
                new { StudentId = studentId });
        }

        public async Task<bool> UpdateSessionPrepAsync(Guid studentId, Guid sessionId, string prepNotes)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE coaching_sessions SET prep_notes = @PrepNotes WHERE id = @SessionId AND student_id = @StudentId",
                new { PrepNotes = prepNotes, SessionId = sessionId, StudentId = studentId });
            return rows > 0;
        }

        public async Task<Guid> CreateCoachingSessionAsync(Guid coachId, Guid studentId, CreateCoachingSessionRequest req)
        {
            var id = Guid.NewGuid();
            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO coaching_sessions (id, coach_id, student_id, session_date, title, notes, action_items)
                VALUES (@Id, @CoachId, @StudentId, @SessionDate, @Title, @Notes, @ActionItems)",
                new { Id = id, CoachId = coachId, StudentId = studentId, req.SessionDate, Title = req.Title ?? "Koçluk Görüşmesi", req.Notes, req.ActionItems });
            return id;
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            using var conn = _connectionFactory.CreateConnection();
            var count = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM users WHERE email = @Email", new { Email = email });
            return count > 0;
        }

        public async Task<Guid> CreateStudentAsync(Guid programId, CreateStudentRequest req)
        {
            var studentId = Guid.NewGuid();
            var fullName = $"{req.FirstName} {req.LastName}".Trim();
            var email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.ToLowerInvariant();
            var track = NormalizeTrack(req.TargetExam);
            var inviteStatus = email != null ? "INVITED" : "NOT_INVITED";

            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                // V13.2: öğrenci limiti kontrolü (program sahibi koçun limiti)
                var maxStudents = await conn.QuerySingleOrDefaultAsync<int?>(
                    @"SELECT COALESCE(c.max_students, (SELECT value::int FROM system_settings WHERE key = 'default_max_students'))
                      FROM coaches c
                      WHERE c.id = (SELECT coach_id FROM program_coaches WHERE program_id = @ProgramId AND role = 'YONETICI' LIMIT 1)",
                    new { ProgramId = programId }, tx);
                if (maxStudents.HasValue)
                {
                    var activeStudents = await conn.ExecuteScalarAsync<int>(
                        "SELECT COUNT(1) FROM students WHERE program_id = @ProgramId AND is_active = 1",
                        new { ProgramId = programId }, tx);
                    if (activeStudents >= maxStudents.Value)
                        throw new InvalidOperationException("STUDENT_LIMIT_EXCEEDED");
                }

                await conn.ExecuteAsync(@"
                    INSERT INTO users (id, email, role, full_name, is_active)
                    VALUES (@Id, @Email, 'Student', @FullName, 1)",
                    new { Id = studentId, Email = email, FullName = fullName }, tx);

                await conn.ExecuteAsync(@"
                    INSERT INTO students (id, program_id, grade, track, is_active, invite_status)
                    VALUES (@Id, @ProgramId, @Grade, @Track, 1, @InviteStatus)",
                    new { Id = studentId, ProgramId = programId, Grade = req.ClassLevel, Track = track, InviteStatus = inviteStatus }, tx);

                if (email != null)
                {
                    var code = InviteCode.Generate();
                    await conn.ExecuteAsync(@"
                        INSERT INTO invite_tokens (id, token, code, email, role, related_id, expires_at)
                        VALUES (@Id, @Token, @Code, @Email, 'Student', @ProgramId, @ExpiresAt)",
                        new { Id = Guid.NewGuid(), Token = Guid.NewGuid(), Code = code, Email = email, ProgramId = programId, ExpiresAt = DateTime.UtcNow.AddHours(48) }, tx);
                }

                if (req.GroupId.HasValue)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO student_group_members (id, group_id, student_id, program_id, is_active)
                        SELECT @Id, @GroupId, @StudentId, @ProgramId, 1
                        WHERE EXISTS (SELECT 1 FROM student_groups WHERE id = @GroupId AND program_id = @ProgramId)",
                        new { Id = Guid.NewGuid(), GroupId = req.GroupId.Value, StudentId = studentId, ProgramId = programId }, tx);
                }
                else
                {
                    // V13.2: gruba eklenmiyorsa otomatik bireysel koçluk (OZEL_DERS) kursu aç
                    var courseId = Guid.NewGuid();
                    await conn.ExecuteAsync(@"
                        INSERT INTO courses (id, program_id, name, type, is_active)
                        VALUES (@Id, @ProgramId, @Name, 'OZEL_DERS', 1)",
                        new { Id = courseId, ProgramId = programId, Name = $"{fullName} — Bireysel Koçluk" }, tx);
                    await conn.ExecuteAsync(@"
                        INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
                        VALUES (@Id, @CourseId, @StudentId, @ProgramId, 1)",
                        new { Id = Guid.NewGuid(), CourseId = courseId, StudentId = studentId, ProgramId = programId }, tx);
                }

                tx.Commit();
                return studentId;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<(string Code, DateTime ExpiresAt)?> InviteStudentAsync(Guid programId, Guid studentId, string email)
        {
            var emailLower = email.ToLowerInvariant();
            var code = InviteCode.Generate();
            var expiresAt = DateTime.UtcNow.AddHours(48);

            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var updated = await conn.ExecuteAsync(@"
                    UPDATE users SET email = @Email
                    WHERE id = @StudentId
                      AND EXISTS (SELECT 1 FROM students WHERE id = @StudentId AND program_id = @ProgramId)",
                    new { Email = emailLower, StudentId = studentId, ProgramId = programId }, tx);
                if (updated == 0) { tx.Rollback(); return null; }

                await conn.ExecuteAsync("UPDATE students SET invite_status = 'INVITED' WHERE id = @StudentId", new { StudentId = studentId }, tx);
                await conn.ExecuteAsync(@"
                    INSERT INTO invite_tokens (id, token, code, email, role, related_id, expires_at)
                    VALUES (@Id, @Token, @Code, @Email, 'Student', @ProgramId, @ExpiresAt)",
                    new { Id = Guid.NewGuid(), Token = Guid.NewGuid(), Code = code, Email = emailLower, ProgramId = programId, ExpiresAt = expiresAt }, tx);

                tx.Commit();
                return (code, expiresAt);
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<bool> MoveToGroupAsync(Guid programId, Guid studentId, Guid groupId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var groupOk = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(1) FROM student_groups WHERE id = @GroupId AND program_id = @ProgramId",
                    new { GroupId = groupId, ProgramId = programId }, tx);
                if (groupOk == 0) { tx.Rollback(); return false; }

                await conn.ExecuteAsync(@"
                    INSERT INTO student_group_members (id, group_id, student_id, program_id, is_active)
                    VALUES (@Id, @GroupId, @StudentId, @ProgramId, 1)
                    ON CONFLICT (group_id, student_id) DO UPDATE SET is_active = 1",
                    new { Id = Guid.NewGuid(), GroupId = groupId, StudentId = studentId, ProgramId = programId }, tx);

                // V13.2 (hibrit): Gruba taşınan öğrencinin bireysel (OZEL_DERS) kursu AKTİF kalır;
                // böylece öğrenci hem grubun ortak ders/ödevlerini hem bireysel ders/ödevleri alabilir.
                // Geçmiş (ödev/sınav/not) student_id'ye bağlı olduğu için asla silinmez.

                tx.Commit();
                return true;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task MoveToIndividualAsync(Guid programId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                await conn.ExecuteAsync(@"
                    UPDATE student_group_members SET is_active = 0
                    WHERE student_id = @StudentId
                      AND group_id IN (SELECT id FROM student_groups WHERE program_id = @ProgramId)",
                    new { StudentId = studentId, ProgramId = programId }, tx);

                var courseId = Guid.NewGuid();
                await conn.ExecuteAsync(@"
                    INSERT INTO courses (id, program_id, name, type, is_active)
                    VALUES (@Id, @ProgramId, 'Bireysel Koçluk', 'OZEL_DERS', 1)",
                    new { Id = courseId, ProgramId = programId }, tx);

                await conn.ExecuteAsync(@"
                    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
                    VALUES (@Id, @CourseId, @StudentId, @ProgramId, 1)
                    ON CONFLICT (course_id, student_id) DO UPDATE SET is_active = 1",
                    new { Id = Guid.NewGuid(), CourseId = courseId, StudentId = studentId, ProgramId = programId }, tx);

                tx.Commit();
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<bool> DeleteStudentAsync(Guid coachId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                // IDOR Kontrolü: Öğrenci bu koçun yetkili olduğu bir programa mı kayıtlı?
                var owned = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM students s
                    WHERE s.id = @StudentId
                      AND s.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)",
                    new { StudentId = studentId, CoachId = coachId }, tx);

                if (owned == null) return false;

                // 1. Grup üyeliklerini pasife al
                await conn.ExecuteAsync(@"
                    UPDATE student_group_members 
                    SET is_active = 0 
                    WHERE student_id = @StudentId",
                    new { StudentId = studentId }, tx);

                // 2. Özel ders ve kurs kayıtlarını pasife al
                await conn.ExecuteAsync(@"
                    UPDATE course_students 
                    SET is_active = 0 
                    WHERE student_id = @StudentId",
                    new { StudentId = studentId }, tx);

                // 3. Öğrenci tablosunda pasife al
                await conn.ExecuteAsync(@"
                    UPDATE students 
                    SET is_active = 0, updated_at = NOW() 
                    WHERE id = @StudentId",
                    new { StudentId = studentId }, tx);

                // 4. Kullanıcı tablosunda pasife al
                await conn.ExecuteAsync(@"
                    UPDATE users 
                    SET is_active = 0 
                    WHERE id = @StudentId",
                    new { StudentId = studentId }, tx);

                tx.Commit();
                return true;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<bool> UpdateStudentAsync(Guid studentId, UpdateStudentRequest req)
        {
            var track = NormalizeTrack(req.TargetExam);

            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                if (!string.IsNullOrWhiteSpace(req.FirstName) || !string.IsNullOrWhiteSpace(req.LastName))
                {
                    var currentName = await conn.QuerySingleOrDefaultAsync<string>(
                        "SELECT full_name FROM users WHERE id = @StudentId", new { StudentId = studentId }, tx);

                    if (currentName != null)
                    {
                        var parts = currentName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                        var currentFirst = parts.Length > 0 ? parts[0] : "";
                        var currentLast = parts.Length > 1 ? parts[1] : "";

                        var newFirst = !string.IsNullOrWhiteSpace(req.FirstName) ? req.FirstName.Trim() : currentFirst;
                        var newLast = !string.IsNullOrWhiteSpace(req.LastName) ? req.LastName.Trim() : currentLast;
                        var newFullName = $"{newFirst} {newLast}".Trim();

                        await conn.ExecuteAsync(
                            "UPDATE users SET full_name = @FullName, updated_at = NOW() WHERE id = @StudentId",
                            new { FullName = newFullName, StudentId = studentId }, tx);
                    }
                }

                var rows = await conn.ExecuteAsync(@"
                    UPDATE students SET
                        grade = COALESCE(@Grade, grade),
                        track = COALESCE(@Track, track),
                        updated_at = NOW()
                    WHERE id = @StudentId",
                    new { Grade = req.ClassLevel, Track = track, StudentId = studentId }, tx);

                tx.Commit();
                return rows > 0;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        private static string? NormalizeTrack(string? targetExam)
        {
            if (string.IsNullOrWhiteSpace(targetExam)) return null;
            var t = targetExam.Trim().ToUpperInvariant();
            return t is "SAY" or "EA" or "SOZ" or "ORTAOKUL" ? t : null;
        }
    }
}
