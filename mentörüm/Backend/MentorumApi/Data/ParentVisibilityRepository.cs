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
    }
}
