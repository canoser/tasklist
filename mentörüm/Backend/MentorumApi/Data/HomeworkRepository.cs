using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class HomeworkRepository : BaseRepository
    {
        public HomeworkRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<Guid> CreateTemplateAsync(Guid coachId, CreateHomeworkTemplateRequest req)
        {
            var id = Guid.NewGuid();
            var sql = @"
                INSERT INTO homework_templates (id, coach_id, subject_id, title, description, resource_ref, curriculum_topic_id, free_topic, created_at, updated_at)
                VALUES (@Id, @CoachId, @SubjectId, @Title, @Description, @ResourceRef, @CurriculumTopicId, @FreeTopic, @Now, @Now)";

            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(sql, new {
                Id = id,
                CoachId = coachId,
                req.SubjectId,
                req.Title,
                req.Description,
                req.ResourceRef,
                req.CurriculumTopicId,
                req.FreeTopic,
                Now = DateTime.UtcNow
            });
            return id;
        }

        public async Task<Guid?> AssignHomeworkAsync(Guid coachId, AssignHomeworkRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();

            try
            {
                // IDOR koruması: öğrenci bu koça ait olmalı
                var owned = await conn.QuerySingleOrDefaultAsync<int?>(
                    "SELECT 1 FROM students WHERE id = @StudentId AND coach_id = @CoachId",
                    new { req.StudentId, CoachId = coachId }, tx);

                if (owned == null) return null;

                // Snapshot ile doğrudan atama (konu/ders/şablon silinse bile içerik ve istatistik korunur)
                var assignId = Guid.NewGuid();
                await conn.ExecuteAsync(@"
                    INSERT INTO homework_assignments (
                        id, subject_id, curriculum_topic_id, snapshot_title, snapshot_desc, snapshot_source,
                        student_id, coach_id, due_date, status, created_at, updated_at
                    )
                    VALUES (
                        @Id, @SubjectId, @CurriculumTopicId, @Title, @Description, @Source,
                        @StudentId, @CoachId, @DueDate, 'PENDING', @Now, @Now
                    )", new {
                    Id = assignId,
                    req.SubjectId,
                    req.CurriculumTopicId,
                    Title = req.Title,
                    Description = req.Description,
                    Source = req.FreeTopic,
                    req.StudentId,
                    CoachId = coachId,
                    req.DueDate,
                    Now = DateTime.UtcNow
                }, tx);

                tx.Commit();
                return assignId;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }
    }
}
