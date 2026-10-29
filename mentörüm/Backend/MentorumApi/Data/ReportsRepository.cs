using Dapper;
using MentorumApi.DTOs;
using MentorumApi.Services;

namespace MentorumApi.Data
{
    public class ReportsRepository : BaseRepository
    {
        public ReportsRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<ReportsOverviewDto> GetOverviewReportAsync(Guid coachId)
        {
            var sql = @"
                SELECT 
                    (SELECT COUNT(*) FROM students WHERE program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId) AND is_active = 1) AS TotalStudents,
                    (SELECT COUNT(*) FROM homework_assignments WHERE program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId) AND status IN ('DONE', 'LATE_DONE') AND completed_at >= CURRENT_DATE) AS CompletedToday,
                    (SELECT COUNT(*) FROM homework_assignments WHERE program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId) AND status = 'OVERDUE') AS TotalOverdue,
                    (SELECT COUNT(*) FROM homework_assignments WHERE program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId) AND due_date >= date_trunc('week', CURRENT_DATE)) AS AssignedThisWeek,
                    
                    -- Başarı Oranı (Tamamlanan / Toplam)
                    (
                        SELECT COALESCE(
                            CAST(SUM(CASE WHEN status IN ('DONE', 'LATE_DONE') THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 
                        0)
                        FROM homework_assignments 
                        WHERE program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                    ) AS SuccessRate
            ";
            
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<ReportsOverviewDto>(sql, new { CoachId = coachId }) ?? new ReportsOverviewDto();
        }

        public async Task<StudentReportDto?> GetStudentReportAsync(Guid coachId, Guid studentId)
        {
            // Security check
            var sqlCheck = "SELECT 1 FROM students WHERE id = @StudentId AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)";
            using var conn = _connectionFactory.CreateConnection();
            var exists = await conn.QueryFirstOrDefaultAsync<int?>(sqlCheck, new { StudentId = studentId, CoachId = coachId });
            if (exists == null) return null;

            var sql = @"
                SELECT 
                    (SELECT COUNT(*) FROM homework_assignments WHERE student_id = @StudentId AND status IN ('DONE', 'LATE_DONE')) AS TotalCompleted,
                    (SELECT COUNT(*) FROM homework_assignments WHERE student_id = @StudentId AND status = 'OVERDUE') AS TotalOverdue,
                    (SELECT COUNT(*) FROM homework_assignments WHERE student_id = @StudentId) AS TotalAssigned,
                    
                    (
                        SELECT COALESCE(
                            CAST(SUM(CASE WHEN status IN ('DONE', 'LATE_DONE') THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 
                        0)
                        FROM homework_assignments 
                        WHERE student_id = @StudentId
                    ) AS SuccessRate
            ";

            return await conn.QueryFirstOrDefaultAsync<StudentReportDto>(sql, new { StudentId = studentId });
        }

        public async Task<ReportsDetailDto> GetDetailReportAsync(Guid coachId)
        {
            var result = new ReportsDetailDto();
            using var conn = _connectionFactory.CreateConnection();

            var subjectBreakdown = await conn.QueryAsync<SubjectBreakdownItemDto>(@"
                SELECT COALESCE(s.name, 'Serbest') AS SubjectName,
                       SUM(CASE WHEN h.status IN ('DONE','LATE_DONE') THEN 1 ELSE 0 END)::int AS Completed,
                       COUNT(*)::int AS Total,
                       CAST(COALESCE(SUM(CASE WHEN h.status IN ('DONE','LATE_DONE') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*),0), 0) AS int) AS SuccessRate
                FROM homework_assignments h
                LEFT JOIN subjects s ON s.id = h.subject_id
                WHERE h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                GROUP BY s.name
                ORDER BY Total DESC",
                new { CoachId = coachId });
            result.SubjectBreakdown = subjectBreakdown.ToList();

            var recent = await conn.QueryAsync<RecentHomeworkItemDto>(@"
                SELECT u.full_name AS StudentName, h.snapshot_title AS Title, h.completed_at AS CompletedAt, h.status AS Status
                FROM homework_assignments h
                JOIN users u ON u.id = h.student_id
                WHERE h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                  AND h.status IN ('DONE','LATE_DONE')
                ORDER BY h.completed_at DESC
                LIMIT 5",
                new { CoachId = coachId });
            result.RecentHomework = recent.ToList();

            var overdue = await conn.QueryAsync<OverdueHomeworkItemDto>(@"
                SELECT u.full_name AS StudentName, h.snapshot_title AS Title, h.due_date AS DueDate
                FROM homework_assignments h
                JOIN users u ON u.id = h.student_id
                WHERE h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                  AND h.status = 'OVERDUE'
                ORDER BY h.due_date ASC",
                new { CoachId = coachId });
            result.OverdueHomework = overdue.ToList();

            var weekly = await conn.QueryAsync<WeeklyTrendItemDto>(@"
                SELECT date_trunc('week', h.completed_at)::date AS WeekStart,
                       COUNT(*)::int AS Completed
                FROM homework_assignments h
                WHERE h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                  AND h.status IN ('DONE','LATE_DONE')
                  AND h.completed_at >= date_trunc('week', CURRENT_DATE) - interval '3 weeks'
                GROUP BY 1
                ORDER BY 1",
                new { CoachId = coachId });
            result.WeeklyTrend = weekly.ToList();

            return result;
        }

        public async Task<IEnumerable<StudentSubjectStatDto>> GetStudentSubjectStatsAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var track = await conn.QuerySingleOrDefaultAsync<string>(
                "SELECT track FROM students WHERE id = @StudentId",
                new { StudentId = studentId });

            var sql = @"
                SELECT 
                    ss.subject_id AS SubjectId,
                    s.name AS SubjectName,
                    ss.curriculum_topic_id AS CurriculumTopicId,
                    ct.topic_name AS TopicName,
                    COALESCE(SUM(ss.minutes), 0)::int AS TotalMinutes,
                    COALESCE(SUM(ss.question_count), 0)::int AS TotalQuestions,
                    COALESCE(SUM(ss.correct), 0)::int AS TotalCorrect,
                    COALESCE(SUM(ss.wrong), 0)::int AS TotalWrong,
                    COALESCE(SUM(ss.blank), 0)::int AS TotalBlank
                FROM study_sessions ss
                LEFT JOIN subjects s ON s.id = ss.subject_id
                LEFT JOIN curriculum_topics ct ON ct.id = ss.curriculum_topic_id
                WHERE ss.student_id = @StudentId
                GROUP BY ss.subject_id, s.name, ss.curriculum_topic_id, ct.topic_name
                ORDER BY TotalMinutes DESC";

            var rows = await conn.QueryAsync<dynamic>(sql, new { StudentId = studentId });

            return rows.Select(r =>
            {
                int correct = (int)r.totalcorrect;
                int wrong = (int)r.totalwrong;
                int blank = (int)r.totalblank;
                int qCount = (int)r.totalquestions;

                return new StudentSubjectStatDto
                {
                    SubjectId = (Guid?)r.subjectid,
                    SubjectName = (string?)r.subjectname ?? "Genel",
                    CurriculumTopicId = (Guid?)r.curriculumtopicid,
                    TopicName = (string?)r.topicname,
                    TotalMinutes = (int)r.totalminutes,
                    TotalQuestions = qCount,
                    TotalCorrect = correct,
                    TotalWrong = wrong,
                    TotalBlank = blank,
                    TotalNet = NetCalculator.ComputeNet(correct, wrong, blank, track),
                    SuccessRate = NetCalculator.ComputeSuccessRate(correct, qCount)
                };
            });
        }

        public async Task<WeeklyTimeBudgetDto> GetWeeklyTimeBudgetAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var studyMinutes = await conn.ExecuteScalarAsync<int?>(@"
                SELECT COALESCE(SUM(minutes), 0)::int 
                FROM study_sessions 
                WHERE student_id = @StudentId 
                  AND (started_at >= date_trunc('week', CURRENT_DATE) OR (started_at IS NULL AND created_at >= date_trunc('week', CURRENT_DATE)))",
                new { StudentId = studentId }) ?? 0;

            var personalRows = await conn.QueryAsync<dynamic>(@"
                SELECT 
                    COALESCE(category, 'OTHER') AS Category,
                    COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_at, start_at + interval '1 hour') - start_at)) / 60), 0)::int AS TotalMinutes
                FROM personal_events
                WHERE user_id = @StudentId 
                  AND start_at >= date_trunc('week', CURRENT_DATE)
                GROUP BY COALESCE(category, 'OTHER')",
                new { StudentId = studentId });

            var schoolMinutes = await conn.ExecuteScalarAsync<int?>(@"
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN end_time >= start_time THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60
                        ELSE EXTRACT(EPOCH FROM (end_time + interval '24 hours' - start_time)) / 60
                    END
                ), 0)::int
                FROM school_schedules
                WHERE student_id = @StudentId",
                new { StudentId = studentId }) ?? 0;

            var result = new WeeklyTimeBudgetDto
            {
                TotalStudyMinutes = studyMinutes
            };

            int totalPersonal = 0;
            var categoriesMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            foreach (var r in personalRows)
            {
                string cat = (string)r.category;
                int mins = (int)r.totalminutes;
                totalPersonal += mins;
                categoriesMap[cat] = categoriesMap.GetValueOrDefault(cat, 0) + mins;
            }

            if (schoolMinutes > 0)
            {
                totalPersonal += schoolMinutes;
                categoriesMap["SCHOOL"] = categoriesMap.GetValueOrDefault("SCHOOL", 0) + schoolMinutes;
            }

            if (studyMinutes > 0)
            {
                result.Categories.Add(new WeeklyTimeBudgetItemDto
                {
                    Category = "STUDY",
                    TotalMinutes = studyMinutes
                });
            }

            foreach (var kvp in categoriesMap)
            {
                result.Categories.Add(new WeeklyTimeBudgetItemDto
                {
                    Category = kvp.Key,
                    TotalMinutes = kvp.Value
                });
            }

            result.TotalPersonalMinutes = totalPersonal;
            result.TotalTrackedMinutes = studyMinutes + totalPersonal;

            if (result.TotalTrackedMinutes > 0)
            {
                foreach (var cat in result.Categories)
                {
                    cat.Percentage = Math.Round((double)cat.TotalMinutes / result.TotalTrackedMinutes * 100.0, 1);
                }
            }

            return result;
        }
    }
}
