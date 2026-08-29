using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    /// <summary>
    /// UserRole varlığı için veri erişim sözleşmesi.
    /// ITaggableRepository&lt;UserRole&gt;'ü genişleterek role özgü iş kurallarını ekler.
    ///
    /// UserRolesController bu arayüzü tüketir; somut implementasyon
    /// (UserRoleRepository) BaseRepository'den türeyerek TenantId filtre zırhından yararlanır.
    /// </summary>
    public interface IUserRoleRepository : ITaggableRepository<UserRole>
    {
        /// <summary>
        /// Belirtilen role bağlı görev (TaskAssignment) sayısını döner.
        /// Kullanıcı rolü silmek istediğinde "Karar Modalı"'nı tetiklemek için
        /// UserRolesController bu metodu çağırır.
        /// count > 0 → Modal açılır ("Görevleri Tut" / "Görevleri Tamamen Sil")
        /// count = 0 → Doğrudan soft-delete
        /// </summary>
        Task<int> GetTaskCountByRoleIdAsync(int roleId);

        /// <summary>
        /// Belirtilen id değerine sahip rolü getirir. IDOR kontrolleri için gereklidir.
        /// </summary>
        Task<UserRole?> GetByIdAsync(int roleId);
    }
}
