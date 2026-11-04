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
            return await conn.QuerySingleOrDefaultAsync<ParentPermissionsDto>(@"
                SELECT 
                    (COALESCE(can_view_exams, 0) = 1) AS CanViewExams,
                    (COALESCE(can_view_homework, 0) = 1) AS CanViewHomework,
                    (COALESCE(can_view_calendar, 0) = 1) AS CanViewCalendar,
                    (COALESCE(can_view_study_stats, 0) = 1) AS CanViewStudyStats,
                    (COALESCE(can_view_payments, 0) = 1) AS CanViewPayments
                FROM student_parents
                WHERE student_id = @StudentId AND parent_id = @ParentId",
                new { StudentId = studentId, ParentId = parentId });
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

        public async Task<IEnumerable<ParentChildSummaryDto>> GetMyChildrenAsync(Guid parentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<ParentChildSummaryDto>(@"
                SELECT 
                    s.id AS StudentId, 
                    u.full_name AS FullName, 
                    s.grade AS Grade, 
                    s.track AS Area,
                    COALESCE(sp.can_view_exams, 0) AS CanViewExams,
                    COALESCE(sp.can_view_homework, 0) AS CanViewHomework,
                    COALESCE(sp.can_view_calendar, 0) AS CanViewCalendar,
                    COALESCE(sp.can_view_study_stats, 0) AS CanViewStudyStats,
                    COALESCE(sp.can_view_payments, 0) AS CanViewPayments
                FROM student_parents sp
                JOIN students s ON sp.student_id = s.id
                JOIN users u ON s.id = u.id
                WHERE sp.parent_id = @ParentId AND sp.is_accepted = 1",
                new { ParentId = parentId });
        }

        public async Task<ParentChildFlagsDto?> GetPermissionsForParentAsync(Guid parentId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<ParentChildFlagsDto>(@"
                SELECT 
                    COALESCE(can_view_exams, 0) AS CanViewExams,
                    COALESCE(can_view_homework, 0) AS CanViewHomework,
                    COALESCE(can_view_calendar, 0) AS CanViewCalendar,
                    COALESCE(can_view_study_stats, 0) AS CanViewStudyStats,
                    COALESCE(can_view_payments, 0) AS CanViewPayments
                FROM student_parents
                WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1",
                new { ParentId = parentId, StudentId = studentId });
        }

        public async Task<(ParentChildDetailDto? Student, IEnumerable<MaskedOtherParentDto> OtherParents)?> GetChildDetailWithMaskedParentsAsync(Guid parentId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var relation = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1",
                new { ParentId = parentId, StudentId = studentId });

            if (relation == null) return null;

            var student = await conn.QuerySingleOrDefaultAsync<ParentChildDetailDto>(@"
                SELECT s.id AS Id, u.full_name AS FullName, s.grade AS Grade, s.track AS Area, s.target_university AS TargetUniversity
                FROM students s
                JOIN users u ON s.id = u.id
                WHERE s.id = @StudentId",
                new { StudentId = studentId });

            var otherParents = await conn.QueryAsync<MaskedOtherParentDto>(@"
                SELECT 
                    u.full_name AS FullName,
                    'GİZLİ' AS Email,
                    'GİZLİ' AS Phone
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

            var stats = await conn.QuerySingleOrDefaultAsync<WeeklyStudyStatsRow>(@"
                SELECT 
                    COALESCE(SUM(minutes), 0)::int AS TotalMinutes,
                    COALESCE(SUM(question_count), 0)::int AS TotalQuestions
                FROM study_sessions
                WHERE student_id = @StudentId
                  AND (started_at >= date_trunc('week', CURRENT_DATE) OR (started_at IS NULL AND created_at >= date_trunc('week', CURRENT_DATE)))",
                new { StudentId = studentId });

            return (stats?.TotalMinutes ?? 0, stats?.TotalQuestions ?? 0);
        }

        public sealed class ParentChildFlagsDto
        {
            public int CanViewExams { get; set; }
            public int CanViewHomework { get; set; }
            public int CanViewCalendar { get; set; }
            public int CanViewStudyStats { get; set; }
            public int CanViewPayments { get; set; }
        }

        public sealed class ParentChildSummaryDto
        {
            public Guid StudentId { get; set; }
            public string FullName { get; set; } = string.Empty;
            public int? Grade { get; set; }
            public string? Area { get; set; }
            public int CanViewExams { get; set; }
            public int CanViewHomework { get; set; }
            public int CanViewCalendar { get; set; }
            public int CanViewStudyStats { get; set; }
            public int CanViewPayments { get; set; }
        }

        public sealed class ParentChildDetailDto
        {
            public Guid Id { get; set; }
            public string FullName { get; set; } = string.Empty;
            public int? Grade { get; set; }
            public string? Area { get; set; }
            public string? TargetUniversity { get; set; }
        }

        public sealed class MaskedOtherParentDto
        {
            public string FullName { get; set; } = string.Empty;
            public string Email { get; set; } = "GİZLİ";
            public string Phone { get; set; } = "GİZLİ";
        }

        private sealed class WeeklyStudyStatsRow
        {
            public int TotalMinutes { get; set; }
            public int TotalQuestions { get; set; }
        }
    }
}
