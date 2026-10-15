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
                       s.grade, s.track, s.target_university AS TargetUniversity, s.is_active AS IsActive,
                       s.program_id AS ProgramId, cp.name AS ProgramName,
                       (SELECT COUNT(1) FROM homework_assignments ha WHERE ha.student_id = u.id AND ha.status IN ('PENDING','OVERDUE')) AS active_homework_count,
                       (SELECT COUNT(1) FROM homework_assignments ha WHERE ha.student_id = u.id AND ha.status IN ('DONE','LATE_DONE')) AS completed_homework_count,
                       (SELECT COUNT(1) FROM homework_assignments ha WHERE ha.student_id = u.id AND ha.status = 'OVERDUE') AS overdue_homework_count
                FROM users u 
                JOIN students s ON u.id = s.id 
                LEFT JOIN coaching_programs cp ON cp.id = s.program_id
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

        // --- Öğrenci kendi verisi (Aşama 1) ---
        public async Task<StudentProfileDto?> GetStudentProfileAsync(Guid studentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var profile = await connection.QuerySingleOrDefaultAsync<StudentProfileDto>(@"
                SELECT u.id, u.full_name AS FullName, u.email, u.avatar_url AS AvatarUrl,
                       s.grade, s.track, s.target_university AS TargetUniversity,
                       s.target_department AS TargetDepartment, s.target_score AS TargetScore,
                       s.coaching_start_date AS CoachingStartDate
                FROM users u
                JOIN students s ON u.id = s.id
                WHERE u.id = @StudentId AND u.is_active = 1",
                new { StudentId = studentId });

            if (profile != null)
            {
                var parents = await connection.QueryAsync<StudentParentInfoDto>(@"
                    SELECT sp.parent_id AS ParentId, pu.full_name AS ParentName, sp.relation AS Relation
                    FROM student_parents sp
                    JOIN users pu ON pu.id = sp.parent_id
                    WHERE sp.student_id = @StudentId AND sp.is_accepted = 1 AND pu.is_active = 1",
                    new { StudentId = studentId });
                profile.Parents = parents.ToList();
            }

            return profile;
        }

        public async Task<IEnumerable<StudentExamDto>> GetStudentExamsAsync(Guid studentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<StudentExamDto>(@"
                SELECT id, exam_date AS ExamDate, exam_type AS ExamType, exam_name AS ExamName, total_net AS TotalNet
                FROM exam_results
                WHERE student_id = @StudentId
                ORDER BY exam_date DESC",
                new { StudentId = studentId });
        }

        public async Task<StudentGoalDto?> GetStudentGoalAsync(Guid studentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<StudentGoalDto>(@"
                SELECT target_university AS TargetUniversity, target_department AS TargetDepartment, target_score AS TargetScore
                FROM students
                WHERE id = @StudentId",
                new { StudentId = studentId });
        }

        public async Task<int> UpdateStudentGoalAsync(Guid studentId, UpdateStudentGoalRequest req)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.ExecuteAsync(@"
                UPDATE students
                SET target_university = @TargetUniversity,
                    target_department = @TargetDepartment,
                    target_score = @TargetScore,
                    updated_at = @Now
                WHERE id = @StudentId",
                new { StudentId = studentId, req.TargetUniversity, req.TargetDepartment, req.TargetScore, Now = DateTime.UtcNow });
        }

        public async Task<IEnumerable<CoachingSessionDto>> GetCoachingSessionsAsync(Guid coachId, Guid studentId)
        {
            var check = await GetStudentDetailAsync(coachId, studentId);
            if (check == null) return Array.Empty<CoachingSessionDto>();

            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CoachingSessionDto>(@"
                SELECT id AS Id, coach_id AS CoachId, student_id AS StudentId, session_date AS SessionDate, title AS Title, notes AS Notes, action_items AS ActionItems, prep_notes AS PrepNotes, created_at AS CreatedAt
                FROM coaching_sessions
                WHERE student_id = @StudentId
                ORDER BY session_date DESC NULLS LAST",
                new { StudentId = studentId });
        }

        public async Task<IEnumerable<CoachingSessionDto>> GetStudentSessionsAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CoachingSessionDto>(@"
                SELECT id AS Id, coach_id AS CoachId, student_id AS StudentId, session_date AS SessionDate, title AS Title, notes AS Notes, action_items AS ActionItems, prep_notes AS PrepNotes, created_at AS CreatedAt
                FROM coaching_sessions
                WHERE student_id = @StudentId
                ORDER BY session_date DESC NULLS LAST",
                new { StudentId = studentId });
        }

        public async Task<bool> UpdateSessionPrepAsync(Guid studentId, Guid sessionId, string prepNotes)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE coaching_sessions SET prep_notes = @PrepNotes WHERE id = @SessionId AND student_id = @StudentId",
                new { PrepNotes = prepNotes, SessionId = sessionId, StudentId = studentId });
            return rows > 0;
        }

        public async Task<Guid> CreateCoachingSessionAsync(Guid coachId, Guid studentId, CreateCoachingSessionRequest req)
        {
            var id = Guid.NewGuid();
            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO coaching_sessions (id, coach_id, student_id, session_date, title, notes, action_items)
                VALUES (@Id, @CoachId, @StudentId, @SessionDate, @Title, @Notes, @ActionItems)",
                new { Id = id, CoachId = coachId, StudentId = studentId, req.SessionDate, Title = req.Title ?? "Koçluk Görüşmesi", req.Notes, req.ActionItems });
            return id;
        }
    }
}
