using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MentorumApi.Tests
{
    public class SchoolEndpointsIdorTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        private static readonly Guid ProgramA = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        private static readonly Guid ProgramB = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        private static readonly Guid CourseA = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
        private static readonly Guid Group1 = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");
        private static readonly Guid StudentA = Guid.Parse("33333333-3333-3333-3333-333333333333");

        public SchoolEndpointsIdorTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            _factory = factory;
        }

        private HttpClient CreateCoachAClient()
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

        [Fact]
        public async Task CoachA_CanListOwnProgramTeachers()
        {
            var client = CreateCoachAClient();
            var res = await client.GetAsync($"/api/v1/programs/{ProgramA}/teachers");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.Contains("Teacher A", body);
        }

        [Fact]
        public async Task CoachA_CannotListOtherProgramTeachers()
        {
            var client = CreateCoachAClient();
            var res = await client.GetAsync($"/api/v1/programs/{ProgramB}/teachers");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.DoesNotContain("Teacher B", body);
        }

        [Fact]
        public async Task CoachA_CannotGetOtherProgramTeacher()
        {
            var client = CreateCoachAClient();
            var teacherB = Guid.Parse("77777777-7777-7777-7777-777777777777");
            var res = await client.GetAsync($"/api/v1/programs/{ProgramB}/teachers/{teacherB}");
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }

        [Fact]
        public async Task CoachA_CanListOwnCourses()
        {
            var client = CreateCoachAClient();
            var res = await client.GetAsync($"/api/v1/programs/{ProgramA}/courses");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.Contains("Matematik", body);
        }

        [Fact]
        public async Task CoachA_CannotListOtherProgramCourses()
        {
            var client = CreateCoachAClient();
            var res = await client.GetAsync($"/api/v1/programs/{ProgramB}/courses");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.DoesNotContain("Fizik", body);
        }

        [Fact]
        public async Task CoachA_CannotGetOtherProgramCourse()
        {
            var client = CreateCoachAClient();
            var res = await client.GetAsync($"/api/v1/programs/{ProgramB}/courses/{CourseA}");
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }
        [Fact]
        public async Task CoachA_CanListOwnGroups()
        {
            var client = CreateCoachAClient();
            var res = await client.GetAsync($"/api/v1/programs/{ProgramA}/groups");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.Contains("Grup 1", body);
        }

        [Fact]
        public async Task CoachA_CannotListOtherProgramGroups()
        {
            var client = CreateCoachAClient();
            var res = await client.GetAsync($"/api/v1/programs/{ProgramB}/groups");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.DoesNotContain("Grup B", body);
        }

        [Fact]
        public async Task CoachA_CannotGetOtherProgramGroup()
        {
            var client = CreateCoachAClient();
            var res = await client.GetAsync($"/api/v1/programs/{ProgramB}/groups/{Group1}");
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }

        [Fact]
        public async Task CoachA_CannotAddForeignStudentToOwnCourse()
        {
            // IDOR: Program B'deki öğrenci, Program A'nın dersine eklenemez
            var client = CreateCoachAClient();
            var res = await client.PostAsJsonAsync($"/api/v1/programs/{ProgramA}/courses/{CourseA}/students", new { studentId = StudentA });
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }

        [Fact]
        public async Task CoachA_CannotDeleteOtherProgramCourse()
        {
            var client = CreateCoachAClient();
            var courseB = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");
            var res = await client.DeleteAsync($"/api/v1/programs/{ProgramB}/courses/{courseB}");
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }
    }
}
