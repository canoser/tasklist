namespace PlanlamaApp.Domain.Common
{
    /// <summary>
    /// Soft-delete (yumuşak silme) destekleyen tüm entity'ler bu arayüzü uygular.
    /// Kaydı fiziksel olarak silmek yerine IsActive=false ve DeletedAt=now yapılır;
    /// böylece yabancı anahtar ilişkileri (örn. TaskAssignment.RoleId) asla orphan kalmaz.
    ///
    /// Gelecekte BaseRepository'ye eklenecek generic SoftDeleteAsync<T> metodu
    /// bu arayüzü kontrol ederek tüm entity'lere uygulanabilir hale gelir.
    /// </summary>
    public interface ISoftDeletable
    {
        /// <summary>false = kayıt silinmiş (soft-deleted), ancak veri tabanında duruyor.</summary>
        bool IsActive { get; set; }

        /// <summary>Soft-delete tarihi. Restore edilirse null'a çekilir.</summary>
        DateTime? DeletedAt { get; set; }
    }
}
