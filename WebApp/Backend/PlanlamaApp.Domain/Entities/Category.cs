namespace PlanlamaApp.Domain.Entities
{
    /// <summary>
    /// Ders ve Alt Konu hiyerarşisini temsil eden entity.
    /// Kendi kendine referans vererek (ParentId) sınırsız derinlikte ağaç yapısı oluşturabilir.
    /// Örnek: Matematik (Parent) → Türev (Child) → Zincir Kural (Grandchild)
    /// </summary>
    public class Category
    {
        public int Id { get; set; }

        /// <summary>Kiracı izolasyonu. Kırmızı çizgi: zorunludur.</summary>
        public string TenantId { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Üst kategorinin kimliği. Null ise bu kategori bir kök (ders) kategorisidir.
        /// Dolu ise bir alt konu veya alt başlıktır.
        /// </summary>
        public int? ParentId { get; set; }

        /// <summary>
        /// Şablondan mı klonlandı? Eğer true ise bu kategori bir Eğitim Şablonu'ndan
        /// öğrencinin profiline kopyalanmış hazır bir ders/konudur.
        /// </summary>
        public bool IsFromTemplate { get; set; } = false;

        /// <summary>Sıralama amacıyla kullanılır (UI'da listeleme düzeni).</summary>
        public int SortOrder { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
