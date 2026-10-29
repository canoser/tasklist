using Dapper;
using MentorumApi.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MentorumApi.Data
{
    /// <summary>V5 izin/tenant helper'ı (Aşama 1.5): CourseAccessHelper + GetCourseStudentIds + program_id doğrulama.</summary>
    public class SchoolAccessRepository
    {
        private readonly DbConnectionFactory _connectionFactory;
        public SchoolAccessRepository(DbConnectionFactory connectionFactory) { _connectionFactory = connectionFactory; }

        public async Task<CourseAccessDto?> GetCourseAccessAsync(Guid courseId, Guid teacherId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<CourseAccessDto>(@"
                SELECT id AS CourseId, teacher_id AS TeacherId, program_id AS ProgramId,
                       name AS Name, type AS Type, color AS Color,
                       (COALESCE(teacher_can_view_profile, 0) = 1) AS CanViewProfile,
                       (COALESCE(teacher_can_view_contact, 0) = 1) AS CanViewContact,
                       (COALESCE(teacher_can_view_homework, 0) = 1) AS CanViewHomework,
                       (COALESCE(teacher_can_manage_homework, 0) = 1) AS CanManageHomework,
                       (COALESCE(teacher_can_view_exams, 0) = 1) AS CanViewExams,
                       (COALESCE(teacher_can_manage_exams, 0) = 1) AS CanManageExams,
                       (COALESCE(teacher_can_view_notes, 0) = 1) AS CanViewNotes,
                       (COALESCE(teacher_can_add_notes, 0) = 1) AS CanAddNotes,
                       (COALESCE(teacher_can_view_schedule, 0) = 1) AS CanViewSchedule,
                       (COALESCE(teacher_can_manage_schedule, 0) = 1) AS CanManageSchedule,
                       (COALESCE(teacher_can_process_homework, 0) = 1) AS CanProcessHomework
                FROM courses
                WHERE id = @CourseId AND teacher_id = @TeacherId AND is_active = 1",
                new { CourseId = courseId, TeacherId = teacherId });
        }

        public async Task<IEnumerable<Guid>> GetCourseStudentIdsAsync(Guid courseId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<Guid>(@"
                SELECT DISTINCT student_id FROM (
                    SELECT cs.student_id FROM course_students cs WHERE cs.course_id = @CourseId AND cs.is_active = 1
                    UNION
                    SELECT sgm.student_id FROM course_groups cg
                    JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1
                    WHERE cg.course_id = @CourseId
                ) AS t",
                new { CourseId = courseId });
        }

        public async Task<bool> IsTeacherInProgramAsync(Guid teacherId, Guid programId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var found = await conn.ExecuteScalarAsync<int?>(@"
                SELECT 1 FROM program_teachers WHERE teacher_id = @TeacherId AND program_id = @ProgramId AND is_active = 1",
                new { TeacherId = teacherId, ProgramId = programId });
            return found != null;
        }

        public async Task<List<Guid>> GetTeacherProgramIdsAsync(Guid teacherId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var ids = await conn.QueryAsync<Guid>(
                "SELECT program_id FROM program_teachers WHERE teacher_id = @TeacherId AND is_active = 1",
                new { TeacherId = teacherId });
            return ids.ToList();
        }

        public async Task<Guid?> GetStudentProgramIdAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<Guid?>(@"
                SELECT program_id FROM students WHERE id = @StudentId",
                new { StudentId = studentId });
        }

        public async Task<Guid?> GetGroupProgramIdAsync(Guid groupId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<Guid?>(@"
                SELECT program_id FROM student_groups WHERE id = @GroupId",
                new { GroupId = groupId });
        }

        public async Task<bool> IsStudentInCourseAsync(Guid courseId, Guid studentId)
        {
            var ids = await GetCourseStudentIdsAsync(courseId);
            return ids.Contains(studentId);
        }

        public static StudentTeacherViewDto MaskStudent(StudentDetailDto student, CourseAccessDto access)
        {
            return new StudentTeacherViewDto
            {
                Id = student.Id,
                FullName = student.FullName,
                Email = access.CanViewContact ? student.Email : null,
                AvatarUrl = access.CanViewContact ? student.AvatarUrl : null,
                Grade = access.CanViewProfile ? student.Grade : null,
                Track = access.CanViewProfile ? student.Track : null,
                TargetUniversity = access.CanViewProfile ? student.TargetUniversity : null,
                TargetDepartment = access.CanViewProfile ? student.TargetDepartment : null,
                TargetScore = access.CanViewProfile ? student.TargetScore : null,
                CoachingStartDate = access.CanViewProfile ? student.CoachingStartDate : null,
            };
        }

        // Öğretmenin dersleri (Aşama 6)
        public async Task<IEnumerable<CourseAccessDto>> GetTeacherCoursesAsync(Guid teacherId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CourseAccessDto>(@"
                SELECT courses.id AS CourseId, courses.teacher_id AS TeacherId, courses.program_id AS ProgramId,
                       courses.name AS Name, courses.type AS Type, courses.color AS Color,
                       cp.name AS ProgramName,
                       (COALESCE(teacher_can_view_profile, 0) = 1) AS CanViewProfile,
                       (COALESCE(teacher_can_view_contact, 0) = 1) AS CanViewContact,
                       (COALESCE(teacher_can_view_homework, 0) = 1) AS CanViewHomework,
                       (COALESCE(teacher_can_manage_homework, 0) = 1) AS CanManageHomework,
                       (COALESCE(teacher_can_view_exams, 0) = 1) AS CanViewExams,
                       (COALESCE(teacher_can_manage_exams, 0) = 1) AS CanManageExams,
                       (COALESCE(teacher_can_view_notes, 0) = 1) AS CanViewNotes,
                       (COALESCE(teacher_can_add_notes, 0) = 1) AS CanAddNotes,
                       (COALESCE(teacher_can_view_schedule, 0) = 1) AS CanViewSchedule,
                       (COALESCE(teacher_can_manage_schedule, 0) = 1) AS CanManageSchedule,
                       (COALESCE(teacher_can_process_homework, 0) = 1) AS CanProcessHomework
                FROM courses
                JOIN coaching_programs cp ON cp.id = courses.program_id
                WHERE courses.teacher_id = @TeacherId AND courses.is_active = 1
                ORDER BY courses.name",
                new { TeacherId = teacherId });
        }

        // Öğretmenin dersindeki öğrenciler (detay, maskeleme öncesi)
        public async Task<IEnumerable<StudentDetailDto>> GetTeacherCourseStudentsAsync(Guid courseId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<StudentDetailDto>(@"
                SELECT u.id, u.full_name AS FullName, u.email, u.avatar_url AS AvatarUrl,
                       s.grade, s.track, s.target_university AS TargetUniversity, s.is_active AS IsActive,
                       s.coaching_start_date AS CoachingStartDate, s.target_department AS TargetDepartment, s.target_score AS TargetScore
                FROM users u
                JOIN students s ON u.id = s.id
                WHERE s.id IN (
                    SELECT cs.student_id FROM course_students cs WHERE cs.course_id = @CourseId AND cs.is_active = 1
                    UNION
                    SELECT sgm.student_id FROM course_groups cg 
                    JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1
                    WHERE cg.course_id = @CourseId
                )
                ORDER BY u.full_name",
                new { CourseId = courseId });
        }

        public async Task<IEnumerable<dynamic>> GetTeacherCourseHomeworkAsync(Guid courseId)
        {
            // Not: Koçun AssignHomeworkAsync ile attığı course_id=NULL ödevler bu filtreyle öğretmene görünmez (kabul edilen davranış).
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync(@"
                SELECT h.id, h.student_id as ""studentId"", u.full_name as ""studentName"", h.snapshot_title as title, h.due_date as ""dueDate"", h.status as status, h.feedback as feedback, COALESCE(h.version, 1) as version
                FROM homework_assignments h
                JOIN users u ON u.id = h.student_id
                WHERE h.program_id = (SELECT program_id FROM courses WHERE id = @CourseId)
                  AND h.course_id = @CourseId
                  AND h.student_id IN (
                    SELECT cs.student_id FROM course_students cs WHERE cs.course_id = @CourseId AND cs.is_active = 1
                    UNION
                    SELECT sgm.student_id FROM course_groups cg 
                    JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1
                    WHERE cg.course_id = @CourseId
                )
                ORDER BY h.due_date DESC",
                new { CourseId = courseId });
        }

        public async Task<IEnumerable<dynamic>> GetTeacherCourseExamsAsync(Guid courseId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync(@"
                SELECT e.id, e.student_id as ""studentId"", u.full_name as ""studentName"", COALESCE(e.exam_name, e.exam_type) as name, e.exam_date as ""examDate"", e.total_net as ""totalNet""
                FROM exam_results e
                JOIN users u ON u.id = e.student_id
                WHERE e.program_id = (SELECT program_id FROM courses WHERE id = @CourseId)
                  AND e.course_id = @CourseId
                  AND e.student_id IN (
                    SELECT cs.student_id FROM course_students cs WHERE cs.course_id = @CourseId AND cs.is_active = 1
                    UNION
                    SELECT sgm.student_id FROM course_groups cg 
                    JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1
                    WHERE cg.course_id = @CourseId
                )
                ORDER BY e.exam_date DESC",
                new { CourseId = courseId });
        }

        // Öğrencinin dersleri (Aşama 10)
        public async Task<IEnumerable<dynamic>> GetStudentCoursesAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync(@"
                SELECT DISTINCT ON (CASE WHEN c.type = 'OZEL_DERS' THEN 'OZEL_DERS' ELSE c.id::text END)
                    c.id AS Id, 
                    c.name AS Name, 
                    c.type AS Type,
                    u.full_name AS TeacherName,
                    s.name AS SubjectName
                FROM courses c
                LEFT JOIN users u ON u.id = c.teacher_id
                LEFT JOIN subjects s ON s.id = c.subject_id
                WHERE c.is_active = 1
                  AND c.id IN (
                      SELECT cs.course_id FROM course_students cs WHERE cs.student_id = @StudentId AND cs.is_active = 1
                      UNION
                      SELECT cg.course_id FROM course_groups cg
                      JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1
                      WHERE sgm.student_id = @StudentId
                  )
                ORDER BY (CASE WHEN c.type = 'OZEL_DERS' THEN 'OZEL_DERS' ELSE c.id::text END), c.name",
                new { StudentId = studentId });
        }

        // --- Öğretmen oluşturma yetkileri (Aşama 3) ---
        public async Task<List<Guid>> CreateTeacherHomeworkAsync(Guid courseId, Guid teacherId, TeacherCreateHomeworkRequest req)
        {
            var access = await GetCourseAccessAsync(courseId, teacherId);
            if (access == null) throw new UnauthorizedAccessException("NOT_FOUND");
            if (!access.CanManageHomework) throw new InvalidOperationException("FORBIDDEN");

            var courseStudentIds = await GetCourseStudentIdsAsync(courseId);

            // Hedef: tek öğrenci veya dersin tümü (toplu atama).
            var targets = req.StudentId.HasValue
                ? (courseStudentIds.Contains(req.StudentId.Value)
                    ? new List<Guid> { req.StudentId.Value }
                    : throw new UnauthorizedAccessException("STUDENT_NOT_IN_COURSE"))
                : courseStudentIds.ToList();

            if (targets.Count == 0) throw new UnauthorizedAccessException("STUDENT_NOT_IN_COURSE");

            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            var created = new List<Guid>();
            try
            {
                foreach (var studentId in targets)
                {
                    var id = Guid.NewGuid();
                    await conn.ExecuteAsync(@"
                        INSERT INTO homework_assignments (id, subject_id, curriculum_topic_id, snapshot_title, snapshot_desc, snapshot_source, student_id, program_id, course_id, created_by, due_date, status, version, created_at, updated_at)
                        VALUES (@Id, @SubjectId, @CurriculumTopicId, @Title, @Description, @Source, @StudentId, @ProgramId, @CourseId, @CreatedBy, @DueDate, 'PENDING', 1, @Now, @Now)",
                        new
                        {
                            Id = id,
                            req.SubjectId,
                            req.CurriculumTopicId,
                            req.Title,
                            req.Description,
                            Source = req.FreeTopic,
                            StudentId = studentId,
                            ProgramId = access.ProgramId,
                            CourseId = courseId,
                            CreatedBy = teacherId,
                            req.DueDate,
                            Now = DateTime.UtcNow
                        }, tx);
                    created.Add(id);
                }
                tx.Commit();
            }
            catch { tx.Rollback(); throw; }

            return created;
        }

        public async Task<Guid> CreateTeacherExamAsync(Guid courseId, Guid teacherId, TeacherCreateExamRequest req)
        {
            var access = await GetCourseAccessAsync(courseId, teacherId);
            if (access == null) throw new UnauthorizedAccessException("NOT_FOUND");
            if (!access.CanManageExams) throw new InvalidOperationException("FORBIDDEN");

            var studentIds = await GetCourseStudentIdsAsync(courseId);
            if (!studentIds.Contains(req.StudentId)) throw new UnauthorizedAccessException("STUDENT_NOT_IN_COURSE");

            using var conn = _connectionFactory.CreateConnection();
            var id = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO exam_results (id, student_id, program_id, course_id, created_by, exam_date, exam_type, exam_name, total_net, created_at)
                VALUES (@Id, @StudentId, @ProgramId, @CourseId, @CreatedBy, @ExamDate, @ExamType, @ExamName, @TotalNet, @Now)",
                new
                {
                    Id = id,
                    req.StudentId,
                    ProgramId = access.ProgramId,
                    CourseId = courseId,
                    CreatedBy = teacherId,
                    req.ExamDate,
                    req.ExamType,
                    req.ExamName,
                    req.TotalNet,
                    Now = DateTime.UtcNow
                });
            return id;
        }

        /// <summary>
        /// Öğretmenin kendi dersindeki öğrencinin ödevini işlemesi (onay/geri bildirim/tamamlama).
        /// Yalnızca `teacher_can_process_homework = 1` olan derslerde çalışır.
        /// Ödev mutlaka öğretmenin kendi dersine (course_id) ait olmalıdır (cross-course koruması).
        /// </summary>
        public async Task<Guid> ReviewTeacherHomeworkAsync(Guid courseId, Guid teacherId, Guid assignmentId, TeacherReviewHomeworkRequest req)
        {
            var access = await GetCourseAccessAsync(courseId, teacherId);
            if (access == null) throw new UnauthorizedAccessException("NOT_FOUND");
            if (!access.CanProcessHomework) throw new InvalidOperationException("FORBIDDEN");

            var studentIds = await GetCourseStudentIdsAsync(courseId);

            using var conn = _connectionFactory.CreateConnection();
            var target = await conn.QuerySingleOrDefaultAsync<HomeworkReviewTarget>(@"
                SELECT id, student_id AS StudentId
                FROM homework_assignments
                WHERE id = @AssignmentId AND course_id = @CourseId",
                new { AssignmentId = assignmentId, CourseId = courseId });

            if (target == null || !studentIds.Contains(target.StudentId))
                throw new UnauthorizedAccessException("STUDENT_NOT_IN_COURSE");

            var status = req.Status == "DONE" ? "DONE" : "PENDING";
            var now = DateTime.UtcNow;
            var rows = await conn.ExecuteAsync(@"
                UPDATE homework_assignments
                SET status = @Status,
                    feedback = @Feedback,
                    completed_at = CASE WHEN @Status = 'DONE' THEN @Now ELSE completed_at END,
                    completed_by = CASE WHEN @Status = 'DONE' THEN 'Teacher' ELSE completed_by END,
                    version = version + 1,
                    updated_at = @Now
                WHERE id = @AssignmentId AND course_id = @CourseId AND (@ExpectedVersion IS NULL OR version = @ExpectedVersion)",
                new { 
                    Status = status, 
                    Feedback = req.Feedback ?? "", 
                    Now = now, 
                    AssignmentId = assignmentId, 
                    CourseId = courseId,
                    req.ExpectedVersion 
                });

            if (rows == 0)
            {
                var currentVer = await conn.QuerySingleOrDefaultAsync<int?>(
                    "SELECT version FROM homework_assignments WHERE id = @AssignmentId AND course_id = @CourseId",
                    new { AssignmentId = assignmentId, CourseId = courseId });
                if (currentVer != null && req.ExpectedVersion.HasValue && currentVer.Value != req.ExpectedVersion.Value)
                {
                    throw new InvalidOperationException("CONCURRENCY_CONFLICT");
                }
                throw new UnauthorizedAccessException("NOT_FOUND");
            }
            return assignmentId;
        }

        /// <summary>Öğretmenin dersteki öğrenciye ders içi performans notu bırakması (CanAddNotes).</summary>
        public async Task<Guid> AddTeacherNoteAsync(Guid courseId, Guid teacherId, Guid studentId, TeacherAddNoteRequest req)
        {
            var access = await GetCourseAccessAsync(courseId, teacherId);
            if (access == null) throw new UnauthorizedAccessException("NOT_FOUND");
            if (!access.CanAddNotes) throw new InvalidOperationException("FORBIDDEN");

            var studentIds = await GetCourseStudentIdsAsync(courseId);
            if (!studentIds.Contains(studentId)) throw new UnauthorizedAccessException("STUDENT_NOT_IN_COURSE");

            var visibility = req.Visibility == "COACH_ONLY" ? "COACH_ONLY" : "STUDENT_VISIBLE";

            using var conn = _connectionFactory.CreateConnection();
            var id = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO teacher_notes (id, program_id, course_id, student_id, teacher_id, note, summary, visibility, created_at)
                VALUES (@Id, @ProgramId, @CourseId, @StudentId, @TeacherId, @Note, @Summary, @Visibility, @Now)",
                new { Id = id, ProgramId = access.ProgramId, CourseId = courseId, StudentId = studentId, TeacherId = teacherId, Note = req.Note, Summary = req.Summary, Visibility = visibility, Now = DateTime.UtcNow });
            return id;
        }

        /// <summary>Öğretmenin dersteki öğrenci notlarını okuması (CanViewNotes) — tam not + özet + görünürlük döner.</summary>
        public async Task<IEnumerable<TeacherNoteDto>> GetTeacherNotesAsync(Guid courseId, Guid teacherId, Guid studentId)
        {
            var access = await GetCourseAccessAsync(courseId, teacherId);
            if (access == null) throw new UnauthorizedAccessException("NOT_FOUND");
            if (!access.CanViewNotes) throw new InvalidOperationException("FORBIDDEN");

            var studentIds = await GetCourseStudentIdsAsync(courseId);
            if (!studentIds.Contains(studentId)) throw new UnauthorizedAccessException("STUDENT_NOT_IN_COURSE");

            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<TeacherNoteDto>(@"
                SELECT id, note AS Note, summary AS Summary, visibility AS Visibility, created_at AS CreatedAt
                FROM teacher_notes
                WHERE course_id = @CourseId AND student_id = @StudentId
                ORDER BY created_at DESC",
                new { CourseId = courseId, StudentId = studentId });
        }

        /// <summary>Öğrenci veya veli için: yalnızca STUDENT_VISIBLE olanların summary + createdAt alanları.</summary>
        public async Task<IEnumerable<PublicTeacherNoteDto>> GetStudentVisibleTeacherNotesAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<PublicTeacherNoteDto>(@"
                SELECT id, summary AS Summary, created_at AS CreatedAt
                FROM teacher_notes
                WHERE student_id = @StudentId AND visibility = 'STUDENT_VISIBLE'
                ORDER BY created_at DESC",
                new { StudentId = studentId });
        }

        /// <summary>T30: Koç için öğrencinin tüm öğretmen notları (tam not + özet + görünürlük + öğretmen adı).</summary>
        public async Task<IEnumerable<dynamic>> GetStudentTeacherNotesForCoachAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync(@"
                SELECT 
                    tn.id, 
                    tn.course_id AS CourseId, 
                    c.name AS CourseName, 
                    tn.teacher_id AS TeacherId, 
                    u.full_name AS TeacherName, 
                    tn.note AS Note, 
                    tn.summary AS Summary, 
                    tn.visibility AS Visibility, 
                    tn.created_at AS CreatedAt
                FROM teacher_notes tn
                JOIN courses c ON c.id = tn.course_id
                JOIN users u ON u.id = tn.teacher_id
                WHERE tn.student_id = @StudentId
                ORDER BY tn.created_at DESC",
                new { StudentId = studentId });
        }

        public async Task<IEnumerable<RecentTeacherNoteDto>> GetRecentTeacherNotesForCoachAsync(Guid coachId, int limit = 10)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<RecentTeacherNoteDto>(@"
                SELECT 
                    tn.id, 
                    tn.student_id AS StudentId,
                    su.full_name AS StudentName,
                    tn.course_id AS CourseId, 
                    c.name AS CourseName, 
                    tn.teacher_id AS TeacherId, 
                    tu.full_name AS TeacherName, 
                    tn.note AS Note, 
                    tn.summary AS Summary, 
                    tn.visibility AS Visibility, 
                    tn.created_at AS CreatedAt
                FROM teacher_notes tn
                JOIN courses c ON c.id = tn.course_id
                JOIN users tu ON tu.id = tn.teacher_id
                JOIN users su ON su.id = tn.student_id
                JOIN students s ON s.id = tn.student_id
                WHERE s.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                ORDER BY tn.created_at DESC
                LIMIT @Limit",
                new { CoachId = coachId, Limit = limit });
        }

        private sealed class HomeworkReviewTarget
        {
            public Guid Id { get; set; }
            public Guid StudentId { get; set; }
        }
    }
}
