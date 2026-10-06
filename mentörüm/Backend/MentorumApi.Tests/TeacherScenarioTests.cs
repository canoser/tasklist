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
    public class TestTeacherAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string Scheme = "TestTeacherScheme";

        public TestTeacherAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
            : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "44444444-4444-4444-4444-444444444444"),
                new Claim(ClaimTypes.Role, "Teacher")
            };
            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    public class TeacherScenarioTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private static readonly Guid CourseA = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
        private static readonly Guid CourseB = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");

        public TeacherScenarioTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            _factory = factory;
        }

        private HttpClient CreateTeacherAClient()
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

        [Fact]
        public async Task TeacherA_CanListOwnCourses()
        {
            var client = CreateTeacherAClient();
            var res = await client.GetAsync("/api/v1/teacher/courses");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.Contains("Matematik", body);
            Assert.DoesNotContain("Fizik", body); // Fizik başka öğretmenin (Teacher B)
        }

        [Fact]
        public async Task TeacherA_CannotGetOtherTeachersCourseStudents()
        {
            // IDOR: Teacher A, Course B'nin öğretmeni değil → 404
            var client = CreateTeacherAClient();
            var res = await client.GetAsync($"/api/v1/teacher/courses/{CourseB}/students");
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }

        [Fact]
        public async Task TeacherA_StudentContactIsMasked()
        {
            // DTO maskeleme: CanViewContact=0 → email response'tan çıkarılır
            var client = CreateTeacherAClient();
            var res = await client.GetAsync($"/api/v1/teacher/courses/{CourseA}/students");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.Contains("Student B", body);          // ad görünür
            Assert.DoesNotContain("studentB@test.com", body); // email maskelendi
        }
    }
}
