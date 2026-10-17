using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class ScheduleRepository
    {
        private readonly DbConnectionFactory _connectionFactory;
        public ScheduleRepository(DbConnectionFactory connectionFactory) { _connectionFactory = connectionFactory; }

        private const string SlotSelect = @"
            SELECT s.id, s.program_id AS ProgramId, s.course_id AS CourseId, s.group_id AS GroupId, s.student_id AS StudentId,
                   s.day_of_week AS DayOfWeek, s.start_time AS StartTime, s.end_time AS EndTime, s.title AS Title,
                   s.type AS Type, s.valid_from AS ValidFrom, s.valid_to AS ValidTo, s.color AS Color, s.is_active AS IsActive";

        private async Task<bool> IsMemberAsync(Guid programId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var found = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId",
                new { ProgramId = programId, CoachId = coachId });
            return found != null;
        }

        public async Task<IEnumerable<ScheduleSlotDto>> GetSlotsAsync(Guid programId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return Enumerable.Empty<ScheduleSlotDto>();
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<ScheduleSlotDto>($@"
                {SlotSelect}
                FROM schedule_slots s
                WHERE s.program_id = @ProgramId AND s.is_active = 1
                ORDER BY s.day_of_week, s.start_time", new { ProgramId = programId });
        }

        public async Task<ScheduleSlotDto?> GetSlotAsync(Guid programId, Guid slotId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return null;
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<ScheduleSlotDto>($@"
                {SlotSelect}
                FROM schedule_slots s
                WHERE s.id = @SlotId AND s.program_id = @ProgramId",
                new { SlotId = slotId, ProgramId = programId });
        }

        public async Task<Guid> CreateSlotAsync(Guid programId, Guid coachId, CreateScheduleSlotRequest req)
        {
            if (!await IsMemberAsync(programId, coachId)) throw new UnauthorizedAccessException("FORBIDDEN");

            int targetCount = (req.CourseId != null ? 1 : 0) + (req.GroupId != null ? 1 : 0) + (req.StudentId != null ? 1 : 0);
            if (targetCount != 1) throw new InvalidOperationException("EXACTLY_ONE_TARGET");
            if (req.DayOfWeek < 1 || req.DayOfWeek > 7) throw new InvalidOperationException("INVALID_DAY_OF_WEEK");
            if (req.StartTime >= req.EndTime) throw new InvalidOperationException("INVALID_TIME_RANGE");

            var id = Guid.NewGuid();
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                INSERT INTO schedule_slots (id, program_id, course_id, group_id, student_id, day_of_week, start_time, end_time, title, type, valid_from, valid_to, color)
                SELECT @Id, @ProgramId, @CourseId, @GroupId, @StudentId, @DayOfWeek, @StartTime, @EndTime, @Title, @Type, @ValidFrom, @ValidTo, @Color
                WHERE (@CourseId IS NULL OR EXISTS (SELECT 1 FROM courses c WHERE c.id = @CourseId AND c.program_id = @ProgramId))
                  AND (@GroupId IS NULL OR EXISTS (SELECT 1 FROM student_groups g WHERE g.id = @GroupId AND g.program_id = @ProgramId))
                  AND (@StudentId IS NULL OR EXISTS (SELECT 1 FROM students s WHERE s.id = @StudentId AND s.program_id = @ProgramId))",
                new {
                    Id = id, ProgramId = programId, req.CourseId, req.GroupId, req.StudentId,
                    req.DayOfWeek, req.StartTime, req.EndTime, req.Title, req.Type, req.ValidFrom, req.ValidTo, req.Color
                });
            if (rows == 0) throw new InvalidOperationException("TARGET_NOT_IN_PROGRAM");
            return id;
        }

        public async Task<bool> UpdateSlotAsync(Guid programId, Guid slotId, Guid coachId, UpdateScheduleSlotRequest req)
        {
            if (!await IsMemberAsync(programId, coachId)) return false;
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE schedule_slots SET
                    day_of_week = COALESCE(@DayOfWeek, day_of_week),
                    start_time = COALESCE(@StartTime, start_time),
                    end_time = COALESCE(@EndTime, end_time),
                    title = COALESCE(@Title, title),
                    type = COALESCE(@Type, type),
                    valid_from = COALESCE(@ValidFrom, valid_from),
                    valid_to = COALESCE(@ValidTo, valid_to),
                    color = COALESCE(@Color, color),
                    is_active = COALESCE(@IsActive, is_active),
                    updated_at = NOW()
                WHERE id = @SlotId AND program_id = @ProgramId",
                new {
                    SlotId = slotId, ProgramId = programId,
                    req.DayOfWeek, req.StartTime, req.EndTime, req.Title, req.Type, req.ValidFrom, req.ValidTo, req.Color, req.IsActive
                });
            return rows > 0;
        }

        public async Task<bool> DeleteSlotAsync(Guid programId, Guid slotId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return false;
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(
                "UPDATE schedule_slots SET is_active = 0 WHERE id = @SlotId AND program_id = @ProgramId",
                new { SlotId = slotId, ProgramId = programId });
            return rows > 0;
        }
        // Öğretmenin derslerinin slotları (yetkili olduğu dersler tam, yetkili olmadığı program içi slotlar IsBusyOnly=true)
        public async Task<IEnumerable<ScheduleSlotDto>> GetTeacherSlotsAsync(Guid teacherId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT 
                    s.id,
                    CASE WHEN is_own.val = 1 THEN s.program_id ELSE NULL END AS ProgramId,
                    CASE WHEN is_own.val = 1 THEN s.course_id ELSE NULL END AS CourseId,
                    CASE WHEN is_own.val = 1 THEN s.group_id ELSE NULL END AS GroupId,
                    CASE WHEN is_own.val = 1 THEN s.student_id ELSE NULL END AS StudentId,
                    s.day_of_week AS DayOfWeek,
                    s.start_time AS StartTime,
                    s.end_time AS EndTime,
                    CASE WHEN is_own.val = 1 THEN s.title ELSE NULL END AS Title,
                    CASE WHEN is_own.val = 1 THEN s.type ELSE 'BUSY' END AS Type,
                    s.valid_from AS ValidFrom,
                    s.valid_to AS ValidTo,
                    CASE WHEN is_own.val = 1 THEN s.color ELSE '#94A3B8' END AS Color,
                    s.is_active AS IsActive,
                    CASE WHEN is_own.val = 1 THEN false ELSE true END AS IsBusyOnly
                FROM schedule_slots s
                JOIN program_teachers pt ON pt.program_id = s.program_id AND pt.teacher_id = @TeacherId AND pt.assignment_status = 'ACTIVE'
                CROSS JOIN LATERAL (
                    SELECT CASE 
                        WHEN s.course_id IN (
                            SELECT id FROM courses 
                            WHERE teacher_id = @TeacherId 
                              AND is_active = 1 
                              AND assignment_status = 'ACTIVE'
                              AND COALESCE(teacher_can_view_schedule, 0) = 1
                        ) THEN 1 
                        ELSE 0 
                    END AS val
                ) is_own
                WHERE s.is_active = 1
                ORDER BY s.day_of_week, s.start_time";

            return await conn.QueryAsync<ScheduleSlotDto>(sql, new { TeacherId = teacherId });
        }

        // Öğrencinin slotları (doğrudan + ders + grup)
        public async Task<IEnumerable<ScheduleSlotDto>> GetStudentSlotsAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<ScheduleSlotDto>($@"
                {SlotSelect}
                FROM schedule_slots s
                WHERE s.is_active = 1
                  AND (
                      s.student_id = @StudentId
                      OR s.course_id IN (SELECT course_id FROM course_students WHERE student_id = @StudentId AND is_active = 1)
                      OR s.group_id IN (SELECT group_id FROM student_group_members WHERE student_id = @StudentId)
                  )
                ORDER BY s.day_of_week, s.start_time", new { StudentId = studentId });
        }

        // Velinin çocuklarının slotları
        public async Task<IEnumerable<ScheduleSlotDto>> GetParentSlotsAsync(Guid parentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<ScheduleSlotDto>($@"
                {SlotSelect}
                FROM schedule_slots s
                WHERE s.is_active = 1
                  AND (
                      s.student_id IN (SELECT student_id FROM student_parents WHERE parent_id = @ParentId AND is_accepted = 1)
                      OR s.course_id IN (SELECT cs.course_id FROM course_students cs WHERE cs.student_id IN (SELECT student_id FROM student_parents WHERE parent_id = @ParentId AND is_accepted = 1) AND cs.is_active = 1)
                      OR s.group_id IN (SELECT sgm.group_id FROM student_group_members sgm WHERE sgm.student_id IN (SELECT student_id FROM student_parents WHERE parent_id = @ParentId AND is_accepted = 1))
                  )
                ORDER BY s.day_of_week, s.start_time", new { ParentId = parentId });
        }
    }
}
