using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class CourseResourceRepository
    {
        private readonly DbConnectionFactory _connectionFactory;
        public CourseResourceRepository(DbConnectionFactory connectionFactory) { _connectionFactory = connectionFactory; }

        private async Task<bool> IsMemberAsync(Guid programId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var found = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId",
                new { ProgramId = programId, CoachId = coachId });
            return found != null;
        }

        public async Task<IEnumerable<CourseResourceDto>> GetResourcesAsync(Guid programId, Guid courseId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return Enumerable.Empty<CourseResourceDto>();
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CourseResourceDto>(@"
                SELECT r.id, r.course_id AS CourseId, r.title AS Title, r.type AS Type, r.resource_ref AS ResourceRef, r.sort_order AS SortOrder
                FROM course_resources r
                JOIN courses c ON c.id = r.course_id
                WHERE r.course_id = @CourseId AND c.program_id = @ProgramId
                ORDER BY r.sort_order, r.created_at",
                new { CourseId = courseId, ProgramId = programId });
        }

        public async Task<Guid> CreateResourceAsync(Guid programId, Guid courseId, Guid coachId, CreateCourseResourceRequest req)
        {
            if (!await IsMemberAsync(programId, coachId)) throw new UnauthorizedAccessException("FORBIDDEN");
            var id = Guid.NewGuid();
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                INSERT INTO course_resources (id, course_id, program_id, title, type, resource_ref, sort_order)
                SELECT @Id, c.id, c.program_id, @Title, @Type, @ResourceRef, COALESCE(@SortOrder, 0)
                FROM courses c
                WHERE c.id = @CourseId AND c.program_id = @ProgramId",
                new { Id = id, CourseId = courseId, ProgramId = programId, req.Title, req.Type, req.ResourceRef, req.SortOrder });
            if (rows == 0) throw new InvalidOperationException("COURSE_NOT_IN_PROGRAM");
            return id;
        }

        public async Task<bool> UpdateResourceAsync(Guid programId, Guid resourceId, Guid coachId, UpdateCourseResourceRequest req)
        {
            if (!await IsMemberAsync(programId, coachId)) return false;
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE course_resources r SET
                    title = COALESCE(@Title, title),
                    type = COALESCE(@Type, type),
                    resource_ref = COALESCE(@ResourceRef, resource_ref),
                    sort_order = COALESCE(@SortOrder, sort_order),
                    updated_at = NOW()
                FROM courses c
                WHERE r.id = @ResourceId AND r.course_id = c.id AND c.program_id = @ProgramId",
                new { ResourceId = resourceId, ProgramId = programId, req.Title, req.Type, req.ResourceRef, req.SortOrder });
            return rows > 0;
        }

        public async Task<bool> DeleteResourceAsync(Guid programId, Guid resourceId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return false;
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                DELETE FROM course_resources r
                USING courses c
                WHERE r.id = @ResourceId AND r.course_id = c.id AND c.program_id = @ProgramId",
                new { ResourceId = resourceId, ProgramId = programId });
            return rows > 0;
        }
        // Öğrenci için: dersteki kaynaklar + ilerleme
        public async Task<IEnumerable<CourseResourceDto>> GetStudentCourseResourcesAsync(Guid courseId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CourseResourceDto>(@"
                SELECT r.id, r.course_id AS CourseId, r.title AS Title, r.type AS Type, r.resource_ref AS ResourceRef, r.sort_order AS SortOrder,
                       p.progress AS Progress, p.is_done AS IsDone
                FROM course_resources r
                LEFT JOIN course_resource_progress p ON p.course_resource_id = r.id AND p.student_id = @StudentId
                WHERE r.course_id = @CourseId
                ORDER BY r.sort_order, r.created_at",
                new { CourseId = courseId, StudentId = studentId });
        }

        public async Task<bool> UpsertProgressAsync(Guid resourceId, Guid studentId, UpdateResourceProgressRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                INSERT INTO course_resource_progress (id, course_resource_id, student_id, program_id, progress, is_done, updated_at)
                SELECT gen_random_uuid(), r.id, @StudentId, r.program_id, COALESCE(@Progress, 0), COALESCE(@IsDone, 0), NOW()
                FROM course_resources r
                WHERE r.id = @ResourceId
                  AND EXISTS (
                      SELECT 1 FROM course_students cs WHERE cs.course_id = r.course_id AND cs.student_id = @StudentId AND cs.is_active = 1
                      UNION
                      SELECT 1 FROM course_groups cg JOIN student_group_members sgm ON sgm.group_id = cg.group_id
                      WHERE cg.course_id = r.course_id AND sgm.student_id = @StudentId
                  )
                ON CONFLICT (course_resource_id, student_id) DO UPDATE
                SET progress = COALESCE(@Progress, course_resource_progress.progress),
                    is_done = COALESCE(@IsDone, course_resource_progress.is_done),
                    updated_at = NOW()",
                new {
                    ResourceId = resourceId, StudentId = studentId,
                    Progress = req.Progress,
                    IsDone = req.IsDone.HasValue ? (req.IsDone.Value ? 1 : 0) : (int?)null
                });
            return rows > 0;
        }
    }
}
