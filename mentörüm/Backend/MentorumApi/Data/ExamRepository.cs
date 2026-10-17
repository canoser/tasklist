using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class ExamRepository : BaseRepository
    {
        public ExamRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<Guid> CreateExamResultAsync(Guid coachId, CreateExamResultRequest req)
        {
            if (!req.StudentId.HasValue && !req.GroupId.HasValue)
                throw new ArgumentException("Öğrenci veya Grup seçilmelidir.");

            var firstExamId = Guid.NewGuid();

            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try 
            {
                var targetStudentIds = new List<Guid>();
                Guid programId;

                if (req.GroupId.HasValue)
                {
                    var groupProg = await conn.QuerySingleOrDefaultAsync<Guid?>(
                        @"SELECT g.program_id 
                          FROM student_groups g 
                          JOIN program_coaches pc ON pc.program_id = g.program_id
                          WHERE g.id = @GroupId AND pc.coach_id = @CoachId",
                        new { GroupId = req.GroupId.Value, CoachId = coachId }, tx);

                    if (groupProg == null)
                        throw new UnauthorizedAccessException("Bu grup koça ait değil veya bulunamadı.");

                    programId = groupProg.Value;

                    var groupStudents = await conn.QueryAsync<Guid>(
                        "SELECT student_id FROM student_group_members WHERE group_id = @GroupId",
                        new { GroupId = req.GroupId.Value }, tx);

                    targetStudentIds.AddRange(groupStudents);
                }
                else
                {
                    var studentProg = await conn.QuerySingleOrDefaultAsync<Guid?>(
                        @"SELECT program_id FROM students 
                          WHERE id = @StudentId AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)",
                        new { StudentId = req.StudentId!.Value, CoachId = coachId }, tx);

                    if (studentProg == null)
                        throw new UnauthorizedAccessException("Bu öğrenci bu koça ait değil.");

                    programId = studentProg.Value;
                    targetStudentIds.Add(req.StudentId.Value);
                }

                var sql = @"
                    INSERT INTO exam_results (id, student_id, program_id, created_by, exam_date, exam_type, exam_name, total_net, notes, created_at)
                    VALUES (@Id, @StudentId, @ProgramId, @CreatedBy, @ExamDate, @ExamType, @ExamName, @TotalNet, @Notes, @Now)";

                var scoreSql = @"
                    INSERT INTO exam_scores (exam_id, subject_code, score, max_score)
                    VALUES (@ExamId, @SubjectCode, @Score, @MaxScore)";

                bool isFirst = true;
                foreach (var sId in targetStudentIds)
                {
                    var examId = isFirst ? firstExamId : Guid.NewGuid();
                    isFirst = false;

                    await conn.ExecuteAsync(sql, new {
                        Id = examId,
                        StudentId = sId,
                        CreatedBy = coachId,
                        ProgramId = programId,
                        req.ExamDate,
                        req.ExamType,
                        req.ExamName,
                        req.TotalNet,
                        req.Notes,
                        Now = DateTime.UtcNow
                    }, tx);

                    if (req.Scores != null && req.Scores.Any())
                    {
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
                }

                tx.Commit();
                return firstExamId;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }
    }
}
