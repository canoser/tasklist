using Dapper;
using MentorumApi.DTOs;
using System.Text;

namespace MentorumApi.Data
{
    public class CalendarRepository : BaseRepository
    {
        public CalendarRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<CalendarEventDto>> GetCalendarEventsAsync(
            Guid userId, 
            string role, 
            DateTime fromDate, 
            DateTime toDate, 
            Guid? studentId = null)
        {
            // Fail-closed: yalnızca bilinen roller takvime erişir (bilinmeyen rol → boş).
            if (role != "Coach" && role != "Student" && role != "Parent")
                return Array.Empty<CalendarEventDto>();

            var sqlBuilder = new StringBuilder();
            
            // Homeworks (due_date between From and To)
            sqlBuilder.Append(@"
                SELECT 
                    h.id AS Id,
                    h.snapshot_title AS Title,
                    h.due_date AS Start,
                    h.due_date AS End,
                    'HOMEWORK' AS Type,
                    CASE 
                        WHEN h.status = 'DONE' THEN '#22C55E'
                        WHEN h.status = 'OVERDUE' THEN '#EF4444'
                        WHEN h.status = 'LATE_DONE' THEN '#F97316'
                        ELSE '#3B82F6'
                    END AS Color,
                    h.student_id AS StudentId,
                    u.full_name AS StudentName
                FROM homework_assignments h
                JOIN users u ON h.student_id = u.id
                WHERE h.due_date >= @From AND h.due_date <= @To
            ");

            if (role == "Coach")
            {
                sqlBuilder.Append(" AND h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @UserId)");
                if (studentId.HasValue)
                {
                    sqlBuilder.Append(" AND h.student_id = @StudentId");
                }
            }
            else if (role == "Student")
            {
                sqlBuilder.Append(" AND h.student_id = @UserId");
            }
            else if (role == "Parent")
            {
                sqlBuilder.Append(@" 
                    AND h.student_id = @StudentId 
                    AND EXISTS (SELECT 1 FROM student_parents sp WHERE sp.student_id = h.student_id AND sp.parent_id = @UserId AND sp.is_accepted = 1)
                ");
            }

            sqlBuilder.Append(" UNION ALL ");

            // Exams (exam_date between From and To)
            sqlBuilder.Append(@"
                SELECT 
                    e.id AS Id,
                    COALESCE(e.exam_name, e.exam_type) AS Title,
                    e.exam_date AS Start,
                    e.exam_date AS End,
                    'EXAM' AS Type,
                    '#F59E0B' AS Color,
                    e.student_id AS StudentId,
                    u.full_name AS StudentName
                FROM exam_results e
                JOIN users u ON e.student_id = u.id
                WHERE e.exam_date >= @From AND e.exam_date <= @To
            ");

            if (role == "Coach")
            {
                sqlBuilder.Append(" AND e.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @UserId)");
                if (studentId.HasValue)
                {
                    sqlBuilder.Append(" AND e.student_id = @StudentId");
                }
            }
            else if (role == "Student")
            {
                sqlBuilder.Append(" AND e.student_id = @UserId");
            }
            else if (role == "Parent")
            {
                sqlBuilder.Append(@" 
                    AND e.student_id = @StudentId 
                    AND EXISTS (SELECT 1 FROM student_parents sp WHERE sp.student_id = e.student_id AND sp.parent_id = @UserId AND sp.is_accepted = 1)
                ");
            }

            sqlBuilder.Append(" UNION ALL ");

            // Schedule slots (haftalık tekrar — gün içinde ilk oluşum)
            sqlBuilder.Append(@"
                SELECT
                    s.id AS Id,
                    s.title AS Title,
                    (occ.d + s.start_time) AS Start,
                    (occ.d + s.end_time) AS End,
                    'SCHEDULE' AS Type,
                    COALESCE(s.color, '#8B5CF6') AS Color,
                    s.student_id AS StudentId,
                    u.full_name AS StudentName
                FROM schedule_slots s
                CROSS JOIN LATERAL (
                    SELECT d::date FROM generate_series(@From::date, @To::date, interval '1 day') AS g(d)
                    WHERE EXTRACT(ISODOW FROM d) = s.day_of_week
                ) occ
                LEFT JOIN users u ON s.student_id = u.id
                WHERE s.is_active = 1
                  AND (s.valid_from IS NULL OR occ.d >= s.valid_from)
                  AND (s.valid_to IS NULL OR occ.d <= s.valid_to)
            ");

            if (role == "Coach")
            {
                sqlBuilder.Append(" AND s.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @UserId)");
                if (studentId.HasValue)
                {
                    sqlBuilder.Append(" AND s.student_id = @StudentId");
                }
            }
            else if (role == "Student")
            {
                sqlBuilder.Append(@"
                    AND (s.student_id = @UserId
                         OR s.course_id IN (SELECT course_id FROM course_students WHERE student_id = @UserId AND is_active = 1)
                         OR s.group_id IN (SELECT group_id FROM student_group_members WHERE student_id = @UserId))
                ");
            }
            else if (role == "Parent")
            {
                sqlBuilder.Append(@"
                    AND (s.student_id = @StudentId
                         OR s.course_id IN (SELECT course_id FROM course_students WHERE student_id = @StudentId AND is_active = 1)
                         OR s.group_id IN (SELECT group_id FROM student_group_members WHERE student_id = @StudentId))
                    AND EXISTS (SELECT 1 FROM student_parents sp WHERE sp.student_id = @StudentId AND sp.parent_id = @UserId AND sp.is_accepted = 1)
                ");
            }

            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CalendarEventDto>(sqlBuilder.ToString(), new {
                UserId = userId,
                From = fromDate.Date,
                To = toDate.Date,
                StudentId = studentId
            });
        }
    }
}
