using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class StudentCheckinRepository : BaseRepository
    {
        public StudentCheckinRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task UpsertAsync(Guid studentId, Guid programId, string mood, string? note)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO student_checkins (id, program_id, student_id, checkin_date, mood, note, created_at, updated_at)
                VALUES (gen_random_uuid(), @ProgramId, @StudentId, (NOW() AT TIME ZONE 'Europe/Istanbul')::date, @Mood, @Note, NOW(), NOW())
                ON CONFLICT (student_id, checkin_date) DO UPDATE SET mood = @Mood, note = @Note, updated_at = NOW()",
                new { ProgramId = programId, StudentId = studentId, Mood = mood, Note = note });
        }

        public async Task<IEnumerable<StudentCheckinDto>> GetRecentAsync(Guid studentId, int limit = 30)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<StudentCheckinDto>(@"
                SELECT id AS Id, checkin_date AS CheckinDate, mood AS Mood, note AS Note
                FROM student_checkins
                WHERE student_id = @StudentId
                ORDER BY checkin_date DESC
                LIMIT @Limit",
                new { StudentId = studentId, Limit = limit });
        }
    }
}
