using System.Threading.Tasks;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IQuotaManager
    {
        /// <summary>
        /// Kotayı düşürmeye çalışır (Atomik olarak). Limit dolmamışsa True, dolmuşsa False döner.
        /// </summary>
        Task<bool> TryDeductAsync(string tenantId, string plan, string resourceType, System.Data.IDbTransaction? transaction = null);

        /// <summary>
        /// Eğer işlem (örn: AI API çağrısı) başarısız olursa kotayı iade eder.
        /// </summary>
        Task<bool> RefundAsync(string tenantId, string plan, string resourceType, System.Data.IDbTransaction? transaction = null);
        /// <summary>
        /// Kullanıcıya reklam izlemesi karşılığında ekstra kredi tanımlar.
        /// </summary>
        Task<bool> GrantRewardAsync(string tenantId, string resourceType, int amount, DateTime expirationDate);
    }
}
