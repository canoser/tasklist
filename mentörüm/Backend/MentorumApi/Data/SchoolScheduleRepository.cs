using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class SchoolScheduleRepository : BaseRepository
    {
        public SchoolScheduleRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<SchoolScheduleDto>> ListAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<SchoolScheduleDto>(@"
                SELECT id AS Id, day_of_week AS DayOfWeek, to_char(start_time, 'HH24:MI') AS StartTime, to_char(end_time, 'HH24:MI') AS EndTime, label AS Label
                FROM school_schedules
                WHERE student_id = @StudentId
                ORDER BY day_of_week, start_time",
                new { StudentId = studentId });
        }

        public async Task<Guid> CreateAsync(Guid studentId, Guid programId, CreateSchoolScheduleRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var id = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO school_schedules (id, program_id, student_id, day_of_week, start_time, end_time, label, created_at)
                VALUES (@Id, @ProgramId, @StudentId, @DayOfWeek, @StartTime::time, @EndTime::time, @Label, NOW())",
                new
                {
                    Id = id,
                    ProgramId = programId,
                    StudentId = studentId,
                    req.DayOfWeek,
                    req.StartTime,
                    req.EndTime,
                    Label = string.IsNullOrWhiteSpace(req.Label) ? "Okul" : req.Label
                });
            return id;
        }

        public async Task<bool> DeleteAsync(Guid studentId, Guid scheduleId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync("DELETE FROM school_schedules WHERE id = @Id AND student_id = @StudentId", new { Id = scheduleId, StudentId = studentId });
            return rows > 0;
        }
    }
}
