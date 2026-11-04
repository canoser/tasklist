using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class ReportsEndpoints
    {
        public static void MapReportsEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/reports").RequireAuthorization("RequireCoachRole");
            var sharedGroup = app.MapGroup("/api/v1/reports").RequireAuthorization();

            group.MapGet("/overview", async (
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                var report = await repo.GetOverviewReportAsync(userId.Value);
                return Results.Ok(report);
            });

            group.MapGet("/students/{id:guid}", async (
                Guid id,
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                var report = await repo.GetStudentReportAsync(userId.Value, id);
                if (report == null) return Results.NotFound(new { error = "Öğrenci bulunamadı veya size ait değil." });

                return Results.Ok(report);
            });

            group.MapGet("/detail", async (
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                return Results.Ok(await repo.GetDetailReportAsync(userId.Value));
            });

            group.MapGet("/cohort-by-grade", async (
                [FromQuery] int? grade,
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                var cohorts = await repo.GetCohortByGradeAsync(userId.Value, grade);
                return Results.Ok(cohorts);
            });

            sharedGroup.MapGet("/students/{id:guid}/grade-report", async (
                Guid id,
                [FromQuery] int? grade,
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                var role = user.FindFirst(ClaimTypes.Role)?.Value ?? user.FindFirst("role")?.Value;
                var (canView, canEditTargets) = await repo.CheckStudentReportAccessAsync(userId.Value, role, id);
                if (!canView) return Results.Forbid();

                var report = await repo.GetStudentGradeReportAsync(id, grade, canEditTargets);
                if (report == null) return Results.NotFound(new { error = "Öğrenci bulunamadı." });

                return Results.Ok(report);
            });

            sharedGroup.MapPut("/students/{id:guid}/subject-targets", async (
                Guid id,
                [FromBody] UpsertSubjectTargetsRequest req,
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                var role = user.FindFirst(ClaimTypes.Role)?.Value ?? user.FindFirst("role")?.Value;
                var (canView, canEditTargets) = await repo.CheckStudentReportAccessAsync(userId.Value, role, id);
                if (!canView || !canEditTargets)
                    return Results.Json(new { error = "Bu öğrencinin ders hedeflerini düzenleme yetkiniz yok." }, statusCode: 403);

                await repo.UpsertSubjectTargetsAsync(id, req.Grade, req.Targets ?? new(), string.Equals(role, "Coach", StringComparison.OrdinalIgnoreCase) ? "Coach" : "Student");
                return Results.Ok(new { message = "Ders bazlı hedef netler kaydedildi." });
            });
        }
    }
}
