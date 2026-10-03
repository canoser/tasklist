using System.Security.Cryptography;
using Dapper;
using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Models;
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
                [FromServices] DbConnectionFactory db,
                [FromServices] EmailService emailService,
                System.Security.Claims.ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                if (req.Role != "Student" && req.Role != "Parent")
                    return Results.BadRequest(new { error = "Geçersiz rol. Sadece Student veya Parent davet edilebilir." });

                using var conn = db.CreateConnection();
                
                if (req.Role == "Parent")
                {
                    if (req.RelatedId == null) return Results.BadRequest(new { error = "Veli daveti için öğrenci ID gerekli." });
                    var studentOwned = await conn.QuerySingleOrDefaultAsync<int?>(
                        "SELECT 1 FROM students WHERE id = @RelatedId AND coach_id = @CoachId",
                        new { req.RelatedId, CoachId = coachId });
                    if (studentOwned == null) return Results.BadRequest(new { error = "Öğrenci bulunamadı veya yetkiniz yok." });
                }
                else if (req.Role == "Student")
                {
                    req.RelatedId = coachId;
                }

                var exists = await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM users WHERE email = @Email", new { req.Email });
                if (exists > 0)
                    return Results.Conflict(new { error = "Bu e-posta sistemde zaten kayıtlı." });

                var token = Guid.NewGuid();
                var code = InviteCode.Generate();
                var expiresAt = DateTime.UtcNow.AddHours(48); // Kısa geçerlilik: 48 saat
                var inviteLink = $"https://mentorum.dersmatris.com/invite/{code}";
                
                await conn.ExecuteAsync(@"
                    INSERT INTO invite_tokens (id, token, code, email, role, related_id, expires_at)
                    VALUES (@Id, @Token, @Code, @Email, @Role, @RelatedId, @ExpiresAt)",
                    new { 
                        Id = Guid.NewGuid(), 
                        Token = token, 
                        Code = code,
                        Email = req.Email.ToLower(), 
                        Role = req.Role, 
                        RelatedId = req.RelatedId,
                        ExpiresAt = expiresAt 
                    });

                await emailService.SendInviteEmailAsync(req.Email, req.Role, code, inviteLink);
                return Results.Ok(new { message = "Davet başarıyla oluşturuldu.", code, link = inviteLink, expiresAt });
            }).RequireAuthorization("RequireCoachRole"); // Sadece koç davet atabilir

            // Davet detayını görüntüle (token validasyonu)
            group.MapGet("/{token}", async (
                string token,
                [FromServices] DbConnectionFactory db) =>
            {
                var invite = await GetInviteByCodeAsync(db, token);
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
                [FromServices] DbConnectionFactory db,
                [FromServices] JwtService jwt,
                HttpContext ctx) =>
            {
                var invite = await GetInviteByCodeAsync(db, token);
                if (invite == null || invite.IsUsed == 1 || invite.ExpiresAt < DateTime.UtcNow)
                    return Results.BadRequest(new { error = "Geçersiz, kullanılmış veya süresi dolmuş davet." });

                using var conn = db.CreateConnection();
                conn.Open(); // Transaction için bağlantı açık olmalı

                var userId = Guid.NewGuid();
                var user = new User 
                {
                    Id = userId,
                    Email = invite.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                    Role = invite.Role,
                    FullName = req.FullName,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                using var tx = conn.BeginTransaction();
                try 
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO users (id, email, password_hash, role, full_name, created_at, updated_at) 
                        VALUES (@Id, @Email, @PasswordHash, @Role, @FullName, @CreatedAt, @UpdatedAt)", 
                        user, tx);

                    if (user.Role == "Student")
                    {
                        // Öğrenci olarak kaydedildi. Daveti atan CoachId = RelatedId olabilir
                        await conn.ExecuteAsync(@"
                            INSERT INTO students (id, coach_id, is_active) 
                            VALUES (@Id, @CoachId, 1)", 
                            new { Id = userId, CoachId = invite.RelatedId }, tx);
                    }
                    else if (user.Role == "Parent")
                    {
                        await conn.ExecuteAsync("INSERT INTO parents (id) VALUES (@Id)", new { Id = userId }, tx);
                        
                        // Öğrenci - Veli ilişkisini kur
                        if (invite.RelatedId != null)
                        {
                            await conn.ExecuteAsync(@"
                                INSERT INTO student_parents (id, student_id, parent_id, parent_email, is_accepted)
                                VALUES (@Id, @StudentId, @ParentId, @ParentEmail, 1)",
                                new { Id = Guid.NewGuid(), StudentId = invite.RelatedId, ParentId = userId, ParentEmail = user.Email }, tx);
                        }
                    }

                    // Token'ı kullanıldı işaretle
                    await conn.ExecuteAsync("UPDATE invite_tokens SET is_used = 1 WHERE id = @Id", new { Id = invite.Id }, tx);
                    tx.Commit();
                }
                catch
                {
                    tx.Rollback();
                    throw;
                }

                var tokenStr = jwt.GenerateAccessToken(user);
                var refreshToken = jwt.GenerateRefreshToken();

                await conn.ExecuteAsync(@"
                    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
                    VALUES (@Id, @UserId, @Token, @ExpiresAt)",
                    new { Id = Guid.NewGuid(), UserId = user.Id, Token = refreshToken, ExpiresAt = DateTime.UtcNow.AddDays(7) });

                ctx.Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions {
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

        // Daveti koda göre getirir (normalize + sorgu). Bulunamazsa null döner.
        private static async Task<InviteQueryModel?> GetInviteByCodeAsync(DbConnectionFactory db, string token)
        {
            using var conn = db.CreateConnection();
            var code = InviteCode.Normalize(token);
            return await conn.QuerySingleOrDefaultAsync<InviteQueryModel>(
                "SELECT id AS Id, email AS Email, role AS Role, related_id AS RelatedId, expires_at AS ExpiresAt, is_used AS IsUsed FROM invite_tokens WHERE code = @Code",
                new { Code = code });
        }
    }
}

public class InviteQueryModel
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? RelatedId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int IsUsed { get; set; }
}

internal static class InviteCode
{
    // Crockford Base32: 0-9 + A-Z (I, L, O, U hariç) — karıştırılabilir karakter yok
    private const string Alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

    public static string Generate(int length = 12)
    {
        var chars = new char[length];
        for (int i = 0; i < length; i++)
            chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        return new string(chars);
    }

    public static string Normalize(string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return string.Empty;
        var sb = new System.Text.StringBuilder();
        foreach (var c in code)
        {
            if (c == '-' || c == ' ') continue;
            sb.Append(char.ToUpperInvariant(c));
        }
        return sb.ToString();
    }
}
