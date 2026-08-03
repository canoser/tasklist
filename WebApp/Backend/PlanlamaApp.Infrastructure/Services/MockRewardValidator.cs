using System.Threading.Tasks;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Infrastructure.Services
{
    public class MockRewardValidator : IRewardValidator
    {
        public Task<bool> ValidateAsync(string adToken)
        {
            // Canlıya çıkılana kadar sahte bir token ile doğrulama simüle ediyoruz.
            // Gerçek senaryoda burada Google AdMob veya Unity Ads sunucusuna S2S (Server-to-Server) 
            // doğrulaması atılacak veya HMAC imza kontrolü yapılacaktır.
            if (string.IsNullOrEmpty(adToken))
                return Task.FromResult(false);

            bool isValid = adToken == "DEV_TEST_TOKEN";
            return Task.FromResult(isValid);
        }
    }
}
