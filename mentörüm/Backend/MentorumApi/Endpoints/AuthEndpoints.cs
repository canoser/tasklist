using Dapper;
using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Models;
using MentorumApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace MentorumApi.Endpoints
{
    public static class AuthEndpoints
    {
        public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/auth");

            group.MapPost("/register", async (
                [FromBody] RegisterRequest req, 
                [FromServices] DbConnectionFactory db,
                [FromServices] JwtService jwt,
                HttpContext ctx) => 
            {
                if (string.IsNullOrEmpty(req.Email) || string.IsNullOrEmpty(req.Password))
                    return Results.BadRequest(new { error = "Eksik bilgi" });

                using var conn = db.CreateConnection();
                var exists = await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM users WHERE email = @Email", new { Email = req.Email.ToLower() });
                if (exists > 0)
                    return Results.Conflict(new { error = "Bu e-posta zaten kullanımda." });

                var userId = Guid.NewGuid();
                var user = new User 
                {
                    Id = userId,
                    Email = req.Email.ToLower(),
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                    Role = "Coach",
                    FullName = req.FullName,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                conn.Open();
                using var tx = conn.BeginTransaction();
                try 
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO users (id, email, password_hash, role, full_name, created_at, updated_at) 
                        VALUES (@Id, @Email, @PasswordHash, @Role, @FullName, @CreatedAt, @UpdatedAt)", 
                        user, tx);
                    
                    await conn.ExecuteAsync(@"
                        INSERT INTO coaches (id, plan_type, approval_status) 
                        VALUES (@Id, 'free', 'PENDING')", 
                        new { Id = userId }, tx);

                    tx.Commit();
                }
                catch
                {
                    tx.Rollback();
                    throw;
                }

                                if (user.Role == "Coach")
                {
                    var approval = await conn.ExecuteScalarAsync<string>("SELECT approval_status FROM coaches WHERE id = @Id", new { user.Id });
                    if (approval == "PENDING") return Results.Ok(new { pendingApproval = true, code = "COACH_PENDING" });
                    if (approval == "REJECTED") return Results.Json(new { error = "Basvurunuz reddedildi.", code = "COACH_REJECTED" }, statusCode: 403);
                }
var token = jwt.GenerateAccessToken(user);
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
                    AccessToken = token,
                    RefreshToken = null,
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName }
                });
            });

            group.MapPost("/login", async (
                [FromBody] LoginRequest req,
                [FromServices] DbConnectionFactory db,
                [FromServices] JwtService jwt,
                HttpContext ctx) =>
            {
                using var conn = db.CreateConnection();
                var user = await conn.QuerySingleOrDefaultAsync<User>(
                    "SELECT id, email, password_hash, google_id, role, full_name, avatar_url, is_active, created_at, updated_at FROM users WHERE email = @Email AND is_active = 1", new { Email = req.Email.ToLower() });

                if (user == null || user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                    return Results.Unauthorized();

                                if (user.Role == "Coach")
                {
                    var approval = await conn.ExecuteScalarAsync<string>("SELECT approval_status FROM coaches WHERE id = @Id", new { user.Id });
                    if (approval == "PENDING") return Results.Json(new { error = "Onay bekleniyor.", code = "COACH_PENDING" }, statusCode: 403);
                    if (approval == "REJECTED") return Results.Json(new { error = "Basvurunuz reddedildi.", code = "COACH_REJECTED" }, statusCode: 403);
                }
var token = jwt.GenerateAccessToken(user);
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
                    AccessToken = token,
                    RefreshToken = null,
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, AvatarUrl = user.AvatarUrl }
                });
            });

            group.MapPost("/refresh", async (
                [FromBody] RefreshRequest req,
                [FromServices] DbConnectionFactory db,
                [FromServices] JwtService jwt,
                HttpContext ctx) => 
            {
                var inputToken = req.RefreshToken ?? ctx.Request.Cookies["refresh_token"];
                if (string.IsNullOrEmpty(inputToken)) return Results.Unauthorized();

                using var conn = db.CreateConnection();
                
                var tokenRecord = await conn.QuerySingleOrDefaultAsync<RefreshTokenQueryModel>(
                    "SELECT user_id AS UserId, expires_at AS ExpiresAt FROM refresh_tokens WHERE token = @Token AND is_revoked = 0", 
                    new { Token = inputToken });

                if (tokenRecord == null || tokenRecord.ExpiresAt < DateTime.UtcNow)
                    return Results.Unauthorized();

                var user = await conn.QuerySingleOrDefaultAsync<User>(
                    "SELECT id, email, google_id, role, full_name, avatar_url, is_active, created_at, updated_at FROM users WHERE id = @Id AND is_active = 1", new { Id = tokenRecord.UserId });
                
                if (user == null) return Results.Unauthorized();

                var newAccessToken = jwt.GenerateAccessToken(user);
                var newRefreshToken = jwt.GenerateRefreshToken();

                // Revoke old
                await conn.ExecuteAsync("UPDATE refresh_tokens SET is_revoked = 1 WHERE token = @Token", new { Token = inputToken });

                // Insert new
                await conn.ExecuteAsync(@"
                    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
                    VALUES (@Id, @UserId, @Token, @ExpiresAt)",
                    new { Id = Guid.NewGuid(), UserId = user.Id, Token = newRefreshToken, ExpiresAt = DateTime.UtcNow.AddDays(7) });

                ctx.Response.Cookies.Append("refresh_token", newRefreshToken, new CookieOptions {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTimeOffset.UtcNow.AddDays(7)
                });

                return Results.Ok(new AuthResponse
                {
                    AccessToken = newAccessToken,
                    RefreshToken = null,
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, AvatarUrl = user.AvatarUrl }
                });
            });

            group.MapPost("/google", async (
                [FromBody] GoogleLoginRequest req,
                [FromServices] DbConnectionFactory db,
                [FromServices] JwtService jwt,
                [FromServices] GoogleAuthService googleAuth,
                HttpContext ctx) => 
            {
                var payload = await googleAuth.VerifyGoogleTokenAsync(req.IdToken);
                if (payload == null) return Results.Unauthorized();
                if (payload.EmailVerified != true || string.IsNullOrEmpty(payload.Email)) return Results.Unauthorized();
                var email = payload.Email.ToLowerInvariant();

                using var conn = db.CreateConnection();
                var user = await conn.QuerySingleOrDefaultAsync<User>(
                    "SELECT id, email, google_id, role, full_name, avatar_url, is_active, created_at, updated_at FROM users WHERE email = @Email", new { Email = email });

                if (user == null)
                {
                    // Öğretmen daveti var mı? (Google ile öğretmen kaydı)
                    var teacherInvite = await conn.QuerySingleOrDefaultAsync<InviteQueryModel>(
                        "SELECT id AS Id, related_id AS RelatedId FROM invite_tokens WHERE email = @Email AND role = 'Teacher' AND is_used = 0 AND expires_at > NOW() LIMIT 1",
                        new { Email = email });

                    // Yeni google kullanıcısı (davet varsa Teacher, yoksa Koç)
                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        Email = email,
                        GoogleId = payload.Subject,
                        Role = teacherInvite != null && teacherInvite.RelatedId != null ? "Teacher" : "Coach",
                        FullName = payload.Name ?? "Google User",
                        AvatarUrl = payload.Picture,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    if (conn.State != System.Data.ConnectionState.Open) conn.Open();
                    using var tx = conn.BeginTransaction();
                    try
                    {
                        await conn.ExecuteAsync(@"
                            INSERT INTO users (id, email, google_id, role, full_name, avatar_url, created_at, updated_at) 
                            VALUES (@Id, @Email, @GoogleId, @Role, @FullName, @AvatarUrl, @CreatedAt, @UpdatedAt)", 
                            user, tx);
                        
                        if (teacherInvite != null && teacherInvite.RelatedId != null)
                        {
                            await conn.ExecuteAsync(@"
                                INSERT INTO teachers (id, program_id)
                                VALUES (@Id, @ProgramId)",
                                new { Id = user.Id, ProgramId = teacherInvite.RelatedId }, tx);

                            await conn.ExecuteAsync(@"
                                INSERT INTO program_teachers (id, program_id, teacher_id)
                                VALUES (gen_random_uuid(), @ProgramId, @Id)",
                                new { ProgramId = teacherInvite.RelatedId, Id = user.Id }, tx);

                            var inviteClaimed = await conn.ExecuteAsync("UPDATE invite_tokens SET is_used = 1 WHERE id = @Id AND is_used = 0", new { Id = teacherInvite.Id }, tx);
                            if (inviteClaimed == 0) { tx.Rollback(); return Results.Conflict(new { error = "Davet zaten kullanıldı." }); }
                        }
                        else
                        {
                            await conn.ExecuteAsync(@"
                                INSERT INTO coaches (id, plan_type, approval_status)
                                VALUES (@Id, 'free', 'PENDING')",
                                new { Id = user.Id }, tx);
                        }
                        
                        tx.Commit();
                    }
                    catch
                    {
                        tx.Rollback();
                        throw;
                    }
                }
                else if (user.IsActive == 0)
                {
                    return Results.Unauthorized();
                }
                else if (string.IsNullOrEmpty(user.GoogleId))
                {
                    // Existing user logged in with Google, link accounts
                    user.GoogleId = payload.Subject;
                    if (conn.State != System.Data.ConnectionState.Open) conn.Open();
                    await conn.ExecuteAsync("UPDATE users SET google_id = @GoogleId, updated_at = @UpdatedAt WHERE id = @Id", 
                        new { GoogleId = user.GoogleId, UpdatedAt = DateTime.UtcNow, Id = user.Id });
                }

                                if (user.Role == "Coach")
                {
                    var approval = await conn.ExecuteScalarAsync<string>("SELECT approval_status FROM coaches WHERE id = @Id", new { user.Id });
                    if (approval == "PENDING") return Results.Json(new { error = "Onay bekleniyor.", code = "COACH_PENDING" }, statusCode: 403);
                    if (approval == "REJECTED") return Results.Json(new { error = "Basvurunuz reddedildi.", code = "COACH_REJECTED" }, statusCode: 403);
                }
var token = jwt.GenerateAccessToken(user);
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
                    AccessToken = token,
                    RefreshToken = null,
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, AvatarUrl = user.AvatarUrl }
                });
            });
        }
    }
}

public class RefreshTokenQueryModel
{
    public Guid UserId { get; set; }
    public DateTime ExpiresAt { get; set; }
}
