using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class ExamRepository : BaseRepository
    {
        public ExamRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<Guid> CreateExamResultAsync(Guid coachId, CreateExamResultRequest req)
        {
            var examId = Guid.NewGuid();

            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try 
            {
                var owned = await conn.QuerySingleOrDefaultAsync<int?>(
                    "SELECT 1 FROM students WHERE id = @StudentId AND coach_id = @CoachId",
                    new { req.StudentId, CoachId = coachId });
                if (owned == null) throw new UnauthorizedAccessException("Bu öğrenci bu koça ait değil.");

                var sql = @"
                    INSERT INTO exam_results (id, student_id, coach_id, exam_date, exam_type, exam_name, total_net, notes, created_at)
                    VALUES (@Id, @StudentId, @CoachId, @ExamDate, @ExamType, @ExamName, @TotalNet, @Notes, @Now)";

                await conn.ExecuteAsync(sql, new {
                    Id = examId,
                    req.StudentId,
                    CoachId = coachId,
                    req.ExamDate,
                    req.ExamType,
                    req.ExamName,
                    req.TotalNet,
                    req.Notes,
                    Now = DateTime.UtcNow
                }, tx);

                if (req.Scores != null && req.Scores.Any())
                {
                    var scoreSql = @"
                        INSERT INTO exam_scores (exam_id, subject_code, score, max_score)
                        VALUES (@ExamId, @SubjectCode, @Score, @MaxScore)";

                    foreach (var score in req.Scores)
                    {
                        await conn.ExecuteAsync(scoreSql, new {
                            ExamId = examId,
                            score.SubjectCode,
                            score.Score,
                            score.MaxScore
                        }, tx);
                    }
                }

                tx.Commit();
                return examId;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }
    }
}
