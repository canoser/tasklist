using System.Data;
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
                detail.Parents = (await conn.QueryAsync<CoachStudentParentDto>(
                    "SELECT u.id AS Id, u.full_name AS FullName, u.email AS Email, sp.phone AS Phone, sp.relation AS Relation FROM student_parents sp JOIN users u ON u.id = sp.parent_id WHERE sp.student_id = @StudentId AND sp.is_accepted = 1",
                    new { StudentId = studentId })).ToList();
                detail.PendingParentInvites = (await conn.QueryAsync<PendingParentInviteDto>(
                    "SELECT id AS Id, email AS Email, code AS Code, expires_at AS ExpiresAt FROM invite_tokens WHERE related_id = @StudentId AND role = 'Parent' AND is_used = 0 AND expires_at > NOW() ORDER BY created_at DESC",
                    new { StudentId = studentId })).ToList();
                detail.Permissions = await GetStudentPermissionsInternalAsync(conn, studentId);
            }
            return detail;
        }

        public async Task<IEnumerable<StudentNoteDto>> GetStudentNotesAsync(Guid coachId, Guid studentId)
        {
            var sql = "SELECT id, student_id AS StudentId, content, created_at AS CreatedAt, updated_at AS UpdatedAt FROM coach_notes /**where**/ ORDER BY created_at DESC";
            return await QueryWithTenantAsync<StudentNoteDto>(sql, new { StudentId = studentId }, coachId, "student_id = @StudentId");
        }

        public async Task<int> AddStudentNoteAsync(Guid coachId, Guid studentId, string content)
        {
            var sql = @"INSERT INTO coach_notes (id, student_id, program_id, created_by, content, created_at, updated_at)
                        SELECT @Id, @StudentId, program_id, @CreatedBy, @Content, @Now, @Now FROM students
                        WHERE id = @StudentId AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CreatedBy)";
            using var connection = _connectionFactory.CreateConnection();
            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = Guid.NewGuid(), StudentId = studentId, CreatedBy = coachId, Content = content, Now = DateTime.UtcNow });
            if (rowsAffected == 0) throw new UnauthorizedAccessException("Öğrenci size ait değil veya bulunamadı.");
            return rowsAffected;
        }

        public async Task<StudentProfileDto?> GetStudentProfileAsync(Guid studentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var profile = await connection.QuerySingleOrDefaultAsync<StudentProfileDto>(@"
                SELECT u.id, u.full_name AS FullName, COALESCE(u.email, '') AS Email, u.avatar_url AS AvatarUrl,
                       s.grade, s.track, s.target_university AS TargetUniversity, s.target_department AS TargetDepartment,
                       s.target_score AS TargetScore, s.coaching_start_date AS CoachingStartDate,
                       (pc.coach_id IS NOT NULL) AS HasCoach, pc.coach_id AS CoachId, cu.full_name AS CoachName, cu.email AS CoachEmail
                FROM users u JOIN students s ON u.id = s.id
                LEFT JOIN LATERAL (SELECT coach_id FROM program_coaches WHERE program_id = s.program_id ORDER BY CASE WHEN role = 'YONETICI' THEN 0 ELSE 1 END LIMIT 1) pc ON true
                LEFT JOIN users cu ON cu.id = pc.coach_id
                WHERE u.id = @StudentId AND u.is_active = 1", new { StudentId = studentId });
            if (profile != null)
            {
                profile.Parents = (await connection.QueryAsync<StudentParentInfoDto>(
                    "SELECT sp.parent_id AS ParentId, pu.full_name AS ParentName, sp.relation AS Relation FROM student_parents sp JOIN users pu ON pu.id = sp.parent_id WHERE sp.student_id = @StudentId AND sp.is_accepted = 1 AND pu.is_active = 1",
                    new { StudentId = studentId })).ToList();
                profile.Permissions = await GetStudentPermissionsInternalAsync(connection, studentId);
            }
            return profile;
        }

        public async Task<IEnumerable<StudentExamDto>> GetStudentExamsAsync(Guid studentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var exams = (await connection.QueryAsync<StudentExamDto>(
                "SELECT id, exam_date AS ExamDate, exam_type AS ExamType, exam_name AS ExamName, total_net AS TotalNet, error_reasons AS ErrorReasons, created_by AS CreatedBy, (created_by = student_id) AS CreatedByStudent FROM exam_results WHERE student_id = @StudentId ORDER BY exam_date DESC, created_at DESC",
                new { StudentId = studentId })).ToList();
            if (exams.Count == 0) return exams;

            var examIds = exams.Select(e => e.Id).ToArray();
            var rawScores = (await connection.QueryAsync<ExamScoreRowDto>(
                "SELECT exam_id AS ExamId, id AS Id, subject_id AS SubjectId, curriculum_topic_id AS CurriculumTopicId, subject_code AS SubjectCode, subject_name AS SubjectName, unit_name AS UnitName, topic_name AS TopicName, question_count AS QuestionCount, correct AS Correct, wrong AS Wrong, blank AS Blank, net AS Net, score AS Score, max_score AS MaxScore FROM exam_scores WHERE exam_id = ANY(@ExamIds)",
                new { ExamIds = examIds })).ToList();
            var scoresByExam = rawScores.ToLookup(s => s.ExamId);
            foreach (var exam in exams)
                exam.Scores = scoresByExam[exam.Id].Select(s => new ExamScoreDto { Id = s.Id, SubjectId = s.SubjectId, CurriculumTopicId = s.CurriculumTopicId, SubjectCode = s.SubjectCode, SubjectName = s.SubjectName, UnitName = s.UnitName, TopicName = s.TopicName, QuestionCount = s.QuestionCount, Correct = s.Correct, Wrong = s.Wrong, Blank = s.Blank, Net = s.Net, Score = s.Score, MaxScore = s.MaxScore }).ToList();
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

        private static string? NormalizeTrack(string? targetExam)
        {
            if (string.IsNullOrWhiteSpace(targetExam)) return null;
            var t = targetExam.Trim().ToUpperInvariant();
            return t is "SAY" or "EA" or "SOZ" or "DIL" or "ORTAOKUL" ? t : null;
        }

        private static async Task<StudentPermissionsDto> GetStudentPermissionsInternalAsync(IDbConnection conn, Guid studentId, IDbTransaction? tx = null)
        {
            return await conn.QuerySingleOrDefaultAsync<StudentPermissionsDto>(@"
                SELECT (can_complete_topics = 1) AS CanCompleteTopics, (can_complete_homework = 1) AS CanCompleteHomework,
                       (can_edit_goals = 1) AS CanEditGoals, (can_add_exam_results = 1) AS CanAddExamResults,
                       (can_manage_resources = 1) AS CanManageResources, (can_self_assign_work = 1) AS CanSelfAssignWork
                FROM students WHERE id = @StudentId", new { StudentId = studentId }, tx) ?? new StudentPermissionsDto();
        }

        public async Task<(Guid ProgramId, bool HasCoach, StudentPermissionsDto Permissions)?> GetStudentAutonomyStateAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var row = await conn.QuerySingleOrDefaultAsync<(Guid ProgramId, bool HasCoach)>(@"
                SELECT s.program_id AS ProgramId, EXISTS(SELECT 1 FROM program_coaches pc WHERE pc.program_id = s.program_id) AS HasCoach
                FROM students s WHERE s.id = @StudentId AND s.is_active = 1", new { StudentId = studentId });
            if (row.ProgramId == Guid.Empty) return null;
            var perms = await GetStudentPermissionsInternalAsync(conn, studentId);
            return (row.ProgramId, row.HasCoach, perms);
        }

        public async Task<bool> UpdateStudentPermissionsAsync(Guid coachId, Guid studentId, UpdateStudentPermissionsRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE students SET
                    can_complete_topics = @T, can_complete_homework = @H, can_edit_goals = @G,
                    can_add_exam_results = @E, can_manage_resources = @R, can_self_assign_work = @W, updated_at = NOW()
                WHERE id = @StudentId AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)",
                new { StudentId = studentId, CoachId = coachId, T = req.CanCompleteTopics ? 1 : 0, H = req.CanCompleteHomework ? 1 : 0, G = req.CanEditGoals ? 1 : 0, E = req.CanAddExamResults ? 1 : 0, R = req.CanManageResources ? 1 : 0, W = req.CanSelfAssignWork ? 1 : 0 });
            return rows > 0;
        }

        public async Task<IEnumerable<ConnectionSearchCandidateDto>> SearchIndependentStudentsAsync(Guid coachId, string query, bool isAdmin)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2) return Enumerable.Empty<ConnectionSearchCandidateDto>();
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<ConnectionSearchCandidateDto>(@"
                SELECT u.id AS Id, u.full_name AS FullName, u.email AS Email, s.phone AS Phone, s.grade AS Grade, s.track AS Track,
                       EXISTS(SELECT 1 FROM coach_student_requests r WHERE r.coach_id = @CoachId AND r.student_id = u.id AND r.status = 'PENDING') AS HasPendingRequest
                FROM users u JOIN students s ON s.id = u.id
                WHERE u.role = 'Student' AND u.is_active = 1 AND s.is_active = 1 AND u.approval_status = 'APPROVED'
                  AND (@IsAdmin = true OR NOT EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = s.program_id))
                  AND (u.full_name ILIKE @Q OR u.email ILIKE @Q OR s.phone ILIKE @Q)
                ORDER BY u.full_name LIMIT 20",
                new { CoachId = coachId, IsAdmin = isAdmin, Q = $"%{query.Trim()}%" });
        }

        public async Task<IEnumerable<ConnectionSearchCandidateDto>> SearchCoachesForStudentAsync(Guid studentId, string query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2) return Enumerable.Empty<ConnectionSearchCandidateDto>();
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<ConnectionSearchCandidateDto>(@"
                SELECT u.id AS Id, u.full_name AS FullName, u.email AS Email, c.phone AS Phone, c.specialty AS Specialty,
                       EXISTS(SELECT 1 FROM coach_student_requests r WHERE r.coach_id = u.id AND r.student_id = @StudentId AND r.status = 'PENDING') AS HasPendingRequest
                FROM users u JOIN coaches c ON c.id = u.id
                WHERE u.role = 'Coach' AND u.is_active = 1 AND u.approval_status = 'APPROVED' AND c.approval_status = 'APPROVED'
                  AND (u.full_name ILIKE @Q OR u.email ILIKE @Q OR c.phone ILIKE @Q)
                ORDER BY u.full_name LIMIT 20",
                new { StudentId = studentId, Q = $"%{query.Trim()}%" });
        }

        public async Task<string> CreateConnectionRequestAsync(Guid coachId, Guid studentId, string initiatedBy, string? note)
        {
            using var conn = _connectionFactory.CreateConnection();
            var hasCoach = await conn.ExecuteScalarAsync<bool>(
                "SELECT EXISTS(SELECT 1 FROM students s JOIN program_coaches pc ON pc.program_id = s.program_id WHERE s.id = @StudentId)", new { StudentId = studentId });
            if (hasCoach) return "ALREADY_HAS_COACH";
            var pending = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM coach_student_requests WHERE coach_id = @CoachId AND student_id = @StudentId AND status = 'PENDING'",
                new { CoachId = coachId, StudentId = studentId });
            if (pending > 0) return "ALREADY_PENDING";
            await conn.ExecuteAsync(@"
                INSERT INTO coach_student_requests (id, coach_id, student_id, initiated_by, status, note)
                VALUES (@Id, @CoachId, @StudentId, @InitiatedBy, 'PENDING', @Note)",
                new { Id = Guid.NewGuid(), CoachId = coachId, StudentId = studentId, InitiatedBy = initiatedBy, Note = note });
            return "OK";
        }

        public async Task<IEnumerable<ConnectionRequestDto>> GetConnectionRequestsAsync(Guid userId, bool isCoach)
        {
            using var conn = _connectionFactory.CreateConnection();
            var where = isCoach ? "r.coach_id = @UserId" : "r.student_id = @UserId";
            return await conn.QueryAsync<ConnectionRequestDto>($@"
                SELECT r.id AS Id, r.coach_id AS CoachId, cu.full_name AS CoachName, cu.email AS CoachEmail,
                       r.student_id AS StudentId, su.full_name AS StudentName, su.email AS StudentEmail,
                       r.initiated_by AS InitiatedBy, r.status AS Status, r.note AS Note, r.created_at AS CreatedAt
                FROM coach_student_requests r
                JOIN users cu ON cu.id = r.coach_id
                JOIN users su ON su.id = r.student_id
                WHERE {where} AND r.status = 'PENDING'
                ORDER BY r.created_at DESC", new { UserId = userId });
        }

        public async Task<string> RespondConnectionRequestAsync(Guid requestId, Guid actorUserId, bool actorIsCoach, bool accept, ProgramRepository programRepo)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var req = await conn.QuerySingleOrDefaultAsync<ConnectionRequestDto>(@"
                    SELECT id AS Id, coach_id AS CoachId, student_id AS StudentId, initiated_by AS InitiatedBy, status AS Status
                    FROM coach_student_requests WHERE id = @Id FOR UPDATE", new { Id = requestId }, tx);
                if (req == null || req.Status != "PENDING") { tx.Rollback(); return "NOT_FOUND"; }
                var canRespond = (actorIsCoach && req.CoachId == actorUserId && req.InitiatedBy == "Student") ||
                                 (!actorIsCoach && req.StudentId == actorUserId && req.InitiatedBy == "Coach");
                if (!canRespond) { tx.Rollback(); return "FORBIDDEN"; }

                if (!accept)
                {
                    await conn.ExecuteAsync("UPDATE coach_student_requests SET status = 'REJECTED', resolved_at = NOW() WHERE id = @Id", new { Id = requestId }, tx);
                    tx.Commit();
                    return "REJECTED";
                }

                var coachProgramId = await programRepo.EnsureDefaultWorkspaceInTxAsync(conn, tx, req.CoachId);
                await MigrateStudentWorkspaceInTxAsync(conn, tx, req.StudentId, coachProgramId, isCoachWorkspace: true);
                await conn.ExecuteAsync("UPDATE coach_student_requests SET status = 'ACCEPTED', resolved_at = NOW() WHERE id = @Id", new { Id = requestId }, tx);
                await conn.ExecuteAsync("UPDATE coach_student_requests SET status = 'CANCELLED', resolved_at = NOW() WHERE student_id = @StudentId AND status = 'PENDING' AND id <> @Id", new { req.StudentId, Id = requestId }, tx);
                tx.Commit();
                return "ACCEPTED";
            }
            catch { tx.Rollback(); throw; }
        }

        public async Task<bool> UnlinkCoachStudentAsync(Guid studentId, Guid? coachId, ProgramRepository programRepo)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                if (coachId.HasValue)
                {
                    var owned = await conn.ExecuteScalarAsync<int?>(
                        "SELECT 1 FROM students WHERE id = @StudentId AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)",
                        new { StudentId = studentId, CoachId = coachId.Value }, tx);
                    if (owned == null) { tx.Rollback(); return false; }
                }
                await conn.ExecuteAsync("UPDATE student_group_members SET is_active = 0 WHERE student_id = @StudentId", new { StudentId = studentId }, tx);
                await conn.ExecuteAsync("UPDATE course_students SET is_active = 0 WHERE student_id = @StudentId", new { StudentId = studentId }, tx);
                var personalProgramId = await programRepo.CreateOrGetPersonalWorkspaceInTxAsync(conn, tx, studentId);
                await MigrateStudentWorkspaceInTxAsync(conn, tx, studentId, personalProgramId, isCoachWorkspace: false);
                tx.Commit();
                return true;
            }
            catch { tx.Rollback(); throw; }
        }

        private static async Task MigrateStudentWorkspaceInTxAsync(IDbConnection conn, IDbTransaction tx, Guid studentId, Guid targetProgramId, bool isCoachWorkspace)
        {
            var closedFlag = isCoachWorkspace ? 0 : 1;
            await conn.ExecuteAsync(@"
                UPDATE students SET program_id = @ProgramId, coaching_start_date = CASE WHEN @IsCoach THEN COALESCE(coaching_start_date, CURRENT_DATE) ELSE coaching_start_date END,
                    can_complete_topics = 1, can_complete_homework = 1, can_edit_goals = 1,
                    can_add_exam_results = @ClosedFlag, can_manage_resources = @ClosedFlag, can_self_assign_work = @ClosedFlag, updated_at = NOW()
                WHERE id = @StudentId",
                new { StudentId = studentId, ProgramId = targetProgramId, IsCoach = isCoachWorkspace, ClosedFlag = closedFlag }, tx);

            foreach (var tbl in new[] { "homework_assignments", "exam_results", "study_sessions", "student_resources", "student_notes", "school_schedules", "student_checkins", "student_questions", "student_subjects" })
                await conn.ExecuteAsync($"UPDATE {tbl} SET program_id = @ProgramId WHERE student_id = @StudentId", new { ProgramId = targetProgramId, StudentId = studentId }, tx);
        }

        public async Task<IEnumerable<StudentResourceDto>> GetStudentResourcesAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<StudentResourceDto>(@"
                SELECT sr.id AS Id, sr.student_id AS StudentId, sr.program_id AS ProgramId, sr.subject_id AS SubjectId, s.name AS SubjectName,
                       sr.resource_type AS ResourceType, sr.title AS Title, sr.url_or_author AS UrlOrAuthor,
                       sr.total_units AS TotalUnits, sr.completed_units AS CompletedUnits, sr.created_by AS CreatedBy, sr.created_at AS CreatedAt
                FROM student_resources sr LEFT JOIN subjects s ON s.id = sr.subject_id
                WHERE sr.student_id = @StudentId ORDER BY sr.created_at DESC", new { StudentId = studentId });
        }

        public async Task<Guid> CreateStudentResourceAsync(Guid studentId, Guid programId, CreateStudentResourceRequest req, string createdBy)
        {
            using var conn = _connectionFactory.CreateConnection();
            var id = Guid.NewGuid();
            var rType = req.ResourceType is "BOOK" or "VIDEO" or "OTHER" ? req.ResourceType : "BOOK";
            await conn.ExecuteAsync(@"
                INSERT INTO student_resources (id, student_id, program_id, subject_id, resource_type, title, url_or_author, total_units, completed_units, created_by, grade)
                VALUES (@Id, @StudentId, @ProgramId, @SubjectId, @ResourceType, @Title, @UrlOrAuthor, @TotalUnits, @CompletedUnits, @CreatedBy, (SELECT grade FROM students WHERE id = @StudentId))",
                new { Id = id, StudentId = studentId, ProgramId = programId, req.SubjectId, ResourceType = rType, Title = req.Title.Trim(), req.UrlOrAuthor, TotalUnits = Math.Max(0, req.TotalUnits), CompletedUnits = Math.Max(0, req.CompletedUnits), CreatedBy = createdBy == "Coach" ? "Coach" : "Student" });
            return id;
        }

        public async Task<bool> UpdateStudentResourceAsync(Guid studentId, Guid resourceId, UpdateStudentResourceRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE student_resources SET
                    title = COALESCE(@Title, title), url_or_author = COALESCE(@UrlOrAuthor, url_or_author),
                    total_units = COALESCE(@TotalUnits, total_units), completed_units = COALESCE(@CompletedUnits, completed_units)
                WHERE id = @Id AND student_id = @StudentId",
                new { Id = resourceId, StudentId = studentId, req.Title, req.UrlOrAuthor, req.TotalUnits, req.CompletedUnits });
            return rows > 0;
        }

        public async Task<bool> DeleteStudentResourceAsync(Guid studentId, Guid resourceId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteAsync("DELETE FROM student_resources WHERE id = @Id AND student_id = @StudentId", new { Id = resourceId, StudentId = studentId }) > 0;
        }
    }
}
