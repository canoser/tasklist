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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachInProgramAsync(coachId.Value, programId);
                var items = await repo.ListAsync(programId, status);
                return Results.Ok(items);
            });

            // GET /api/v1/approvals — koçun TÜM programlarındaki onaylar (çok programlı toplulaştırma)
            coachGroup.MapGet("/approvals", async (
                [FromQuery] string? status,
                [FromServices] ApprovalRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                var items = await repo.ListForCoachAsync(coachId.Value, status);
                return Results.Ok(items);
            });

            // POST /api/v1/approvals/{id}/approve
            coachGroup.MapPost("/approvals/{id:guid}/approve", async (
                Guid id,
                [FromServices] ApprovalRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                try
                {
                    await repo.ApproveAsync(id, coachId.Value);
                    return Results.Ok(new { message = "Talep onaylandı." });
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                try
                {
                    await repo.RejectAsync(id, coachId.Value, req?.Reason);
                    return Results.Ok(new { message = "Talep reddedildi." });
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });
        }
    }
}
