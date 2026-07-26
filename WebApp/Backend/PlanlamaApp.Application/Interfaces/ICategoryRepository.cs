using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    /// <summary>
    /// Category varlığı için veri erişim sözleşmesi.
    /// Ders ve Alt Konu hiyerarşisini yönetir.
    /// Tüm sorgular otomatik olarak TenantId filtresiyle izole edilir (BaseRepository garantisi).
    /// </summary>
    public interface ICategoryRepository
    {
        /// <summary>
        /// Tüm kök kategorileri getirir (ParentId == null).
        /// Genellikle "Dersler" listesini oluşturmak için kullanılır.
        /// </summary>
        Task<IEnumerable<Category>> GetRootCategoriesAsync();

        /// <summary>
        /// Belirtilen üst kategorinin tüm alt kategorilerini getirir.
        /// Genellikle "Konular" veya "Alt Başlıklar" listesini oluşturmak için kullanılır.
        /// </summary>
        Task<IEnumerable<Category>> GetChildrenAsync(int parentId);

        /// <summary>Tek bir kategoriyi Id ile getirir.</summary>
        Task<Category?> GetByIdAsync(int id);

        /// <summary>Yeni kategori oluşturur. TenantId doldurulmuş olmalıdır.</summary>
        Task<int> CreateAsync(Category category);

        /// <summary>Mevcut kategoriyi günceller.</summary>
        Task<bool> UpdateAsync(Category category);

        /// <summary>Kategoriyi siler. Alt kategorileri olan silme işlemi katmanda kontrol edilmelidir.</summary>
        Task<bool> DeleteAsync(int id);

        /// <summary>
        /// Eğitim Şablonu'ndan bir kullanıcının profiline kategori ağacı kopyalar.
        /// Onboarding sihirbazı bu metodu çağırır.
        /// </summary>
        Task CloneTemplateAsync(IEnumerable<Category> templateCategories, string targetUserId);
    }
}
