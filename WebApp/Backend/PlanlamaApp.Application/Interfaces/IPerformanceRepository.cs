using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    /// <summary>
    /// PerformanceRecord varlığı için veri erişim sözleşmesi.
    /// Öğrencinin görev sonrası girdiği Doğru/Yanlış/Boş ve Net Skor verilerini yönetir.
    /// Tüm sorgular otomatik olarak TenantId filtresiyle izole edilir (BaseRepository garantisi).
    /// </summary>
    public interface IPerformanceRepository
    {
        /// <summary>Belirli bir kullanıcının tüm performans kayıtlarını getirir.</summary>
        Task<IEnumerable<PerformanceRecord>> GetByUserIdAsync(string userId);

        /// <summary>Belirli bir göreve (TaskItem) ait performans kaydını getirir.</summary>
        Task<PerformanceRecord?> GetByTaskItemIdAsync(int taskItemId);

        /// <summary>
        /// Belirli bir ders/konuya (Category) ait tüm performans kayıtlarını getirir.
        /// Konu bazlı analiz ve raporlama için kullanılır.
        /// </summary>
        Task<IEnumerable<PerformanceRecord>> GetByCategoryIdAsync(int categoryId);

        /// <summary>
        /// Kullanıcının belirtilen tarih aralığındaki performans kayıtlarını getirir.
        /// Haftalık/Aylık rapor ekranları için kullanılır.
        /// </summary>
        Task<IEnumerable<PerformanceRecord>> GetByDateRangeAsync(string userId, DateTime start, DateTime end);

        /// <summary>Tek bir performans kaydını Id ile getirir.</summary>
        Task<PerformanceRecord?> GetByIdAsync(int id);

        /// <summary>Yeni performans kaydı oluşturur. TenantId doldurulmuş olmalıdır.</summary>
        Task<int> CreateAsync(PerformanceRecord record);

        /// <summary>
        /// Mevcut performans kaydını günceller.
        /// Görev tamamlandıktan sonra kullanıcı skorunu düzeltmek istediğinde çağrılır.
        /// </summary>
        Task<bool> UpdateAsync(PerformanceRecord record);

        /// <summary>Performans kaydını siler.</summary>
        Task<bool> DeleteAsync(int id);
    }
}
