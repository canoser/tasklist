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
            Guid? studentId = null,
            Guid? programId = null,
            Guid? courseId = null,
            Guid? teacherId = null,
            string? eventType = null)
        {
            // Fail-closed: yalnızca bilinen roller takvime erişir (bilinmeyen rol → boş).
            if (role != "Coach" && role != "Student" && role != "Parent")
                return Array.Empty<CalendarEventDto>();

            var sqlBuilder = new StringBuilder();
            
            // 1. Homeworks (HOMEWORK_DUE)
            sqlBuilder.Append(@"
                SELECT 
                    h.id AS Id,
                    h.snapshot_title AS Title,
                    h.due_date AS Start,
                    h.due_date AS End,
                    'HOMEWORK_DUE' AS Type,
                    CASE 
                        WHEN h.status = 'DONE' THEN '#22C55E'
                        WHEN h.status = 'OVERDUE' OR (h.status = 'PENDING' AND h.due_date < CURRENT_DATE) THEN '#EF4444'
                        WHEN h.status = 'LATE_DONE' THEN '#F97316'
                        ELSE '#3B82F6'
                    END AS Color,
                    h.student_id AS StudentId,
                    u.full_name AS StudentName
                FROM homework_assignments h
                JOIN users u ON h.student_id = u.id
                WHERE h.due_date >= @From AND h.due_date <= @To
            ");

            if (!string.IsNullOrWhiteSpace(eventType) && eventType != "HOMEWORK_DUE" && eventType != "HOMEWORK")
            {
                sqlBuilder.Append(" AND 1=0 ");
            }

            if (role == "Coach")
            {
                if (programId.HasValue)
                {
                    sqlBuilder.Append(" AND h.program_id = @ProgramId");
                }
                else
                {
                    sqlBuilder.Append(" AND h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @UserId)");
                }

                if (studentId.HasValue)
                {
                    sqlBuilder.Append(" AND h.student_id = @StudentId");
                }
                if (courseId.HasValue)
                {
                    sqlBuilder.Append(" AND h.course_id = @CourseId");
                }
                if (teacherId.HasValue)
                {
                    sqlBuilder.Append(" AND h.course_id IN (SELECT id FROM courses WHERE teacher_id = @TeacherId)");
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
                    AND EXISTS (
                        SELECT 1 FROM student_parents sp 
                        WHERE sp.student_id = h.student_id 
                          AND sp.parent_id = @UserId 
                          AND sp.is_accepted = 1 
                          AND (sp.can_view_homework = 1 AND sp.can_view_calendar = 1)
                    )
                ");
            }

            sqlBuilder.Append(" UNION ALL ");

            // 2. Exams (EXAM)
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

            if (!string.IsNullOrWhiteSpace(eventType) && eventType != "EXAM")
            {
                sqlBuilder.Append(" AND 1=0 ");
            }

            if (role == "Coach")
            {
                if (courseId.HasValue || teacherId.HasValue)
                {
                    sqlBuilder.Append(" AND 1=0 ");
                }
                else
                {
                    if (programId.HasValue)
                    {
                        sqlBuilder.Append(" AND e.program_id = @ProgramId");
                    }
                    else
                    {
                        sqlBuilder.Append(" AND e.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @UserId)");
                    }

                    if (studentId.HasValue)
                    {
                        sqlBuilder.Append(" AND e.student_id = @StudentId");
                    }
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
                    AND EXISTS (
                        SELECT 1 FROM student_parents sp 
                        WHERE sp.student_id = e.student_id 
                          AND sp.parent_id = @UserId 
                          AND sp.is_accepted = 1 
                          AND (sp.can_view_exams = 1 AND sp.can_view_calendar = 1)
                    )
                ");
            }

            sqlBuilder.Append(" UNION ALL ");

            // 3. Schedule slots (TEACHER_LESSON / SCHEDULE)
            sqlBuilder.Append(@"
                SELECT
                    s.id AS Id,
                    s.title AS Title,
                    (occ.d + s.start_time) AS Start,
                    (occ.d + s.end_time) AS End,
                    CASE WHEN s.course_id IS NOT NULL THEN 'TEACHER_LESSON' ELSE 'SCHEDULE' END AS Type,
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
                  AND occ.d >= @From::date AND occ.d <= @To::date
            ");

            if (!string.IsNullOrWhiteSpace(eventType) && eventType != "TEACHER_LESSON" && eventType != "SCHEDULE")
            {
                sqlBuilder.Append(" AND 1=0 ");
            }

            if (role == "Coach")
            {
                if (programId.HasValue)
                {
                    sqlBuilder.Append(" AND s.program_id = @ProgramId");
                }
                else
                {
                    sqlBuilder.Append(" AND s.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @UserId)");
                }

                if (studentId.HasValue)
                {
                    sqlBuilder.Append(@" AND (
                        s.student_id = @StudentId
                        OR s.course_id IN (SELECT course_id FROM vw_active_course_students WHERE student_id = @StudentId)
                        OR s.group_id IN (SELECT group_id FROM vw_active_student_groups WHERE student_id = @StudentId)
                    )");
                }
                if (courseId.HasValue)
                {
                    sqlBuilder.Append(" AND s.course_id = @CourseId");
                }
                if (teacherId.HasValue)
                {
                    sqlBuilder.Append(" AND (s.course_id IN (SELECT id FROM courses WHERE teacher_id = @TeacherId) OR s.created_by = @TeacherId)");
                }
            }
            else if (role == "Student")
            {
                sqlBuilder.Append(@"
                    AND (s.student_id = @UserId
                         OR s.course_id IN (SELECT course_id FROM vw_active_course_students WHERE student_id = @UserId)
                         OR s.group_id IN (SELECT group_id FROM vw_active_student_groups WHERE student_id = @UserId))
                ");
            }
            else if (role == "Parent")
            {
                sqlBuilder.Append(@"
                    AND (s.student_id = @StudentId
                         OR s.course_id IN (SELECT course_id FROM vw_active_course_students WHERE student_id = @StudentId)
                         OR s.group_id IN (SELECT group_id FROM vw_active_student_groups WHERE student_id = @StudentId))
                    AND EXISTS (
                        SELECT 1 FROM student_parents sp 
                        WHERE sp.student_id = @StudentId 
                          AND sp.parent_id = @UserId 
                          AND sp.is_accepted = 1 
                          AND sp.can_view_calendar = 1
                    )
                ");
            }

            // 4. Kişisel etkinlikler (COACHING_SESSION vb.)
            sqlBuilder.Append(" UNION ALL ");
            sqlBuilder.Append(@"
                SELECT
                    pe.id AS Id,
                    pe.title AS Title,
                    pe.start_at AS Start,
                    COALESCE(pe.end_at, pe.start_at) AS End,
                    pe.event_type AS Type,
                    CASE pe.event_type
                        WHEN 'COACHING_SESSION' THEN '#10B981'
                        WHEN 'PARENT_MEETING' THEN '#EC4899'
                        WHEN 'STUDENT_EVENT' THEN '#14B8A6'
                        ELSE '#64748B'
                    END AS Color,
                    NULL::uuid AS StudentId,
                    NULL::text AS StudentName
                FROM personal_events pe
                WHERE pe.start_at >= @From AND pe.start_at <= @To
            ");

            if (!string.IsNullOrWhiteSpace(eventType) && 
                eventType != "COACHING_SESSION" && 
                eventType != "PARENT_MEETING" && 
                eventType != "STUDENT_EVENT" && 
                eventType != "PERSONAL_BLOCK")
            {
                sqlBuilder.Append(" AND 1=0 ");
            }

            if (role == "Coach")
            {
                if (courseId.HasValue || teacherId.HasValue)
                {
                    sqlBuilder.Append(" AND 1=0 ");
                }
                else
                {
                    sqlBuilder.Append(" AND (pe.user_id = @UserId OR (@StudentId IS NOT NULL AND pe.user_id = @StudentId))");
                }
            }
            else if (role == "Student")
            {
                sqlBuilder.Append(" AND pe.user_id = @UserId");
            }
            else
            {
                sqlBuilder.Append(" AND 1=0 "); // Veli görmüyor
            }

            // 4.5 Okul Şablonu (SCHOOL_BLOCK) — V10 T08
            sqlBuilder.Append(" UNION ALL ");
            sqlBuilder.Append(@"
                SELECT
                    ss.id AS Id,
                    COALESCE(ss.label, 'Okul') AS Title,
                    (occ.d + ss.start_time) AS Start,
                    (occ.d + ss.end_time) AS End,
                    'SCHOOL_BLOCK' AS Type,
                    '#0EA5E9' AS Color,
                    ss.student_id AS StudentId,
                    u.full_name AS StudentName
                FROM school_schedules ss
                CROSS JOIN LATERAL (
                    SELECT d::date FROM generate_series(@From::date, @To::date, interval '1 day') AS g(d)
                    WHERE EXTRACT(ISODOW FROM d) = ss.day_of_week
                ) occ
                LEFT JOIN users u ON ss.student_id = u.id
                WHERE occ.d >= @From::date AND occ.d <= @To::date
            ");

            if (!string.IsNullOrWhiteSpace(eventType) && eventType != "SCHOOL_BLOCK")
            {
                sqlBuilder.Append(" AND 1=0 ");
            }

            if (role == "Coach")
            {
                if (programId.HasValue)
                {
                    sqlBuilder.Append(" AND ss.program_id = @ProgramId");
                }
                else
                {
                    sqlBuilder.Append(" AND ss.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @UserId)");
                }
                if (studentId.HasValue)
                {
                    sqlBuilder.Append(" AND ss.student_id = @StudentId");
                }
            }
            else if (role == "Student")
            {
                sqlBuilder.Append(" AND ss.student_id = @UserId");
            }
            else
            {
                sqlBuilder.Append(" AND 1=0 ");
            }

            // 5. Ödemeler (PAYMENT_DUE)
            sqlBuilder.Append(" UNION ALL ");
            sqlBuilder.Append(@"
                SELECT
                    pi.id AS Id,
                    ('Ödeme: ' || pi.base_amount || ' ' || pi.currency) AS Title,
                    pi.due_date::timestamptz AS Start,
                    pi.due_date::timestamptz AS End,
                    'PAYMENT_DUE' AS Type,
                    CASE 
                        WHEN pi.status = 'PAID' THEN '#22C55E'
                        WHEN pi.status = 'PARTIAL' THEN '#F59E0B'
                        WHEN pi.status = 'OVERDUE' THEN '#EF4444'
                        ELSE '#8B5CF6'
                    END AS Color,
                    pp.student_id AS StudentId,
                    u.full_name AS StudentName
                FROM payment_items pi
                JOIN payment_plans pp ON pp.id = pi.plan_id
                JOIN users u ON pp.student_id = u.id
                WHERE pi.due_date >= @From::date AND pi.due_date <= @To::date
            ");

            if (!string.IsNullOrWhiteSpace(eventType) && eventType != "PAYMENT_DUE")
            {
                sqlBuilder.Append(" AND 1=0 ");
            }

            if (role == "Coach")
            {
                if (courseId.HasValue || teacherId.HasValue)
                {
                    sqlBuilder.Append(" AND 1=0 ");
                }
                else
                {
                    if (programId.HasValue)
                    {
                        sqlBuilder.Append(" AND pp.program_id = @ProgramId");
                    }
                    else
                    {
                        sqlBuilder.Append(" AND pp.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @UserId)");
                    }

                    if (studentId.HasValue)
                    {
                        sqlBuilder.Append(" AND pp.student_id = @StudentId");
                    }
                }
            }
            else if (role == "Parent")
            {
                sqlBuilder.Append(@"
                    AND pp.student_id = @StudentId
                    AND EXISTS (
                        SELECT 1 FROM student_parents sp 
                        WHERE sp.student_id = pp.student_id 
                          AND sp.parent_id = @UserId 
                          AND sp.is_accepted = 1 
                          AND sp.can_view_payments = 1
                    )
                ");
            }
            else
            {
                // Öğrenci ödeme görmez
                sqlBuilder.Append(" AND 1=0 ");
            }

            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CalendarEventDto>(sqlBuilder.ToString(), new {
                UserId = userId,
                From = fromDate,
                To = toDate,
                StudentId = studentId,
                ProgramId = programId,
                CourseId = courseId,
                TeacherId = teacherId
            });
        }

        public async Task<IEnumerable<PersonalEventDto>> GetPersonalEventsAsync(Guid userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<PersonalEventDto>(@"
                SELECT id AS Id, user_id AS UserId, title AS Title, event_type AS EventType, category AS Category, start_at AS StartAt, end_at AS EndAt, checked_in AS CheckedIn, actual_minutes AS ActualMinutes
                FROM personal_events
                WHERE user_id = @UserId AND (start_at >= CURRENT_DATE - INTERVAL '30 days')
                ORDER BY start_at DESC
                LIMIT 50",
                new { UserId = userId });
        }

        public async Task<Guid> CreatePersonalEventAsync(Guid userId, CreatePersonalEventRequest req)
        {
            var id = Guid.NewGuid();
            var type = new[] { "COACHING_SESSION", "PARENT_MEETING", "PERSONAL_BLOCK", "STUDENT_EVENT" }.Contains(req.EventType)
                ? req.EventType
                : "PERSONAL_BLOCK";

            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO personal_events (id, user_id, title, event_type, category, start_at, end_at)
                VALUES (@Id, @UserId, @Title, @Type, @Category, @StartAt, @EndAt)",
                new { Id = id, UserId = userId, Title = req.Title ?? "Etkinlik", Type = type, Category = req.Category, req.StartAt, req.EndAt });

            return id;
        }

        public async Task<bool> UpdatePersonalEventCheckinAsync(Guid userId, Guid eventId, bool checkedIn, int? actualMinutes)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE personal_events SET checked_in = @CheckedIn, actual_minutes = @ActualMinutes
                WHERE id = @Id AND user_id = @UserId",
                new { Id = eventId, UserId = userId, CheckedIn = checkedIn ? 1 : 0, ActualMinutes = actualMinutes });
            return rows > 0;
        }

        public async Task<IEnumerable<PersonalEventDto>> GetStudentPersonalEventsForCoachAsync(Guid coachId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<PersonalEventDto>(@"
                SELECT pe.id AS Id, pe.user_id AS UserId, pe.title AS Title, pe.event_type AS EventType, pe.category AS Category, pe.start_at AS StartAt, pe.end_at AS EndAt, pe.checked_in AS CheckedIn, pe.actual_minutes AS ActualMinutes
                FROM personal_events pe
                WHERE pe.user_id = @StudentId
                  AND EXISTS (SELECT 1 FROM students s WHERE s.id = @StudentId AND s.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId))
                ORDER BY pe.start_at DESC",
                new { CoachId = coachId, StudentId = studentId });
        }
    }
}
