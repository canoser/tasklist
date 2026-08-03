using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    /// <summary>
    /// TaskAssignment (Görev Atama) varlığı için veri erişim sözleşmesi.
    ///
    /// Kural — 1 Görev = 1 Rol:
    /// Bir TaskItem aynı anda birden fazla TaskAssignment kaydına sahip olamaz.
    /// Bu kural veritabanı UNIQUE(TaskItemId) kısıtı ve AssignAsync'in UPSERT mantığıyla sağlanır.
    /// Arayüzde çoklu rol ataması seçeneği sunulmaz.
    ///
    /// Rol silme senaryosu:
    /// Kullanıcı "Görevleri Tut (Rolsüz Bırak)" seçerse RemoveRoleFromAssignmentsAsync çağrılır;
    /// ilgili atama kayıtlarının RoleId değeri null'a güncellenir. Görevler silinmez.
    /// "Diğer" adında sahte bir kategori ASLA oluşturulmaz.
    /// </summary>
    public interface ITaskAssignmentRepository
    {
        /// <summary>Belirtilen göreve ait atama kaydını getirir (null → rolsüz veya atanmamış).</summary>
        Task<TaskAssignment?> GetByTaskIdAsync(int taskId);

        /// <summary>Belirtilen role bağlı tüm atamaları getirir.</summary>
        Task<IEnumerable<TaskAssignment>> GetByRoleIdAsync(int roleId);

        /// <summary>Belirtilen kullanıcıya atanmış tüm görev atamalarını getirir.</summary>
        Task<IEnumerable<TaskAssignment>> GetByAssignedUserIdAsync(string userId);

        /// <summary>
        /// Görev ataması oluşturur veya günceller (UPSERT).
        /// TaskItemId için zaten bir kayıt varsa RoleId ve AssignedUserId güncellenir;
        /// yoksa yeni kayıt oluşturulur.
        /// 1 Görev = 1 Rol kuralını uygular.
        /// </summary>
        Task<int> AssignAsync(TaskAssignment assignment, System.Data.IDbTransaction? transaction = null);

        /// <summary>Atama kaydını siler (görev atanmamış hale gelir).</summary>
        Task<bool> UnassignAsync(int assignmentId);

        /// <summary>
        /// Belirtilen role bağlı tüm TaskAssignment kayıtlarının RoleId değerini null'a günceller.
        /// "Görevleri Tut (Rolsüz Bırak)" seçeneği seçildiğinde çağrılır.
        /// Görevler silinmez; yalnızca rol bağlantısı koparılır.
        /// Etkilenen kayıt sayısını döner.
        /// </summary>
        Task<int> RemoveRoleFromAssignmentsAsync(int roleId);

        // Bir workspace'e bağlı tüm atamaları getir
        Task<IEnumerable<TaskAssignment>> GetByWorkspaceIdAsync(int workspaceId);

        // Atayan kullanıcının gönderdiği tüm atamalar ("Atadıklarım")
        Task<IEnumerable<TaskAssignment>> GetCreatedByUserAsync(string userId);

        // Atama durumunu güncelle (Bekliyor → Devam → Tamamlandı)
        Task<bool> UpdateStatusAsync(int assignmentId, string status);
    }
}
