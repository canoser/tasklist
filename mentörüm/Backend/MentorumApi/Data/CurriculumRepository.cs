using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class CurriculumRepository : BaseRepository
    {
        public CurriculumRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<SubjectDto>> GetAllSubjectsAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "SELECT id, name, short_code AS ShortCode, default_color AS DefaultColor, is_system_subject AS IsSystemSubject FROM subjects ORDER BY name";
            return await connection.QueryAsync<SubjectDto>(sql);
        }

        public async Task<IEnumerable<CurriculumTopicDto>> GetTopicsBySubjectAsync(Guid subjectId, int? grade)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT id, subject_id AS SubjectId, grade, curriculum_type AS CurriculumType,
                       unit_number AS UnitNumber, unit_name AS UnitName, topic_number AS TopicNumber,
                       topic_name AS TopicName, sort_order AS SortOrder
                FROM curriculum_topics 
                WHERE subject_id = @SubjectId AND is_active = 1";
            
            if (grade.HasValue)
            {
                sql += " AND grade = @Grade";
            }
            
            sql += " ORDER BY sort_order";

            return await connection.QueryAsync<CurriculumTopicDto>(sql, new { SubjectId = subjectId, Grade = grade });
        }
    }
}
