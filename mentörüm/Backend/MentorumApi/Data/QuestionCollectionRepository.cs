using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class QuestionCollectionRepository : BaseRepository
    {
        public QuestionCollectionRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<Guid?> GetDefaultCoachProgramIdAsync(Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<Guid?>(
                "SELECT program_id FROM program_coaches WHERE coach_id = @CoachId ORDER BY created_at LIMIT 1",
                new { CoachId = coachId });
        }

        public async Task<Guid> CreateAsync(Guid coachId, Guid programId, string title)
        {
            var id = Guid.NewGuid();
            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(
                "INSERT INTO coach_question_collections (id, coach_id, program_id, title) VALUES (@Id, @CoachId, @ProgramId, @Title)",
                new { Id = id, CoachId = coachId, ProgramId = programId, Title = title });
            return id;
        }

        public async Task<IEnumerable<QuestionCollectionDto>> ListAsync(Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<QuestionCollectionDto>(@"
                SELECT c.id AS Id, c.title AS Title, c.program_id AS ProgramId,
                       (SELECT COUNT(1) FROM coach_question_collection_items i WHERE i.collection_id = c.id) AS ItemCount
                FROM coach_question_collections c
                WHERE c.coach_id = @CoachId
                ORDER BY c.created_at DESC",
                new { CoachId = coachId });
        }

        public async Task<bool> AddItemAsync(Guid coachId, Guid collectionId, Guid studentQuestionId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                INSERT INTO coach_question_collection_items (id, collection_id, student_question_id)
                SELECT @Id, @CollectionId, @QuestionId
                WHERE EXISTS (SELECT 1 FROM coach_question_collections c WHERE c.id = @CollectionId AND c.coach_id = @CoachId)
                  AND EXISTS (SELECT 1 FROM student_questions q WHERE q.id = @QuestionId AND q.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId))
                ON CONFLICT (collection_id, student_question_id) DO NOTHING",
                new { Id = Guid.NewGuid(), CollectionId = collectionId, QuestionId = studentQuestionId, CoachId = coachId });
            return rows > 0;
        }

        public async Task<bool> RemoveItemAsync(Guid coachId, Guid collectionId, Guid itemId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                DELETE FROM coach_question_collection_items i
                USING coach_question_collections c
                WHERE i.id = @ItemId AND i.collection_id = @CollectionId AND c.id = i.collection_id AND c.coach_id = @CoachId",
                new { ItemId = itemId, CollectionId = collectionId, CoachId = coachId });
            return rows > 0;
        }

        public async Task<IEnumerable<StudentQuestionDto>> ListItemsAsync(Guid coachId, Guid collectionId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<StudentQuestionDto>(@"
                SELECT q.id AS Id, q.topic_text AS TopicText, q.status AS Status, q.subject_id AS SubjectId, q.upload_id AS UploadId, q.created_at AS CreatedAt
                FROM coach_question_collection_items i
                JOIN coach_question_collections c ON c.id = i.collection_id
                JOIN student_questions q ON q.id = i.student_question_id
                WHERE i.collection_id = @CollectionId AND c.coach_id = @CoachId
                ORDER BY i.added_at DESC",
                new { CollectionId = collectionId, CoachId = coachId });
        }
    }
}
