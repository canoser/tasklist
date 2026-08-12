using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Application.Interfaces
{
    /// <summary>
    /// TaskItem varlığı için veri erişim sözleşmesi.
    /// Tüm sorgular otomatik olarak TenantId filtresiyle izole edilir (BaseRepository garantisi).
    /// </summary>
    public interface ITaskRepository
    {
        /// <summary>Belirli bir kullanıcıya ait tüm görevleri getirir.</summary>
        Task<IEnumerable<TaskItem>> GetByUserIdAsync(string userId);

        /// <summary>Belirli bir kategoriye ait tüm görevleri getirir.</summary>
        Task<IEnumerable<TaskItem>> GetByCategoryIdAsync(int categoryId);

        /// <summary>
        /// Zaman Çizelgesi (Timeline) için, belirtilen tarih aralığındaki görevleri getirir.
        /// Deadline'a göre sıralı döner.
        /// </summary>
        Task<IEnumerable<TaskItem>> GetByDateRangeAsync(string userId, DateTime start, DateTime end);

        /// <summary>Tek bir görevi Id ile getirir.</summary>
        Task<TaskItem?> GetByIdAsync(int id);

        /// <summary>Yeni görev oluşturur. TenantId doldurulmuş olmalıdır.</summary>
        Task<int> CreateAsync(TaskItem task, System.Data.IDbTransaction? transaction = null);

        /// <summary>Mevcut görevi günceller.</summary>
        Task<bool> UpdateAsync(TaskItem task, System.Data.IDbTransaction? transaction = null);

        /// <summary>Görevi siler.</summary>
        Task<bool> DeleteAsync(int id, System.Data.IDbTransaction? transaction = null);

        /// <summary>Görevi tamamlandı olarak işaretler ve CompletedAt alanını günceller.</summary>
        Task<bool> MarkAsCompletedAsync(int id, DateTime completedAt, System.Data.IDbTransaction? transaction = null);

        /// <summary>Bir zincirdeki görevleri (sırası >= minOrder) kaskad olarak öteler.</summary>
        Task<bool> PostponeChainAsync(string chainId, string userId, int minOrder, int daysToShift, System.Data.IDbTransaction? transaction = null);

        /// <summary>
        /// Kullanıcının zincir görevlerini gruplu olarak getirir.
        /// Her grup: ChainId, görev listesi (ChainOrder'a göre sıralı).
        /// </summary>
        Task<IEnumerable<TaskItem>> GetChainTasksByUserIdAsync(string userId);
    }
}
