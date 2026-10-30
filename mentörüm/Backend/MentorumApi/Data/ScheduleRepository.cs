using Dapper;
using MentorumApi.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MentorumApi.Data
{
    public class ScheduleConflictItem
    {
        public Guid SlotId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string ConflictType { get; set; } = string.Empty; // "TEACHER" or "STUDENT"
        public string ConflictingName { get; set; } = string.Empty;
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
    }

    public class ScheduleConflictException : Exception
    {
        public List<ScheduleConflictItem> Conflicts { get; }
        public ScheduleConflictException(List<ScheduleConflictItem> conflicts) 
            : base("Ders çakışması tespit edildi.")
        {
            Conflicts = conflicts;
        }
    }

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

        public async Task<List<ScheduleConflictItem>> CheckConflictsAsync(
            Guid programId,
            int dayOfWeek,
            TimeSpan startTime,
            TimeSpan endTime,
            DateTime? validFrom,
            DateTime? validTo,
            Guid? courseId,
            Guid? groupId,
            Guid? studentId,
            Guid? excludeSlotId = null)
        {
            var conflicts = new List<ScheduleConflictItem>();
            using var conn = _connectionFactory.CreateConnection();

            // 1. Öğretmen çakışması denetimi
            if (courseId.HasValue)
            {
                var teacherInfo = await conn.QuerySingleOrDefaultAsync<(Guid TeacherId, string TeacherName)?>(@"
                    SELECT c.teacher_id, u.full_name 
                    FROM courses c 
                    JOIN users u ON u.id = c.teacher_id 
                    WHERE c.id = @CourseId AND c.is_active = 1 AND c.teacher_id IS NOT NULL",
                    new { CourseId = courseId.Value });

                if (teacherInfo.HasValue)
                {
                    var overlappingTeacherSlots = await conn.QueryAsync<ScheduleConflictItem>(@"
                        SELECT s.id AS SlotId, s.title AS Title, 'TEACHER' AS ConflictType,
                               @TeacherName AS ConflictingName, s.start_time AS StartTime, s.end_time AS EndTime
                        FROM schedule_slots s
                        JOIN courses c ON c.id = s.course_id
                        WHERE c.teacher_id = @TeacherId
                          AND s.is_active = 1
                          AND s.day_of_week = @DayOfWeek
                          AND (@ExcludeSlotId IS NULL OR s.id != @ExcludeSlotId)
                          AND (s.start_time < @EndTime AND s.end_time > @StartTime)
                          AND (@ValidFrom IS NULL OR s.valid_to IS NULL OR s.valid_to >= @ValidFrom)
                          AND (@ValidTo IS NULL OR s.valid_from IS NULL OR s.valid_from <= @ValidTo)",
                        new
                        {
                            TeacherId = teacherInfo.Value.TeacherId,
                            TeacherName = teacherInfo.Value.TeacherName,
                            DayOfWeek = dayOfWeek,
                            StartTime = startTime,
                            EndTime = endTime,
                            ValidFrom = validFrom,
                            ValidTo = validTo,
                            ExcludeSlotId = excludeSlotId
                        });

                    conflicts.AddRange(overlappingTeacherSlots);
                }
            }

            // 2. Öğrenci / Grup çakışması denetimi
            var targetStudentList = new List<Guid>();
            if (studentId.HasValue)
            {
                targetStudentList.Add(studentId.Value);
            }
            else if (groupId.HasValue)
            {
                var gStudents = await GroupRepository.GetActiveMemberIdsAsync(conn, groupId.Value);
                targetStudentList.AddRange(gStudents);
            }
            else if (courseId.HasValue)
            {
                var cStudents = await conn.QueryAsync<Guid>(
                    "SELECT student_id FROM vw_active_course_students WHERE course_id = @CourseId",
                    new { CourseId = courseId.Value });
                targetStudentList.AddRange(cStudents);
            }

            if (targetStudentList.Count > 0)
            {
                var targetStudentArr = targetStudentList.Distinct().ToArray();
                var overlappingStudentSlots = await conn.QueryAsync<ScheduleConflictItem>(@"
                    SELECT DISTINCT s.id AS SlotId, s.title AS Title, 'STUDENT' AS ConflictType,
                           u.full_name AS ConflictingName, s.start_time AS StartTime, s.end_time AS EndTime
                    FROM schedule_slots s
                    JOIN LATERAL (
                        SELECT s.student_id AS sid WHERE s.student_id = ANY(@TargetStudents)
                        UNION
                        SELECT v.student_id AS sid FROM vw_active_course_students v WHERE v.course_id = s.course_id AND v.student_id = ANY(@TargetStudents)
                        UNION
                        SELECT sgm.student_id AS sid FROM student_group_members sgm WHERE sgm.group_id = s.group_id AND sgm.student_id = ANY(@TargetStudents) AND sgm.is_active = 1
                    ) st ON true
                    JOIN users u ON u.id = st.sid
                    WHERE s.is_active = 1
                      AND s.day_of_week = @DayOfWeek
                      AND (@ExcludeSlotId IS NULL OR s.id != @ExcludeSlotId)
                      AND (s.start_time < @EndTime AND s.end_time > @StartTime)
                      AND (@ValidFrom IS NULL OR s.valid_to IS NULL OR s.valid_to >= @ValidFrom)
                      AND (@ValidTo IS NULL OR s.valid_from IS NULL OR s.valid_from <= @ValidTo)",
                    new
                    {
                        TargetStudents = targetStudentArr,
                        DayOfWeek = dayOfWeek,
                        StartTime = startTime,
                        EndTime = endTime,
                        ValidFrom = validFrom,
                        ValidTo = validTo,
                        ExcludeSlotId = excludeSlotId
                    });

                conflicts.AddRange(overlappingStudentSlots);
            }

            return conflicts;
        }

        public async Task<Guid> CreateSlotAsync(Guid programId, Guid coachId, CreateScheduleSlotRequest req)
        {
            if (!await IsMemberAsync(programId, coachId)) throw new UnauthorizedAccessException("FORBIDDEN");

            int targetCount = (req.CourseId != null ? 1 : 0) + (req.GroupId != null ? 1 : 0) + (req.StudentId != null ? 1 : 0);
            if (targetCount != 1) throw new InvalidOperationException("EXACTLY_ONE_TARGET");
            if (req.DayOfWeek < 1 || req.DayOfWeek > 7) throw new InvalidOperationException("INVALID_DAY_OF_WEEK");
            if (req.StartTime >= req.EndTime) throw new InvalidOperationException("INVALID_TIME_RANGE");

            // B3: Çakışma denetimi
            var conflicts = await CheckConflictsAsync(programId, req.DayOfWeek, req.StartTime, req.EndTime, req.ValidFrom, req.ValidTo, req.CourseId, req.GroupId, req.StudentId);
            if (conflicts.Count > 0)
            {
                throw new ScheduleConflictException(conflicts);
            }

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

            var existing = await GetSlotAsync(programId, slotId, coachId);
            if (existing == null) return false;

            var dayOfWeek = req.DayOfWeek ?? existing.DayOfWeek;
            var startTime = req.StartTime ?? existing.StartTime;
            var endTime = req.EndTime ?? existing.EndTime;
            var validFrom = req.ValidFrom ?? existing.ValidFrom;
            var validTo = req.ValidTo ?? existing.ValidTo;

            if (startTime >= endTime) throw new InvalidOperationException("INVALID_TIME_RANGE");

            // B3: Güncellemede çakışma denetimi (kendi slotId'si hariç)
            var conflicts = await CheckConflictsAsync(programId, dayOfWeek, startTime, endTime, validFrom, validTo, existing.CourseId, existing.GroupId, existing.StudentId, slotId);
            if (conflicts.Count > 0)
            {
                throw new ScheduleConflictException(conflicts);
            }

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
                      OR s.course_id IN (SELECT course_id FROM vw_active_course_students WHERE student_id = @StudentId)
                      OR s.group_id IN (SELECT group_id FROM vw_active_student_groups WHERE student_id = @StudentId)
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
                      s.student_id IN (SELECT student_id FROM student_parents WHERE parent_id = @ParentId AND is_accepted = 1 AND COALESCE(can_view_calendar, 0) = 1)
                      OR s.course_id IN (SELECT v.course_id FROM vw_active_course_students v WHERE v.student_id IN (SELECT student_id FROM student_parents WHERE parent_id = @ParentId AND is_accepted = 1 AND COALESCE(can_view_calendar, 0) = 1))
                      OR s.group_id IN (SELECT sgm.group_id FROM vw_active_student_groups sgm WHERE sgm.student_id IN (SELECT student_id FROM student_parents WHERE parent_id = @ParentId AND is_accepted = 1 AND COALESCE(can_view_calendar, 0) = 1))
                  )
                ORDER BY s.day_of_week, s.start_time", new { ParentId = parentId });
        }
    }
}
