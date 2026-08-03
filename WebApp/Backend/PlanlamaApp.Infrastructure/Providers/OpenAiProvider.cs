using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Infrastructure.Providers
{
    public class OpenAiProvider : IAiProvider
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public OpenAiProvider(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["AiSettings:OpenAiApiKey"] ?? throw new ArgumentNullException("OpenAiApiKey");
        }

        public async Task<AiPlanResponse> GeneratePlanAsync(AiPlanRequest request, string systemPrompt)
        {
            var url = "https://api.openai.com/v1/chat/completions";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

            var payload = new
            {
                model = "gpt-4o-mini",
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = request.Prompt }
                },
                tools = AiToolSchemas.GetTools(),
                tool_choice = "auto"
            };

            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(jsonResponse);
            
            var aiPlan = new AiPlanResponse();
            
            var messageElement = doc.RootElement.GetProperty("choices")[0].GetProperty("message");
            
            if (messageElement.TryGetProperty("content", out var textContent) && textContent.ValueKind == JsonValueKind.String)
            {
                aiPlan.Message = textContent.GetString() ?? string.Empty;
            }

            if (messageElement.TryGetProperty("tool_calls", out var toolCallsElement) && toolCallsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var toolCall in toolCallsElement.EnumerateArray())
                {
                    if (toolCall.TryGetProperty("function", out var functionElement))
                    {
                        var name = functionElement.GetProperty("name").GetString();
                        var argsJson = functionElement.GetProperty("arguments").GetString();
                        
                        var argsDict = string.IsNullOrEmpty(argsJson) 
                            ? new Dictionary<string, object>() 
                            : JsonSerializer.Deserialize<Dictionary<string, object>>(argsJson);

                        aiPlan.ToolCalls.Add(new AiToolCall
                        {
                            ToolName = name ?? string.Empty,
                            Parameters = argsDict ?? new Dictionary<string, object>()
                        });
                    }
                }
            }

            return aiPlan;
        }
    }
}
