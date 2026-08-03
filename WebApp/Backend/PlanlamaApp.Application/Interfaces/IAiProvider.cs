using PlanlamaApp.Application.DTOs;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IAiProvider
    {
        Task<AiPlanResponse> GeneratePlanAsync(AiPlanRequest request, string systemPrompt);
    }
}
