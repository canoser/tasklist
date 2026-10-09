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

        public async Task<dynamic> GetStudentReportAsync(Guid coachId, Guid studentId)
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

            return await conn.QueryFirstOrDefaultAsync<dynamic>(sql, new { StudentId = studentId });
        }
    }
}
