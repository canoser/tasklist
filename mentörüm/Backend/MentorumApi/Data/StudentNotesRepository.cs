using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class StudentNotesRepository : BaseRepository
    {
        public StudentNotesRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<StudentPersonalNoteDto>> ListAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<StudentPersonalNoteDto>(@"
                SELECT id AS Id, title AS Title, content AS Content, visibility AS Visibility,
                       is_pinned AS IsPinned, event_date AS EventDate, created_at AS CreatedAt, updated_at AS UpdatedAt
                FROM student_notes
                WHERE student_id = @StudentId
                ORDER BY is_pinned DESC, updated_at DESC",
                new { StudentId = studentId });
        }

        public async Task<Guid> CreateAsync(Guid studentId, Guid programId, CreatePersonalNoteRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var id = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO student_notes (id, program_id, student_id, title, content, visibility, is_pinned, event_date, created_at, updated_at)
                VALUES (@Id, @ProgramId, @StudentId, @Title, @Content, @Visibility, 0, @EventDate, NOW(), NOW())",
                new
                {
                    Id = id,
                    ProgramId = programId,
                    StudentId = studentId,
                    req.Title,
                    req.Content,
                    Visibility = req.Visibility == "COACH" ? "COACH" : "PRIVATE",
                    req.EventDate
                });
            return id;
        }

        public async Task<bool> UpdateAsync(Guid studentId, Guid noteId, UpdatePersonalNoteRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE student_notes
                SET title = @Title, content = @Content, visibility = @Visibility, is_pinned = @IsPinned, event_date = @EventDate, updated_at = NOW()
                WHERE id = @Id AND student_id = @StudentId",
                new
                {
                    Id = noteId,
                    StudentId = studentId,
                    req.Title,
                    req.Content,
                    Visibility = req.Visibility == "COACH" ? "COACH" : "PRIVATE",
                    IsPinned = req.IsPinned ? 1 : 0,
                    req.EventDate
                });
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(Guid studentId, Guid noteId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync("DELETE FROM student_notes WHERE id = @Id AND student_id = @StudentId", new { Id = noteId, StudentId = studentId });
            return rows > 0;
        }

        public async Task<IEnumerable<StudentPersonalNoteDto>> GetForCoachAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<StudentPersonalNoteDto>(@"
                SELECT id AS Id, title AS Title, content AS Content, visibility AS Visibility,
                       is_pinned AS IsPinned, event_date AS EventDate, created_at AS CreatedAt, updated_at AS UpdatedAt
                FROM student_notes
                WHERE student_id = @StudentId AND visibility = 'COACH'
                ORDER BY updated_at DESC",
                new { StudentId = studentId });
        }
    }
}
