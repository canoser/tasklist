using System.Data;
using Dapper;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    /// <summary>
    /// ICategoryRepository'nin Dapper + SQLite üzerinde çalışan somut implementasyonu.
    /// Ders/Konu hiyerarşisini ve Onboarding şablon klonlamayı yönetir.
    /// BaseRepository'nin TenantId filtre zırhı tüm sorgulara otomatik uygulanır.
    /// </summary>
    public class CategoryRepository : BaseRepository, ICategoryRepository
    {
        public CategoryRepository(IDbConnection dbConnection, ITenantProvider tenantProvider)
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<IEnumerable<Category>> GetRootCategoriesAsync()
        {
            // ParentId NULL olan kategoriler kök (ders) kategorilerdir.
            // BaseRepository otomatik "AND TenantId = @TenantId" ekler.
            var sql = @"SELECT * FROM Categories WHERE ParentId IS NULL ORDER BY SortOrder ASC, Name ASC";
            return await QueryAsync<Category>(sql);
        }

        public async Task<IEnumerable<Category>> GetChildrenAsync(int parentId)
        {
            var sql = @"SELECT * FROM Categories WHERE ParentId = @ParentId ORDER BY SortOrder ASC, Name ASC";
            return await QueryAsync<Category>(sql, new { ParentId = parentId });
        }

        public async Task<Category?> GetByIdAsync(int id)
        {
            var sql = @"SELECT * FROM Categories WHERE Id = @Id";
            return await QueryFirstOrDefaultAsync<Category>(sql, new { Id = id });
        }

        public async Task<int> CreateAsync(Category category)
        {
            // INSERT: TenantId kolonu sorguda zorunlu (BaseRepository kural).
            var sql = @"INSERT INTO Categories 
                            (TenantId, Name, ParentId, IsFromTemplate, SortOrder, CreatedAt, UpdatedAt)
                        VALUES 
                            (@TenantId, @Name, @ParentId, @IsFromTemplate, @SortOrder, @CreatedAt, @UpdatedAt)
                        RETURNING ""Id"";";
            return await ExecuteScalarAsync<int>(sql, category);
        }

        public async Task<bool> UpdateAsync(Category category)
        {
            var sql = @"UPDATE Categories 
                        SET Name = @Name,
                            ParentId = @ParentId,
                            IsFromTemplate = @IsFromTemplate,
                            SortOrder = @SortOrder,
                            UpdatedAt = @UpdatedAt
                        WHERE Id = @Id AND TenantId = @TenantId";
            var affected = await ExecuteAsync(sql, category);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            // Not: Alt kategorileri olan bir kaydın silinmesi, üst katmanda (Service) kontrol edilmelidir.
            var sql = @"DELETE FROM Categories WHERE Id = @Id";
            var affected = await ExecuteAsync(sql, new { Id = id });
            return affected > 0;
        }

        public async Task CloneTemplateAsync(IEnumerable<Category> templateCategories, string targetUserId)
        {
            // Onboarding sihirbazı: Şablon kategorilerini bu kiracıya kopyalar.
            // Her kategori TenantId = _tenantId ile oluşturulur; IsFromTemplate = true işaretlenir.
            var sql = @"INSERT INTO Categories 
                            (TenantId, Name, ParentId, IsFromTemplate, SortOrder, CreatedAt, UpdatedAt)
                        VALUES 
                            (@TenantId, @Name, @ParentId, 1, @SortOrder, @CreatedAt, @UpdatedAt);";

            foreach (var category in templateCategories)
            {
                var cloned = new Category
                {
                    TenantId = _tenantId,
                    Name = category.Name,
                    ParentId = category.ParentId,
                    IsFromTemplate = true,
                    SortOrder = category.SortOrder,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await ExecuteAsync(sql, cloned);
            }
        }
    }
}
