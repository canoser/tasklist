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
    // İstek header'ından kimlik/rol okuyan configurable test auth handler'ı
    // (farklı kullanıcılar için IDOR senaryoları test etmek üzere).
    public class ConfigurableTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string DefaultScheme = "ConfigurableTestScheme";

        public ConfigurableTestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var userId = Request.Headers["X-Test-User-Id"].ToString();
            var role = Request.Headers["X-Test-Role"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Task.FromResult(AuthenticateResult.Fail("Missing test user"));

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Role, string.IsNullOrEmpty(role) ? "Coach" : role)
            };
            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, DefaultScheme);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    public class TeacherIdorTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public TeacherIdorTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        private HttpClient CreateClient(string userId, string role)
        {
            var client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = ConfigurableTestAuthHandler.DefaultScheme;
                        options.DefaultChallengeScheme = ConfigurableTestAuthHandler.DefaultScheme;
                    })
                    .AddScheme<AuthenticationSchemeOptions, ConfigurableTestAuthHandler>(ConfigurableTestAuthHandler.DefaultScheme, options => { });
                });
            }).CreateClient();

            client.DefaultRequestHeaders.Add("X-Test-User-Id", userId);
            client.DefaultRequestHeaders.Add("X-Test-Role", role);
            return client;
        }

        [Fact]
        public async Task Teacher_CannotAccess_OtherTeachersCourseStudents()
        {
            // Teacher A (4444) → Course B (eeeeeeee, Teacher B 7777'ye ait) öğrencileri → 404
            var client = CreateClient("44444444-4444-4444-4444-444444444444", "Teacher");
            var response = await client.GetAsync("/api/v1/teacher/courses/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/students");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Teacher_CanAccess_OwnCourseStudents()
        {
            // Teacher A (4444) → kendi dersi Course A (cccccccc) öğrencileri → 200
            var client = CreateClient("44444444-4444-4444-4444-444444444444", "Teacher");
            var response = await client.GetAsync("/api/v1/teacher/courses/cccccccc-cccc-cccc-cccc-cccccccccccc/students");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Coach_CannotAccess_OtherProgramsCourseStudents()
        {
            // Coach A (1111, Program A) → Course B (eeeeeeee, Program B) öğrencileri → boş liste (sızıntı yok)
            var client = CreateClient("11111111-1111-1111-1111-111111111111", "Coach");
            var response = await client.GetAsync("/api/v1/programs/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/courses/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/students");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.Equal("[]", body);
        }
    }
}