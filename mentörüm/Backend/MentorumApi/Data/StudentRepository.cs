using MentorumApi.DTOs;
using Dapper;

namespace MentorumApi.Data
{
    public class StudentRepository : BaseRepository
    {
        public StudentRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<StudentListDto>> GetStudentsByCoachAsync(Guid coachId)
        {
            var sql = @"
                SELECT u.id, u.full_name AS FullName, u.email, u.avatar_url AS AvatarUrl, 
                       s.grade, s.track, s.target_university AS TargetUniversity, s.is_active AS IsActive
                FROM users u 
                JOIN students s ON u.id = s.id 
                /**where**/ 
                ORDER BY u.full_name";
            
            return await QueryWithTenantAsync<StudentListDto>(sql, new {}, coachId, tableAlias: "s");
        }

        public virtual async Task<StudentDetailDto?> GetStudentDetailAsync(Guid coachId, Guid studentId)
        {
            var sql = @"
                SELECT u.id, u.full_name AS FullName, u.email, u.avatar_url AS AvatarUrl, 
                       s.grade, s.track, s.target_university AS TargetUniversity, s.is_active AS IsActive,
                       s.coaching_start_date AS CoachingStartDate, s.target_department AS TargetDepartment,
                       s.target_score AS TargetScore
                FROM users u 
                JOIN students s ON u.id = s.id 
                /**where**/";
            
            return await QuerySingleOrDefaultWithTenantAsync<StudentDetailDto>(sql, new { StudentId = studentId }, coachId, "s.id = @StudentId", tableAlias: "s");
        }

        public async Task<IEnumerable<StudentNoteDto>> GetStudentNotesAsync(Guid coachId, Guid studentId)
        {
            var sql = @"
                SELECT id, student_id AS StudentId, content, created_at AS CreatedAt, updated_at AS UpdatedAt
                FROM coach_notes
                /**where**/
                ORDER BY created_at DESC";

            return await QueryWithTenantAsync<StudentNoteDto>(sql, new { StudentId = studentId }, coachId, "student_id = @StudentId");
        }

        public async Task<int> AddStudentNoteAsync(Guid coachId, Guid studentId, string content)
        {
            var sql = @"
                INSERT INTO coach_notes (id, student_id, program_id, created_by, content, created_at, updated_at)
                SELECT @Id, @StudentId, program_id, @CreatedBy, @Content, @Now, @Now
                FROM students 
                WHERE id = @StudentId AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CreatedBy)";
            
            using var connection = _connectionFactory.CreateConnection();
            var rowsAffected = await connection.ExecuteAsync(sql, new { 
                Id = Guid.NewGuid(),
                StudentId = studentId,
                CreatedBy = coachId,
                Content = content,
                Now = DateTime.UtcNow
            });
            
            if (rowsAffected == 0)
                throw new UnauthorizedAccessException("Öğrenci size ait değil veya bulunamadı.");
                
            return rowsAffected;
        }
    }
}
