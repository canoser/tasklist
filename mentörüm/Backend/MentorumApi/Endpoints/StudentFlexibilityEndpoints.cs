using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    /// <summary>V13: Öğrenci ekleme esnekliği (gölge profil) & bireysel/grup geçişi.</summary>
    public static class StudentFlexibilityEndpoints
    {
        public static void MapStudentFlexibilityEndpoints(this IEndpointRouteBuilder app)
        {
            // B0: V13.2 — path'siz öğrenci ekleme (varsayılan çalışma alanı auto-provision + öğrenci limiti)
            var studentRoot = app.MapGroup("/api/v1/students").RequireAuthorization("RequireCoachRole");
            studentRoot.MapPost("/", async (
                [FromBody] CreateStudentRequest req,
                [FromServices] StudentRepository repo,
                [FromServices] ProgramRepository programRepo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                var programId = await programRepo.EnsureDefaultWorkspaceAsync(coachId.Value);
                return await ExecuteCreateStudentAsync(programId, req, repo);
            });

            studentRoot.MapPut("/{studentId:guid}", async (
                Guid studentId,
                [FromBody] UpdateStudentRequest req,
                [FromServices] StudentRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, studentId);

                var ok = await repo.UpdateStudentAsync(studentId, req);
                return ok ? Results.Ok(new { message = "Öğrenci bilgileri güncellendi." }) : Results.NotFound(new { error = "Öğrenci bulunamadı." });
            });

            var group = app.MapGroup("/api/v1/programs/{programId:guid}/students").RequireAuthorization("RequireCoachRole");

            // B1: Öğrenci ekleme (e-postasız gölge profil destekli)
            group.MapPost("/", async (
                Guid programId,
                [FromBody] CreateStudentRequest req,
                [FromServices] StudentRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachInProgramAsync(coachId.Value, programId);
                return await ExecuteCreateStudentAsync(programId, req, repo);
            });

            // B2: Sonradan e-posta ile davet gönderme
            group.MapPost("/{studentId:guid}/invite", async (
                Guid programId,
                Guid studentId,
                [FromBody] InviteStudentRequest req,
                [FromServices] StudentRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.Email)) return Results.BadRequest(new { error = "E-posta gerekli." });

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, studentId);

                if (await repo.EmailExistsAsync(req.Email.ToLowerInvariant()))
                    return Results.BadRequest(new { error = "Bu e-posta zaten kullanımda." });

                var invite = await repo.InviteStudentAsync(programId, studentId, req.Email);
                return invite == null
                    ? Results.NotFound(new { error = "Öğrenci bu programda bulunamadı." })
                    : Results.Ok(new { code = invite.Value.Code, expiresAt = invite.Value.ExpiresAt });
            });

            // B3: Bireyselden gruba taşı
            group.MapPost("/{studentId:guid}/move-to-group", async (
                Guid programId,
                Guid studentId,
                [FromBody] MoveToGroupRequest req,
                [FromServices] StudentRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, studentId);

                var ok = await repo.MoveToGroupAsync(programId, studentId, req.GroupId);
                return ok
                    ? Results.Ok(new { message = "Öğrenci gruba taşındı." })
                    : Results.BadRequest(new { error = "Grup bulunamadı." });
            });

            // B4: Gruptan bireysele çek
            group.MapPost("/{studentId:guid}/move-to-individual", async (
                Guid programId,
                Guid studentId,
                [FromServices] StudentRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, studentId);

                await repo.MoveToIndividualAsync(programId, studentId);
                return Results.Ok(new { message = "Öğrenci bireysel koçluğa çekildi." });
            });
        }

        private static async Task<IResult> ExecuteCreateStudentAsync(Guid programId, CreateStudentRequest req, StudentRepository repo)
        {
            if (string.IsNullOrWhiteSpace(req.FirstName) || string.IsNullOrWhiteSpace(req.LastName))
                return Results.BadRequest(new { error = "Ad ve soyad zorunludur." });

            if (!string.IsNullOrWhiteSpace(req.Email) && await repo.EmailExistsAsync(req.Email.ToLowerInvariant()))
                return Results.BadRequest(new { error = "Bu e-posta zaten kullanımda." });

            try
            {
                var studentId = await repo.CreateStudentAsync(programId, req);
                return Results.Ok(new { studentId });
            }
            catch (InvalidOperationException ex) when (ex.Message == "STUDENT_LIMIT_EXCEEDED")
            {
                return Results.Conflict(new { error = "Öğrenci limiti aşıldı.", code = "STUDENT_LIMIT_EXCEEDED" });
            }
        }
    }
}
