namespace PlanlamaApp.Domain.Entities
{
    /// <summary>
    /// Sistemdeki her kullanıcıyı temsil eder.
    /// "Udemy Modeli" rol esnekliğine göre, ayrı Öğrenci/Öğretmen tablosu yoktur;
    /// herkes bu tek kimlik üzerinden hareket eder. Rol geçişleri ve Onboarding
    /// sihirbazından gelen dinamik tercihler JSON formatında Preferences alanında tutulur.
    /// </summary>
    public class AppUser
    {
        /// <summary>Firebase UID veya harici kimlik doğrulayıcıdan gelen eşsiz kullanıcı kimliği.</summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>Kullanıcının ait olduğu kiracı (okul, kurum, bireysel hesap) kimliği. Kırmızı çizgi: zorunludur.</summary>
        public string TenantId { get; set; } = string.Empty;

        public string DisplayName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Kullanıcının aktif rolü. Yetkiye bağlı olarak UI üzerinden değiştirilebilir.
        /// Örnek değerler: "Student", "Teacher", "Admin"
        /// </summary>
        public string Role { get; set; } = "Student";

        /// <summary>
        /// Onboarding sihirbazından gelen ve zamanla genişleyebilecek dinamik tercihler.
        /// JSON formatında saklanır. Örnek: { "country": "TR", "examSystem": "YKS", "gradeLevel": 11 }
        /// </summary>
        public string? Preferences { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
