using Dapper;
using MentorumApi.DTOs;
using MentorumApi.Services;

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

                    var groupStudents = await GroupRepository.GetActiveMemberIdsAsync(conn, req.GroupId.Value, tx);
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

                // Önceden konu / ders snapshot bilgilerini çöz
                var preparedScores = new List<PreparedScore>();
                if (req.Scores != null && req.Scores.Count > 0)
                {
                    foreach (var s in req.Scores)
                    {
                        var ps = new PreparedScore
                        {
                            SubjectId = s.SubjectId,
                            CurriculumTopicId = s.CurriculumTopicId,
                            SubjectCode = s.SubjectCode,
                            SubjectName = s.SubjectName,
                            UnitName = s.UnitName,
                            TopicName = s.TopicName,
                            QuestionCount = s.QuestionCount,
                            Correct = s.Correct,
                            Wrong = s.Wrong,
                            Blank = s.Blank,
                            Score = s.Score,
                            MaxScore = s.MaxScore,
                            RawNet = s.Net
                        };

                        if (ps.QuestionCount.HasValue || ps.Correct.HasValue || ps.Wrong.HasValue || ps.Blank.HasValue)
                        {
                            var qc = ps.QuestionCount ?? 0;
                            var cor = ps.Correct ?? 0;
                            var wr = ps.Wrong ?? 0;
                            var bl = ps.Blank ?? 0;
                            if (qc < 0 || cor < 0 || wr < 0 || bl < 0 || (cor + wr + bl != qc))
                                throw new ArgumentException("Doğru, yanlış ve boş toplamı soru sayısına eşit olmalıdır.");
                        }

                        // Snapshot çözümleme
                        if (ps.CurriculumTopicId.HasValue)
                        {
                            var topicInfo = await conn.QuerySingleOrDefaultAsync<TopicSnapshotRow>(@"
                                SELECT s.id AS SubjectId, s.short_code AS SubjectCode, s.name AS SubjectName,
                                       ct.unit_name AS UnitName, ct.topic_name AS TopicName
                                FROM curriculum_topics ct
                                JOIN subjects s ON s.id = ct.subject_id
                                WHERE ct.id = @TopicId",
                                new { TopicId = ps.CurriculumTopicId.Value }, tx);

                            if (topicInfo != null)
                            {
                                ps.SubjectId ??= topicInfo.SubjectId;
                                ps.SubjectCode ??= topicInfo.SubjectCode;
                                ps.SubjectName ??= topicInfo.SubjectName;
                                ps.UnitName ??= topicInfo.UnitName;
                                ps.TopicName ??= topicInfo.TopicName;
                            }
                        }
                        else if (ps.SubjectId.HasValue || !string.IsNullOrWhiteSpace(ps.SubjectCode))
                        {
                            var subInfo = await conn.QuerySingleOrDefaultAsync<SubjectSnapshotRow>(@"
                                SELECT s.id AS SubjectId, s.short_code AS SubjectCode, s.name AS SubjectName
                                FROM subjects s
                                WHERE (@SubId IS NOT NULL AND s.id = @SubId)
                                   OR (@SubCode IS NOT NULL AND (s.short_code = @SubCode OR s.name = @SubCode))
                                LIMIT 1",
                                new { SubId = ps.SubjectId, SubCode = ps.SubjectCode }, tx);

                            if (subInfo != null)
                            {
                                ps.SubjectId ??= subInfo.SubjectId;
                                ps.SubjectCode ??= subInfo.SubjectCode;
                                ps.SubjectName ??= subInfo.SubjectName;
                            }
                        }

                        preparedScores.Add(ps);
                    }
                }

                var sql = @"
                    INSERT INTO exam_results (id, student_id, program_id, created_by, exam_date, exam_type, exam_name, total_net, notes, error_reasons, created_at)
                    VALUES (@Id, @StudentId, @ProgramId, @CreatedBy, @ExamDate, @ExamType, @ExamName, @TotalNet, @Notes, @ErrorReasons, @Now)";

                var scoreSql = @"
                    INSERT INTO exam_scores (
                        id, exam_id, subject_id, curriculum_topic_id, subject_code, subject_name,
                        unit_name, topic_name, question_count, correct, wrong, blank,
                        net, score, max_score
                    )
                    VALUES (
                        @Id, @ExamId, @SubjectId, @CurriculumTopicId, @SubjectCode, @SubjectName,
                        @UnitName, @TopicName, @QuestionCount, @Correct, @Wrong, @Blank,
                        @Net, @Score, @MaxScore
                    )";

                bool isFirst = true;
                foreach (var sId in targetStudentIds)
                {
                    var examId = isFirst ? firstExamId : Guid.NewGuid();
                    isFirst = false;

                    var studentTrack = await conn.QuerySingleOrDefaultAsync<string?>(
                        "SELECT track FROM students WHERE id = @StudentId", new { StudentId = sId }, tx);

                    decimal sumNet = 0m;
                    bool hasComputedNet = false;
                    var studentScores = new List<(PreparedScore Score, decimal? Net)>();

                    foreach (var ps in preparedScores)
                    {
                        decimal? computedNet = null;
                        if (ps.QuestionCount.HasValue || ps.Correct.HasValue || ps.Wrong.HasValue || ps.Blank.HasValue)
                        {
                            computedNet = NetCalculator.ComputeNet(ps.Correct ?? 0, ps.Wrong ?? 0, ps.Blank ?? 0, studentTrack, req.ExamType);
                            sumNet += computedNet.Value;
                            hasComputedNet = true;
                        }
                        else if (ps.RawNet.HasValue)
                        {
                            computedNet = ps.RawNet.Value;
                            sumNet += computedNet.Value;
                            hasComputedNet = true;
                        }
                        studentScores.Add((ps, computedNet));
                    }

                    var finalTotalNet = hasComputedNet ? (float)sumNet : req.TotalNet;

                    await conn.ExecuteAsync(sql, new {
                        Id = examId,
                        StudentId = sId,
                        CreatedBy = coachId,
                        ProgramId = programId,
                        req.ExamDate,
                        req.ExamType,
                        req.ExamName,
                        TotalNet = finalTotalNet,
                        req.Notes,
                        req.ErrorReasons,
                        Now = DateTime.UtcNow
                    }, tx);

                    foreach (var (ps, netVal) in studentScores)
                    {
                        await conn.ExecuteAsync(scoreSql, new {
                            Id = Guid.NewGuid(),
                            ExamId = examId,
                            ps.SubjectId,
                            ps.CurriculumTopicId,
                            ps.SubjectCode,
                            ps.SubjectName,
                            ps.UnitName,
                            ps.TopicName,
                            QuestionCount = ps.QuestionCount,
                            Correct = ps.Correct,
                            Wrong = ps.Wrong,
                            Blank = ps.Blank,
                            Net = netVal,
                            ps.Score,
                            ps.MaxScore
                        }, tx);
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

        private sealed class PreparedScore
        {
            public Guid? SubjectId { get; set; }
            public Guid? CurriculumTopicId { get; set; }
            public string? SubjectCode { get; set; }
            public string? SubjectName { get; set; }
            public string? UnitName { get; set; }
            public string? TopicName { get; set; }
            public int? QuestionCount { get; set; }
            public int? Correct { get; set; }
            public int? Wrong { get; set; }
            public int? Blank { get; set; }
            public float? Score { get; set; }
            public float? MaxScore { get; set; }
            public decimal? RawNet { get; set; }
        }

        private sealed class TopicSnapshotRow
        {
            public Guid SubjectId { get; set; }
            public string SubjectCode { get; set; } = "";
            public string SubjectName { get; set; } = "";
            public string UnitName { get; set; } = "";
            public string TopicName { get; set; } = "";
        }

        private sealed class SubjectSnapshotRow
        {
            public Guid SubjectId { get; set; }
            public string SubjectCode { get; set; } = "";
            public string SubjectName { get; set; } = "";
        }
    }
}
