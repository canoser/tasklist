using Dapper;
using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
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

            admin.MapGet("/users", async (
                [FromServices] ProgramRepository repo, 
                [FromQuery] string? role, 
                [FromQuery] string? search) =>
                Results.Ok(await repo.GetAllUsersForAdminAsync(role, search)));

            admin.MapGet("/pending-approvals", async ([FromServices] ProgramRepository repo) =>
                Results.Ok(await repo.GetPendingApprovalsAsync()));

            admin.MapPost("/users/{userId:guid}/approve", async (Guid userId, [FromBody] ApproveUserRequest req, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var adminId = GetCoachId(user);
                if (adminId == null) return Results.Unauthorized();
                var role = req.Role == "Student" || req.Role == "Parent" || req.Role == "Coach" ? req.Role : "Coach";
                var ok = await repo.ApproveUserAsync(userId, role, req.MaxPrograms, adminId.Value);
                return ok ? Results.Ok(new { message = "Kullanıcı onaylandı." }) : Results.NotFound(new { error = "Kullanıcı bulunamadı." });
            });

            admin.MapPost("/users/{userId:guid}/reject", async (Guid userId, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var adminId = GetCoachId(user);
                if (adminId == null) return Results.Unauthorized();
                var ok = await repo.RejectUserAsync(userId);
                return ok ? Results.Ok(new { message = "Kullanıcı reddedildi." }) : Results.NotFound(new { error = "Kullanıcı bulunamadı." });
            });

            admin.MapPost("/users", async ([FromBody] AddUserRequest req, [FromServices] ProgramRepository repo, [FromServices] IEmailService emailService, ClaimsPrincipal user) =>
            {
                var adminId = GetCoachId(user);
                if (adminId == null) return Results.Unauthorized();
                if (string.IsNullOrEmpty(req.Email) || string.IsNullOrEmpty(req.FullName))
                    return Results.BadRequest(new { error = "Eksik bilgi" });
                var role = req.Role == "Student" || req.Role == "Parent" ? req.Role : "Coach";
                var password = GenerateRandomPassword();
                var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
                var email = req.Email.ToLowerInvariant();
                var r = await repo.AddUserByAdminAsync(email, req.FullName, passwordHash, role);
                if (r != "OK")
                    return Results.Conflict(new { error = "Bu e-posta zaten kullanımda." });

                await emailService.SendWelcomeEmailAsync(email, role, password);

                return Results.Ok(new { message = "Kullanıcı eklendi.", email, password });
            });

            // Süper yönetici herhangi bir kullanıcının şifresini değiştirir (eski oturumlar kapatılır).
            admin.MapPost("/users/{userId:guid}/password", async (
                Guid userId,
                [FromBody] AdminChangePasswordRequest req,
                [FromServices] DbConnectionFactory db) =>
            {
                var newPassword = req.NewPassword?.Trim() ?? "";
                if (newPassword.Length < 6)
                    return Results.BadRequest(new { error = "Yeni şifre en az 6 karakter olmalı." });

                using var conn = db.CreateConnection();
                conn.Open();
                var exists = await conn.ExecuteScalarAsync<int>("SELECT 1 FROM users WHERE id = @Id", new { Id = userId });
                if (exists == 0)
                    return Results.NotFound(new { error = "Kullanıcı bulunamadı." });

                var hash = BCrypt.Net.BCrypt.HashPassword(newPassword);
                using var tx = conn.BeginTransaction();
                try
                {
                    await conn.ExecuteAsync(
                        "UPDATE users SET password_hash = @Hash WHERE id = @Id",
                        new { Hash = hash, Id = userId }, tx);
                    // Güvenlik: kullanıcının mevcut oturumlarını/refresh token'larını iptal et.
                    await conn.ExecuteAsync(
                        "UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = @Id AND is_revoked = 0",
                        new { Id = userId }, tx);
                    tx.Commit();
                }
                catch { tx.Rollback(); throw; }

                return Results.Ok(new { message = "Şifre güncellendi. Kullanıcının eski oturumları kapatıldı." });
            });
        }

        private static Guid? GetCoachId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        private static string GenerateRandomPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
            var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            var bytes = new byte[12];
            rng.GetBytes(bytes);
            var sb = new System.Text.StringBuilder(12);
            foreach (var b in bytes) sb.Append(chars[b % chars.Length]);
            return sb.ToString();
        }
    }

    public class ApproveCoachRequest
    {
        public int? MaxPrograms { get; set; }
    }

    public class ApproveUserRequest
    {
        public string? Role { get; set; }   // Student / Parent / Coach
        public int? MaxPrograms { get; set; }
    }

    public class AddUserRequest
    {
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? Role { get; set; }
    }

    public class AdminChangePasswordRequest
    {
        public string? NewPassword { get; set; }
    }
}

