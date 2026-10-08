using MentorumApi.Data;
using Dapper;
using System.Security.Claims;

namespace MentorumApi.Middleware
{
    public class JwtValidationMiddleware
    {
        private readonly RequestDelegate _next;
        // DbConnectionFactory singleton veya transient olarak configure edilecek
        // Middleware transient çalışması için IServiceProvider veya constructor'dan alınabilir.

        public JwtValidationMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, DbConnectionFactory dbFactory)
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var userIdString = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(userIdString, out Guid userId))
                {
                    // Cache mekanizması eklenebilir, şimdilik direkt db
                    using var connection = dbFactory.CreateConnection();
                    
                    // Aktiflik + onay durumunu tek sorguda kontrol et
                    var status = await connection.QuerySingleOrDefaultAsync<UserAuthStatus>(
                        "SELECT is_active AS IsActive, approval_status AS ApprovalStatus FROM users WHERE id = @Id", new { Id = userId });

                    if (status == null || status.IsActive == 0)
                    {
                        context.Response.StatusCode = 401;
                        await context.Response.WriteAsJsonAsync(new { error = "Hesabınız pasif veya silinmiş." });
                        return; // Pipe'ı kes
                    }

                    // Onay kontrolü (tüm roller için zorunlu)
                    if (status.ApprovalStatus == "PENDING")
                    {
                        context.Response.StatusCode = 403;
                        await context.Response.WriteAsJsonAsync(new { error = "Onay bekleniyor.", code = "PENDING_APPROVAL" });
                        return; // Pipe'ı kes
                    }
                    if (status.ApprovalStatus == "REJECTED")
                    {
                        context.Response.StatusCode = 403;
                        await context.Response.WriteAsJsonAsync(new { error = "Başvurunuz reddedildi.", code = "COACH_REJECTED" });
                        return; // Pipe'ı kes
                    }
                }
            }

            await _next(context);
        }
    }

    /// <summary>Kullanıcının aktiflik + onay durumu (per-request kontrol için).</summary>
    public class UserAuthStatus
    {
        public int IsActive { get; set; }
        public string ApprovalStatus { get; set; } = "";
    }

    public static class JwtValidationMiddlewareExtensions
    {
        public static IApplicationBuilder UseJwtValidation(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<JwtValidationMiddleware>();
        }
    }
}
