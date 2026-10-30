using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class ParentVisibilityRepository : BaseRepository
    {
        public ParentVisibilityRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<ParentPermissionsDto?> GetParentPermissionsAsync(Guid studentId, Guid parentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var row = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                SELECT 
                    COALESCE(can_view_exams, 0) AS can_view_exams,
                    COALESCE(can_view_homework, 0) AS can_view_homework,
                    COALESCE(can_view_calendar, 0) AS can_view_calendar,
                    COALESCE(can_view_study_stats, 0) AS can_view_study_stats,
                    COALESCE(can_view_payments, 0) AS can_view_payments
                FROM student_parents
                WHERE student_id = @StudentId AND parent_id = @ParentId",
                new { StudentId = studentId, ParentId = parentId });

            if (row == null) return null;

            return new ParentPermissionsDto
            {
                CanViewExams = ((int)row.can_view_exams) == 1,
                CanViewHomework = ((int)row.can_view_homework) == 1,
                CanViewCalendar = ((int)row.can_view_calendar) == 1,
                CanViewStudyStats = ((int)row.can_view_study_stats) == 1,
                CanViewPayments = ((int)row.can_view_payments) == 1
            };
        }

        public async Task<bool> UpdateParentPermissionsAsync(Guid studentId, Guid parentId, UpdateParentPermissionsRequest flags)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE student_parents
                SET 
                    can_view_exams = @CanViewExams,
                    can_view_homework = @CanViewHomework,
                    can_view_calendar = @CanViewCalendar,
                    can_view_study_stats = @CanViewStudyStats,
                    can_view_payments = @CanViewPayments
                WHERE student_id = @StudentId AND parent_id = @ParentId",
                new
                {
                    StudentId = studentId,
                    ParentId = parentId,
                    CanViewExams = flags.CanViewExams ? 1 : 0,
                    CanViewHomework = flags.CanViewHomework ? 1 : 0,
                    CanViewCalendar = flags.CanViewCalendar ? 1 : 0,
                    CanViewStudyStats = flags.CanViewStudyStats ? 1 : 0,
                    CanViewPayments = flags.CanViewPayments ? 1 : 0
                });

            return rows > 0;
        }

        public async Task<IEnumerable<dynamic>> GetMyChildrenAsync(Guid parentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<dynamic>(@"
                SELECT 
                    s.id as ""studentId"", 
                    u.full_name as ""fullName"", 
                    s.grade as grade, 
                    s.track as area,
                    COALESCE(sp.can_view_exams, 0) as ""canViewExams"",
                    COALESCE(sp.can_view_homework, 0) as ""canViewHomework"",
                    COALESCE(sp.can_view_calendar, 0) as ""canViewCalendar"",
                    COALESCE(sp.can_view_study_stats, 0) as ""canViewStudyStats"",
                    COALESCE(sp.can_view_payments, 0) as ""canViewPayments""
                FROM student_parents sp
                JOIN students s ON sp.student_id = s.id
                JOIN users u ON s.id = u.id
                WHERE sp.parent_id = @ParentId AND sp.is_accepted = 1",
                new { ParentId = parentId });
        }

        public async Task<dynamic?> GetPermissionsForParentAsync(Guid parentId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                SELECT 
                    COALESCE(can_view_exams, 0) as ""canViewExams"",
                    COALESCE(can_view_homework, 0) as ""canViewHomework"",
                    COALESCE(can_view_calendar, 0) as ""canViewCalendar"",
                    COALESCE(can_view_study_stats, 0) as ""canViewStudyStats"",
                    COALESCE(can_view_payments, 0) as ""canViewPayments""
                FROM student_parents
                WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1",
                new { ParentId = parentId, StudentId = studentId });
        }

        public async Task<(dynamic? Student, IEnumerable<dynamic> OtherParents)?> GetChildDetailWithMaskedParentsAsync(Guid parentId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var relation = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1",
                new { ParentId = parentId, StudentId = studentId });

            if (relation == null) return null;

            var student = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                SELECT s.id as id, u.full_name as ""fullName"", s.grade as grade, s.track as area, s.target_university as ""targetUniversity""
                FROM students s
                JOIN users u ON s.id = u.id
                WHERE s.id = @StudentId",
                new { StudentId = studentId });

            var otherParents = await conn.QueryAsync<dynamic>(@"
                SELECT 
                    u.full_name as ""fullName"",
                    'GİZLİ' as Email,
                    'GİZLİ' as Phone
                FROM student_parents sp
                JOIN users u ON sp.parent_id = u.id
                WHERE sp.student_id = @StudentId AND sp.parent_id != @ParentId AND sp.is_accepted = 1",
                new { StudentId = studentId, ParentId = parentId });

            return (student, otherParents);
        }

        public async Task<bool> CanViewExamsAsync(Guid parentId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rel = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1 AND COALESCE(can_view_exams, 0) = 1",
                new { ParentId = parentId, StudentId = studentId });
            return rel != null;
        }

        public async Task<bool> CanViewCalendarAsync(Guid parentId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rel = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1 AND COALESCE(can_view_calendar, 0) = 1",
                new { ParentId = parentId, StudentId = studentId });
            return rel != null;
        }

        public async Task<(int TotalMinutes, int TotalQuestions)?> GetWeeklyStudyStatsForParentAsync(Guid parentId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var canView = await conn.ExecuteScalarAsync<int?>(@"
                SELECT 1 FROM student_parents 
                WHERE parent_id = @ParentId 
                  AND student_id = @StudentId 
                  AND is_accepted = 1 
                  AND can_view_study_stats = 1",
                new { ParentId = parentId, StudentId = studentId });

            if (canView == null) return null;

            var stats = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                SELECT 
                    COALESCE(SUM(minutes), 0)::int AS total_minutes,
                    COALESCE(SUM(question_count), 0)::int AS total_questions
                FROM study_sessions
                WHERE student_id = @StudentId
                  AND (started_at >= date_trunc('week', CURRENT_DATE) OR (started_at IS NULL AND created_at >= date_trunc('week', CURRENT_DATE)))",
                new { StudentId = studentId });

            return ((int)(stats?.total_minutes ?? 0), (int)(stats?.total_questions ?? 0));
        }
    }
}
