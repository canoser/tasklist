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
                    
                    // Sadece active olanları kontrol et
                    var isActive = await connection.QuerySingleOrDefaultAsync<int?>(
                        "SELECT is_active FROM users WHERE id = @Id", new { Id = userId });

                    if (isActive == null || isActive == 0)
                    {
                        context.Response.StatusCode = 401;
                        await context.Response.WriteAsJsonAsync(new { error = "Hesabınız pasif veya silinmiş." });
                        return; // Pipe'ı kes
                    }
                }
            }

            await _next(context);
        }
    }

    public static class JwtValidationMiddlewareExtensions
    {
        public static IApplicationBuilder UseJwtValidation(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<JwtValidationMiddleware>();
        }
    }
}
