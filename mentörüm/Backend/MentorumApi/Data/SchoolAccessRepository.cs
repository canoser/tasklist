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
                       (teacher_can_view_profile = 1) AS CanViewProfile,
                       (teacher_can_view_contact = 1) AS CanViewContact,
                       (teacher_can_view_homework = 1) AS CanViewHomework,
                       (teacher_can_manage_homework = 1) AS CanManageHomework,
                       (teacher_can_view_exams = 1) AS CanViewExams,
                       (teacher_can_manage_exams = 1) AS CanManageExams,
                       (teacher_can_view_notes = 1) AS CanViewNotes,
                       (teacher_can_add_notes = 1) AS CanAddNotes,
                       (teacher_can_view_schedule = 1) AS CanViewSchedule,
                       (teacher_can_manage_schedule = 1) AS CanManageSchedule
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
    }
}
