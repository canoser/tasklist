using System.Data;
using Dapper;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    /// <summary>
    /// ITaskAssignmentRepository'nin Dapper + SQLite üzerinde çalışan somut implementasyonu.
    ///
    /// 1 Görev = 1 Rol kuralı iki katmanda uygulanır:
    ///   1. Veritabanı: TaskAssignments tablosunda UNIQUE(TaskItemId) kısıtı
    ///   2. Repository: AssignAsync → SQLite ON CONFLICT UPSERT mantığı
    ///
    /// "Görevleri Tut (Rolsüz Bırak)" akışı: RemoveRoleFromAssignmentsAsync ile
    /// belirli bir role bağlı tüm TaskAssignment.RoleId değerleri NULL'a güncellenir.
    /// "Diğer" kategorisi oluşturulmaz; görevler yalnızca rolsüz bırakılır.
    /// </summary>
    public class TaskAssignmentRepository : BaseRepository, ITaskAssignmentRepository
    {
        public TaskAssignmentRepository(IDbConnection dbConnection, ITenantProvider tenantProvider)
            : base(dbConnection, tenantProvider)
        {
        }

        /// <inheritdoc/>
        public async Task<TaskAssignment?> GetByTaskIdAsync(int taskId)
        {
            var sql = "SELECT * FROM TaskAssignments WHERE TaskItemId = @TaskItemId";
            return await QueryFirstOrDefaultAsync<TaskAssignment>(sql, new { TaskItemId = taskId });
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<TaskAssignment>> GetByRoleIdAsync(int roleId)
        {
            var sql = "SELECT * FROM TaskAssignments WHERE RoleId = @RoleId ORDER BY AssignedAt DESC";
            return await QueryAsync<TaskAssignment>(sql, new { RoleId = roleId });
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<TaskAssignment>> GetByAssignedUserIdAsync(string userId)
        {
            var sql = "SELECT * FROM TaskAssignments WHERE AssignedUserId = @AssignedUserId ORDER BY AssignedAt DESC";
            return await QueryAsync<TaskAssignment>(sql, new { AssignedUserId = userId });
        }

        /// <inheritdoc/>
        /// <remarks>
        /// UPSERT mantığı: TaskItemId ve AssignedUserId için atama zaten varsa güncellenir.
        /// Yoksa yeni kayıt eklenir. UNIQUE(TaskItemId, AssignedUserId) kısıtı çift güvence sağlar.
        /// </remarks>
        public async Task<int> AssignAsync(TaskAssignment assignment, System.Data.IDbTransaction? transaction = null)
        {
            assignment.TenantId = _tenantId;
            assignment.AssignedAt = DateTime.UtcNow;

            // SQLite ON CONFLICT ile UPSERT — 1 Görev = 1 Kullanıcı ataması
            var sql = @"INSERT INTO TaskAssignments (TenantId, TaskItemId, AssignedUserId, CreatedByUserId, RoleId, WorkspaceId, Status, AssignedAt)
                        VALUES (@TenantId, @TaskItemId, @AssignedUserId, @CreatedByUserId, @RoleId, @WorkspaceId, @Status, @AssignedAt)
                        ON CONFLICT(TaskItemId, AssignedUserId) DO UPDATE SET
                            RoleId = EXCLUDED.RoleId,
                            WorkspaceId = EXCLUDED.WorkspaceId,
                            Status = EXCLUDED.Status,
                            AssignedAt = EXCLUDED.AssignedAt
                        RETURNING Id;";

            return await ExecuteScalarAsync<int>(sql, assignment, transaction);
        }

        /// <inheritdoc/>
        public async Task<bool> UnassignAsync(int assignmentId)
        {
            var sql = "DELETE FROM TaskAssignments WHERE Id = @Id";
            var affected = await ExecuteAsync(sql, new { Id = assignmentId });
            return affected > 0;
        }

        /// <inheritdoc/>
        /// <remarks>
        /// "Görevleri Tut (Rolsüz Bırak)" seçeneği seçildiğinde çağrılır.
        /// Görevler silinmez; yalnızca RoleId = NULL yapılır.
        /// "Diğer" adında kategori oluşturulmaz.
        /// </remarks>
        public async Task<int> RemoveRoleFromAssignmentsAsync(int roleId)
        {
            var sql = "UPDATE TaskAssignments SET RoleId = NULL WHERE RoleId = @RoleId";
            return await ExecuteAsync(sql, new { RoleId = roleId });
        }

        public async Task<IEnumerable<TaskAssignment>> GetByWorkspaceIdAsync(int workspaceId)
        {
            var sql = "SELECT * FROM TaskAssignments WHERE WorkspaceId = @WorkspaceId ORDER BY AssignedAt DESC";
            return await QueryAsync<TaskAssignment>(sql, new { WorkspaceId = workspaceId });
        }

        public async Task<IEnumerable<TaskAssignment>> GetCreatedByUserAsync(string userId)
        {
            var sql = "SELECT * FROM TaskAssignments WHERE CreatedByUserId = @CreatedByUserId ORDER BY AssignedAt DESC";
            return await QueryAsync<TaskAssignment>(sql, new { CreatedByUserId = userId });
        }

        public async Task<bool> UpdateStatusAsync(int assignmentId, string status)
        {
            var sql = "UPDATE TaskAssignments SET Status = @Status WHERE Id = @Id";
            var affected = await ExecuteAsync(sql, new { Id = assignmentId, Status = status });
            return affected > 0;
        }
    }
}
