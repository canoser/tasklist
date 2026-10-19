using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MentorumApi.Tests
{
    // V10 öğrenci UX özellikleri için IDOR / gizlilik testleri.
    public class V10StudentUxIdorTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        // StudentA ProgramB'de (koçun sahibi değil); StudentB ProgramA'da (koçun sahibi).
        private static readonly Guid StudentA = Guid.Parse("33333333-3333-3333-3333-333333333333");

        public V10StudentUxIdorTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
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
        public async Task Coach_CannotReadOtherStudentsStudentNotes_ReturnsForbidden()
        {
            var client = CreateCoachClient();
            var res = await client.GetAsync($"/api/v1/students/{StudentA}/student-notes");
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }

        [Fact]
        public async Task Coach_CannotReadOtherStudentsCheckins_ReturnsForbidden()
        {
            var client = CreateCoachClient();
            var res = await client.GetAsync($"/api/v1/students/{StudentA}/checkins");
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }

        [Fact]
        public async Task Coach_CannotReadOtherStudentsQuestions_ReturnsForbidden()
        {
            var client = CreateCoachClient();
            var res = await client.GetAsync($"/api/v1/students/{StudentA}/questions");
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }

        [Fact]
        public async Task Student_CanReadOwnNotes_ReturnsOk()
        {
            var client = CreateStudentClient();
            var res = await client.GetAsync("/api/v1/student/notes");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Student_CanReadOwnQuestions_ReturnsOk()
        {
            var client = CreateStudentClient();
            var res = await client.GetAsync("/api/v1/student/questions");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Student_CanReadOwnStreak_ReturnsOk()
        {
            var client = CreateStudentClient();
            var res = await client.GetAsync("/api/v1/student/streak");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Student_CanReadOwnSchoolSchedule_ReturnsOk()
        {
            var client = CreateStudentClient();
            var res = await client.GetAsync("/api/v1/student/school-schedule");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
