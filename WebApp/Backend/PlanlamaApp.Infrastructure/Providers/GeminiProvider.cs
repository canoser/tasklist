using System.Net.Http.Headers;
using Microsoft.Extensions.Configuration;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Infrastructure.Providers
{
    public class GeminiProvider : IAiProvider
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public GeminiProvider(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["AiSettings:GeminiApiKey"] ?? throw new ArgumentNullException("GeminiApiKey");
        }

        public Task<AiPlanResponse> GeneratePlanAsync(AiPlanRequest request, string systemPrompt)
        {
            // Gemini API'si için araçlar (tools) functionDeclarations dizisi altında gönderilir.
            // Bu sınıfın içi ilerleyen safhalarda tamamen doldurulacaktır. 
            // Şimdilik sistemin çoklu modele (GPT ve Gemini) aynı arayüz üzerinden
            // hazır olduğunu göstermek için bırakılmıştır.
            
            throw new NotImplementedException("Gemini Provider entegrasyonu hazır, ancak JSON şeması map'lemesi henüz yapılmadı. Lütfen şimdilik OpenAiProvider kullanın.");
        }
    }
}
