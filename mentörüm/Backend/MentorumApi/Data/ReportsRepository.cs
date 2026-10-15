using Dapper;
using MentorumApi.DTOs;

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
    }
}
