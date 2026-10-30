using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetProgramsByCoachAsync(coachId.Value));
            });

            group.MapPost("/", async ([FromBody] CreateProgramRequest req, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                var p = await repo.GetProgramAsync(id, coachId.Value);
                return p == null ? Results.NotFound(new { error = "Program bulunamadı." }) : Results.Ok(p);
            });

            group.MapPut("/{id:guid}", async (Guid id, [FromBody] UpdateProgramRequest req, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                return await repo.UpdateProgramAsync(id, coachId.Value, req)
                    ? Results.Ok(new { message = "Güncellendi." })
                    : Results.NotFound(new { error = "Program bulunamadı veya yetkiniz yok." });
            });

            group.MapDelete("/{id:guid}", async (Guid id, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetProgramCoachesAsync(id, coachId.Value));
            });

            group.MapPost("/{id:guid}/coaches", async (Guid id, [FromBody] AddProgramCoachRequest req, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
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
                var adminId = user.GetUserId();
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
                var adminId = user.GetUserId();
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

            // B1: Koç için program denetim izi (Audit Logs)
            group.MapGet("/{id:guid}/audit-logs", async (
                Guid id,
                [FromQuery] int? limit,
                [FromServices] AuditLogRepository auditRepo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                if (!await guard.IsCoachInProgramAsync(coachId.Value, id))
                    return Results.Forbid();

                var logs = await auditRepo.GetByProgramAsync(id, limit ?? 100);
                return Results.Ok(logs);
            });

            // B6: Müfredat ilerleme özeti (alias)
            group.MapGet("/{id:guid}/curriculum/progress", async (
                Guid id,
                [FromQuery] Guid studentId,
                [FromServices] ProgramRepository programRepo,
                [FromServices] CurriculumRepository curriculumRepo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                var p = await programRepo.GetProgramAsync(id, coachId.Value);
                if (p == null) return Results.NotFound(new { error = "Program bulunamadı." });
                if (!await guard.IsStudentInProgramAsync(studentId, id))
                    return Results.Forbid();
                var progress = await curriculumRepo.GetStudentCurriculumAsync(studentId);
                return Results.Ok(progress);
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
                var adminId = user.GetUserId();
                if (adminId == null) return Results.Unauthorized();
                var role = req.Role == "Student" || req.Role == "Parent" || req.Role == "Coach" ? req.Role : "Coach";
                var ok = await repo.ApproveUserAsync(userId, role, req.MaxStudents, req.MaxTeachers, req.StorageQuotaMb, adminId.Value);
                return ok ? Results.Ok(new { message = "Kullanıcı onaylandı." }) : Results.NotFound(new { error = "Kullanıcı bulunamadı." });
            });

            admin.MapPost("/users/{userId:guid}/reject", async (Guid userId, [FromServices] ProgramRepository repo, ClaimsPrincipal user) =>
            {
                var adminId = user.GetUserId();
                if (adminId == null) return Results.Unauthorized();
                var ok = await repo.RejectUserAsync(userId);
                return ok ? Results.Ok(new { message = "Kullanıcı reddedildi." }) : Results.NotFound(new { error = "Kullanıcı bulunamadı." });
            });

            admin.MapPost("/users", async ([FromBody] AddUserRequest req, [FromServices] ProgramRepository repo, [FromServices] IEmailService emailService, ClaimsPrincipal user) =>
            {
                var adminId = user.GetUserId();
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
                [FromServices] ProgramRepository repo) =>
            {
                var newPassword = req.NewPassword?.Trim() ?? "";
                if (newPassword.Length < 6)
                    return Results.BadRequest(new { error = "Yeni şifre en az 6 karakter olmalı." });

                var hash = BCrypt.Net.BCrypt.HashPassword(newPassword);
                var ok = await repo.ChangeUserPasswordByAdminAsync(userId, hash);
                if (!ok)
                    return Results.NotFound(new { error = "Kullanıcı bulunamadı." });

                return Results.Ok(new { message = "Şifre güncellendi. Kullanıcının eski oturumları kapatıldı." });
            });

            // --- Güvenlik & Kota denetimi (süper yönetici) ---
            admin.MapGet("/rate-limits", async ([FromServices] RateLimitRepository repo) =>
                Results.Ok(new
                {
                    rules = await repo.GetRulesAsync(),
                    events = await repo.GetRecentEventsAsync(100)
                }));

            admin.MapPut("/rate-limits", async (
                [FromBody] UpdateRateLimitRequest req,
                [FromServices] RateLimitRepository repo,
                [FromServices] IMemoryCache cache,
                ClaimsPrincipal user) =>
            {
                if (string.IsNullOrWhiteSpace(req.Path))
                    return Results.BadRequest(new { error = "Endpoint yolu gerekli." });
                if (req.MaxAttempts < 0 || req.MaxAttempts > 1000)
                    return Results.BadRequest(new { error = "Limit 0-1000 arasında olmalı." });

                var adminId = user.GetUserId();
                var ok = await repo.UpdateRuleAsync(req.Path.Trim(), req.MaxAttempts, adminId);
                if (!ok)
                    return Results.NotFound(new { error = "Kural bulunamadı." });

                cache.Remove("rl_rule:" + req.Path.Trim());  // 30sn'lik önbelleği geçersiz kıl
                return Results.Ok(new { message = "Kural güncellendi." });
            });
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

    public class ApproveUserRequest
    {
        public string? Role { get; set; }   // Student / Parent / Coach
        public int? MaxStudents { get; set; }
        public int? MaxTeachers { get; set; }
        public int? StorageQuotaMb { get; set; }
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
