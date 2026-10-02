using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class ExamEndpoints
    {
        public static void MapExamEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/exams").RequireAuthorization("RequireCoachRole");

            group.MapPost("/", async (
                [FromBody] CreateExamResultRequest req,
                [FromServices] ExamRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var examId = await repo.CreateExamResultAsync(coachId, req);
                return Results.Ok(new { examId });
            });
        }
    }
}
