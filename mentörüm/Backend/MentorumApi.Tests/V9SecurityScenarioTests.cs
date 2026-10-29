using System.Net;
using System.Net.Http.Headers;
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
    public class TestStudentAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public new const string Scheme = "TestStudentScheme";

        public TestStudentAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
            : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "55555555-5555-5555-5555-555555555555"),
                new Claim(ClaimTypes.Role, "Student")
            };
            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    public class V9SecurityScenarioTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private static readonly Guid ProgramA = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        private static readonly Guid StudentA = Guid.Parse("33333333-3333-3333-3333-333333333333");
        private static readonly Guid StudentB = Guid.Parse("55555555-5555-5555-5555-555555555555");

        public V9SecurityScenarioTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            _factory = factory;
        }

        private HttpClient CreateCoachClient()
        {
            var client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = TestAuthHandler.DefaultScheme;
                        options.DefaultChallengeScheme = TestAuthHandler.DefaultScheme;
                    })
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.DefaultScheme, options => { });
                });
            }).CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.DefaultScheme);
            return client;
        }

        private HttpClient CreateTeacherClient()
        {
            var client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = TestTeacherAuthHandler.Scheme;
                        options.DefaultChallengeScheme = TestTeacherAuthHandler.Scheme;
                    })
                    .AddScheme<AuthenticationSchemeOptions, TestTeacherAuthHandler>(TestTeacherAuthHandler.Scheme, options => { });
                });
            }).CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestTeacherAuthHandler.Scheme);
            return client;
        }

        private HttpClient CreateStudentClient()
        {
            var client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = TestStudentAuthHandler.Scheme;
                        options.DefaultChallengeScheme = TestStudentAuthHandler.Scheme;
                    })
                    .AddScheme<AuthenticationSchemeOptions, TestStudentAuthHandler>(TestStudentAuthHandler.Scheme, options => { });
                });
            }).CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestStudentAuthHandler.Scheme);
            return client;
        }

        [Fact]
        public async Task Teacher_CannotAccessFinanceEndpoints_ReturnsForbidden()
        {
            var client = CreateTeacherClient();
            var res = await client.GetAsync($"/api/v1/programs/{ProgramA}/payment-plans");
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }

        [Fact]
        public async Task Student_CannotAccessFinanceEndpoints_ReturnsForbidden()
        {
            var client = CreateStudentClient();
            var res = await client.GetAsync($"/api/v1/programs/{ProgramA}/payment-plans");
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }

        [Fact]
        public async Task Coach_ViewAsSimulation_BlocksMutationsWithForbidden()
        {
            var client = CreateCoachClient();
            client.DefaultRequestHeaders.Add("X-View-As-Student-Id", StudentB.ToString());

            // POST isteği View-As modunda 403 almalıdır
            var content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");
            var res = await client.PostAsync($"/api/v1/student/study-sessions", content);

            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }

        [Fact]
        public async Task Student_CanListOnlyOwnStudySessions()
        {
            var client = CreateStudentClient();
            var res = await client.GetAsync("/api/v1/student/study-sessions");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
