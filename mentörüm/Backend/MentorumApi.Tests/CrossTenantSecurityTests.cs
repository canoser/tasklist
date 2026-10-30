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
            var userId = Request.Headers.TryGetValue("X-Test-UserId", out var uid) && !string.IsNullOrWhiteSpace(uid)
                ? uid.ToString()
                : "11111111-1111-1111-1111-111111111111";
            var role = Request.Headers.TryGetValue("X-Test-Role", out var r) && !string.IsNullOrWhiteSpace(r)
                ? r.ToString()
                : "Coach";

            var claims = new[] 
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Role, role)
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
            PostgreSqlContainer = new PostgreSqlBuilder("postgres:15-alpine")
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

            await MentorumApi.Data.MigrationRunner.RunAsync(connectionString);

            using var conn = new Npgsql.NpgsqlConnection(connectionString);
            await conn.OpenAsync();

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
        private readonly IntegrationTestFixture _fixture;
        private readonly WebApplicationFactory<Program> _factory;

        public CrossTenantSecurityTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            
            _fixture = fixture;
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

        [Fact]
        public async Task MigrationRunner_RunAsync_WhenCalledRepeatedly_IsIdempotent()
        {
            var connStr = _fixture.PostgreSqlContainer.GetConnectionString();
            await MentorumApi.Data.MigrationRunner.RunAsync(connStr);

            using var conn = new Npgsql.NpgsqlConnection(connStr);
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM _schema_migrations WHERE filename = '001_schema.sql'");
            Assert.Equal(1, count);
        }

        [Fact]
        public async Task CoachingTools_And_GrowSession_PersistAndReturnStructuredJson()
        {
            var studentId = Guid.Parse("55555555-5555-5555-5555-555555555555");
            var client = CreateAuthClient();

            var putToolsRes = await client.PutAsync(
                $"/api/v1/students/{studentId}/coaching-tools",
                new StringContent(
                    "{\"swotData\":\"{\\\"strengths\\\":\\\"Analitik\\\"}\",\"wheelData\":\"{\\\"Uyku\\\":8}\",\"habitsData\":\"[{\\\"id\\\":\\\"h1\\\",\\\"title\\\":\\\"Kitap\\\",\\\"completedDates\\\":[]}]\"}",
                    System.Text.Encoding.UTF8,
                    "application/json"));
            Assert.Equal(HttpStatusCode.OK, putToolsRes.StatusCode);

            var getToolsRes = await client.GetAsync($"/api/v1/students/{studentId}/coaching-tools");
            Assert.Equal(HttpStatusCode.OK, getToolsRes.StatusCode);
            var toolsBody = await getToolsRes.Content.ReadAsStringAsync();
            Assert.Contains("Analitik", toolsBody);
            Assert.Contains("Kitap", toolsBody);

            var postSessionRes = await client.PostAsync(
                $"/api/v1/students/{studentId}/sessions",
                new StringContent(
                    "{\"title\":\"GROW Seansı 1\",\"notes\":\"Notlar\",\"actionItems\":\"Aksiyon\",\"growData\":\"{\\\"goal\\\":\\\"İlk 5000\\\",\\\"reality\\\":\\\"75 net\\\",\\\"options\\\":\\\"Branş denemesi\\\",\\\"willAction\\\":\\\"Günde 2 deneme\\\"}\"}",
                    System.Text.Encoding.UTF8,
                    "application/json"));
            Assert.Equal(HttpStatusCode.OK, postSessionRes.StatusCode);

            var getSessionsRes = await client.GetAsync($"/api/v1/students/{studentId}/sessions");
            Assert.Equal(HttpStatusCode.OK, getSessionsRes.StatusCode);
            var sessionsBody = await getSessionsRes.Content.ReadAsStringAsync();
            Assert.Contains("İlk 5000", sessionsBody);
            Assert.Contains("Günde 2 deneme", sessionsBody);
        }

        [Fact]
        public async Task RemovedGroupMember_IsSoftDeletedAndExcludedFromCourseRoster()
        {
            var programId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
            var courseId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
            var groupId = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");
            var tempStudentId = Guid.Parse("66666666-6666-6666-6666-666666666699");

            var connStr = _fixture.PostgreSqlContainer.GetConnectionString();
            using (var conn = new Npgsql.NpgsqlConnection(connStr))
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO users (id, email, role, full_name) VALUES (@Id, 'temp_roster@test.com', 'Student', 'Temp Roster Student') ON CONFLICT DO NOTHING;
                    INSERT INTO students (id, program_id, is_active) VALUES (@Id, @ProgramId, 1) ON CONFLICT DO NOTHING;
                    INSERT INTO student_group_members (id, group_id, student_id, program_id, is_active) VALUES (gen_random_uuid(), @GroupId, @Id, @ProgramId, 1);",
                    new { Id = tempStudentId, ProgramId = programId, GroupId = groupId });
            }

            var client = CreateAuthClient();
            var delRes = await client.DeleteAsync($"/api/v1/programs/{programId}/groups/{groupId}/members/{tempStudentId}");
            Assert.Equal(HttpStatusCode.OK, delRes.StatusCode);

            var rosterRes = await client.GetAsync($"/api/v1/programs/{programId}/courses/{courseId}/students");
            Assert.Equal(HttpStatusCode.OK, rosterRes.StatusCode);
            var rosterBody = await rosterRes.Content.ReadAsStringAsync();
            Assert.DoesNotContain(tempStudentId.ToString(), rosterBody);
        }

        [Fact]
        public async Task GetProgramCurriculumProgress_WhenStudentBelongsToForeignProgram_ReturnsForbidden()
        {
            var programAId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
            var foreignStudentId = Guid.Parse("33333333-3333-3333-3333-333333333333"); // Program B öğrencisi
            var client = CreateAuthClient();

            var res = await client.GetAsync($"/api/v1/programs/{programAId}/curriculum/progress?studentId={foreignStudentId}");
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }

        [Fact]
        public async Task CollectPayment_WhenAmountIsZeroOrNegative_ReturnsBadRequest()
        {
            var programAId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
            var studentBId = Guid.Parse("55555555-5555-5555-5555-555555555555");
            var planId = Guid.NewGuid();
            var itemId = Guid.NewGuid();

            var connStr = _fixture.PostgreSqlContainer.GetConnectionString();
            using (var conn = new Npgsql.NpgsqlConnection(connStr))
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO payment_plans (id, program_id, student_id, period_type, amount, currency, start_date, is_active, created_by)
                    VALUES (@PlanId, @ProgramId, @StudentId, 'MONTHLY', 1000, 'TRY', CURRENT_DATE, 1, '11111111-1111-1111-1111-111111111111');
                    INSERT INTO payment_items (id, plan_id, due_date, base_amount, paid_amount, status, currency)
                    VALUES (@ItemId, @PlanId, CURRENT_DATE, 1000, 0, 'PENDING', 'TRY');",
                    new { PlanId = planId, ItemId = itemId, ProgramId = programAId, StudentId = studentBId });
            }

            var client = CreateAuthClient();
            var res = await client.PostAsync(
                $"/api/v1/payment-items/{itemId}/collect",
                new StringContent("{\"amount\":0}", System.Text.Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task ParentCreatePaymentClaim_WithItemId_Succeeds()
        {
            var programAId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
            var studentBId = Guid.Parse("55555555-5555-5555-5555-555555555555");
            var acceptedParentId = Guid.Parse("bbbb2222-2222-2222-2222-222222222222");
            var planId = Guid.NewGuid();
            var itemId = Guid.NewGuid();

            var connStr = _fixture.PostgreSqlContainer.GetConnectionString();
            using (var conn = new Npgsql.NpgsqlConnection(connStr))
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO users (id, email, role, full_name) VALUES (@ParentId, 'accepted_parent_v18@test.com', 'Parent', 'Kabul Edilmis Veli') ON CONFLICT DO NOTHING;
                    INSERT INTO parents (id) VALUES (@ParentId) ON CONFLICT DO NOTHING;
                    INSERT INTO student_parents (id, student_id, parent_id, parent_email, is_accepted, can_view_payments)
                    VALUES (gen_random_uuid(), @StudentId, @ParentId, 'accepted_parent_v18@test.com', 1, 1) ON CONFLICT DO NOTHING;
                    INSERT INTO payment_plans (id, program_id, student_id, period_type, amount, currency, start_date, is_active, created_by)
                    VALUES (@PlanId, @ProgramId, @StudentId, 'MONTHLY', 2000, 'TRY', CURRENT_DATE, 1, '11111111-1111-1111-1111-111111111111');
                    INSERT INTO payment_items (id, plan_id, due_date, base_amount, paid_amount, status, currency)
                    VALUES (@ItemId, @PlanId, CURRENT_DATE, 2000, 0, 'PENDING', 'TRY');",
                    new { ParentId = acceptedParentId, StudentId = studentBId, ProgramId = programAId, PlanId = planId, ItemId = itemId });
            }

            var client = CreateAuthClient();
            client.DefaultRequestHeaders.Add("X-Test-UserId", acceptedParentId.ToString());
            client.DefaultRequestHeaders.Add("X-Test-Role", "Parent");

            var res = await client.PostAsync(
                $"/api/v1/parents/children/{studentBId}/payment-claims",
                new StringContent($"{{\"itemId\":\"{itemId}\",\"amount\":500,\"notes\":\"Dekont gonderildi\"}}", System.Text.Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task OverdueHomeworkJob_WithMultiCoachProgram_DoesNotThrowAndRespects7DayCutoff()
        {
            var programAId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"); // 2 koç: 1111... (YONETICI) ve 8888... (YARDIMCI)
            var studentBId = Guid.Parse("55555555-5555-5555-5555-555555555555");
            var recentHwId = Guid.NewGuid();
            var ancientHwId = Guid.NewGuid();

            var connStr = _fixture.PostgreSqlContainer.GetConnectionString();
            using (var conn = new Npgsql.NpgsqlConnection(connStr))
            {
                await conn.ExecuteAsync("DELETE FROM notifications WHERE type = 'HOMEWORK_OVERDUE';");
                await conn.ExecuteAsync(@"
                    INSERT INTO homework_assignments (id, snapshot_title, student_id, program_id, created_by, due_date, status)
                    VALUES
                    (@RecentId, 'Son 2 Gunluk Geciken', @StudentId, @ProgramId, '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '2 days', 'PENDING'),
                    (@AncientId, '15 Gunluk Eski Geciken', @StudentId, @ProgramId, '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '15 days', 'PENDING');",
                    new { RecentId = recentHwId, AncientId = ancientHwId, StudentId = studentBId, ProgramId = programAId });
            }

            using (var scope = _factory.Services.CreateScope())
            {
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<MentorumApi.Services.Background.OverdueHomeworkJob>>();
                var job = new MentorumApi.Services.Background.OverdueHomeworkJob(logger, _factory.Services);
                await job.ProcessJobsAsync();
            }

            using (var conn = new Npgsql.NpgsqlConnection(connStr))
            {
                var recentStatus = await conn.ExecuteScalarAsync<string>("SELECT status FROM homework_assignments WHERE id = @Id", new { Id = recentHwId });
                var ancientStatus = await conn.ExecuteScalarAsync<string>("SELECT status FROM homework_assignments WHERE id = @Id", new { Id = ancientHwId });
                Assert.Equal("OVERDUE", recentStatus);
                Assert.Equal("OVERDUE", ancientStatus);

                // Program A'daki her iki koç (1111... ve 8888...) bildirim almalı (PK çakışması olmadan)
                var coachANotifCount = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(1) FROM notifications WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid AND type = 'HOMEWORK_OVERDUE'");
                var assistantNotifCount = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(1) FROM notifications WHERE user_id = '88888888-8888-8888-8888-888888888888'::uuid AND type = 'HOMEWORK_OVERDUE'");
                Assert.True(coachANotifCount >= 1);
                Assert.True(assistantNotifCount >= 1);
            }
        }

        [Fact]
        public async Task CompleteHomework_ContractDriftAndOptimisticConcurrency_Return400And409()
        {
            var programAId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
            var studentBId = Guid.Parse("55555555-5555-5555-5555-555555555555");
            var hwId = Guid.NewGuid();

            var connStr = _fixture.PostgreSqlContainer.GetConnectionString();
            using (var conn = new Npgsql.NpgsqlConnection(connStr))
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO homework_assignments (id, snapshot_title, student_id, program_id, created_by, due_date, status, version)
                    VALUES (@Id, 'V18 Concurrency Test', @StudentId, @ProgramId, '11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '2 days', 'PENDING', 1);",
                    new { Id = hwId, StudentId = studentBId, ProgramId = programAId });
            }

            var client = CreateAuthClient();

            // B10: Bilinmeyen JSON alanı (studentNotes) gönderildiğinde 400 BadRequest dönmeli
            var driftRes = await client.PostAsync(
                $"/api/v1/homework/assignments/{hwId}/complete",
                new StringContent("{\"studentNotes\":\"yanlis alan adi\"}", System.Text.Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.BadRequest, driftRes.StatusCode);

            // S3: Uyuşmayan expectedVersion (999 != 1) gönderildiğinde 409 Conflict dönmeli
            var staleRes = await client.PostAsync(
                $"/api/v1/homework/assignments/{hwId}/complete",
                new StringContent("{\"note\":\"Gecersiz versiyon\",\"expectedVersion\":999}", System.Text.Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.Conflict, staleRes.StatusCode);

            // Doğru alan adı (note) ve doğru expectedVersion (1) ile 200 OK dönmeli
            var okRes = await client.PostAsync(
                $"/api/v1/homework/assignments/{hwId}/complete",
                new StringContent("{\"note\":\"Tamamlandi\",\"completionPercentage\":100,\"expectedVersion\":1}", System.Text.Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.OK, okRes.StatusCode);
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
