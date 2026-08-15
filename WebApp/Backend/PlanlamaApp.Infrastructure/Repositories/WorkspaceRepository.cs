using Dapper;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Data;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class WorkspaceRepository : BaseRepository, IWorkspaceRepository
    {
        public WorkspaceRepository(IDbConnection dbConnection, ITenantProvider tenantProvider)
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<IEnumerable<Workspace>> GetOwnedAsync(string ownerId)
        {
            var sql = "SELECT * FROM Workspaces WHERE OwnerId = @OwnerId AND IsActive = true";
            return await QueryAsync<Workspace>(sql, new { OwnerId = ownerId });
        }

        public async Task<IEnumerable<Workspace>> GetMemberOfAsync(string userId)
        {
            var sql = @"
                SELECT w.* FROM Workspaces w
                INNER JOIN WorkspaceMembers wm ON wm.WorkspaceId = w.Id
                WHERE wm.UserId = @UserId AND w.IsActive = true AND w.TenantId = @TenantId AND wm.TenantId = @TenantId
            ";
            var parameters = new DynamicParameters(new { UserId = userId });
            parameters.Add("@TenantId", _tenantId);

            return await _dbConnection.QueryAsync<Workspace>(sql, parameters);
        }

        public async Task<Workspace?> GetByIdAsync(int id)
        {
            var sql = "SELECT * FROM Workspaces WHERE Id = @Id AND IsActive = true";
            return await QueryFirstOrDefaultAsync<Workspace>(sql, new { Id = id });
        }

        public async Task<Workspace?> GetByInviteCodeAsync(string code)
        {
            var sql = "SELECT * FROM Workspaces WHERE InviteCode = @InviteCode AND IsActive = true";
            return await QueryFirstOrDefaultAsync<Workspace>(sql, new { InviteCode = code });
        }

        public async Task<int> CreateAsync(Workspace workspace)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            workspace.InviteCode = new string(Enumerable.Repeat(chars, 8).Select(s => s[random.Next(s.Length)]).ToArray());
            
            workspace.CreatedAt = DateTime.UtcNow;
            workspace.UpdatedAt = DateTime.UtcNow;

            workspace.TenantId = _tenantId;
            var sql = @"
                INSERT INTO Workspaces (TenantId, OwnerId, Name, Description, InviteCode, Type, Settings, IsActive, CreatedAt, UpdatedAt)
                VALUES (@TenantId, @OwnerId, @Name, @Description, @InviteCode, @Type, @Settings, @IsActive, @CreatedAt, @UpdatedAt)
                RETURNING Id;
            ";
            
            var id = await ExecuteScalarAsync<int>(sql, workspace);
            workspace.Id = id;
            return id;
        }

        public async Task<bool> UpdateAsync(Workspace workspace)
        {
            workspace.UpdatedAt = DateTime.UtcNow;
            var sql = @"
                UPDATE Workspaces 
                SET Name = @Name, Description = @Description, Type = @Type, Settings = @Settings, UpdatedAt = @UpdatedAt
                WHERE Id = @Id
            ";
            var affected = await ExecuteAsync(sql, workspace);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var sql = "UPDATE Workspaces SET IsActive = false, DeletedAt = @DeletedAt WHERE Id = @Id";
            var affected = await ExecuteAsync(sql, new { Id = id, DeletedAt = DateTime.UtcNow });
            return affected > 0;
        }

        public async Task<IEnumerable<WorkspaceMember>> GetMembersAsync(int workspaceId)
        {
            var sql = "SELECT * FROM WorkspaceMembers WHERE WorkspaceId = @WorkspaceId AND IsActiveMember = true";
            return await QueryAsync<WorkspaceMember>(sql, new { WorkspaceId = workspaceId });
        }

        public async Task<WorkspaceMember?> GetMemberByIdAsync(int memberId)
        {
            var sql = "SELECT * FROM WorkspaceMembers WHERE Id = @Id";
            return await QueryFirstOrDefaultAsync<WorkspaceMember>(sql, new { Id = memberId });
        }

        public async Task<bool> IsObserverAsync(string observerId, string linkedUserId)
        {
            var sql = @"
                SELECT 1 FROM WorkspaceMembers
                WHERE UserId = @ObserverId 
                  AND Role = 'Observer' 
                  AND ObserverLinkedUserId = @LinkedUserId
                  AND TenantId = @TenantId
                LIMIT 1";
            var result = await QueryFirstOrDefaultAsync<int?>(sql, new { ObserverId = observerId, LinkedUserId = linkedUserId, TenantId = _tenantId });
            return result.HasValue;
        }

        public async Task<int> AddMemberAsync(WorkspaceMember member)
        {
            member.JoinedAt = DateTime.UtcNow;
            member.TenantId = _tenantId;
            var sql = @"
                INSERT INTO WorkspaceMembers (TenantId, WorkspaceId, UserId, DisplayName, JoinedAt, Role, ObserverLinkedUserId, IsActiveMember)
                VALUES (@TenantId, @WorkspaceId, @UserId, @DisplayName, @JoinedAt, @Role, @ObserverLinkedUserId, true)
                ON CONFLICT(WorkspaceId, UserId) DO UPDATE 
                SET IsActiveMember = true, Role = EXCLUDED.Role, JoinedAt = EXCLUDED.JoinedAt
                RETURNING Id;
            ";
            var id = await ExecuteScalarAsync<int>(sql, member);
            member.Id = id;
            return id;
        }

        public async Task<bool> UpdateMemberDisplayNameAsync(int memberId, string displayName)
        {
            var sql = "UPDATE WorkspaceMembers SET DisplayName = @DisplayName WHERE Id = @Id";
            var affected = await ExecuteAsync(sql, new { Id = memberId, DisplayName = displayName });
            return affected > 0;
        }

        public async Task<bool> RemoveMemberAsync(int workspaceId, string userId)
        {
            var sql = "UPDATE WorkspaceMembers SET IsActiveMember = false WHERE WorkspaceId = @WorkspaceId AND UserId = @UserId";
            var affected = await ExecuteAsync(sql, new { WorkspaceId = workspaceId, UserId = userId });
            return affected > 0;
        }
    }
}
