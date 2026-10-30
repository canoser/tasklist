using System.Data;
using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class GroupRepository
    {
        private readonly DbConnectionFactory _connectionFactory;
        public GroupRepository(DbConnectionFactory connectionFactory) { _connectionFactory = connectionFactory; }

        public static Task<IEnumerable<Guid>> GetActiveMemberIdsAsync(IDbConnection conn, Guid groupId, IDbTransaction? tx = null) =>
            conn.QueryAsync<Guid>("SELECT student_id FROM student_group_members WHERE group_id = @GroupId AND is_active = 1", new { GroupId = groupId }, tx);

        public async Task<IEnumerable<Guid>> GetActiveMemberIdsAsync(Guid groupId, IDbTransaction? tx = null)
        {
            if (tx?.Connection != null) return await GetActiveMemberIdsAsync(tx.Connection, groupId, tx);
            using var conn = _connectionFactory.CreateConnection();
            return await GetActiveMemberIdsAsync(conn, groupId);
        }

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
                       (SELECT COUNT(1) FROM student_group_members m WHERE m.group_id = g.id AND m.is_active = 1) AS MemberCount
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
                       (SELECT COUNT(1) FROM student_group_members m WHERE m.group_id = g.id AND m.is_active = 1) AS MemberCount
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
                INSERT INTO student_group_members (id, group_id, student_id, program_id, is_active)
                SELECT @Id, g.id, s.id, @ProgramId, 1
                FROM student_groups g
                JOIN students s ON s.id = @StudentId AND s.program_id = @ProgramId
                WHERE g.id = @GroupId AND g.program_id = @ProgramId
                ON CONFLICT (group_id, student_id) DO UPDATE SET is_active = 1",
                new { Id = Guid.NewGuid(), GroupId = groupId, StudentId = studentId, ProgramId = programId });
            return rows > 0 ? "OK" : "NOT_FOUND";
        }

        public async Task<string> RemoveMemberAsync(Guid programId, Guid groupId, Guid studentId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return "FORBIDDEN";
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE student_group_members SET is_active = 0
                WHERE group_id = @GroupId AND student_id = @StudentId AND program_id = @ProgramId",
                new { GroupId = groupId, StudentId = studentId, ProgramId = programId });
            return rows > 0 ? "OK" : "NOT_FOUND";
        }

        public async Task<IEnumerable<GroupMemberDto>> GetGroupMembersAsync(Guid programId, Guid groupId, Guid coachId)
        {
            if (!await IsMemberAsync(programId, coachId)) return Enumerable.Empty<GroupMemberDto>();
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<GroupMemberDto>(@"
                SELECT m.student_id AS Id, u.full_name AS FullName, u.email AS Email, s.grade AS Grade
                FROM student_group_members m
                JOIN users u ON u.id = m.student_id
                JOIN students s ON s.id = m.student_id
                WHERE m.group_id = @GroupId AND m.program_id = @ProgramId AND m.is_active = 1
                ORDER BY u.full_name",
                new { GroupId = groupId, ProgramId = programId });
        }
    }
}
