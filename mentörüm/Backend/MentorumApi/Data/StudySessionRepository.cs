using Dapper;
using MentorumApi.DTOs;
using MentorumApi.Services;

namespace MentorumApi.Data
{
    public class StudySessionRepository : BaseRepository
    {
        public StudySessionRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<Guid> CreateAsync(Guid studentId, CreateStudySessionRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var studentInfo = await conn.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT program_id, track FROM students WHERE id = @StudentId",
                new { StudentId = studentId });

            if (studentInfo == null) throw new UnauthorizedAccessException("Öğrenci bulunamadı.");

            Guid? resolvedSubjectId = req.SubjectId;
            string? subjectName = null;

            if (req.SubjectId.HasValue)
            {
                subjectName = await conn.QuerySingleOrDefaultAsync<string>("SELECT name FROM subjects WHERE id = @SubjectId", new { req.SubjectId });
            }
            else if (req.CurriculumTopicId.HasValue)
            {
                var subjectInfo = await conn.QuerySingleOrDefaultAsync<dynamic>(
                    "SELECT s.id, s.name FROM curriculum_topics ct JOIN subjects s ON s.id = ct.subject_id WHERE ct.id = @TopicId",
                    new { TopicId = req.CurriculumTopicId });
                if (subjectInfo != null)
                {
                    resolvedSubjectId = (Guid)subjectInfo.id;
                    subjectName = (string)subjectInfo.name;
                }
            }

            var id = Guid.NewGuid();
            var sql = @"
                INSERT INTO study_sessions (
                    id, program_id, student_id, subject_id, curriculum_topic_id,
                    minutes, question_count, correct, wrong, blank, source_type,
                    started_at, ended_at, created_at
                ) VALUES (
                    @Id, @ProgramId, @StudentId, @SubjectId, @CurriculumTopicId,
                    @Minutes, @QuestionCount, @Correct, @Wrong, @Blank, @SourceType,
                    @StartedAt, @EndedAt, NOW()
                )";

            var parameters = new
            {
                Id = id,
                ProgramId = (Guid)studentInfo.program_id,
                StudentId = studentId,
                SubjectId = resolvedSubjectId,
                req.CurriculumTopicId,
                req.Minutes,
                req.QuestionCount,
                req.Correct,
                req.Wrong,
                req.Blank,
                SourceType = string.IsNullOrWhiteSpace(req.SourceType) ? "MANUAL" : req.SourceType,
                req.StartedAt,
                req.EndedAt
            };

            // T06: Kronometre kaydı → aynı işlemde takvime otomatik "Çalışma" bloğu
            if (!req.StartedAt.HasValue)
            {
                await conn.ExecuteAsync(sql, parameters);
                return id;
            }

            if (conn.State != System.Data.ConnectionState.Open) conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                await conn.ExecuteAsync(sql, parameters, tx);

                var label = string.IsNullOrWhiteSpace(subjectName) ? "Çalışma" : $"Çalışma: {subjectName}";
                var blockEnd = req.EndedAt ?? req.StartedAt.Value.AddMinutes(req.Minutes);

                await conn.ExecuteAsync(@"
                    INSERT INTO personal_events (id, user_id, title, event_type, category, start_at, end_at)
                    VALUES (gen_random_uuid(), @StudentId, @Label, 'STUDENT_EVENT', 'STUDY', @StartAt, @EndAt)",
                    new { StudentId = studentId, Label = label, StartAt = req.StartedAt.Value, EndAt = blockEnd }, tx);

                tx.Commit();
            }
            catch
            {
                tx.Rollback();
                throw;
            }

            return id;
        }

        public async Task<StreakDto> GetStreakAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var days = await conn.QueryAsync<DateTime>(@"
                SELECT DISTINCT COALESCE((started_at AT TIME ZONE 'Europe/Istanbul')::date, (created_at AT TIME ZONE 'Europe/Istanbul')::date) AS d
                FROM study_sessions
                WHERE student_id = @StudentId",
                new { StudentId = studentId });

            var distinct = days.Select(d => d.Date).Distinct().OrderBy(d => d).ToList();
            var cursor = DateTime.UtcNow.AddHours(3).Date; // Türkiye (UTC+3) yerel günü
            if (!distinct.Contains(cursor))
                cursor = cursor.AddDays(-1);

            var streak = 0;
            while (distinct.Contains(cursor))
            {
                streak++;
                cursor = cursor.AddDays(-1);
            }

            return new StreakDto { CurrentStreak = streak, TotalStudyDays = distinct.Count };
        }

        public async Task<IEnumerable<StudySessionDto>> ListAsync(Guid studentId, DateTime? from = null, DateTime? to = null)
        {
            using var conn = _connectionFactory.CreateConnection();
            var studentTrack = await conn.QuerySingleOrDefaultAsync<string>(
                "SELECT track FROM students WHERE id = @StudentId",
                new { StudentId = studentId });

            var sql = @"
                SELECT 
                    ss.id AS Id,
                    ss.program_id AS ProgramId,
                    ss.student_id AS StudentId,
                    ss.subject_id AS SubjectId,
                    ss.curriculum_topic_id AS CurriculumTopicId,
                    s.name AS SubjectName,
                    ct.topic_name AS TopicName,
                    ss.minutes AS Minutes,
                    ss.question_count AS QuestionCount,
                    ss.correct AS Correct,
                    ss.wrong AS Wrong,
                    ss.blank AS Blank,
                    ss.source_type AS SourceType,
                    ss.started_at AS StartedAt,
                    ss.ended_at AS EndedAt,
                    ss.created_at AS CreatedAt
                FROM study_sessions ss
                LEFT JOIN subjects s ON s.id = ss.subject_id
                LEFT JOIN curriculum_topics ct ON ct.id = ss.curriculum_topic_id
                WHERE ss.student_id = @StudentId";

            if (from.HasValue)
            {
                sql += " AND (ss.started_at >= @From OR (ss.started_at IS NULL AND ss.created_at >= @From))";
            }
            if (to.HasValue)
            {
                sql += " AND (ss.started_at <= @To OR (ss.started_at IS NULL AND ss.created_at <= @To))";
            }
            sql += " ORDER BY COALESCE(ss.started_at, ss.created_at) DESC";

            var rows = await conn.QueryAsync<dynamic>(sql, new { StudentId = studentId, From = from, To = to });

            return rows.Select(r =>
            {
                int correct = (int)r.correct;
                int wrong = (int)r.wrong;
                int blank = (int)r.blank;
                int qCount = (int)r.question_count;

                return new StudySessionDto
                {
                    Id = (Guid)r.id,
                    ProgramId = (Guid)r.program_id,
                    StudentId = (Guid)r.student_id,
                    SubjectId = (Guid?)r.subject_id,
                    CurriculumTopicId = (Guid?)r.curriculum_topic_id,
                    SubjectName = (string?)r.subject_name,
                    TopicName = (string?)r.topic_name,
                    Minutes = (int)r.minutes,
                    QuestionCount = qCount,
                    Correct = correct,
                    Wrong = wrong,
                    Blank = blank,
                    Net = NetCalculator.ComputeNet(correct, wrong, blank, studentTrack),
                    SuccessRate = NetCalculator.ComputeSuccessRate(correct, qCount),
                    SourceType = (string)r.source_type,
                    StartedAt = (DateTime?)r.started_at,
                    EndedAt = (DateTime?)r.ended_at,
                    CreatedAt = (DateTime)r.created_at
                };
            });
        }
    }
}
