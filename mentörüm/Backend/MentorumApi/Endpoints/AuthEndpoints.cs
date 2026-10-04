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
                        INSERT INTO coaches (id, plan_type) 
                        VALUES (@Id, 'free')", 
                        new { Id = userId }, tx);

                    tx.Commit();
                }
                catch
                {
                    tx.Rollback();
                    throw;
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

                using var conn = db.CreateConnection();
                var user = await conn.QuerySingleOrDefaultAsync<User>(
                    "SELECT id, email, google_id, role, full_name, avatar_url, is_active, created_at, updated_at FROM users WHERE email = @Email", new { Email = payload.Email });

                if (user == null)
                {
                    // Yeni google kullanıcısı (Varsayılan Koç)
                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        Email = payload.Email,
                        GoogleId = payload.Subject,
                        Role = "Coach",
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
                        
                        await conn.ExecuteAsync(@"
                            INSERT INTO coaches (id, plan_type) 
                            VALUES (@Id, 'free')", 
                            new { Id = user.Id }, tx);
                        
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
