using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class ProgramEndpoints
    {
        public static void MapProgramEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/programs").RequireAuthorization("RequireCoachRole");

            group.MapGet("/", async ([FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetProgramsByCoachAsync(coachId.Value));
            });

            group.MapPost("/", async ([FromBody] CreateProgramRequest req, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                try
                {
                    var id = await repo.CreateProgramAsync(coachId.Value, req);
                    return Results.Ok(new { id });
                }
                catch (InvalidOperationException ex) when (ex.Message == "PROGRAM_LIMIT_EXCEEDED")
                {
                    return Results.Conflict(new { error = "Program limiti aşıldı.", code = "PROGRAM_LIMIT_EXCEEDED" });
                }
            }).AddEndpointFilter<MentorumApi.Filters.IdempotencyFilter>();

            group.MapGet("/{id:guid}", async (Guid id, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var p = await repo.GetProgramAsync(id, coachId.Value);
                return p == null ? Results.NotFound(new { error = "Program bulunamadı." }) : Results.Ok(p);
            });

            group.MapPut("/{id:guid}", async (Guid id, [FromBody] UpdateProgramRequest req, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                return await repo.UpdateProgramAsync(id, coachId.Value, req)
                    ? Results.Ok(new { message = "Güncellendi." })
                    : Results.NotFound(new { error = "Program bulunamadı veya yetkiniz yok." });
            });

            group.MapDelete("/{id:guid}", async (Guid id, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var r = await repo.ArchiveProgramAsync(id, coachId.Value);
                return r switch
                {
                    "OK" => Results.Ok(new { message = "Program silindi/arşivlendi." }),
                    "FORBIDDEN" => Results.Forbid(),
                    _ => Results.NotFound(new { error = "Program bulunamadı." })
                };
            });

            group.MapGet("/{id:guid}/coaches", async (Guid id, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetProgramCoachesAsync(id, coachId.Value));
            });

            group.MapPost("/{id:guid}/coaches", async (Guid id, [FromBody] AddProgramCoachRequest req, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var r = await repo.AddCoachAsync(id, coachId.Value, req.CoachId);
                return r switch
                {
                    "OK" => Results.Ok(new { message = "Yardımcı koç eklendi." }),
                    "ALREADY_MEMBER" => Results.Conflict(new { error = "Koç zaten üye." }),
                    "COACH_NOT_FOUND" => Results.NotFound(new { error = "Koç bulunamadı." }),
                    "FORBIDDEN" => Results.Forbid(),
                    _ => Results.NotFound(new { error = "Program bulunamadı." })
                };
            });

            group.MapDelete("/{id:guid}/coaches/{coachId:guid}", async (Guid id, Guid coachId, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var adminId = GetCoachId(user);
                if (adminId == null) return Results.Unauthorized();
                var r = await repo.RemoveCoachAsync(id, adminId.Value, coachId);
                return r switch
                {
                    "OK" => Results.Ok(new { message = "Yardımcı koç çıkarıldı." }),
                    "CANNOT_REMOVE_ADMIN" => Results.BadRequest(new { error = "Yönetici çıkarılamaz." }),
                    "NOT_MEMBER" => Results.NotFound(new { error = "Koç üye değil." }),
                    "FORBIDDEN" => Results.Forbid(),
                    _ => Results.NotFound(new { error = "Program bulunamadı." })
                };
            });

            group.MapPost("/{id:guid}/transfer-admin", async (Guid id, [FromBody] TransferAdminRequest req, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var adminId = GetCoachId(user);
                if (adminId == null) return Results.Unauthorized();
                var r = await repo.TransferAdminAsync(id, adminId.Value, req.CoachId);
                return r switch
                {
                    "OK" => Results.Ok(new { message = "Yöneticilik devredildi." }),
                    "CONFLICT" => Results.Conflict(new { error = "Eşzamanlı işlem nedeniyle devir gerçekleştirilemedi. Lütfen tekrar deneyin." }),
                    "TARGET_NOT_ASSISTANT" => Results.BadRequest(new { error = "Hedef yardımcı koç değil." }),
                    "FORBIDDEN" => Results.Forbid(),
                    _ => Results.NotFound(new { error = "Program bulunamadı." })
                };
            });

            // --- Süper yönetici ---
            var admin = app.MapGroup("/api/v1/admin").RequireAuthorization("RequireAdminRole");

            admin.MapGet("/pending-coaches", async ([FromServices] ProgramRepository repo) =>
                Results.Ok(await repo.GetPendingCoachesAsync()));

            admin.MapPost("/coaches/{coachId:guid}/approve", async (Guid coachId, [FromBody] ApproveCoachRequest req, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var adminId = GetCoachId(user);
                if (adminId == null) return Results.Unauthorized();
                var ok = await repo.SetCoachApprovalAsync(coachId, "APPROVED", req.MaxPrograms, adminId.Value);
                return ok ? Results.Ok(new { message = "Koç onaylandı." }) : Results.NotFound(new { error = "Koç bulunamadı." });
            });

            admin.MapPost("/coaches/{coachId:guid}/reject", async (Guid coachId, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var adminId = GetCoachId(user);
                if (adminId == null) return Results.Unauthorized();
                var ok = await repo.SetCoachApprovalAsync(coachId, "REJECTED", null, adminId.Value);
                return ok ? Results.Ok(new { message = "Koç reddedildi." }) : Results.NotFound(new { error = "Koç bulunamadı." });
            });
        }

        private static Guid? GetCoachId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }

    public class ApproveCoachRequest
    {
        public int? MaxPrograms { get; set; }
    }
}

