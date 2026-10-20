using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class StudentQuestionsRepository : BaseRepository
    {
        public StudentQuestionsRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<StudentQuestionDto>> ListAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<StudentQuestionDto>(@"
                SELECT id AS Id, topic_text AS TopicText, status AS Status, subject_id AS SubjectId, upload_id AS UploadId, created_at AS CreatedAt
                FROM student_questions
                WHERE student_id = @StudentId
                ORDER BY (status = 'OPEN') DESC, created_at DESC",
                new { StudentId = studentId });
        }

        public async Task<Guid> CreateAsync(Guid studentId, Guid programId, CreateStudentQuestionRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var id = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO student_questions (id, program_id, student_id, subject_id, topic_text, upload_id, status, created_at)
                VALUES (@Id, @ProgramId, @StudentId, @SubjectId, @TopicText, @UploadId, 'OPEN', NOW())",
                new { Id = id, ProgramId = programId, StudentId = studentId, req.SubjectId, req.TopicText, req.UploadId });
            return id;
        }

        public async Task<bool> SetStatusAsync(Guid studentId, Guid questionId, string status)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE student_questions SET status = @Status WHERE id = @Id AND student_id = @StudentId",
                new { Id = questionId, StudentId = studentId, Status = status == "RESOLVED" ? "RESOLVED" : "OPEN" });
            return rows > 0;
        }
    }
}
