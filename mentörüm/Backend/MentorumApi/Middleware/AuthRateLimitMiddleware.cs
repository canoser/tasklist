using System.Security.Cryptography;
using System.Text;
using Dapper;
using MentorumApi.Data;

namespace MentorumApi.Middleware
{
    /// <summary>
    /// Kimlik doğrulama uçlarına (login/register/google) IP bazlı kalıcı hız sınırlama uygular.
    /// Sayaç veritabanında atomik upsert ile tutulur; çok istekte race condition oluşmaz.
    /// </summary>
    public class AuthRateLimitMiddleware
    {
        private static readonly string[] ProtectedPaths =
        {
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/google"
        };

        private const int WindowSeconds = 300;   // 5 dakika
        private const int MaxAttempts = 40;

        private readonly RequestDelegate _next;

        public AuthRateLimitMiddleware(RequestDelegate next) => _next = next;

        public async Task InvokeAsync(HttpContext context, DbConnectionFactory dbFactory)
        {
            if (context.Request.Method == HttpMethods.Post && IsProtected(context.Request.Path))
            {
                var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                var bucket = Hash("auth:" + ip);
                var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

                using var conn = dbFactory.CreateConnection();
                conn.Open();

                var attempts = await conn.ExecuteScalarAsync<int>(@"
                    INSERT INTO auth_attempts (bucket, window_start, attempts)
                    VALUES (@Bucket, @Now, 1)
                    ON CONFLICT (bucket) DO UPDATE SET
                        attempts = CASE WHEN auth_attempts.window_start > @Window THEN auth_attempts.attempts + 1 ELSE 1 END,
                        window_start = CASE WHEN auth_attempts.window_start > @Window THEN auth_attempts.window_start ELSE @Now END
                    RETURNING attempts",
                    new { Bucket = bucket, Now = now, Window = now - WindowSeconds });

                // Eski kovaları temizle (best-effort).
                await conn.ExecuteAsync(
                    "DELETE FROM auth_attempts WHERE window_start < @Cutoff",
                    new { Cutoff = now - (WindowSeconds * 2) });

                if (attempts > MaxAttempts)
                {
                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.Response.Headers.RetryAfter = "300";
                    await context.Response.WriteAsJsonAsync(new { error = "Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin." });
                    return;
                }
            }

            await _next(context);
        }

        private static bool IsProtected(PathString path)
        {
            foreach (var p in ProtectedPaths)
                if (path.Equals(p)) return true;
            return false;
        }

        private static string Hash(string value)
            => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }

    public static class AuthRateLimitMiddlewareExtensions
    {
        public static IApplicationBuilder UseAuthRateLimit(this IApplicationBuilder builder)
            => builder.UseMiddleware<AuthRateLimitMiddleware>();
    }
}
