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
            var sql = @"
                SELECT w.*, 
                       (SELECT COUNT(*) FROM WorkspaceMembers WHERE WorkspaceId = w.Id AND IsActiveMember = true AND ApprovalStatus = 'Approved') as MemberCount,
                       (SELECT COUNT(*) FROM TaskItems WHERE AssignedByWorkspaceId = w.Id) as TasksCount
                FROM Workspaces w 
                WHERE w.OwnerId = @OwnerId AND w.IsActive = true
            ";
            return await QueryAsync<Workspace>(sql, new { OwnerId = ownerId });
        }

        public async Task<IEnumerable<Workspace>> GetMemberOfAsync(string userId)
        {
            var sql = @"
                SELECT w.*,
                       (SELECT COUNT(*) FROM WorkspaceMembers m WHERE m.WorkspaceId = w.Id AND m.IsActiveMember = true AND m.ApprovalStatus = 'Approved') as MemberCount,
                       (SELECT COUNT(*) FROM TaskItems t WHERE t.AssignedByWorkspaceId = w.Id) as TasksCount
                FROM Workspaces w
                INNER JOIN WorkspaceMembers wm ON wm.WorkspaceId = w.Id
                WHERE wm.UserId = @UserId AND w.IsActive = true AND wm.IsActiveMember = true AND wm.ApprovalStatus = 'Approved'
            ";
            return await _dbConnection.QueryAsync<Workspace>(sql, new { UserId = userId });
        }

        public async Task<Workspace?> GetByIdAsync(int id)
        {
            var sql = @"
                SELECT w.*,
                       (SELECT COUNT(*) FROM WorkspaceMembers WHERE WorkspaceId = w.Id AND IsActiveMember = true AND ApprovalStatus = 'Approved') as MemberCount,
                       (SELECT COUNT(*) FROM TaskItems WHERE AssignedByWorkspaceId = w.Id) as TasksCount
                FROM Workspaces w 
                WHERE w.Id = @Id AND w.IsActive = true
            ";
            return await QueryFirstOrDefaultAsync<Workspace>(sql, new { Id = id });
        }

        public async Task<Workspace?> GetByInviteCodeAsync(string code)
        {
            // Davet kodları globaldir, farklı bir Tenant'tan kullanıcı arayabilir. BaseRepository injection'ı bypass edilir.
            var sql = "SELECT * FROM Workspaces WHERE InviteCode = @InviteCode AND IsActive = true";
            return await _dbConnection.QueryFirstOrDefaultAsync<Workspace>(sql, new { InviteCode = code });
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
                INSERT INTO Workspaces (TenantId, OwnerId, Name, Description, InviteCode, Type, Settings, RequiresApproval, IsActive, CreatedAt, UpdatedAt)
                VALUES (@TenantId, @OwnerId, @Name, @Description, @InviteCode, @Type, @Settings, @RequiresApproval, @IsActive, @CreatedAt, @UpdatedAt)
                RETURNING Id;
            ";
            
            var id = await ExecuteScalarAsync<int>(sql, workspace);
            workspace.Id = id;

            var memberSql = @"
                INSERT INTO WorkspaceMembers (TenantId, WorkspaceId, UserId, DisplayName, JoinedAt, Role, IsActiveMember, ApprovalStatus)
                VALUES (@TenantId, @WorkspaceId, @OwnerId, 'Kurucu', @JoinedAt, 'Owner', true, 'Approved')";
            
            await _dbConnection.ExecuteAsync(memberSql, new {
                TenantId = workspace.TenantId,
                WorkspaceId = id,
                OwnerId = workspace.OwnerId,
                JoinedAt = DateTime.UtcNow
            });

            return id;
        }

        public async Task<bool> UpdateAsync(Workspace workspace)
        {
            workspace.UpdatedAt = DateTime.UtcNow;
            var sql = @"
                UPDATE Workspaces 
                SET Name = @Name, Description = @Description, Type = @Type, Settings = @Settings, RequiresApproval = @RequiresApproval, UpdatedAt = @UpdatedAt
                WHERE Id = @Id
            ";
            var affected = await ExecuteAsync(sql, workspace);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            if (_dbConnection.State != ConnectionState.Open)
            {
                _dbConnection.Open();
            }
            using var transaction = _dbConnection.BeginTransaction();
            try {
                var sql1 = "UPDATE Workspaces SET IsActive = false, DeletedAt = @DeletedAt WHERE Id = @Id";
                await ExecuteAsync(sql1, new { Id = id, DeletedAt = DateTime.UtcNow }, transaction);
                
                var sql2 = "UPDATE WorkspaceMembers SET IsActiveMember = false WHERE WorkspaceId = @Id";
                await _dbConnection.ExecuteAsync(sql2, new { Id = id }, transaction);
                
                transaction.Commit();
                return true;
            } catch {
                transaction.Rollback();
                return false;
            }
        }

        public async Task<IEnumerable<WorkspaceMember>> GetMembersAsync(int workspaceId)
        {
            // WorkspaceId zaten spesifik bir sınırdır, TenantId kısıtlamasını bypass ediyoruz
            var sql = "SELECT * FROM WorkspaceMembers WHERE WorkspaceId = @WorkspaceId AND IsActiveMember = true AND ApprovalStatus = 'Approved'";
            return await _dbConnection.QueryAsync<WorkspaceMember>(sql, new { WorkspaceId = workspaceId });
        }

        public async Task<IEnumerable<WorkspaceMember>> GetPendingMembersAsync(int workspaceId)
        {
            var sql = "SELECT * FROM WorkspaceMembers WHERE WorkspaceId = @WorkspaceId AND IsActiveMember = false AND ApprovalStatus = 'Pending'";
            return await _dbConnection.QueryAsync<WorkspaceMember>(sql, new { WorkspaceId = workspaceId });
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
                LIMIT 1";
            var result = await _dbConnection.QueryFirstOrDefaultAsync<int?>(sql, new { ObserverId = observerId, LinkedUserId = linkedUserId });
            return result.HasValue;
        }

        public async Task<int> AddMemberAsync(WorkspaceMember member)
        {
            member.JoinedAt = DateTime.UtcNow;
            
            // Eğer TenantId dışarıdan (WorkspaceController üzerinden) verilmişse onu kullan, 
            // verilmemişse aktif kullanıcının TenantId'sini ata.
            if (string.IsNullOrEmpty(member.TenantId))
            {
                member.TenantId = _tenantId;
            }

            var sql = @"
                INSERT INTO WorkspaceMembers (TenantId, WorkspaceId, UserId, DisplayName, JoinedAt, Role, ObserverLinkedUserId, IsActiveMember, ApprovalStatus)
                VALUES (@TenantId, @WorkspaceId, @UserId, @DisplayName, @JoinedAt, @Role, @ObserverLinkedUserId, @IsActiveMember, @ApprovalStatus)
                ON CONFLICT(WorkspaceId, UserId) DO UPDATE 
                SET ApprovalStatus = EXCLUDED.ApprovalStatus,
                    IsActiveMember = EXCLUDED.IsActiveMember,
                    Role = EXCLUDED.Role, 
                    JoinedAt = EXCLUDED.JoinedAt
                WHERE WorkspaceMembers.ApprovalStatus != 'Approved'
                RETURNING Id;
            ";
            
            // BaseRepository'nin TenantId'yi ezmesini engellemek için doğrudan dbConnection kullanılıyor
            var id = await _dbConnection.ExecuteScalarAsync<int>(sql, member);
            member.Id = id;
            return id;
        }

        public async Task<bool> UpdateMemberDisplayNameAsync(int memberId, string displayName)
        {
            var sql = "UPDATE WorkspaceMembers SET DisplayName = @DisplayName WHERE Id = @Id";
            var affected = await ExecuteAsync(sql, new { Id = memberId, DisplayName = displayName });
            return affected > 0;
        }

        public async Task<bool> UpdateMemberStatusAsync(int memberId, string status)
        {
            var sql = "UPDATE WorkspaceMembers SET ApprovalStatus = @Status, IsActiveMember = @IsActive WHERE Id = @Id";
            var isActive = status == "Approved";
            var affected = await _dbConnection.ExecuteAsync(sql, new { Id = memberId, Status = status, IsActive = isActive });
            return affected > 0;
        }

        public async Task<bool> UpdateMemberRoleAsync(int workspaceId, string userId, string role)
        {
            var sql = "UPDATE WorkspaceMembers SET Role = @Role WHERE WorkspaceId = @WorkspaceId AND UserId = @UserId";
            var affected = await _dbConnection.ExecuteAsync(sql, new { WorkspaceId = workspaceId, UserId = userId, Role = role });
            return affected > 0;
        }

        public async Task<bool> RemoveMemberAsync(int workspaceId, string userId)
        {
            var sql = "UPDATE WorkspaceMembers SET IsActiveMember = false WHERE WorkspaceId = @WorkspaceId AND UserId = @UserId";
            var affected = await _dbConnection.ExecuteAsync(sql, new { WorkspaceId = workspaceId, UserId = userId });
            return affected > 0;
        }
    }
}
