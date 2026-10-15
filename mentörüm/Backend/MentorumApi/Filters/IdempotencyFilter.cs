using System.Text.Json;
using Dapper;
using Microsoft.AspNetCore.Http;
using MentorumApi.Data;

namespace MentorumApi.Filters
{
    /// <summary>
    /// Kullanıcı bazlı, veritabanı destekli idempotency filtresi.
    /// - Aynı kullanıcı + aynı anahtar tekrar ederse önceki başarılı yanıtı döner (RFC idempotency).
    /// - İşlem sürerken (in-flight) gelen istek 409 ile reddedilir.
    /// - Hatalı (>=400) işlemde kayıt silinir; istemci tekrar deneyebilir.
    /// Anahtar kullanıcıya scope'landığı için farklı kullanıcılar çakışmaz.
    /// </summary>
    public class IdempotencyFilter : IEndpointFilter
    {
        private readonly DbConnectionFactory _dbFactory;

        public IdempotencyFilter(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            var request = context.HttpContext.Request;

            if (!request.Headers.TryGetValue("Idempotency-Key", out var keyHeader) ||
                string.IsNullOrWhiteSpace(keyHeader.ToString()))
            {
                return await next(context);
            }

            var key = keyHeader.ToString().Trim();
            if (key.Length > 100) key = key[..100];

            var ownerId = GetOwnerId(context.HttpContext);

            using var conn = _dbFactory.CreateConnection();
            conn.Open();

            // 1) PENDING kaydı oluştur (mükerrer ise hiçbir şey yapmaz).
            var inserted = await conn.ExecuteAsync(@"
                INSERT INTO idempotency_keys (user_id, key, status, created_at)
                VALUES (@OwnerId, @Key, 'PENDING', NOW())
                ON CONFLICT (user_id, key) DO NOTHING",
                new { OwnerId = ownerId, Key = key });

            if (inserted == 0)
            {
                var existing = await conn.QuerySingleOrDefaultAsync<IdempotencyRecord>(@"
                    SELECT status, status_code AS StatusCode, response_body AS ResponseBody
                    FROM idempotency_keys WHERE user_id = @OwnerId AND key = @Key",
                    new { OwnerId = ownerId, Key = key });

                if (existing == null)
                    return await next(context); // race fallback

                if (existing.Status == "PENDING")
                    return Results.Conflict(new { error = "Bu işlem şu an yürütülüyor. Lütfen bekleyin." });

                if (existing.StatusCode is int code)
                    return Results.Text(existing.ResponseBody ?? "", "application/json; charset=utf-8", null, code);

                return Results.Conflict(new { error = "Bu istek daha önce işlendi." });
            }

            // 2) Endpoint'i çalıştır.
            var result = await next(context);

            // 3) Sonucu kalıcılaştır veya hata durumunda sil (retry'e izin ver).
            var statusCode = result is IStatusCodeHttpResult sc ? sc.StatusCode ?? 200 : 200;
            string? body = null;
            if (result is IValueHttpResult valueResult && valueResult.Value is not null)
            {
                try { body = JsonSerializer.Serialize(valueResult.Value); }
                catch { body = null; }
            }

            if (statusCode >= 400)
            {
                await conn.ExecuteAsync(
                    "DELETE FROM idempotency_keys WHERE user_id = @OwnerId AND key = @Key",
                    new { OwnerId = ownerId, Key = key });
            }
            else
            {
                await conn.ExecuteAsync(@"
                    UPDATE idempotency_keys
                    SET status = 'COMPLETED', status_code = @StatusCode, response_body = @Body
                    WHERE user_id = @OwnerId AND key = @Key",
                    new { OwnerId = ownerId, Key = key, StatusCode = statusCode, Body = body });
            }

            return result;
        }

        private static string GetOwnerId(HttpContext context)
        {
            var userId = context.User?.Identity?.IsAuthenticated == true
                ? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                : null;
            return string.IsNullOrWhiteSpace(userId)
                ? "anon:" + (context.Connection.RemoteIpAddress?.ToString() ?? "unknown")
                : userId;
        }

        private sealed class IdempotencyRecord
        {
            public string Status { get; set; } = string.Empty;
            public int? StatusCode { get; set; }
            public string? ResponseBody { get; set; }
        }
    }
}
