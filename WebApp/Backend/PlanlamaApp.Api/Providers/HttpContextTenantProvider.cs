using System.Security.Claims;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Api.Providers
{
    public class HttpContextTenantProvider : ITenantProvider
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public HttpContextTenantProvider(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public string GetTenantId()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || !user.Identity!.IsAuthenticated)
            {
                // Giriş yapmamış kullanıcılar (örn. login, register) için geçici "SYSTEM" döneriz.
                return "SYSTEM"; 
            }

            // auth token içindeki tenant_id veya doğrudan UserId (NameIdentifier) kullanılır
            var tenantId = user.FindFirst("tenant_id")?.Value 
                           ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                           
            return string.IsNullOrEmpty(tenantId) ? "SYSTEM" : tenantId;
        }
    }
}
