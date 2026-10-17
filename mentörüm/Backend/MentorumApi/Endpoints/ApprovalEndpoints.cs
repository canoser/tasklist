using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class ApprovalEndpoints
    {
        public static void MapApprovalEndpoints(this IEndpointRouteBuilder app)
        {
            var coachGroup = app.MapGroup("/api/v1").RequireAuthorization("RequireCoachRole");

            // GET /api/v1/programs/{programId}/approvals?status=PENDING
            coachGroup.MapGet("/programs/{programId:guid}/approvals", async (
                Guid programId,
                [FromQuery] string? status,
                [FromServices] ApprovalRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                try
                {
                    await guard.EnsureCoachInProgramAsync(coachId, programId);
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.Json(new { error = "Bu programa erişim yetkiniz yok." }, statusCode: 403);
                }

                var items = await repo.ListAsync(programId, status);
                return Results.Ok(items);
            });

            // POST /api/v1/approvals/{id}/approve
            coachGroup.MapPost("/approvals/{id:guid}/approve", async (
                Guid id,
                [FromServices] ApprovalRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                try
                {
                    await repo.ApproveAsync(id, coachId);
                    return Results.Ok(new { message = "Talep onaylandı." });
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: 403);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

            // POST /api/v1/approvals/{id}/reject
            coachGroup.MapPost("/approvals/{id:guid}/reject", async (
                Guid id,
                [FromBody] RejectApprovalRequest? req,
                [FromServices] ApprovalRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                try
                {
                    await repo.RejectAsync(id, coachId, req?.Reason);
                    return Results.Ok(new { message = "Talep reddedildi." });
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: 403);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });
        }
    }
}
