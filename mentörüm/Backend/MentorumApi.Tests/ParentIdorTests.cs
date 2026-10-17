using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace MentorumApi.Tests
{
    public class TestParentAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string Scheme = "TestParentScheme";

        public TestParentAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
            : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // is_accepted=0 olan veli (bbbb1111...) — reddedilmiş/bekleyen ilişki
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "bbbb1111-1111-1111-1111-111111111111"),
                new Claim(ClaimTypes.Role, "Parent")
            };
            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    public class ParentIdorTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public ParentIdorTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            _factory = factory;
        }

        private HttpClient CreateUnacceptedParentClient()
        {
            var client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = TestParentAuthHandler.Scheme;
                        options.DefaultChallengeScheme = TestParentAuthHandler.Scheme;
                    })
                    .AddScheme<AuthenticationSchemeOptions, TestParentAuthHandler>(TestParentAuthHandler.Scheme, options => { });
                });
            }).CreateClient();
            return client;
        }

        [Fact]
        public async Task UnacceptedParent_CannotReadChildProfile()
        {
            var client = CreateUnacceptedParentClient();
            var studentId = "55555555-5555-5555-5555-555555555555";

            var profile = await client.GetAsync($"/api/v1/parents/children/{studentId}");
            Assert.Equal(HttpStatusCode.Forbidden, profile.StatusCode);

            var exams = await client.GetAsync($"/api/v1/parents/children/{studentId}/exams");
            Assert.Equal(HttpStatusCode.Forbidden, exams.StatusCode);

            var schedule = await client.GetAsync($"/api/v1/parent/children/{studentId}/schedule");
            Assert.Equal(HttpStatusCode.Forbidden, schedule.StatusCode);
        }
    }
}
