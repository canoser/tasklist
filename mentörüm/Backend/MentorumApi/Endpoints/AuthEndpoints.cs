using Microsoft.Extensions.Caching.Memory;
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
                [FromServices] AuthRepository repo,
                [FromServices] JwtService jwt,
                HttpContext ctx) =>
            {
                if (string.IsNullOrEmpty(req.Email) || string.IsNullOrEmpty(req.Password) || string.IsNullOrEmpty(req.FullName))
                    return Results.BadRequest(new { error = "Eksik bilgi" });

                var email = req.Email.ToLowerInvariant();
                // Self-registration yalnızca koç hesabı oluşturur.
                // Öğrenci/Veli/Öğretmen rolleri davet akışı üzerinden gelir (rol yükseltme/IDOR önlemi).
                var role = "Coach";
                var isAdmin = IsSuperAdminEmail(email);

                if (await repo.EmailExistsAsync(email))
                    return Results.Conflict(new { error = "Bu e-posta zaten kullanımda." });

                var user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                    Role = role,
                    FullName = req.FullName,
                    IsAdmin = isAdmin,
                    ApprovalStatus = isAdmin ? "APPROVED" : "PENDING",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await repo.RegisterCoachAsync(user, isAdmin);

                // Süper yönetici → otomatik giriş; diğerleri onay bekler
                if (!isAdmin)
                    return Results.Ok(new { pendingApproval = true, code = "PENDING_APPROVAL" });

                var token = jwt.GenerateAccessToken(user);
                var refreshToken = jwt.GenerateRefreshToken();

                await repo.InsertRefreshTokenAsync(user.Id, HashRefreshToken(refreshToken), DateTime.UtcNow.AddDays(7));
                AppendRefreshTokenCookie(ctx, refreshToken);

                return Results.Ok(new AuthResponse
                {
                    AccessToken = token,
                    RefreshToken = null,
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, IsAdmin = user.IsAdmin }
                });
            });

            group.MapPost("/login", async (
                [FromBody] LoginRequest req,
                [FromServices] AuthRepository repo,
                [FromServices] JwtService jwt,
                HttpContext ctx) =>
            {
                var user = await repo.GetActiveUserByEmailAsync(req.Email.ToLowerInvariant());

                if (user == null || user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                    return Results.Unauthorized();

                if (IsSuperAdminEmail(user.Email) && !user.IsAdmin)
                {
                    user.IsAdmin = true;
                    user.ApprovalStatus = "APPROVED";
                    await repo.PromoteSuperAdminAsync(user.Id);
                }

                if (user.ApprovalStatus == "PENDING")
                    return Results.Json(new { error = "Onay bekleniyor.", code = "PENDING_APPROVAL" }, statusCode: 403);
                if (user.ApprovalStatus == "REJECTED")
                    return Results.Json(new { error = "Basvurunuz reddedildi.", code = "COACH_REJECTED" }, statusCode: 403);

                var token = jwt.GenerateAccessToken(user);
                var refreshToken = jwt.GenerateRefreshToken();

                await repo.InsertRefreshTokenAsync(user.Id, HashRefreshToken(refreshToken), DateTime.UtcNow.AddDays(7));
                AppendRefreshTokenCookie(ctx, refreshToken);

                return Results.Ok(new AuthResponse
                {
                    AccessToken = token,
                    RefreshToken = null,
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, AvatarUrl = user.AvatarUrl, IsAdmin = user.IsAdmin }
                });
            });

            group.MapPost("/refresh", async (
                [FromBody] RefreshRequest req,
                [FromServices] AuthRepository repo,
                [FromServices] JwtService jwt,
                HttpContext ctx) =>
            {
                var inputToken = req.RefreshToken ?? ctx.Request.Cookies["refresh_token"];
                if (string.IsNullOrEmpty(inputToken)) return Results.Unauthorized();

                var tokenHash = HashRefreshToken(inputToken);
                var tokenRecord = await repo.GetValidRefreshTokenAsync(tokenHash, inputToken);

                if (tokenRecord == null || tokenRecord.ExpiresAt < DateTime.UtcNow)
                    return Results.Unauthorized();

                var user = await repo.GetActiveUserByIdAsync(tokenRecord.UserId);
                if (user == null) return Results.Unauthorized();

                if (user.ApprovalStatus == "PENDING")
                    return Results.Json(new { error = "Onay bekleniyor.", code = "PENDING_APPROVAL" }, statusCode: 403);
                if (user.ApprovalStatus == "REJECTED")
                    return Results.Json(new { error = "Başvurunuz reddedildi.", code = "COACH_REJECTED" }, statusCode: 403);

                var newAccessToken = jwt.GenerateAccessToken(user);
                var newRefreshToken = jwt.GenerateRefreshToken();

                var rotated = await repo.RotateRefreshTokenAsync(
                    user.Id, tokenHash, inputToken, HashRefreshToken(newRefreshToken), DateTime.UtcNow.AddDays(7));
                if (!rotated)
                    return Results.Unauthorized();

                AppendRefreshTokenCookie(ctx, newRefreshToken);

                return Results.Ok(new AuthResponse
                {
                    AccessToken = newAccessToken,
                    RefreshToken = null,
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, AvatarUrl = user.AvatarUrl, IsAdmin = user.IsAdmin }
                });
            });

            group.MapPost("/logout", async (HttpContext ctx, [FromServices] AuthRepository repo) =>
            {
                var inputToken = ctx.Request.Cookies["refresh_token"];
                if (!string.IsNullOrEmpty(inputToken))
                {
                    await repo.RevokeRefreshTokenAsync(HashRefreshToken(inputToken), inputToken);
                }
                ctx.Response.Cookies.Delete("refresh_token", new CookieOptions { HttpOnly = true, Secure = true, SameSite = SameSiteMode.Strict, Path = "/" });
                return Results.Ok(new { message = "Çıkış yapıldı" });
            });

            group.MapPost("/google", async (
                [FromBody] GoogleLoginRequest req,
                [FromServices] AuthRepository repo,
                [FromServices] JwtService jwt,
                [FromServices] GoogleAuthService googleAuth,
                HttpContext ctx) =>
            {
                var payload = await googleAuth.VerifyGoogleTokenAsync(req.IdToken);
                if (payload == null) return Results.Unauthorized();
                if (payload.EmailVerified != true || string.IsNullOrEmpty(payload.Email)) return Results.Unauthorized();
                var email = payload.Email.ToLowerInvariant();
                var isAdmin = IsSuperAdminEmail(email);

                var (user, conflictInviteUsed, inactive) = await repo.GetOrCreateGoogleUserAsync(
                    email, payload.Subject, payload.Name, payload.Picture, isAdmin);

                if (conflictInviteUsed)
                    return Results.Conflict(new { error = "Davet zaten kullanıldı." });
                if (inactive || user == null)
                    return Results.Unauthorized();

                if (IsSuperAdminEmail(user.Email) && !user.IsAdmin)
                {
                    user.IsAdmin = true;
                    user.ApprovalStatus = "APPROVED";
                    await repo.PromoteSuperAdminAsync(user.Id);
                }

                if (user.ApprovalStatus == "PENDING")
                    return Results.Json(new { error = "Onay bekleniyor.", code = "PENDING_APPROVAL" }, statusCode: 403);
                if (user.ApprovalStatus == "REJECTED")
                    return Results.Json(new { error = "Basvurunuz reddedildi.", code = "COACH_REJECTED" }, statusCode: 403);

                var token = jwt.GenerateAccessToken(user);
                var refreshToken = jwt.GenerateRefreshToken();

                await repo.InsertRefreshTokenAsync(user.Id, HashRefreshToken(refreshToken), DateTime.UtcNow.AddDays(7));
                AppendRefreshTokenCookie(ctx, refreshToken);

                return Results.Ok(new AuthResponse
                {
                    AccessToken = token,
                    RefreshToken = null,
                    User = new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, FullName = user.FullName, AvatarUrl = user.AvatarUrl, IsAdmin = user.IsAdmin }
                });
            });

            group.MapPost("/forgot-password", async (
                [FromBody] ForgotPasswordRequest req,
                [FromServices] AuthRepository repo,
                [FromServices] IEmailService emailService,
                [FromServices] IMemoryCache cache) =>
            {
                if (string.IsNullOrEmpty(req.Email)) return Results.BadRequest(new { error = "Eksik bilgi" });
                var email = req.Email.ToLowerInvariant();

                // Basit rate-limit: aynı e-posta için 5 dakikada en fazla 1 sıfırlama e-postası (kota koruması).
                var rateKey = $"forgot_pw_{email}";
                if (cache.TryGetValue(rateKey, out _))
                    return Results.Ok(new { message = "Eğer e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi." });
                cache.Set(rateKey, true, TimeSpan.FromMinutes(5));

                var token = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
                var created = await repo.CreatePasswordResetTokenAsync(email, token);
                if (!created)
                    return Results.Ok(new { message = "Eğer e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi." });

                var baseUrl = (Environment.GetEnvironmentVariable("APP_BASE_URL") ?? "https://mentorum.dersmatris.com").TrimEnd('/');
                var resetLink = $"{baseUrl}/reset-password?token={token}";
                await emailService.SendPasswordResetEmailAsync(email, resetLink);

                return Results.Ok(new { message = "Eğer e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi." });
            });

            group.MapPost("/reset-password", async ([FromBody] ResetPasswordRequest req, [FromServices] AuthRepository repo) =>
            {
                if (string.IsNullOrEmpty(req.Token) || string.IsNullOrEmpty(req.NewPassword))
                    return Results.BadRequest(new { error = "Eksik bilgi" });

                var hash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
                var ok = await repo.ResetPasswordWithTokenAsync(req.Token, hash);
                if (!ok)
                    return Results.BadRequest(new { error = "Geçersiz veya süresi dolmuş bağlantı." });

                return Results.Ok(new { message = "Şifreniz güncellendi. Giriş yapabilirsiniz." });
            });

            // --- Kimlik ucu (tüm roller) — koç profili vb. (Aşama 5) ---
            var meGroup = app.MapGroup("/api/v1/me").RequireAuthorization();
            meGroup.MapGet("/", async ([FromServices] AuthRepository repo, HttpContext ctx) =>
            {
                var id = ctx.User.GetUserId();
                if (id == null) return Results.Unauthorized();

                var meDto = await repo.GetMeAsync(id.Value);
                return meDto == null ? Results.Unauthorized() : Results.Ok(meDto);
            });

            // Koç profilini (biyografi + uzmanlık) güncelle
            meGroup.MapPatch("/profile", async ([FromBody] UpdateCoachProfileRequest req, [FromServices] AuthRepository repo, HttpContext ctx) =>
            {
                var id = ctx.User.GetUserId();
                if (id == null) return Results.Unauthorized();

                var ok = await repo.UpdateCoachProfileAsync(id.Value, req.Bio, req.Specialty);
                if (!ok) return Results.NotFound(new { error = "Koç profili bulunamadı." });
                return Results.Ok(new { message = "Profil güncellendi." });
            });

            // Şifre oluştur / değiştir — Google ile girmiş kullanıcılar dahil (e-posta+şifre ile giriş yedeklemesi)
            meGroup.MapPost("/password", async ([FromBody] SetPasswordRequest req, [FromServices] AuthRepository repo, HttpContext ctx) =>
            {
                var id = ctx.User.GetUserId();
                if (id == null) return Results.Unauthorized();

                var hash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
                await repo.SetPasswordAsync(id.Value, hash);

                return Results.Ok(new { message = "Şifreniz oluşturuldu. Artık e-posta ve şifre ile de giriş yapabilirsiniz." });
            });

            // Tema tercihi (açık/koyu mod + stil) — tüm roller
            meGroup.MapPut("/theme", async ([FromBody] UpdateThemeRequest req, [FromServices] AuthRepository repo, HttpContext ctx) =>
            {
                var id = ctx.User.GetUserId();
                if (id == null) return Results.Unauthorized();

                var mode = req.ThemeMode == "dark" ? "dark" : "light";
                var style = new[] { "classic", "nature", "ocean", "cyber", "formal" }.Contains(req.ThemeStyle) ? req.ThemeStyle! : "classic";

                await repo.UpdateThemeAsync(id.Value, mode, style);

                return Results.Ok(new { message = "Tema güncellendi." });
            });
        }

        private static void AppendRefreshTokenCookie(HttpContext ctx, string refreshToken)
        {
            ctx.Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });
        }

        private static string HashRefreshToken(string rawToken)
        {
            var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken));
            return Convert.ToHexStringLower(bytes);
        }

        private static bool IsSuperAdminEmail(string email)
        {
            var configured = Environment.GetEnvironmentVariable("SUPER_ADMIN_EMAILS");
            if (string.IsNullOrWhiteSpace(configured))
                return false;
            foreach (var e in configured.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                if (e.Equals(email, StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }
    }
}
