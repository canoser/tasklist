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

                if (!req.StudentId.HasValue && !req.GroupId.HasValue)
                {
                    return Results.BadRequest(new { error = "Öğrenci veya Grup seçilmelidir." });
                }

                // Merkezi IDOR kontrolü: koç yalnızca kendi programındaki öğrenciye veya gruba sınav girebilir.
                try
                {
                    if (req.StudentId.HasValue)
                    {
                        await guard.EnsureCoachOwnsStudentAsync(coachId, req.StudentId.Value);
                    }
                    var examId = await repo.CreateExamResultAsync(coachId, req);
                    return Results.Ok(new { examId });
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: 403);
                }
            });
        }
    }
}
