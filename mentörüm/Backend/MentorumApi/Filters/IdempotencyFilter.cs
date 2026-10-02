using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;

namespace MentorumApi.Filters
{
    public class IdempotencyFilter : IEndpointFilter
    {
        private readonly IMemoryCache _cache;

        public IdempotencyFilter(IMemoryCache cache)
        {
            _cache = cache;
        }

        public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            var request = context.HttpContext.Request;

            if (request.Headers.TryGetValue("Idempotency-Key", out var idempotencyKey))
            {
                var cacheKey = $"Idempotency_{idempotencyKey}";

                if (_cache.TryGetValue(cacheKey, out _))
                {
                    return Results.Conflict(new { error = "Bu istek daha önce işlendi (Idempotency Key Conflict). Lütfen tekrar denemeyin." });
                }

                var result = await next(context);

                bool isSuccess = true;
                if (result is Microsoft.AspNetCore.Http.IStatusCodeHttpResult statusCodeResult && statusCodeResult.StatusCode >= 400)
                {
                    isSuccess = false;
                }

                if (isSuccess)
                {
                    var cacheOptions = new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromHours(1));
                    _cache.Set(cacheKey, true, cacheOptions);
                }
                
                return result;
            }

            // Idempotency key yoksa standart devam et
            return await next(context);
        }
    }
}
