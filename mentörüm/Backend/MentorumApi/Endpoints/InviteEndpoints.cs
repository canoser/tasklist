using System.Security.Claims;
using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace MentorumApi.Endpoints
{
    public static class InviteEndpoints
    {
        public static void MapInviteEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/invites");

            // Koç davet gönderir
            group.MapPost("/send", async (
                [FromBody] InviteRequest req,
                [FromServices] InviteRepository repo,
                [FromServices] IEmailService emailService,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                if (!string.IsNullOrWhiteSpace(req.Role))
                {
                    req.Role = req.Role.Trim().ToUpperInvariant() switch
                    {
                        "STUDENT" => "Student",
                        "PARENT" => "Parent",
                        "TEACHER" => "Teacher",
                        "COACH" => "Coach",
                        _ => req.Role.Trim()
                    };
                }

                if (req.Role != "Student" && req.Role != "Parent" && req.Role != "Teacher" && req.Role != "Coach")
                    return Results.BadRequest(new { error = "Geçersiz rol. Student, Parent, Teacher veya Coach olabilir." });

                if (req.Role == "Parent")
                {
                    if (req.RelatedId == null) return Results.BadRequest(new { error = "Veli daveti için öğrenci ID gerekli." });
                    if (!await repo.CanCoachInviteParentAsync(coachId.Value, req.RelatedId.Value))
                        return Results.BadRequest(new { error = "Öğrenci bulunamadı veya yetkiniz yok." });
                }
                else // Student, Teacher, Coach → related_id = program_id
                {
                    if (req.RelatedId == null) return Results.BadRequest(new { error = "Davet için program ID gerekli." });
                    if (!await repo.IsCoachProgramAdminAsync(coachId.Value, req.RelatedId.Value))
                        return Results.BadRequest(new { error = "Program bulunamadı veya yönetici değilsiniz." });
                }

                // V13.2: öğretmen limiti kontrolü (program sahibi koçun limiti)
                if (req.Role == "Teacher" && req.RelatedId != null)
                {
                    if (await repo.IsTeacherLimitExceededAsync(req.RelatedId.Value))
                        return Results.Conflict(new { error = "Öğretmen limiti aşıldı.", code = "TEACHER_LIMIT_EXCEEDED" });
                }

                var emailLower = req.Email.ToLowerInvariant();
                var existingUser = await repo.GetUserByEmailAsync(emailLower);

                if (existingUser != null)
                {
                    if (req.Role == "Student" && existingUser.Role == "Student")
                    {
                        var existingProgramId = await repo.GetStudentProgramIdAsync(existingUser.Id);

                        if (existingProgramId != null)
                        {
                            if (existingProgramId.Value != req.RelatedId)
                            {
                                return Results.Conflict(new
                                {
                                    error = "Bu öğrenci şu anda aktif başka bir koçluk veya okul programına kayıtlıdır. Transfer işlemi için sistem yöneticisine başvurunuz."
                                });
                            }
                            // Aynı programda zaten kayıtlı: şifre sıfırlama için yeni davet oluştur (re-invite) → aşağıda token üretilir.
                        }
                        else
                        {
                            // Yalnızca sisteme önceden kaydolmuş ama henüz hiçbir programa bağlanmamış öğrenci eklenebilir
                            await repo.AddExistingStudentToProgramAsync(existingUser.Id, req.RelatedId!.Value);

                            return Results.Ok(new
                            {
                                message = $"'{existingUser.FullName}' adlı öğrenci programa başarıyla eklendi.",
                                directAdded = true
                            });
                        }
                    }
                    else if (req.Role == "Parent" && existingUser.Role == "Parent")
                    {
                        // Mevcut veli için 2. öğrenci daveti: Conflict fırlatma, davet akışına devam et (token üretilir)
                    }
                    else
                    {
                        return Results.Conflict(new { error = $"Bu e-posta sistemde farklı bir rol ({existingUser.Role}) ile zaten kayıtlı." });
                    }
                }

                var token = Guid.NewGuid();
                var code = InviteCode.Generate();
                var expiresAt = DateTime.UtcNow.AddHours(48); // Kısa geçerlilik: 48 saat
                var inviteLink = $"https://mentorum.dersmatris.com/invite/{code}";

                await repo.CreateInviteTokenAsync(token, code, emailLower, req.Role, req.RelatedId, expiresAt);

                if (req.SendEmail)
                {
                    await emailService.SendInviteEmailAsync(emailLower, code, inviteLink, req.Role);
                }

                return Results.Ok(new { message = req.SendEmail ? "Davet oluşturuldu ve e-posta gönderildi." : "Davet başarıyla oluşturuldu.", code, link = inviteLink, expiresAt, emailed = req.SendEmail });
            }).RequireAuthorization("RequireCoachRole")
                .AddEndpointFilter<MentorumApi.Filters.IdempotencyFilter>(); // Sadece koç davet atabilir; idempotency

            // Koçun programlarına ait bekleyen davetleri listele (Öğrenci + Veli davetleri)
            group.MapGet("/pending", async (
                [FromServices] InviteRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                var pending = await repo.GetPendingInvitesForCoachAsync(coachId.Value);
                return Results.Ok(pending);
            }).RequireAuthorization("RequireCoachRole");

            // Davet detayını görüntüle (token validasyonu)
            group.MapGet("/{token}", async (
                string token,
                [FromServices] InviteRepository repo) =>
            {
                var invite = await repo.GetInviteByCodeAsync(token);
                if (invite == null)
                    return Results.NotFound(new { error = "Davet bulunamadı." });
                if (invite.IsUsed == 1)
                    return Results.BadRequest(new { error = "Bu davet zaten kullanılmış." });
                if (invite.ExpiresAt < DateTime.UtcNow)
                    return Results.BadRequest(new { error = "Bu davetin süresi dolmuş." });

                return Results.Ok(new { email = invite.Email, role = invite.Role });
            });

            // Daveti kabul et ve şifre belirleyip kayıt ol
            group.MapPost("/{token}/accept", async (
                string token,
                [FromBody] InviteAcceptRequest req,
                [FromServices] InviteRepository repo,
                [FromServices] JwtService jwt,
                HttpContext ctx) =>
            {
                var invite = await repo.GetInviteByCodeAsync(token);
                if (invite == null || invite.IsUsed == 1 || invite.ExpiresAt < DateTime.UtcNow)
                    return Results.BadRequest(new { error = "Geçersiz, kullanılmış veya süresi dolmuş davet." });

                if (invite.Role == "Student" && invite.RelatedId == null)
                    return Results.BadRequest(new { error = "Öğrenci davetinde koç bilgisi eksik." });

                var refreshToken = jwt.GenerateRefreshToken();
                var (user, alreadyUsed) = await repo.AcceptInviteAsync(invite, req, refreshToken);
                if (alreadyUsed || user == null)
                    return Results.BadRequest(new { error = "Bu davet zaten kullanılmış." });

                var tokenStr = jwt.GenerateAccessToken(user);

                ctx.Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTimeOffset.UtcNow.AddDays(7)
                });

                return Results.Ok(new AuthResponse
                {
                    AccessToken = tokenStr,
                    RefreshToken = null,
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName }
                });
            });
        }
    }
}
