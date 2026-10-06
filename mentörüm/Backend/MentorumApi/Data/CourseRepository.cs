using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class CourseRepository
    {
        private readonly DbConnectionFactory _connectionFactory;
        public CourseRepository(DbConnectionFactory connectionFactory) { _connectionFactory = connectionFactory; }

        private const string CourseSelect = @"
            SELECT c.id, c.program_id AS ProgramId, c.subject_id AS SubjectId, c.teacher_id AS TeacherId,
                   c.name AS Name, c.type AS Type, c.color AS Color, c.is_active AS IsActive,
                   (COALESCE(c.teacher_can_view_profile, 0) = 1) AS TeacherCanViewProfile,
                   (COALESCE(c.teacher_can_view_contact, 0) = 1) AS TeacherCanViewContact,
                   (COALESCE(c.teacher_can_view_homework, 0) = 1) AS TeacherCanViewHomework,
                   (COALESCE(c.teacher_can_manage_homework, 0) = 1) AS TeacherCanManageHomework,
                   (COALESCE(c.teacher_can_view_exams, 0) = 1) AS TeacherCanViewExams,
                   (COALESCE(c.teacher_can_manage_exams, 0) = 1) AS TeacherCanManageExams,
                   (COALESCE(c.teacher_can_view_notes, 0) = 1) AS TeacherCanViewNotes,
                   (COALESCE(c.teacher_can_add_notes, 0) = 1) AS TeacherCanAddNotes,
                   (COALESCE(c.teacher_can_view_schedule, 0) = 1) AS TeacherCanViewSchedule,
                   (COALESCE(c.teacher_can_manage_schedule, 0) = 1) AS TeacherCanManageSchedule,
                   (SELECT COUNT(1) FROM course_students cs WHERE cs.course_id = c.id AND cs.is_active = 1) AS StudentCount";

        private async Task<bool> IsMemberAsync(Guid programId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var found = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId",
                new { ProgramId = programId, CoachId = coachId });
            return found != null;
        }

        public async Task<IEnumerable<CourseDto>> GetCoursesAsync(Guid programId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return Enumerable.Empty<CourseDto>();
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CourseDto>($@"
                {CourseSelect}
                FROM courses c
                WHERE c.program_id = @ProgramId AND c.is_active = 1
                ORDER BY c.name", new { ProgramId = programId });
        }

        public async Task<CourseDto?> GetCourseAsync(Guid programId, Guid courseId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return null;
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<CourseDto>($@"
                {CourseSelect}
                FROM courses c
                WHERE c.id = @CourseId AND c.program_id = @ProgramId AND c.is_active = 1",
                new { ProgramId = programId, CourseId = courseId });
        }

        public async Task<Guid> CreateCourseAsync(Guid programId, Guid coachId, CreateCourseRequest req)
        {
            if (!await IsMemberAsync(programId, coachId)) throw new UnauthorizedAccessException("FORBIDDEN");
            var id = Guid.NewGuid();
            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO courses (id, program_id, subject_id, teacher_id, name, type, color,
                    teacher_can_view_profile, teacher_can_view_contact, teacher_can_view_homework, teacher_can_manage_homework,
                    teacher_can_view_exams, teacher_can_manage_exams, teacher_can_view_notes, teacher_can_add_notes,
                    teacher_can_view_schedule, teacher_can_manage_schedule)
                VALUES (@Id, @ProgramId, @SubjectId, @TeacherId, @Name, @Type, @Color,
                    @ViewProfile, @ViewContact, @ViewHomework, @ManageHomework,
                    @ViewExams, @ManageExams, @ViewNotes, @AddNotes, @ViewSchedule, @ManageSchedule)",
                new {
                    Id = id, ProgramId = programId, req.SubjectId, req.TeacherId, req.Name, req.Type, req.Color,
                    ViewProfile = (req.TeacherCanViewProfile ?? true) ? 1 : 0,
                    ViewContact = (req.TeacherCanViewContact ?? false) ? 1 : 0,
                    ViewHomework = (req.TeacherCanViewHomework ?? true) ? 1 : 0,
                    ManageHomework = (req.TeacherCanManageHomework ?? true) ? 1 : 0,
                    ViewExams = (req.TeacherCanViewExams ?? true) ? 1 : 0,
                    ManageExams = (req.TeacherCanManageExams ?? false) ? 1 : 0,
                    ViewNotes = (req.TeacherCanViewNotes ?? false) ? 1 : 0,
                    AddNotes = (req.TeacherCanAddNotes ?? false) ? 1 : 0,
                    ViewSchedule = (req.TeacherCanViewSchedule ?? true) ? 1 : 0,
                    ManageSchedule = (req.TeacherCanManageSchedule ?? false) ? 1 : 0
                });
            return id;
        }
        public async Task<bool> UpdateCourseAsync(Guid programId, Guid courseId, Guid coachId, UpdateCourseRequest req)
        {
            if (!await IsMemberAsync(programId, coachId)) return false;
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE courses SET
                    name = COALESCE(@Name, name),
                    type = COALESCE(@Type, type),
                    subject_id = @SubjectId,
                    teacher_id = @TeacherId,
                    color = COALESCE(@Color, color),
                    teacher_can_view_profile = COALESCE(@ViewProfile, teacher_can_view_profile),
                    teacher_can_view_contact = COALESCE(@ViewContact, teacher_can_view_contact),
                    teacher_can_view_homework = COALESCE(@ViewHomework, teacher_can_view_homework),
                    teacher_can_manage_homework = COALESCE(@ManageHomework, teacher_can_manage_homework),
                    teacher_can_view_exams = COALESCE(@ViewExams, teacher_can_view_exams),
                    teacher_can_manage_exams = COALESCE(@ManageExams, teacher_can_manage_exams),
                    teacher_can_view_notes = COALESCE(@ViewNotes, teacher_can_view_notes),
                    teacher_can_add_notes = COALESCE(@AddNotes, teacher_can_add_notes),
                    teacher_can_view_schedule = COALESCE(@ViewSchedule, teacher_can_view_schedule),
                    teacher_can_manage_schedule = COALESCE(@ManageSchedule, teacher_can_manage_schedule),
                    updated_at = NOW()
                WHERE id = @CourseId AND program_id = @ProgramId AND is_active = 1",
                new {
                    CourseId = courseId, ProgramId = programId,
                    req.Name, req.Type, req.SubjectId, req.TeacherId, req.Color,
                    ViewProfile = req.TeacherCanViewProfile.HasValue ? (req.TeacherCanViewProfile.Value ? 1 : 0) : (int?)null,
                    ViewContact = req.TeacherCanViewContact.HasValue ? (req.TeacherCanViewContact.Value ? 1 : 0) : (int?)null,
                    ViewHomework = req.TeacherCanViewHomework.HasValue ? (req.TeacherCanViewHomework.Value ? 1 : 0) : (int?)null,
                    ManageHomework = req.TeacherCanManageHomework.HasValue ? (req.TeacherCanManageHomework.Value ? 1 : 0) : (int?)null,
                    ViewExams = req.TeacherCanViewExams.HasValue ? (req.TeacherCanViewExams.Value ? 1 : 0) : (int?)null,
                    ManageExams = req.TeacherCanManageExams.HasValue ? (req.TeacherCanManageExams.Value ? 1 : 0) : (int?)null,
                    ViewNotes = req.TeacherCanViewNotes.HasValue ? (req.TeacherCanViewNotes.Value ? 1 : 0) : (int?)null,
                    AddNotes = req.TeacherCanAddNotes.HasValue ? (req.TeacherCanAddNotes.Value ? 1 : 0) : (int?)null,
                    ViewSchedule = req.TeacherCanViewSchedule.HasValue ? (req.TeacherCanViewSchedule.Value ? 1 : 0) : (int?)null,
                    ManageSchedule = req.TeacherCanManageSchedule.HasValue ? (req.TeacherCanManageSchedule.Value ? 1 : 0) : (int?)null
                });
            return rows > 0;
        }

        public async Task<bool> DeleteCourseAsync(Guid programId, Guid courseId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return false;
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(
                "UPDATE courses SET is_active = 0 WHERE id = @CourseId AND program_id = @ProgramId",
                new { CourseId = courseId, ProgramId = programId });
            return rows > 0;
        }
        public async Task<string> AddStudentToCourseAsync(Guid programId, Guid courseId, Guid studentId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return "FORBIDDEN";
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                INSERT INTO course_students (id, course_id, student_id, program_id)
                SELECT @Id, c.id, s.id, @ProgramId
                FROM courses c
                JOIN students s ON s.id = @StudentId AND s.program_id = @ProgramId
                WHERE c.id = @CourseId AND c.program_id = @ProgramId
                ON CONFLICT (course_id, student_id) DO NOTHING",
                new { Id = Guid.NewGuid(), CourseId = courseId, StudentId = studentId, ProgramId = programId });
            return rows > 0 ? "OK" : "NOT_FOUND";
        }

        public async Task<string> RemoveStudentFromCourseAsync(Guid programId, Guid courseId, Guid studentId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return "FORBIDDEN";
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                DELETE FROM course_students
                WHERE course_id = @CourseId AND student_id = @StudentId AND program_id = @ProgramId",
                new { CourseId = courseId, StudentId = studentId, ProgramId = programId });
            return rows > 0 ? "OK" : "NOT_FOUND";
        }

        public async Task<string> AddGroupToCourseAsync(Guid programId, Guid courseId, Guid groupId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return "FORBIDDEN";
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                INSERT INTO course_groups (id, course_id, group_id, program_id)
                SELECT @Id, c.id, g.id, @ProgramId
                FROM courses c
                JOIN student_groups g ON g.id = @GroupId AND g.program_id = @ProgramId
                WHERE c.id = @CourseId AND c.program_id = @ProgramId
                ON CONFLICT (course_id, group_id) DO NOTHING",
                new { Id = Guid.NewGuid(), CourseId = courseId, GroupId = groupId, ProgramId = programId });
            return rows > 0 ? "OK" : "NOT_FOUND";
        }

        public async Task<string> RemoveGroupFromCourseAsync(Guid programId, Guid courseId, Guid groupId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return "FORBIDDEN";
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                DELETE FROM course_groups
                WHERE course_id = @CourseId AND group_id = @GroupId AND program_id = @ProgramId",
                new { CourseId = courseId, GroupId = groupId, ProgramId = programId });
            return rows > 0 ? "OK" : "NOT_FOUND";
        }
        public async Task<IEnumerable<CourseStudentDto>> GetCourseStudentsAsync(Guid programId, Guid courseId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return Enumerable.Empty<CourseStudentDto>();
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CourseStudentDto>(@"
                SELECT u.id AS Id, u.full_name AS FullName, u.email AS Email
                FROM users u
                JOIN students s ON s.id = u.id AND s.program_id = @ProgramId
                WHERE u.is_active = 1
                  AND s.id IN (
                    SELECT cs.student_id FROM course_students cs
                    JOIN courses c ON c.id = cs.course_id AND c.program_id = @ProgramId
                    WHERE cs.course_id = @CourseId AND cs.is_active = 1
                    UNION
                    SELECT sgm.student_id FROM course_groups cg
                    JOIN courses c ON c.id = cg.course_id AND c.program_id = @ProgramId
                    JOIN student_group_members sgm ON sgm.group_id = cg.group_id
                    WHERE cg.course_id = @CourseId
                )
                ORDER BY u.full_name",
                new { CourseId = courseId, ProgramId = programId });
        }

        public async Task<IEnumerable<CourseGroupDto>> GetCourseGroupsAsync(Guid programId, Guid courseId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return Enumerable.Empty<CourseGroupDto>();
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CourseGroupDto>(@"
                SELECT g.id AS Id, g.name AS Name
                FROM student_groups g
                JOIN course_groups cg ON cg.group_id = g.id
                JOIN courses c ON c.id = cg.course_id AND c.program_id = @ProgramId
                WHERE cg.course_id = @CourseId AND g.program_id = @ProgramId
                ORDER BY g.name",
                new { CourseId = courseId, ProgramId = programId });
        }
    }
}
