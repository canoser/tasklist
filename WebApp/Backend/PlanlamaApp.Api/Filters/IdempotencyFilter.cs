using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Api.Filters
{
    public class IdempotencyFilter : IAsyncActionFilter
    {
        private readonly IIdempotencyRepository _repository;
        private readonly ITenantProvider _tenantProvider;

        private class RefCountedSemaphore
        {
            public SemaphoreSlim Semaphore { get; } = new(1, 1);
            public int RefCount;
        }

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, RefCountedSemaphore> _locks = new();

        public IdempotencyFilter(IIdempotencyRepository repository, ITenantProvider tenantProvider)
        {
            _repository = repository;
            _tenantProvider = tenantProvider;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // Yalnızca POST ve PUT işlemleri finansal / kritik değişiklik yapar.
            if (context.HttpContext.Request.Method != HttpMethods.Post && 
                context.HttpContext.Request.Method != HttpMethods.Put)
            {
                await next();
                return;
            }

            if (!context.HttpContext.Request.Headers.TryGetValue("Idempotency-Key", out var extractedKey))
            {
                context.Result = new BadRequestObjectResult("Idempotency-Key header eksik! Eşetkisellik (Idempotency) gereklidir.");
                return;
            }

            var idempotencyKey = extractedKey.ToString();
            var refSemaphore = _locks.GetOrAdd(idempotencyKey, _ => new RefCountedSemaphore());
            System.Threading.Interlocked.Increment(ref refSemaphore.RefCount);

            await refSemaphore.Semaphore.WaitAsync();
            try
            {
                // Mükerrer istek kontrolü
                if (await _repository.ExistsAsync(idempotencyKey))
                {
                    context.Result = new ConflictObjectResult("Bu istek daha önce başarıyla işlenmiş. Çift işlem engellendi.");
                    return;
                }

                // İşlemi gerçekleştir
                var executedContext = await next();

                // İşlem başarılıysa anahtarı kaydet
                bool isSuccess = false;
                if (executedContext.Exception == null)
                {
                    if (executedContext.Result is Microsoft.AspNetCore.Mvc.Infrastructure.IStatusCodeActionResult statusCodeResult && statusCodeResult.StatusCode != null)
                    {
                        isSuccess = statusCodeResult.StatusCode >= 200 && statusCodeResult.StatusCode < 300;
                    }
                    else if (executedContext.Result is ObjectResult objResult && objResult.StatusCode != null)
                    {
                        isSuccess = objResult.StatusCode >= 200 && objResult.StatusCode < 300;
                    }
                    else
                    {
                        isSuccess = true; // Eğer StatusCode belirtilmemiş bir result ise (ör. düz Ok(), EmptyResult) başarılı varsay
                    }
                }

                if (isSuccess)
                {
                    var newKey = new IdempotencyKey
                    {
                        Key = idempotencyKey,
                        TenantId = _tenantProvider.GetTenantId(),
                        RequestPath = context.HttpContext.Request.Path,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _repository.SaveAsync(newKey);
                }
            }
            finally
            {
                refSemaphore.Semaphore.Release();
                if (System.Threading.Interlocked.Decrement(ref refSemaphore.RefCount) == 0)
                {
                    _locks.TryRemove(idempotencyKey, out _);
                }
            }
        }
    }
}
