using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MentorumApi.Tests
{
    // V6 yeni uçlarının IDOR + izin + maskeleme senaryoları.
    // Kimlik/rol, ConfigurableTestAuthHandler (TeacherIdorTests.cs) üzerinden header ile verilir.
    public class ProfileVisibilityTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        private static readonly Guid CourseA = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
        private static readonly Guid CourseB = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");
        private static readonly Guid StudentB = Guid.Parse("55555555-5555-5555-5555-555555555555");
        private static readonly Guid StudentA = Guid.Parse("33333333-3333-3333-3333-333333333333");
        private const string TeacherA = "44444444-4444-4444-4444-444444444444";
        private const string CoachA = "11111111-1111-1111-1111-111111111111";

        public ProfileVisibilityTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
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
        public async Task Student_Profile_ReturnsOwnData()
        {
            var client = CreateClient(StudentB.ToString(), "Student");
            var res = await client.GetAsync("/api/v1/student/profile");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.Contains("Student B", body);
            Assert.Contains("studentB@test.com", body);
        }

        [Fact]
        public async Task Student_Exams_ReturnsOk()
        {
            // Uç id parametresi almaz; her zaman kendi verisini döner (200).
            var client = CreateClient(StudentB.ToString(), "Student");
            var res = await client.GetAsync("/api/v1/student/exams");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Student_Goal_ReturnsOk()
        {
            var client = CreateClient(StudentB.ToString(), "Student");
            var res = await client.GetAsync("/api/v1/student/goal");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Teacher_CreateHomework_OwnCourse_Ok()
        {
            // Course A'da teacher_can_manage_homework=1 (varsayılan) → 200
            var client = CreateClient(TeacherA, "Teacher");
            var res = await client.PostAsJsonAsync($"/api/v1/teacher/courses/{CourseA}/homework", new
            {
                studentId = StudentB,
                title = "Test Ödev",
                description = "açıklama",
                dueDate = DateTime.UtcNow.AddDays(1)
            });
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Teacher_CreateHomework_OtherCourse_NotFound()
        {
            // Teacher A, Course B'nin sahibi değil → 404
            var client = CreateClient(TeacherA, "Teacher");
            var res = await client.PostAsJsonAsync($"/api/v1/teacher/courses/{CourseB}/homework", new
            {
                studentId = StudentA,
                title = "Test Ödev",
                dueDate = DateTime.UtcNow.AddDays(1)
            });
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }

        [Fact]
        public async Task Teacher_CreateHomework_StudentNotInCourse_NotFound()
        {
            // Student A, Course A'da değil → 404
            var client = CreateClient(TeacherA, "Teacher");
            var res = await client.PostAsJsonAsync($"/api/v1/teacher/courses/{CourseA}/homework", new
            {
                studentId = StudentA,
                title = "Test Ödev",
                dueDate = DateTime.UtcNow.AddDays(1)
            });
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }

        [Fact]
        public async Task Teacher_CreateExam_NoPermission_Forbidden()
        {
            // Course A'da teacher_can_manage_exams=0 (varsayılan) → 403 (izin kapısı)
            var client = CreateClient(TeacherA, "Teacher");
            var res = await client.PostAsJsonAsync($"/api/v1/teacher/courses/{CourseA}/exams", new
            {
                studentId = StudentB,
                examDate = DateTime.UtcNow,
                examName = "1. Deneme",
                totalNet = 80.5f
            });
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }

        [Fact]
        public async Task Teacher_Profile_ReturnsOwnData()
        {
            var client = CreateClient(TeacherA, "Teacher");
            var res = await client.GetAsync("/api/v1/teacher/me");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.Contains("Teacher A", body);
        }

        [Fact]
        public async Task Coach_TeacherDetail_CrossProgram_NotFound()
        {
            // Coach A (Program A) → Teacher B (Program B) detayı → 404
            var client = CreateClient(CoachA, "Coach");
            var res = await client.GetAsync($"/api/v1/programs/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/teachers/77777777-7777-7777-7777-777777777777");
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }

        [Fact]
        public async Task Coach_TeacherDetail_OwnProgram_Ok()
        {
            var client = CreateClient(CoachA, "Coach");
            var res = await client.GetAsync($"/api/v1/programs/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/teachers/44444444-4444-4444-4444-444444444444");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.Contains("Teacher A", body);
        }
    }
}
