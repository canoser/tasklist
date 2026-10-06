using Dapper;
using MentorumApi.DTOs;

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
                       (COALESCE(teacher_can_manage_schedule, 0) = 1) AS CanManageSchedule
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
                    JOIN student_group_members sgm ON sgm.group_id = cg.group_id
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
        public async Task<Guid?> GetTeacherProgramIdAsync(Guid teacherId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<Guid?>(@"
                SELECT program_id FROM program_teachers WHERE teacher_id = @TeacherId AND is_active = 1 LIMIT 1",
                new { TeacherId = teacherId });
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
                       (COALESCE(teacher_can_manage_schedule, 0) = 1) AS CanManageSchedule
                FROM courses
                WHERE teacher_id = @TeacherId AND is_active = 1
                ORDER BY name",
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
                    SELECT sgm.student_id FROM course_groups cg JOIN student_group_members sgm ON sgm.group_id = cg.group_id WHERE cg.course_id = @CourseId
                )
                ORDER BY u.full_name",
                new { CourseId = courseId });
        }

        public async Task<IEnumerable<dynamic>> GetTeacherCourseHomeworkAsync(Guid courseId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync(@"
                SELECT h.id, h.student_id AS StudentId, u.full_name AS StudentName, h.snapshot_title AS Title, h.due_date AS DueDate, h.status AS Status
                FROM homework_assignments h
                JOIN users u ON u.id = h.student_id
                WHERE h.student_id IN (
                    SELECT cs.student_id FROM course_students cs WHERE cs.course_id = @CourseId AND cs.is_active = 1
                    UNION
                    SELECT sgm.student_id FROM course_groups cg JOIN student_group_members sgm ON sgm.group_id = cg.group_id WHERE cg.course_id = @CourseId
                )
                ORDER BY h.due_date DESC",
                new { CourseId = courseId });
        }

        public async Task<IEnumerable<dynamic>> GetTeacherCourseExamsAsync(Guid courseId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync(@"
                SELECT e.id, e.student_id AS StudentId, u.full_name AS StudentName, COALESCE(e.exam_name, e.exam_type) AS Name, e.exam_date AS ExamDate, e.total_net AS TotalNet
                FROM exam_results e
                JOIN users u ON u.id = e.student_id
                WHERE e.student_id IN (
                    SELECT cs.student_id FROM course_students cs WHERE cs.course_id = @CourseId AND cs.is_active = 1
                    UNION
                    SELECT sgm.student_id FROM course_groups cg JOIN student_group_members sgm ON sgm.group_id = cg.group_id WHERE cg.course_id = @CourseId
                )
                ORDER BY e.exam_date DESC",
                new { CourseId = courseId });
        }
        // Öğrencinin dersleri (Aşama 10)
        public async Task<IEnumerable<dynamic>> GetStudentCoursesAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync(@"
                SELECT c.id AS Id, c.name AS Name, c.type AS Type
                FROM courses c
                WHERE c.is_active = 1
                  AND c.id IN (
                      SELECT cs.course_id FROM course_students cs WHERE cs.student_id = @StudentId AND cs.is_active = 1
                      UNION
                      SELECT cg.course_id FROM course_groups cg
                      JOIN student_group_members sgm ON sgm.group_id = cg.group_id
                      WHERE sgm.student_id = @StudentId
                  )
                ORDER BY c.name",
                new { StudentId = studentId });
        }
    }
}
