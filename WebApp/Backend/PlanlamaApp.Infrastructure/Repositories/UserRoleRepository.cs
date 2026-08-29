using System.Data;
using Dapper;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    /// <summary>
    /// IUserRoleRepository'nin Dapper + SQLite üzerinde çalışan somut implementasyonu.
    /// BaseRepository'nin TenantId filtre zırhı tüm SELECT/UPDATE/DELETE sorgularına otomatik uygulanır.
    /// INSERT sorgularında ise TenantId kolonu VALUES içine dahil edilip _dbConnection doğrudan kullanılır
    /// (BaseRepository'nin ExecuteAsync'i TenantId'yi iki kez eklememesi için — CategoryRepository ile aynı pattern).
    /// </summary>
    public class UserRoleRepository : BaseRepository, IUserRoleRepository
    {
        public UserRoleRepository(IDbConnection dbConnection, ITenantProvider tenantProvider)
            : base(dbConnection, tenantProvider)
        {
        }

        // ── ITaggableRepository<UserRole> ────────────────────────────────────────

        /// <inheritdoc/>
        public async Task<IEnumerable<UserRole>> GetActiveTagsAsync(string ownerId)
        {
            // BaseRepository, sorgunun sonuna "AND TenantId = @TenantId" ekler.
            var sql = "SELECT * FROM UserRoles WHERE UserId = @UserId AND IsActive = 1 ORDER BY CreatedAt ASC";
            return await QueryAsync<UserRole>(sql, new { UserId = ownerId });
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<UserRole>> GetAllTagsAsync(string ownerId)
        {
            // Silinmiş dahil tüm roller — AddOrRestoreTagAsync'in restore kontrolü için.
            var sql = "SELECT * FROM UserRoles WHERE UserId = @UserId ORDER BY CreatedAt ASC";
            return await QueryAsync<UserRole>(sql, new { UserId = ownerId });
        }

        /// <inheritdoc/>
        /// <remarks>
        /// Restore önceliği: Aynı kullanıcıya ait aynı RoleName'de IsActive=false kayıt varsa
        /// yeni kayıt oluşturulmaz, mevcut kayıt restore edilir.
        /// Bu sayede TaskAssignment.RoleId asla geçersiz (orphan) kalmaz.
        /// </remarks>
        public async Task<int> AddOrRestoreTagAsync(UserRole tag)
        {
            // 1. Aynı isimde soft-deleted kayıt var mı? (TenantId filtresi otomatik eklenir)
            var existingSql = @"SELECT * FROM UserRoles 
                                WHERE UserId = @UserId AND RoleName = @RoleName AND IsActive = 0";
            var existing = await QueryFirstOrDefaultAsync<UserRole>(existingSql, new { tag.UserId, tag.RoleName });

            if (existing != null)
            {
                // 2a. Restore: IsActive=true, DeletedAt=null — aynı Id korunur
                var restoreSql = @"UPDATE UserRoles 
                                   SET IsActive = 1, DeletedAt = NULL, UpdatedAt = @UpdatedAt 
                                   WHERE Id = @Id AND TenantId = @TenantId";
                await ExecuteAsync(restoreSql, new { existing.Id, UpdatedAt = DateTime.UtcNow });
                return existing.Id;
            }

            // 2b. Yeni kayıt — TenantId = _tenantId ile INSERT
            tag.TenantId = _tenantId;
            tag.CreatedAt = DateTime.UtcNow;
            tag.UpdatedAt = DateTime.UtcNow;

            var insertSql = @"INSERT INTO UserRoles (TenantId, UserId, RoleName, IsActive, DeletedAt, CreatedAt, UpdatedAt)
                              VALUES (@TenantId, @UserId, @RoleName, 1, NULL, @CreatedAt, @UpdatedAt)
                              RETURNING Id;";
            return await ExecuteScalarAsync<int>(insertSql, tag);
        }

        /// <inheritdoc/>
        public async Task<bool> SoftDeleteTagAsync(int id)
        {
            // BaseRepository, WHERE'den sonra "AND TenantId = @TenantId" ekler.
            var sql = @"UPDATE UserRoles 
                        SET IsActive = 0, DeletedAt = @DeletedAt, UpdatedAt = @UpdatedAt 
                        WHERE Id = @Id AND TenantId = @TenantId";
            var affected = await ExecuteAsync(sql, new { Id = id, DeletedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            return affected > 0;
        }

        /// <inheritdoc/>
        public async Task<bool> HardDeleteTagAsync(int id)
        {
            // Fiziksel silmeden önce controller, ITaskAssignmentRepository.RemoveRoleFromAssignmentsAsync
            // çağırarak TaskAssignment.RoleId değerlerini null'a çekmiş olmalıdır.
            var sql = "DELETE FROM UserRoles WHERE Id = @Id";
            var affected = await ExecuteAsync(sql, new { Id = id });
            return affected > 0;
        }

        /// <inheritdoc/>
        public async Task<bool> RestoreTagAsync(int id)
        {
            var sql = @"UPDATE UserRoles 
                        SET IsActive = 1, DeletedAt = NULL, UpdatedAt = @UpdatedAt 
                        WHERE Id = @Id AND TenantId = @TenantId";
            var affected = await ExecuteAsync(sql, new { Id = id, UpdatedAt = DateTime.UtcNow });
            return affected > 0;
        }

        // ── IUserRoleRepository (Role'e özgü) ───────────────────────────────────

        /// <inheritdoc/>
        public async Task<int> GetTaskCountByRoleIdAsync(int roleId)
        {
            // TaskAssignments tablosunu doğrudan sorguluyoruz; TenantId filtresi manuel eklendi.
            var sql = "SELECT COUNT(*) FROM TaskAssignments WHERE RoleId = @RoleId AND TenantId = @TenantId";
            return await ExecuteScalarAsync<int>(sql, new { RoleId = roleId });
        }

        /// <inheritdoc/>
        public async Task<UserRole?> GetByIdAsync(int roleId)
        {
            var sql = "SELECT * FROM UserRoles WHERE Id = @Id";
            return await QueryFirstOrDefaultAsync<UserRole>(sql, new { Id = roleId });
        }
    }
}
