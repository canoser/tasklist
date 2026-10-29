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

                // E5: Sınırda Request Doğrulama (Cross-Field Check)
                if (req.Scores != null && req.Scores.Count > 0)
                {
                    foreach (var s in req.Scores)
                    {
                        if (s.QuestionCount.HasValue || s.Correct.HasValue || s.Wrong.HasValue || s.Blank.HasValue)
                        {
                            var qc = s.QuestionCount ?? 0;
                            var cor = s.Correct ?? 0;
                            var wr = s.Wrong ?? 0;
                            var bl = s.Blank ?? 0;
                            if (qc < 0 || cor < 0 || wr < 0 || bl < 0 || (cor + wr + bl != qc))
                            {
                                return Results.BadRequest(new { error = "Doğru, yanlış ve boş toplamı soru sayısına eşit olmalıdır.", code = "VALIDATION_ERROR" });
                            }
                        }
                    }
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
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { error = ex.Message, code = "VALIDATION_ERROR" });
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: 403);
                }
            });
        }
    }
}
