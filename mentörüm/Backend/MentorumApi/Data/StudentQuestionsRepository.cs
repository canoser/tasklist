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
                SELECT q.id AS Id, q.topic_text AS TopicText, q.status AS Status, q.subject_id AS SubjectId,
                       s.name AS SubjectName, q.upload_id AS UploadId, q.coach_reply AS CoachReply,
                       q.replied_at AS RepliedAt, q.created_at AS CreatedAt
                FROM student_questions q
                LEFT JOIN subjects s ON s.id = q.subject_id
                WHERE q.student_id = @StudentId
                ORDER BY (q.status = 'OPEN') DESC, q.created_at DESC",
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

        public async Task<bool> ReplyByCoachAsync(Guid studentId, Guid questionId, Guid coachId, string? reply, string? status)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE student_questions q
                SET coach_reply = @Reply,
                    replied_by = @CoachId,
                    replied_at = NOW(),
                    status = @Status
                WHERE q.id = @QuestionId 
                  AND q.student_id = @StudentId
                  AND q.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)",
                new { 
                    QuestionId = questionId, 
                    StudentId = studentId, 
                    CoachId = coachId, 
                    Reply = reply, 
                    Status = status == "OPEN" ? "OPEN" : "RESOLVED" 
                });
            return rows > 0;
        }
    }
}
