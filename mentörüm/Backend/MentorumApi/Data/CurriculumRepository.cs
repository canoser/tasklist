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

        public async Task<IEnumerable<string>> GetLevelsAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "SELECT DISTINCT grade FROM curriculum_topics WHERE is_active = 1 ORDER BY grade";
            return await connection.QueryAsync<string>(sql);
        }

        public async Task<IEnumerable<SubjectDto>> GetSubjectsByLevelAsync(string? level)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT DISTINCT s.id, s.name, s.short_code AS ShortCode, s.default_color AS DefaultColor, s.is_system_subject AS IsSystemSubject
                FROM subjects s
                INNER JOIN curriculum_topics ct ON ct.subject_id = s.id
                WHERE ct.is_active = 1 AND (@Level IS NULL OR ct.grade = @Level)
                ORDER BY s.name";
            return await connection.QueryAsync<SubjectDto>(sql, new { Level = level });
        }

        public async Task<IEnumerable<CurriculumTopicDto>> GetTopicsBySubjectAsync(Guid subjectId, string? grade)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT id, subject_id AS SubjectId, grade, curriculum_type AS CurriculumType,
                       unit_number AS UnitNumber, unit_name AS UnitName, topic_number AS TopicNumber,
                       topic_name AS TopicName, sort_order AS SortOrder
                FROM curriculum_topics 
                WHERE subject_id = @SubjectId AND is_active = 1";
            
            if (!string.IsNullOrEmpty(grade))
            {
                sql += " AND grade = @Grade";
            }
            
            sql += " ORDER BY sort_order";

            return await connection.QueryAsync<CurriculumTopicDto>(sql, new { SubjectId = subjectId, Grade = grade });
        }

        // Öğrencinin sınıfına göre müfredat + tamamlanma durumu (Aşama 1).
        // Tamamlanma, ödevlerden (curriculum_topic_id + DONE/LATE_DONE) türetilir; veri yoksa salt konu listesi.
        public async Task<IEnumerable<StudentCurriculumTopicDto>> GetStudentCurriculumAsync(Guid studentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var grade = await connection.ExecuteScalarAsync<int?>("SELECT grade FROM students WHERE id = @StudentId", new { StudentId = studentId });
            var gradeText = grade?.ToString();

            return await connection.QueryAsync<StudentCurriculumTopicDto>(@"
                SELECT ct.id AS Id, s.name AS SubjectName, ct.grade AS Grade, ct.curriculum_type AS CurriculumType,
                       ct.unit_number AS UnitNumber, ct.unit_name AS UnitName, ct.topic_number AS TopicNumber,
                       ct.topic_name AS TopicName,
                       EXISTS (
                           SELECT 1 FROM homework_assignments ha
                           WHERE ha.student_id = @StudentId AND ha.curriculum_topic_id = ct.id
                             AND ha.status IN ('DONE','LATE_DONE')
                       ) AS IsCompleted
                FROM curriculum_topics ct
                JOIN subjects s ON s.id = ct.subject_id
                WHERE ct.is_active = 1 AND (@GradeText IS NULL OR ct.grade = @GradeText)
                ORDER BY s.name, ct.sort_order",
                new { StudentId = studentId, GradeText = gradeText });
        }
    }
}
