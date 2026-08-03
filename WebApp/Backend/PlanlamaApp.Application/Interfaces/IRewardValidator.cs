using System.Threading.Tasks;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IRewardValidator
    {
        /// <summary>
        /// S2S Callback veya Frontend SDK'sından gelen kriptografik ödül jetonunu doğrular.
        /// </summary>
        Task<bool> ValidateAsync(string adToken);
    }
}
