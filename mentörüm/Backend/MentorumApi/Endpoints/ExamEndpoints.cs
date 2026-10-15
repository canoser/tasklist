using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
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
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                // Merkezi IDOR kontrolü: koç yalnızca kendi programındaki öğrenciye sınav girebilir.
                try
                {
                    await guard.EnsureCoachOwnsStudentAsync(coachId, req.StudentId);
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.NotFound(new { error = "Öğrenci bulunamadı veya yetkiniz yok." });
                }

                var examId = await repo.CreateExamResultAsync(coachId, req);
                return Results.Ok(new { examId });
            });
        }
    }
}
