using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class GroupRepository
    {
        private readonly DbConnectionFactory _connectionFactory;
        public GroupRepository(DbConnectionFactory connectionFactory) { _connectionFactory = connectionFactory; }

        private async Task<bool> IsMemberAsync(Guid programId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var found = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId",
                new { ProgramId = programId, CoachId = coachId });
            return found != null;
        }

        public async Task<IEnumerable<GroupDto>> GetGroupsAsync(Guid programId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return Enumerable.Empty<GroupDto>();
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<GroupDto>(@"
                SELECT g.id, g.program_id AS ProgramId, g.name AS Name, g.color AS Color, g.description AS Description,
                       (SELECT COUNT(1) FROM student_group_members m WHERE m.group_id = g.id) AS MemberCount
                FROM student_groups g
                WHERE g.program_id = @ProgramId
                ORDER BY g.name", new { ProgramId = programId });
        }

        public async Task<GroupDto?> GetGroupAsync(Guid programId, Guid groupId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return null;
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<GroupDto>(@"
                SELECT g.id, g.program_id AS ProgramId, g.name AS Name, g.color AS Color, g.description AS Description,
                       (SELECT COUNT(1) FROM student_group_members m WHERE m.group_id = g.id) AS MemberCount
                FROM student_groups g
                WHERE g.id = @GroupId AND g.program_id = @ProgramId",
                new { GroupId = groupId, ProgramId = programId });
        }

        public async Task<Guid> CreateGroupAsync(Guid programId, Guid coachId, CreateGroupRequest req)
        {
            if (!await IsMemberAsync(programId, coachId)) throw new UnauthorizedAccessException("FORBIDDEN");
            var id = Guid.NewGuid();
            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO student_groups (id, program_id, name, color, description)
                VALUES (@Id, @ProgramId, @Name, @Color, @Description)",
                new { Id = id, ProgramId = programId, req.Name, req.Color, req.Description });
            return id;
        }

        public async Task<bool> UpdateGroupAsync(Guid programId, Guid groupId, Guid coachId, UpdateGroupRequest req)
        {
            if (!await IsMemberAsync(programId, coachId)) return false;
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE student_groups SET
                    name = COALESCE(@Name, name),
                    color = COALESCE(@Color, color),
                    description = COALESCE(@Description, description),
                    updated_at = NOW()
                WHERE id = @GroupId AND program_id = @ProgramId",
                new { GroupId = groupId, ProgramId = programId, req.Name, req.Color, req.Description });
            return rows > 0;
        }

        public async Task<bool> DeleteGroupAsync(Guid programId, Guid groupId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return false;
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(
                "DELETE FROM student_groups WHERE id = @GroupId AND program_id = @ProgramId",
                new { GroupId = groupId, ProgramId = programId });
            return rows > 0;
        }

        public async Task<string> AddMemberAsync(Guid programId, Guid groupId, Guid studentId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return "FORBIDDEN";
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                INSERT INTO student_group_members (id, group_id, student_id, program_id)
                SELECT @Id, g.id, s.id, @ProgramId
                FROM student_groups g
                JOIN students s ON s.id = @StudentId AND s.program_id = @ProgramId
                WHERE g.id = @GroupId AND g.program_id = @ProgramId
                ON CONFLICT (group_id, student_id) DO NOTHING",
                new { Id = Guid.NewGuid(), GroupId = groupId, StudentId = studentId, ProgramId = programId });
            return rows > 0 ? "OK" : "NOT_FOUND";
        }

        public async Task<string> RemoveMemberAsync(Guid programId, Guid groupId, Guid studentId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return "FORBIDDEN";
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                DELETE FROM student_group_members
                WHERE group_id = @GroupId AND student_id = @StudentId AND program_id = @ProgramId",
                new { GroupId = groupId, StudentId = studentId, ProgramId = programId });
            return rows > 0 ? "OK" : "NOT_FOUND";
        }
    }
}
