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
                       (SELECT COUNT(1) FROM homework_assignments ha WHERE ha.student_id = u.id AND ha.status = 'PENDING' AND ha.due_date >= CURRENT_DATE) AS active_homework_count,
                       (SELECT COUNT(1) FROM homework_assignments ha WHERE ha.student_id = u.id AND ha.status IN ('DONE','LATE_DONE')) AS completed_homework_count,
                       (SELECT COUNT(1) FROM homework_assignments ha WHERE ha.student_id = u.id AND (ha.status = 'OVERDUE' OR (ha.status = 'PENDING' AND ha.due_date < CURRENT_DATE))) AS overdue_homework_count,
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
                       s.target_score AS TargetScore, s.program_id AS ProgramId,
                       s.phone AS Phone, s.monthly_milestone AS MonthlyMilestone,
                       s.weekly_target_minutes AS WeeklyTargetMinutes, s.weekly_target_questions AS WeeklyTargetQuestions,
                       (SELECT g.id FROM student_group_members m JOIN student_groups g ON g.id = m.group_id WHERE m.student_id = u.id AND m.is_active = 1 LIMIT 1) AS GroupId,
                       (SELECT g.name FROM student_group_members m JOIN student_groups g ON g.id = m.group_id WHERE m.student_id = u.id AND m.is_active = 1 LIMIT 1) AS GroupName,
                       (SELECT COUNT(1) FROM course_students cs JOIN courses c ON c.id = cs.course_id WHERE cs.student_id = u.id AND cs.is_active = 1 AND c.type = 'OZEL_DERS') > 0 AS HasIndividualCourse,
                       COALESCE((SELECT SUM(minutes) FROM study_sessions ss WHERE ss.student_id = u.id AND (ss.started_at >= date_trunc('week', CURRENT_DATE) OR (ss.started_at IS NULL AND ss.created_at >= date_trunc('week', CURRENT_DATE)))), 0) AS ThisWeekStudyMinutes,
                       COALESCE((SELECT SUM(question_count) FROM study_sessions ss WHERE ss.student_id = u.id AND (ss.started_at >= date_trunc('week', CURRENT_DATE) OR (ss.started_at IS NULL AND ss.created_at >= date_trunc('week', CURRENT_DATE)))), 0) AS ThisWeekQuestionCount
                FROM users u 
                JOIN students s ON u.id = s.id 
                /**where**/";
            
            var detail = await QuerySingleOrDefaultWithTenantAsync<StudentDetailDto>(sql, new { StudentId = studentId }, coachId, "s.id = @StudentId AND s.is_active = 1", tableAlias: "s");
            if (detail != null)
            {
                var exams = await GetStudentExamsAsync(studentId);
                detail.ExamResults = exams.ToList();

                using var conn = _connectionFactory.CreateConnection();
                var parents = await conn.QueryAsync<CoachStudentParentDto>(@"
                    SELECT u.id AS Id, u.full_name AS FullName, u.email AS Email, sp.phone AS Phone, sp.relation AS Relation
                    FROM student_parents sp
                    JOIN users u ON u.id = sp.parent_id
                    WHERE sp.student_id = @StudentId AND sp.is_accepted = 1",
                    new { StudentId = studentId });
                detail.Parents = parents.ToList();

                var pendingInvites = await conn.QueryAsync<PendingParentInviteDto>(@"
                    SELECT id AS Id, email AS Email, code AS Code, expires_at AS ExpiresAt
                    FROM invite_tokens
                    WHERE related_id = @StudentId AND role = 'Parent' AND is_used = 0 AND expires_at > NOW()
                    ORDER BY created_at DESC",
                    new { StudentId = studentId });
                detail.PendingParentInvites = pendingInvites.ToList();
            }
            return detail;
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
            var exams = (await connection.QueryAsync<StudentExamDto>(@"
                SELECT id, exam_date AS ExamDate, exam_type AS ExamType, exam_name AS ExamName, total_net AS TotalNet, error_reasons AS ErrorReasons
                FROM exam_results
                WHERE student_id = @StudentId
                ORDER BY exam_date DESC, created_at DESC",
                new { StudentId = studentId })).ToList();

            if (exams.Count == 0) return exams;

            var examIds = exams.Select(e => e.Id).ToArray();
            var rawScores = (await connection.QueryAsync<ExamScoreRowDto>(@"
                SELECT exam_id AS ExamId, id AS Id, subject_id AS SubjectId, curriculum_topic_id AS CurriculumTopicId,
                       subject_code AS SubjectCode, subject_name AS SubjectName, unit_name AS UnitName, topic_name AS TopicName,
                       question_count AS QuestionCount, correct AS Correct, wrong AS Wrong, blank AS Blank,
                       net AS Net, score AS Score, max_score AS MaxScore
                FROM exam_scores
                WHERE exam_id = ANY(@ExamIds)",
                new { ExamIds = examIds })).ToList();

            var scoresByExam = rawScores.ToLookup(s => s.ExamId);
            foreach (var exam in exams)
            {
                exam.Scores = scoresByExam[exam.Id].Select(s => new ExamScoreDto
                {
                    Id = s.Id,
                    SubjectId = s.SubjectId,
                    CurriculumTopicId = s.CurriculumTopicId,
                    SubjectCode = s.SubjectCode,
                    SubjectName = s.SubjectName,
                    UnitName = s.UnitName,
                    TopicName = s.TopicName,
                    QuestionCount = s.QuestionCount,
                    Correct = s.Correct,
                    Wrong = s.Wrong,
                    Blank = s.Blank,
                    Net = s.Net,
                    Score = s.Score,
                    MaxScore = s.MaxScore
                }).ToList();
            }

            return exams;
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

                var existingCourseId = await conn.QuerySingleOrDefaultAsync<Guid?>(@"
                    SELECT c.id
                    FROM courses c
                    JOIN course_students cs ON cs.course_id = c.id
                    WHERE cs.student_id = @StudentId AND c.program_id = @ProgramId AND c.type = 'OZEL_DERS'
                    ORDER BY c.is_active DESC, c.created_at ASC
                    LIMIT 1",
                    new { StudentId = studentId, ProgramId = programId }, tx);

                var courseId = existingCourseId ?? Guid.NewGuid();
                if (existingCourseId == null)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO courses (id, program_id, name, type, is_active)
                        VALUES (@Id, @ProgramId, 'Bireysel Koçluk', 'OZEL_DERS', 1)",
                        new { Id = courseId, ProgramId = programId }, tx);
                }
                else
                {
                    await conn.ExecuteAsync("UPDATE courses SET is_active = 1, updated_at = NOW() WHERE id = @Id", new { Id = courseId }, tx);
                }

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
                var owned = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM students s
                    WHERE s.id = @StudentId
                      AND s.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)",
                    new { StudentId = studentId, CoachId = coachId }, tx);
                if (owned == null) return false;

                await conn.ExecuteAsync("UPDATE student_group_members SET is_active = 0 WHERE student_id = @StudentId", new { StudentId = studentId }, tx);
                await conn.ExecuteAsync("UPDATE course_students SET is_active = 0 WHERE student_id = @StudentId", new { StudentId = studentId }, tx);
                await conn.ExecuteAsync("UPDATE students SET is_active = 0, updated_at = NOW() WHERE id = @StudentId", new { StudentId = studentId }, tx);
                await conn.ExecuteAsync("UPDATE users SET is_active = 0 WHERE id = @StudentId", new { StudentId = studentId }, tx);

                tx.Commit();
                return true;
            }
            catch { tx.Rollback(); throw; }
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
                        var newFirst = !string.IsNullOrWhiteSpace(req.FirstName) ? req.FirstName.Trim() : (parts.Length > 0 ? parts[0] : "");
                        var newLast = !string.IsNullOrWhiteSpace(req.LastName) ? req.LastName.Trim() : (parts.Length > 1 ? parts[1] : "");
                        await conn.ExecuteAsync(
                            "UPDATE users SET full_name = @FullName, updated_at = NOW() WHERE id = @StudentId",
                            new { FullName = $"{newFirst} {newLast}".Trim(), StudentId = studentId }, tx);
                    }
                }

                var rows = await conn.ExecuteAsync(@"
                    UPDATE students SET
                        grade = COALESCE(@Grade, grade), track = COALESCE(@Track, track), phone = COALESCE(@Phone, phone),
                        target_university = COALESCE(@TargetUniversity, target_university), target_department = COALESCE(@TargetDepartment, target_department),
                        target_score = COALESCE(@TargetScore, target_score), monthly_milestone = COALESCE(@MonthlyMilestone, monthly_milestone),
                        weekly_target_minutes = COALESCE(@WeeklyTargetMinutes, weekly_target_minutes), weekly_target_questions = COALESCE(@WeeklyTargetQuestions, weekly_target_questions),
                        updated_at = NOW()
                    WHERE id = @StudentId",
                    new { Grade = req.ClassLevel, Track = track, req.Phone, req.TargetUniversity, req.TargetDepartment, req.TargetScore, req.MonthlyMilestone, req.WeeklyTargetMinutes, req.WeeklyTargetQuestions, StudentId = studentId }, tx);

                tx.Commit();
                return rows > 0;
            }
            catch { tx.Rollback(); throw; }
        }

        public async Task<Guid?> GetProgramIdAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<Guid?>(
                "SELECT program_id FROM students WHERE id = @Id",
                new { Id = studentId });
        }

        private static string? NormalizeTrack(string? targetExam)
        {
            if (string.IsNullOrWhiteSpace(targetExam)) return null;
            var t = targetExam.Trim().ToUpperInvariant();
            return t is "SAY" or "EA" or "SOZ" or "ORTAOKUL" ? t : null;
        }
    }
}
