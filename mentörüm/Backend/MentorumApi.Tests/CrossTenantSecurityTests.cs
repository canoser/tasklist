using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Testcontainers.PostgreSql;
using Xunit;
using Dapper;

namespace MentorumApi.Tests
{
    public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string DefaultScheme = "TestScheme";

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
                new Claim(ClaimTypes.NameIdentifier, "11111111-1111-1111-1111-111111111111"),
                new Claim(ClaimTypes.Role, "Coach")
            };
            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, DefaultScheme);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    public class IntegrationTestFixture : IAsyncLifetime
    {
        public PostgreSqlContainer PostgreSqlContainer { get; }

        public IntegrationTestFixture()
        {
            PostgreSqlContainer = new PostgreSqlBuilder()
                .WithImage("postgres:15-alpine")
                .Build();
        }

        public async Task InitializeAsync()
        {
            await PostgreSqlContainer.StartAsync();
            var connectionString = PostgreSqlContainer.GetConnectionString();
            Environment.SetEnvironmentVariable("DATABASE_URL", connectionString);
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");

            using var conn = new Npgsql.NpgsqlConnection(connectionString);
            await conn.OpenAsync();
            
            var migrationsPath = Path.Combine(AppContext.BaseDirectory, "../../../../MentorumApi/Data/Migrations");
            var migrationFiles = Directory.GetFiles(migrationsPath, "*.sql").OrderBy(f => f);
            foreach (var file in migrationFiles)
            {
                var sql = await File.ReadAllTextAsync(file);
                await conn.ExecuteAsync(sql);
            }

            // Coach A (1111...), Coach B (2222...)
            // Student A (3333...) is assigned to Coach B.
            // When Coach A requests Student A, it should return 404 due to BaseRepository tenant filtering.
            await conn.ExecuteAsync(@"
                INSERT INTO users (id, email, role, full_name) VALUES 
                ('11111111-1111-1111-1111-111111111111', 'coachA@test.com', 'Coach', 'Coach A'),
                ('22222222-2222-2222-2222-222222222222', 'coachB@test.com', 'Coach', 'Coach B'),
                ('33333333-3333-3333-3333-333333333333', 'studentA@test.com', 'Student', 'Student A'),
                ('44444444-4444-4444-4444-444444444444', 'teacherA@test.com', 'Teacher', 'Teacher A'),
                ('55555555-5555-5555-5555-555555555555', 'studentB@test.com', 'Student', 'Student B'),
                ('66666666-6666-6666-6666-666666666666', 'studentC@test.com', 'Student', 'Student C'),
                ('77777777-7777-7777-7777-777777777777', 'teacherB@test.com', 'Teacher', 'Teacher B'),
                ('88888888-8888-8888-8888-888888888888', 'assistantA@test.com', 'Coach', 'Assistant A');
                
                INSERT INTO coaches (id) VALUES ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222'), ('88888888-8888-8888-8888-888888888888');
                
                INSERT INTO coaching_programs (id, name, created_by) VALUES
                ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Program A', '11111111-1111-1111-1111-111111111111'),
                ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Program B', '22222222-2222-2222-2222-222222222222');

                INSERT INTO program_coaches (id, program_id, coach_id, role) VALUES
                (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'YONETICI'),
                (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'YONETICI'),
                (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', 'YARDIMCI');

                INSERT INTO students (id, program_id) VALUES 
                ('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
                ('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
                ('66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

                INSERT INTO teachers (id, program_id) VALUES ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
                INSERT INTO program_teachers (id, program_id, teacher_id) VALUES (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444');

                INSERT INTO courses (id, program_id, teacher_id, name, type) VALUES
                ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Matematik', 'DERS');

                INSERT INTO course_students (id, course_id, student_id, program_id) VALUES
                (gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

                INSERT INTO student_groups (id, program_id, name) VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Grup 1');
                INSERT INTO student_group_members (id, group_id, student_id, program_id) VALUES
                (gen_random_uuid(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
                INSERT INTO course_groups (id, course_id, group_id, program_id) VALUES
                (gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

                -- Program B: Teacher B + Course B + Group B (IDOR cross-tenant testi için)
                INSERT INTO teachers (id, program_id) VALUES ('77777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
                INSERT INTO program_teachers (id, program_id, teacher_id) VALUES (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777');
                INSERT INTO courses (id, program_id, teacher_id, name, type) VALUES
                ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777', 'Fizik', 'DERS');
                INSERT INTO student_groups (id, program_id, name) VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Grup B');

                -- 1.1 IDOR: Fizik dersi (Program A) — öğrenci 5555 hem Matematik(CourseA) hem Fizik(CourseC) dersinde
                INSERT INTO courses (id, program_id, teacher_id, name, type) VALUES
                ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Coğrafya', 'DERS');
                INSERT INTO course_students (id, course_id, student_id, program_id) VALUES
                (gen_random_uuid(), '99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
                INSERT INTO homework_assignments (id, snapshot_title, student_id, program_id, course_id, created_by, due_date, status) VALUES
                (gen_random_uuid(), 'Matematik Ödevi', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', '2026-10-21', 'PENDING'),
                (gen_random_uuid(), 'Coğrafya Ödevi', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', '2026-10-20', 'PENDING');
                INSERT INTO exam_results (id, student_id, created_by, exam_date, exam_name, exam_type, program_id, course_id) VALUES
                (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '2026-10-15', 'Matematik Sınavı', 'Deneme', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
                (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '2026-10-14', 'Coğrafya Sınavı', 'Deneme', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999');

                -- 1.2 IDOR: reddedilmiş/bekleyen veli ilişkisi (is_accepted=0)
                INSERT INTO users (id, email, role, full_name) VALUES
                ('bbbb1111-1111-1111-1111-111111111111', 'unaccepted@test.com', 'Parent', 'Reddedilmis Veli');
                INSERT INTO parents (id) VALUES ('bbbb1111-1111-1111-1111-111111111111');
                INSERT INTO student_parents (id, student_id, parent_id, parent_email, is_accepted) VALUES
                (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 'bbbb1111-1111-1111-1111-111111111111', 'unaccepted@test.com', 0);

                -- 2.1 IDOR: çok programlı öğretmen (Teacher C hem Program A hem Program B)
                INSERT INTO users (id, email, role, full_name) VALUES
                ('99999999-9999-9999-9999-999999999998', 'teacherC@test.com', 'Teacher', 'Teacher C');
                INSERT INTO teachers (id, program_id) VALUES ('99999999-9999-9999-9999-999999999998', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
                INSERT INTO program_teachers (id, program_id, teacher_id) VALUES
                (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999998'),
                (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999998');
                INSERT INTO courses (id, program_id, teacher_id, name, type) VALUES
                ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999998', 'Kimya', 'DERS'),
                ('99999999-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999998', 'Biyoloji', 'DERS');
                INSERT INTO homework_assignments (id, snapshot_title, student_id, program_id, course_id, created_by, due_date, status) VALUES
                (gen_random_uuid(), 'Kimya Ödevi', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999998', '2026-10-22', 'PENDING');
                INSERT INTO exam_results (id, student_id, created_by, exam_date, exam_name, exam_type, program_id, course_id) VALUES
                (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '99999999-9999-9999-9999-999999999998', '2026-10-16', 'Kimya Sınavı', 'Deneme', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001');
            ");
        }

        public async Task DisposeAsync()
        {
            await PostgreSqlContainer.DisposeAsync();
        }
    }

    public class CrossTenantSecurityTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public CrossTenantSecurityTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            
            _factory = factory;
        }

        [Fact]
        public async Task GetStudentDetail_WhenWrongCoachId_ReturnsNotFound()
        {
            var studentId = Guid.Parse("33333333-3333-3333-3333-333333333333");

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

            var response = await client.GetAsync($"/api/v1/students/{studentId}");
            var result = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Contains("Öğrenci bulunamadı", result);
        }

        [Fact]
        public async Task GetStudentCurriculum_WhenWrongCoach_ReturnsNotFound()
        {
            var studentId = Guid.Parse("33333333-3333-3333-3333-333333333333");
            var client = CreateAuthClient();
            var response = await client.GetAsync($"/api/v1/students/{studentId}/curriculum");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task GetStudentEvents_WhenWrongCoach_ReturnsNotFound()
        {
            var studentId = Guid.Parse("33333333-3333-3333-3333-333333333333");
            var client = CreateAuthClient();
            var response = await client.GetAsync($"/api/v1/students/{studentId}/events");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task GetStudentSessions_WhenWrongCoach_ReturnsNotFound()
        {
            var studentId = Guid.Parse("33333333-3333-3333-3333-333333333333");
            var client = CreateAuthClient();
            var response = await client.GetAsync($"/api/v1/students/{studentId}/sessions");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        private HttpClient CreateAuthClient()
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
    }
}
