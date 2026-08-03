namespace PlanlamaApp.Application.Interfaces
{
    /// <summary>
    /// "Etiketlenebilir" varlıklar için generic CRUD + soft/hard delete sözleşmesi.
    ///
    /// Neden generic?
    /// Bu arayüzü şu an UserRole uygular. İleride:
    ///   - ProjectTag : ITaggableRepository&lt;ProjectTag&gt;  (Proje etiketleri)
    ///   - SkillTag   : ITaggableRepository&lt;SkillTag&gt;    (Yetkinlik etiketleri)
    ///   - HabitTag   : ITaggableRepository&lt;HabitTag&gt;    (Alışkanlık kategorileri)
    /// gibi varlıklar aynı sözleşmeye uyarak sisteme eklenebilir.
    /// Mevcut koda dokunulmaz — Açık/Kapalı Prensibi (OCP) uygulanır.
    ///
    /// Tipik implementasyon: Somut Repository, BaseRepository'den türer ve
    /// TenantId filtre zırhından otomatik yararlanır.
    /// </summary>
    /// <typeparam name="T">Soft-delete alanları bulunan entity tipi.</typeparam>
    public interface ITaggableRepository<T> where T : class
    {
        /// <summary>Belirtilen sahibin aktif (IsActive=true) tag'lerini getirir.</summary>
        Task<IEnumerable<T>> GetActiveTagsAsync(string ownerId);

        /// <summary>
        /// Silinmiş dahil tüm tag'leri getirir.
        /// AddOrRestoreTagAsync'in restore kontrolü için kullanılır.
        /// </summary>
        Task<IEnumerable<T>> GetAllTagsAsync(string ownerId);

        /// <summary>
        /// Yeni tag ekler veya soft-deleted kaydı geri getirir.
        /// Mantık: Aynı ownerId + aynı RoleName/Label'a sahip IsActive=false kayıt varsa
        /// IsActive=true, DeletedAt=null yapılır ve Id geri döner.
        /// Yoksa yeni kayıt INSERT edilir.
        /// Bu sayede TaskAssignment.RoleId hiçbir zaman orphan kalmaz.
        /// </summary>
        Task<int> AddOrRestoreTagAsync(T tag);

        /// <summary>
        /// Soft-delete: IsActive=false, DeletedAt=now yapılır.
        /// Fiziksel silme yoktur — yabancı anahtar referansları (TaskAssignment.RoleId) korunur.
        /// Görev bağlantısı olan kayıtlarda bu metot çağrılmadan önce üst katman
        /// (Controller veya Service) kullanıcıdan karar almalıdır.
        /// </summary>
        Task<bool> SoftDeleteTagAsync(int id);

        /// <summary>
        /// Hard-delete: Kaydı fiziksel olarak siler.
        /// Bu işlemden önce bağlı TaskAssignment kayıtları null'lanmalıdır
        /// (ITaskAssignmentRepository.RemoveRoleFromAssignmentsAsync).
        /// </summary>
        Task<bool> HardDeleteTagAsync(int id);

        /// <summary>Soft-deleted kaydı geri getirir (IsActive=true, DeletedAt=null).</summary>
        Task<bool> RestoreTagAsync(int id);
    }
}
