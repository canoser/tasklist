using MentorumApi.Data;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class ReportsEndpoints
    {
        public static void MapReportsEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/reports").RequireAuthorization("RequireCoachRole");

            group.MapGet("/overview", async (
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

                var report = await repo.GetOverviewReportAsync(userId);
                return Results.Ok(report);
            });

            group.MapGet("/students/{id:guid}", async (
                Guid id,
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

                var report = await repo.GetStudentReportAsync(userId, id);
                if (report == null) return Results.NotFound(new { error = "Öğrenci bulunamadı veya size ait değil." });

                return Results.Ok(report);
            });
        }
    }
}
