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
            conn.Open(); // Dapper Transaction için bağlantının açık olması gerekir
            using var tx = conn.BeginTransaction();
            
            try
            {
                // 1. Get Template to create snapshot (IDOR koruması: CoachId filtresi)
                var template = await conn.QuerySingleOrDefaultAsync(
                    "SELECT title, description, resource_ref FROM homework_templates WHERE id = @Id AND coach_id = @CoachId",
                    new { Id = req.TemplateId, CoachId = coachId }, tx);

                if (template == null) return null;
                
                // 1.5. Verify student belongs to this coach
                var studentBelongsToCoach = await conn.QuerySingleOrDefaultAsync<int?>(
                    "SELECT 1 FROM students WHERE id = @StudentId AND coach_id = @CoachId",
                    new { req.StudentId, CoachId = coachId }, tx);

                if (studentBelongsToCoach == null) return null;

                // 2. Insert Assignment with Snapshot
                var assignId = Guid.NewGuid();
                var sql = @"
                    INSERT INTO homework_assignments (
                        id, template_id, snapshot_title, snapshot_desc, snapshot_source,
                        student_id, student_subject_id, coach_id, due_date, status, created_at, updated_at
                    )
                    VALUES (
                        @Id, @TemplateId, @SnapshotTitle, @SnapshotDesc, @SnapshotSource,
                        @StudentId, @StudentSubjectId, @CoachId, @DueDate, 'PENDING', @Now, @Now
                    )";

                await conn.ExecuteAsync(sql, new {
                    Id = assignId,
                    TemplateId = req.TemplateId,
                    SnapshotTitle = template.title,
                    SnapshotDesc = template.description,
                    SnapshotSource = template.resource_ref,
                    req.StudentId,
                    req.StudentSubjectId,
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
