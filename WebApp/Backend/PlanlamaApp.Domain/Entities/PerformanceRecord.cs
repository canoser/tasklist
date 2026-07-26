namespace PlanlamaApp.Domain.Entities
{
    /// <summary>
    /// Öğrencinin bir görevi tamamladıktan sonra girdiği performans verilerini tutar.
    /// Doğru/Yanlış/Boş sayıları ve hesaplanan Net skoru içerir.
    /// TaskItem tamamlandığında (IsCompleted = true) bu kayıt oluşturulur veya güncellenir.
    /// </summary>
    public class PerformanceRecord
    {
        public int Id { get; set; }

        /// <summary>Kiracı izolasyonu. Kırmızı çizgi: zorunludur.</summary>
        public string TenantId { get; set; } = string.Empty;

        /// <summary>Performansın ait olduğu kullanıcı (AppUser.Id).</summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>İlgili görev. Performans kaydı her zaman bir TaskItem'a bağlıdır.</summary>
        public int TaskItemId { get; set; }

        /// <summary>
        /// İlgili ders/konu. TaskItem üzerinden dolaylı erişilebilse de
        /// performans raporlarında hızlı sorgulama için doğrudan tutulur.
        /// </summary>
        public int? CategoryId { get; set; }

        /// <summary>Doğru sayısı.</summary>
        public int CorrectCount { get; set; } = 0;

        /// <summary>Yanlış sayısı.</summary>
        public int WrongCount { get; set; } = 0;

        /// <summary>Boş sayısı (yanıtlanmayan sorular).</summary>
        public int BlankCount { get; set; } = 0;

        /// <summary>
        /// Net skor. YKS'de standart hesaplama: Doğru - (Yanlış / 4).
        /// Farklı sınav sistemleri için farklı formüller uygulanabilir.
        /// </summary>
        public decimal NetScore { get; set; } = 0;

        /// <summary>Öğrencinin serbest notları veya konu değerlendirmesi.</summary>
        public string? Notes { get; set; }

        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
