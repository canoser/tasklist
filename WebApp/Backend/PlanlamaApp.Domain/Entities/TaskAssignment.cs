namespace PlanlamaApp.Domain.Entities
{
    /// <summary>
    /// Bir görevin (TaskItem) belirli bir kullanıcıya ve role göre atanmasını modelleyen
    /// ilişki tablosu entity'si.
    ///
    /// Tasarım kararları:
    /// - 1 Görev = 1 Rol kuralı: Aynı TaskItemId için yalnızca bir aktif kayıt bulunabilir.
    ///   Bu kısıt hem veritabanı UNIQUE kısıtı (TaskAssignments tablosunda UNIQUE(TaskItemId))
    ///   hem de TaskAssignmentRepository.AssignAsync'in UPSERT mantığıyla çift güvenceyle uygulanır.
    ///   Arayüzde (UI) çoklu rol ataması seçeneği ASLA sunulmaz.
    ///
    /// - RoleId nullable: Kullanıcı rolü soft-delete yapıp "Görevleri Tut (Rolsüz Bırak)" seçerse
    ///   tüm TaskAssignment kayıtlarının RoleId değeri null'a çekilir. Görevler varlığını korur;
    ///   sadece bir role bağlı olmaktan çıkarlar. "Diğer" adında sahte bir kategori oluşturulmaz.
    ///
    /// - AssignedUserId: Görevi alan kişinin kimliği. Öğretmen-Öğrenci, Patron-Çalışan,
    ///   Antrenör-Sporcu gibi sınırsız rol çifti bu yapıyla modellenir.
    /// </summary>
    public class TaskAssignment
    {
        public int Id { get; set; }

        /// <summary>Kiracı izolasyonu. Kırmızı çizgi: zorunludur.</summary>
        public string TenantId { get; set; } = string.Empty;

        /// <summary>Atanan görev (TaskItem.Id). UNIQUE kısıtı — bir görev yalnızca bir atama kaydına sahip olabilir.</summary>
        public int TaskItemId { get; set; }

        /// <summary>Görevi alan kullanıcı (AppUser.Id).</summary>
        public string AssignedUserId { get; set; } = string.Empty;

        /// <summary>
        /// Görevin hangi rol çatısı altında atandığı (UserRole.Id).
        /// Null → rolsüz atama; kullanıcı ilgili rolü "Görevleri Tut" seçeneğiyle silmişse burası null olur.
        /// Rol restore edildiğinde bu kayıt zaten null'da durur; UI'da "rolsüz" olarak görünür.
        /// </summary>
        public int? RoleId { get; set; }

        /// <summary>Görevin atandığı zaman damgası.</summary>
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        /// <summary>Görevi atayan kişi.</summary>
        public string CreatedByUserId { get; set; } = string.Empty;

        /// <summary>Hangi çalışma alanı bağlamında, null = bireysel</summary>
        public int? WorkspaceId { get; set; }

        /// <summary>Atama durumu: Bekliyor / Devam / Tamamlandı / Geç</summary>
        public string Status { get; set; } = "Bekliyor";
    }
}
