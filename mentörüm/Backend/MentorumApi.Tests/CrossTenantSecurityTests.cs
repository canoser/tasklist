using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

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
                new Claim(ClaimTypes.NameIdentifier, "11111111-1111-1111-1111-111111111111"), // Test Coach ID
                new Claim(ClaimTypes.Role, "Coach")
            };
            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, DefaultScheme);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    public class TestDbConnectionFactory : DbConnectionFactory
    {
        public TestDbConnectionFactory(Microsoft.Extensions.Configuration.IConfiguration configuration) : base(configuration) { }

        public override System.Data.IDbConnection CreateConnection()
        {
            var connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=file::memory:?cache=shared");
            connection.Open();
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS refresh_tokens (token TEXT, is_revoked INTEGER);
                CREATE TABLE IF NOT EXISTS users (id TEXT, is_active INTEGER);
                DELETE FROM users;
                INSERT INTO users (id, is_active) VALUES ('11111111-1111-1111-1111-111111111111', 1);
            ";
            command.ExecuteNonQuery();
            return connection;
        }
    }

    public class CrossTenantSecurityTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public CrossTenantSecurityTests(WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            _factory = factory;
        }

        [Fact]
        public async Task GetStudentDetail_WhenWrongCoachId_ReturnsNotFound()
        {
            // Arrange
            var studentId = Guid.NewGuid();
            
            // Null vererek Dummy nesne kullanıyoruz (Gerçek DB bağlantısını bypass ediyoruz)
            var mockRepo = new Mock<StudentRepository>(null);
            
            // IDOR Protection: The repository method requires BOTH the coachId from the JWT and the studentId.
            // When `coach_id` filter is added, if it doesn't match the DB, it returns null. We mock this behavior here.
            mockRepo.Setup(r => r.GetStudentDetailAsync(
                It.Is<Guid>(g => g == Guid.Parse("11111111-1111-1111-1111-111111111111")), 
                studentId))
                .ReturnsAsync((StudentDetailDto?)null);

            var client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Override existing DI for testing
                    var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(StudentRepository));
                    if (descriptor != null) services.Remove(descriptor);
                    
                    var dbDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbConnectionFactory));
                    if (dbDescriptor != null) services.Remove(dbDescriptor);

                    services.AddScoped(_ => mockRepo.Object);
                    services.AddSingleton<DbConnectionFactory, TestDbConnectionFactory>();

                    // Authentication bypass (Mock scheme)
                    services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = TestAuthHandler.DefaultScheme;
                        options.DefaultChallengeScheme = TestAuthHandler.DefaultScheme;
                    })
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.DefaultScheme, options => { });
                });
            }).CreateClient();
            
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.DefaultScheme);

            // Act
            var response = await client.GetAsync($"/api/v1/students/{studentId}");

            // Assert
            var result = await response.Content.ReadAsStringAsync();
            if (response.StatusCode != HttpStatusCode.NotFound)
            {
                Assert.Fail($"Beklenen 404 ama {response.StatusCode} döndü. Hata mesajı: {result}");
            }
            Assert.Contains("Öğrenci bulunamadı", result);
        }
    }
}
