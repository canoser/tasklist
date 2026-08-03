using PlanlamaApp.Domain.Common;

namespace PlanlamaApp.Domain.Entities
{
    /// <summary>
    /// Bir kullanıcının sistemdeki rolünü temsil eder.
    /// "Öğrenci", "Öğretmen" gibi sabit roller veya kullanıcının tanımladığı
    /// "Proje Yöneticisi", "Antrenör", "Patron" gibi özel roller bu entity ile saklanır.
    ///
    /// Tasarım kararları:
    /// - Soft-delete (ISoftDeletable): Rol silindiğinde TaskAssignment.RoleId referansları
    ///   korunur. Rol geri eklendiğinde aynı Id kullanılır; ilişkiler kendiliğinden döner.
    /// - AddOrRestore mantığı: Aynı RoleName'de silinmiş kayıt varsa yeni kayıt oluşturulmaz,
    ///   mevcut kayıt restore edilir. Böylece TaskAssignment.RoleId hiçbir zaman geçersiz kalmaz.
    /// </summary>
    public class UserRole : ISoftDeletable
    {
        public int Id { get; set; }

        /// <summary>Kullanıcının Firebase UID veya harici kimlik doğrulayıcı Id'si.</summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>Kiracı izolasyonu. Kırmızı çizgi: zorunludur.</summary>
        public string TenantId { get; set; } = string.Empty;

        /// <summary>
        /// Rol adı. Serbest metin; kullanıcının girdiği değer saklanır.
        /// Örnek: "Öğrenci", "Öğretmen", "Antrenör", "Patron"
        /// </summary>
        public string RoleName { get; set; } = string.Empty;

        // ── ISoftDeletable ───────────────────────────────────────────────────────

        /// <summary>false → soft-deleted; görevler ve ilişkiler korunur, UI'dan gizlenir.</summary>
        public bool IsActive { get; set; } = true;

        /// <summary>Soft-delete anı. Restore edilirse null olur.</summary>
        public DateTime? DeletedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
