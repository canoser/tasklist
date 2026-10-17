using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using Dapper;
using MentorumApi.Data;
using Microsoft.Extensions.Caching.Memory;

namespace MentorumApi.Middleware
{
    /// <summary>
    /// Kimlik doğrulama ve e-posta gönderen uçlara IP bazlı kalıcı hız sınırlama uygular.
    /// Sayaç veritabanında atomik upsert ile tutulur; çok istekte race condition oluşmaz.
    /// </summary>
    public class AuthRateLimitMiddleware
    {
        // Varsayılan limitler (DB'de kural yoksa veya DB erişilemezse kullanılır).
        private static readonly Dictionary<string, int> DefaultLimits = new(StringComparer.Ordinal)
        {
            ["/api/v1/auth/login"] = 40,
            ["/api/v1/auth/register"] = 40,
            ["/api/v1/auth/google"] = 40,
            ["/api/v1/invites/send"] = 20   // e-posta (Resend) kotası koruması
        };

        private const int WindowSeconds = 300;   // 5 dakika

        private readonly RequestDelegate _next;

        public AuthRateLimitMiddleware(RequestDelegate next) => _next = next;

        public async Task InvokeAsync(HttpContext context, DbConnectionFactory dbFactory, IMemoryCache cache)
        {
            var path = context.Request.Path.Value ?? string.Empty;
            var maxAttempts = context.Request.Method == HttpMethods.Post
                ? await GetLimitAsync(cache, dbFactory, path)
                : 0;

            if (maxAttempts > 0)
            {
                var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                var bucket = Hash("rl:" + path + ":" + ip);
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

                if (attempts > maxAttempts)
                {
                    // Kota ihlalini günlüğe yaz (admin paneli denetimi).
                    try
                    {
                        await conn.ExecuteAsync(@"
                            INSERT INTO rate_limit_events (id, path, ip, attempts, created_at)
                            VALUES (gen_random_uuid(), @Path, @Ip, @Attempts, NOW())",
                            new { Path = path, Ip = ip, Attempts = attempts });
                    }
                    catch { /* günlük başarısız olsa bile isteği reddet */ }

                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.Response.Headers.RetryAfter = "300";
                    await context.Response.WriteAsJsonAsync(new { error = "Çok fazla istek. Lütfen birkaç dakika sonra tekrar deneyin." });
                    return;
                }
            }

            await _next(context);
        }

        private async Task<int> GetLimitAsync(IMemoryCache cache, DbConnectionFactory dbFactory, string path)
        {
            if (!DefaultLimits.ContainsKey(path)) return 0;

            var key = "rl_rule:" + path;
            if (cache.TryGetValue(key, out int cached)) return cached;

            var limit = DefaultLimits[path];
            try
            {
                using var conn = dbFactory.CreateConnection();
                var dbLimit = await conn.ExecuteScalarAsync<int?>(
                    "SELECT max_attempts FROM rate_limit_rules WHERE path = @Path",
                    new { Path = path });
                if (dbLimit.HasValue && dbLimit.Value >= 0) limit = dbLimit.Value;
            }
            catch { /* DB erişilemezse varsayılan limit */ }

            cache.Set(key, limit, TimeSpan.FromSeconds(30));
            return limit;
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
