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

            // Mükerrer istek kontrolü
            if (await _repository.ExistsAsync(idempotencyKey))
            {
                context.Result = new ConflictObjectResult("Bu istek daha önce başarıyla işlenmiş. Çift işlem engellendi.");
                return;
            }

            // İşlemi gerçekleştir
            var executedContext = await next();

            // İşlem başarılıysa anahtarı kaydet (Hata aldıysa tekrar denenebilmesi için kaydetmiyoruz)
            if (executedContext.Exception == null)
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
    }
}
