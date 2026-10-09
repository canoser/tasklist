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
                if (string.IsNullOrEmpty(req.Email) || string.IsNullOrEmpty(req.Password) || string.IsNullOrEmpty(req.FullName))
                    return Results.BadRequest(new { error = "Eksik bilgi" });

                var email = req.Email.ToLowerInvariant();
                var role = req.Role ?? "Coach";
                if (role != "Coach" && role != "Student" && role != "Parent")
                    role = "Coach";

                var isAdmin = IsSuperAdminEmail(email);

                using var conn = db.CreateConnection();
                var exists = await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM users WHERE email = @Email", new { Email = email });
                if (exists > 0)
                    return Results.Conflict(new { error = "Bu e-posta zaten kullanımda." });

                var userId = Guid.NewGuid();
                var user = new User 
                {
                    Id = userId,
                    Email = email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                    Role = role,
                    FullName = req.FullName,
                    IsAdmin = isAdmin,
                    ApprovalStatus = isAdmin ? "APPROVED" : "PENDING",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                conn.Open();
                using var tx = conn.BeginTransaction();
                try 
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, created_at, updated_at) 
                        VALUES (@Id, @Email, @PasswordHash, @Role, @FullName, @IsAdmin, @ApprovalStatus, @CreatedAt, @UpdatedAt)", 
                        user, tx);
                    
                    if (role == "Coach")
                    {
                        await conn.ExecuteAsync(@"
                            INSERT INTO coaches (id, plan_type, approval_status) 
                            VALUES (@Id, 'free', @Approval)", 
                            new { Id = userId, Approval = isAdmin ? "APPROVED" : "PENDING" }, tx);
                    }

                    tx.Commit();
                }
                catch
                {
                    tx.Rollback();
                    throw;
                }

                // Süper yönetici → otomatik giriş; diğerleri onay bekler
                if (!isAdmin)
                    return Results.Ok(new { pendingApproval = true, code = "PENDING_APPROVAL" });

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
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, IsAdmin = user.IsAdmin }
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
                    "SELECT id AS Id, email AS Email, password_hash AS PasswordHash, google_id AS GoogleId, role AS Role, full_name AS FullName, avatar_url AS AvatarUrl, is_active AS IsActive, is_admin AS IsAdmin, approval_status AS ApprovalStatus, created_at AS CreatedAt, updated_at AS UpdatedAt FROM users WHERE email = @Email AND is_active = 1", new { Email = req.Email.ToLowerInvariant() });

                if (user == null || user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                    return Results.Unauthorized();

                if (IsSuperAdminEmail(user.Email) && !user.IsAdmin)
                {
                    user.IsAdmin = true;
                    user.ApprovalStatus = "APPROVED";
                    await conn.ExecuteAsync("UPDATE users SET is_admin = TRUE, approval_status = 'APPROVED' WHERE id = @Id", new { user.Id });
                }

                if (user.ApprovalStatus == "PENDING")
                    return Results.Json(new { error = "Onay bekleniyor.", code = "PENDING_APPROVAL" }, statusCode: 403);
                if (user.ApprovalStatus == "REJECTED")
                    return Results.Json(new { error = "Basvurunuz reddedildi.", code = "COACH_REJECTED" }, statusCode: 403);
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
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, AvatarUrl = user.AvatarUrl, IsAdmin = user.IsAdmin }
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
                    "SELECT id AS Id, email AS Email, google_id AS GoogleId, role AS Role, full_name AS FullName, avatar_url AS AvatarUrl, is_active AS IsActive, is_admin AS IsAdmin, approval_status AS ApprovalStatus FROM users WHERE id = @Id AND is_active = 1", new { Id = tokenRecord.UserId });
                
                if (user == null) return Results.Unauthorized();

                if (user.ApprovalStatus == "PENDING")
                    return Results.Json(new { error = "Onay bekleniyor.", code = "PENDING_APPROVAL" }, statusCode: 403);
                if (user.ApprovalStatus == "REJECTED")
                    return Results.Json(new { error = "Başvurunuz reddedildi.", code = "COACH_REJECTED" }, statusCode: 403);

                var newAccessToken = jwt.GenerateAccessToken(user);
                var newRefreshToken = jwt.GenerateRefreshToken();

                if (conn.State != System.Data.ConnectionState.Open) conn.Open();
                using var tx = conn.BeginTransaction();
                try
                {
                    // Revoke old
                    var affected = await conn.ExecuteAsync("UPDATE refresh_tokens SET is_revoked = 1 WHERE token = @Token AND is_revoked = 0", new { Token = inputToken }, tx);
                    if (affected == 0)
                    {
                        tx.Rollback();
                        return Results.Unauthorized();
                    }

                    // Insert new
                    await conn.ExecuteAsync(@"
                        INSERT INTO refresh_tokens (id, user_id, token, expires_at)
                        VALUES (@Id, @UserId, @Token, @ExpiresAt)",
                        new { Id = Guid.NewGuid(), UserId = user.Id, Token = newRefreshToken, ExpiresAt = DateTime.UtcNow.AddDays(7) }, tx);

                    tx.Commit();
                }
                catch
                {
                    tx.Rollback();
                    throw;
                }

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
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, AvatarUrl = user.AvatarUrl, IsAdmin = user.IsAdmin }
                });
            });

            group.MapPost("/logout", async (HttpContext ctx, [FromServices] DbConnectionFactory db) => 
            {
                var inputToken = ctx.Request.Cookies["refresh_token"];
                if (!string.IsNullOrEmpty(inputToken))
                {
                    using var conn = db.CreateConnection();
                    await conn.ExecuteAsync("UPDATE refresh_tokens SET is_revoked = 1 WHERE token = @Token", new { Token = inputToken });
                }
                ctx.Response.Cookies.Delete("refresh_token", new CookieOptions { HttpOnly = true, Secure = true, SameSite = SameSiteMode.Strict, Path = "/" });
                return Results.Ok(new { message = "Çıkış yapıldı" });
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
                var isAdmin = IsSuperAdminEmail(email);

                using var conn = db.CreateConnection();
                var user = await conn.QuerySingleOrDefaultAsync<User>(
                    "SELECT id AS Id, email AS Email, google_id AS GoogleId, role AS Role, full_name AS FullName, avatar_url AS AvatarUrl, is_active AS IsActive, is_admin AS IsAdmin, approval_status AS ApprovalStatus, created_at AS CreatedAt, updated_at AS UpdatedAt FROM users WHERE email = @Email", new { Email = email });

                if (user == null)
                {
                    // Geçerli davet var mı? (Google ile tüm roller: Student/Parent/Teacher/Coach)
                    var validInvite = await conn.QuerySingleOrDefaultAsync<InviteQueryModel>(
                        "SELECT id AS Id, role AS Role, related_id AS RelatedId FROM invite_tokens WHERE email = @Email AND is_used = 0 AND expires_at > NOW() LIMIT 1",
                        new { Email = email });

                    // Yeni google kullanıcısı (davet varsa davetteki rol, yoksa Koç)
                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        Email = email,
                        GoogleId = payload.Subject,
                        Role = validInvite?.Role ?? "Coach",
                        FullName = payload.Name ?? "Google User",
                        AvatarUrl = payload.Picture,
                        IsAdmin = isAdmin,
                        ApprovalStatus = (isAdmin || validInvite != null) ? "APPROVED" : "PENDING",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    if (conn.State != System.Data.ConnectionState.Open) conn.Open();
                    using var tx = conn.BeginTransaction();
                    try
                    {
                        await conn.ExecuteAsync(@"
                            INSERT INTO users (id, email, google_id, role, full_name, avatar_url, is_admin, approval_status, created_at, updated_at) 
                            VALUES (@Id, @Email, @GoogleId, @Role, @FullName, @AvatarUrl, @IsAdmin, @ApprovalStatus, @CreatedAt, @UpdatedAt)", 
                            user, tx);
                        
                        if (validInvite != null)
                        {
                            if (user.Role == "Student")
                            {
                                await conn.ExecuteAsync(@"
                                    INSERT INTO students (id, program_id, is_active)
                                    VALUES (@Id, @ProgramId, 1)",
                                    new { Id = user.Id, ProgramId = validInvite.RelatedId }, tx);
                            }
                            else if (user.Role == "Parent")
                            {
                                await conn.ExecuteAsync("INSERT INTO parents (id) VALUES (@Id)", new { Id = user.Id }, tx);
                                if (validInvite.RelatedId != null)
                                {
                                    await conn.ExecuteAsync(@"
                                        INSERT INTO student_parents (id, student_id, parent_id, parent_email, is_accepted)
                                        VALUES (gen_random_uuid(), @StudentId, @ParentId, @ParentEmail, 1)",
                                        new { StudentId = validInvite.RelatedId, ParentId = user.Id, ParentEmail = user.Email }, tx);
                                }
                            }
                            else if (user.Role == "Teacher")
                            {
                                await conn.ExecuteAsync(@"
                                    INSERT INTO teachers (id, program_id, is_active)
                                    VALUES (@Id, @ProgramId, 1)",
                                    new { Id = user.Id, ProgramId = validInvite.RelatedId }, tx);

                                await conn.ExecuteAsync(@"
                                    INSERT INTO program_teachers (id, program_id, teacher_id)
                                    VALUES (gen_random_uuid(), @ProgramId, @Id)",
                                    new { ProgramId = validInvite.RelatedId, Id = user.Id }, tx);
                            }
                            else if (user.Role == "Coach")
                            {
                                await conn.ExecuteAsync(@"
                                    INSERT INTO coaches (id, plan_type, approval_status, max_programs)
                                    VALUES (@Id, 'free', 'APPROVED', 0)",
                                    new { Id = user.Id }, tx);

                                await conn.ExecuteAsync(@"
                                    INSERT INTO program_coaches (id, program_id, coach_id, role)
                                    VALUES (gen_random_uuid(), @ProgramId, @CoachId, 'YARDIMCI')",
                                    new { ProgramId = validInvite.RelatedId, CoachId = user.Id }, tx);
                            }

                            var inviteClaimed = await conn.ExecuteAsync("UPDATE invite_tokens SET is_used = 1 WHERE id = @Id AND is_used = 0", new { Id = validInvite.Id }, tx);
                            if (inviteClaimed == 0) { tx.Rollback(); return Results.Conflict(new { error = "Davet zaten kullanıldı." }); }
                        }
                        else
                        {
                            await conn.ExecuteAsync(@"
                                INSERT INTO coaches (id, plan_type, approval_status)
                                VALUES (@Id, 'free', @Approval)",
                                new { Id = user.Id, Approval = isAdmin ? "APPROVED" : "PENDING" }, tx);
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

                if (IsSuperAdminEmail(user.Email) && !user.IsAdmin)
                {
                    user.IsAdmin = true;
                    user.ApprovalStatus = "APPROVED";
                    await conn.ExecuteAsync("UPDATE users SET is_admin = TRUE, approval_status = 'APPROVED' WHERE id = @Id", new { user.Id });
                }

                if (user.ApprovalStatus == "PENDING")
                    return Results.Json(new { error = "Onay bekleniyor.", code = "PENDING_APPROVAL" }, statusCode: 403);
                if (user.ApprovalStatus == "REJECTED")
                    return Results.Json(new { error = "Basvurunuz reddedildi.", code = "COACH_REJECTED" }, statusCode: 403);
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
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, AvatarUrl = user.AvatarUrl, IsAdmin = user.IsAdmin }
                });
            });
            group.MapPost("/forgot-password", async ([FromBody] ForgotPasswordRequest req, [FromServices] DbConnectionFactory db, [FromServices] IEmailService emailService) =>
            {
                if (string.IsNullOrEmpty(req.Email)) return Results.BadRequest(new { error = "Eksik bilgi" });
                var email = req.Email.ToLowerInvariant();

                using var conn = db.CreateConnection();
                var userId = await conn.QuerySingleOrDefaultAsync<Guid?>("SELECT id FROM users WHERE email = @Email AND is_active = 1", new { Email = email });
                // E-posta numaralandırma önlemi: kullanıcı yoksa bile aynı mesajı dön
                if (userId == null)
                    return Results.Ok(new { message = "Eğer e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi." });

                var token = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
                await conn.ExecuteAsync(@"
                    INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
                    VALUES (gen_random_uuid(), @UserId, @Token, NOW() + interval '1 hour')",
                    new { UserId = userId.Value, Token = token });

                var baseUrl = (Environment.GetEnvironmentVariable("APP_BASE_URL") ?? "https://mentorum.dersmatris.com").TrimEnd('/');
                var resetLink = $"{baseUrl}/reset-password?token={token}";
                await emailService.SendPasswordResetEmailAsync(email, resetLink);

                return Results.Ok(new { message = "Eğer e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi." });
            });

            group.MapPost("/reset-password", async ([FromBody] ResetPasswordRequest req, [FromServices] DbConnectionFactory db) =>
            {
                if (string.IsNullOrEmpty(req.Token) || string.IsNullOrEmpty(req.NewPassword))
                    return Results.BadRequest(new { error = "Eksik bilgi" });

                using var conn = db.CreateConnection();
                var userId = await conn.QuerySingleOrDefaultAsync<Guid?>(@"
                    SELECT user_id FROM password_reset_tokens
                    WHERE token = @Token AND is_used = FALSE AND expires_at > NOW()",
                    new { Token = req.Token });

                if (userId == null)
                    return Results.BadRequest(new { error = "Geçersiz veya süresi dolmuş bağlantı." });

                var hash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
                await conn.ExecuteAsync("UPDATE users SET password_hash = @Hash WHERE id = @Id", new { Hash = hash, Id = userId.Value });
                await conn.ExecuteAsync("UPDATE password_reset_tokens SET is_used = TRUE WHERE token = @Token", new { Token = req.Token });

                return Results.Ok(new { message = "Şifreniz güncellendi. Giriş yapabilirsiniz." });
            });

            // --- Kimlik ucu (tüm roller) — koç profili vb. (Aşama 5) ---
            var meGroup = app.MapGroup("/api/v1/me").RequireAuthorization();
            meGroup.MapGet("/", async ([FromServices] DbConnectionFactory db, HttpContext ctx) =>
            {
                var idStr = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(idStr, out var id)) return Results.Unauthorized();

                using var conn = db.CreateConnection();
                var meDto = await conn.QuerySingleOrDefaultAsync<UserDto>(@"
                    SELECT id AS Id, email AS Email, role AS Role, full_name AS FullName, avatar_url AS AvatarUrl, is_admin AS IsAdmin
                    FROM users WHERE id = @Id AND is_active = 1",
                    new { Id = id });

                return meDto == null ? Results.Unauthorized() : Results.Ok(meDto);
            });

        }

        private static bool IsSuperAdminEmail(string email)
        {
            var list = (Environment.GetEnvironmentVariable("SUPER_ADMIN_EMAILS") ?? "canoser@gmail.com,canoser@hotmail.com")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var e in list)
                if (e.Equals(email, StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }
    }
}

public class RefreshTokenQueryModel
{
    public Guid UserId { get; set; }
    public DateTime ExpiresAt { get; set; }
}
