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
                ('33333333-3333-3333-3333-333333333333', 'studentA@test.com', 'Student', 'Student A');
                
                INSERT INTO coaches (id) VALUES ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
                
                INSERT INTO students (id, coach_id) VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222');
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
    }
}
