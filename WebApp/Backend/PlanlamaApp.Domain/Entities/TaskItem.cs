namespace PlanlamaApp.Domain.Entities
{
    /// <summary>
    /// Eğitim planlama mantığına uygun görev entity'si.
    /// Zaman Çizelgesi (Timeline) ekranında bir kart olarak görünür.
    /// Öğretmen veya öğrenci tarafından atanabilir; deadline ve ders tipi gibi
    /// eğitim odaklı alanlar içerir. Gelecekteki belirsiz gereksinimler için
    /// JSON tabanlı Metadata alanı zorunlu olarak bulunur.
    /// </summary>
    public class TaskItem
    {
        public int Id { get; set; }

        /// <summary>Kiracı izolasyonu. Kırmızı çizgi: zorunludur.</summary>
        public string TenantId { get; set; } = string.Empty;

        /// <summary>Görevi oluşturan veya üstlenen kullanıcı (AppUser.Id).</summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>İlgili ders veya konu (Category.Id). Null olabilir (genel görev).</summary>
        public int? CategoryId { get; set; }

        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        /// <summary>
        /// Görevin türü / ders tipi.
        /// Örnek değerler: "Video", "Test", "Okuma", "Soru Çözme", "Deneme", "Tekrar"
        /// </summary>
        public string TaskType { get; set; } = "Soru Çözme";

        /// <summary>
        /// Görevin tamamlanması gereken son tarih.
        /// Timeline sıralaması bu alan üzerinden yapılır.
        /// </summary>
        public DateTime? Deadline { get; set; }

        /// <summary>
        /// true → Görevi öğretmen atadı (teacher-assigned).
        /// false → Öğrencinin kendi kendine oluşturduğu görev.
        /// Detay Kartı'nda "Öğretmen Görevi" / "Kişisel Görev" rozeti için kullanılır.
        /// </summary>
        public bool IsTeacherAssigned { get; set; } = false;

        public bool IsCompleted { get; set; } = false;

        public DateTime? CompletedAt { get; set; }

        /// <summary>
        /// Görevin hedef soru/sayfa/video sayısı gibi nicelik bilgileri.
        /// Örnek: 40 (soru), 20 (sayfa)
        /// </summary>
        public int? TargetCount { get; set; }

        /// <summary>
        /// Gelecekteki belirsiz gereksinimler için esnek JSON alanı.
        /// Örnek: { "difficulty": "hard", "sourceBook": "Palme", "repeatInterval": 3 }
        /// </summary>
        public string? Metadata { get; set; }

        public int? WorkspaceId { get; set; }
        public string? ChainId { get; set; }
        public int? ChainOrder { get; set; }
        public DateTime? OriginalDeadline { get; set; }
        public bool IsHomework { get; set; } = false;
        public string? AssignedBy { get; set; }

        public int? AssignedByWorkspaceId { get; set; }
        public string? AssignedByUserId { get; set; }
        public string? UserTaskSnapshot { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
