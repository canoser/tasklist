using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace PlanlamaApp.IntegrationTests.Infrastructure
{
    public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string DefaultTenantId = "test-tenant-123";
        public const string DefaultUserId = "test-user-123";
        public const string DefaultPlan = "free";
        public const string DefaultEmail = "test@example.com";

        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options, 
            ILoggerFactory logger, 
            UrlEncoder encoder) 
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, DefaultUserId),
                new Claim(ClaimTypes.Email, DefaultEmail),
                new Claim("TenantId", DefaultTenantId),
                new Claim("subscription_plan", DefaultPlan)
            };

            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, "TestAuth");

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
