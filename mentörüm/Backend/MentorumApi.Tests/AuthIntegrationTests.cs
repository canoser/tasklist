using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using MentorumApi.DTOs;

namespace MentorumApi.Tests
{
    public class AuthIntegrationTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public AuthIntegrationTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            
            _factory = factory;
        }

        [Fact]
        public async Task Register_ThenLogin_PendingCoach_IsBlocked()
        {
            var client = _factory.CreateClient();
            var email = "newcoach@test.com";
            var password = "Password123!";

            // 1. Register → OK (koç PENDING oluşturulur; token verilmez)
            var registerReq = new RegisterRequest
            {
                Email = email,
                Password = password,
                FullName = "New Coach"
            };
            var registerRes = await client.PostAsJsonAsync("/api/v1/auth/register", registerReq);
            Assert.Equal(HttpStatusCode.OK, registerRes.StatusCode);

            // 2. Login → 403 (onay bekleniyor)
            var loginReq = new LoginRequest
            {
                Email = email,
                Password = password
            };
            var loginRes = await client.PostAsJsonAsync("/api/v1/auth/login", loginReq);
            Assert.Equal(HttpStatusCode.Forbidden, loginRes.StatusCode);
        }

        [Fact]
        public async Task SendInvite_ThenAccept_ThenLogin_ShouldSucceed()
        {
            // Set up authenticated client for sending invite
            var authClient = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = TestAuthHandler.DefaultScheme;
                        options.DefaultChallengeScheme = TestAuthHandler.DefaultScheme;
                    })
                    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.DefaultScheme, options => { });
                });
            }).CreateClient();
            authClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.DefaultScheme);

            var email = "invitedstudent@test.com";
            var password = "Password123!";

            // 1. Send Invite as Coach (TestScheme mocks Coach A)
            var inviteReq = new InviteRequest
            {
                Email = email,
                Role = "Student",
                RelatedId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") // Program A (Coach A yöneticisi)
            };
            var inviteRes = await authClient.PostAsJsonAsync("/api/v1/invites/send", inviteReq);
            Assert.Equal(HttpStatusCode.OK, inviteRes.StatusCode);

            // Parse response to get the code
            var inviteData = await inviteRes.Content.ReadFromJsonAsync<JsonElement>();
            var code = inviteData.GetProperty("code").GetString();
            Assert.NotNull(code);

            // 2. Accept Invite
            var unauthClient = _factory.CreateClient();
            var acceptReq = new InviteAcceptRequest
            {
                FullName = "Invited Student",
                Password = password
            };
            var acceptRes = await unauthClient.PostAsJsonAsync($"/api/v1/invites/{code}/accept", acceptReq);
            Assert.Equal(HttpStatusCode.OK, acceptRes.StatusCode);

            // 3. Login
            var loginReq = new LoginRequest
            {
                Email = email,
                Password = password
            };
            var loginRes = await unauthClient.PostAsJsonAsync("/api/v1/auth/login", loginReq);
            Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
            
            var authRes = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
            Assert.NotNull(authRes);
            Assert.NotNull(authRes.AccessToken);
            Assert.Equal(email, authRes.User.Email);
        }
    }
}
