using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;
using MentorumApi.Services;

namespace MentorumApi.Tests
{
    // V13: Öğrenci ekleme esnekliği (gölge profil) & bireysel/grup geçişi testleri.
    public class V13StudentFlexibilityTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private static readonly Guid ProgramA = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

        public V13StudentFlexibilityTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        private HttpClient CreateCoachClient()
        {
            var client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.RemoveAll<IStorageService>();
                    services.AddSingleton<IStorageService, FakeStorageService>();

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
        public async Task Coach_CanCreateShadowStudent_WithoutEmail()
        {
            var client = CreateCoachClient();
            var json = new StringContent("{\"firstName\":\"Ali\",\"lastName\":\"Veli\",\"classLevel\":11}", Encoding.UTF8, "application/json");
            var res = await client.PostAsync($"/api/v1/programs/{ProgramA}/students", json);
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Coach_CanCreateStudent_WithEmail()
        {
            var client = CreateCoachClient();
            var json = new StringContent("{\"firstName\":\"Ayse\",\"lastName\":\"Kaya\",\"email\":\"ayse.v13@test.com\"}", Encoding.UTF8, "application/json");
            var res = await client.PostAsync($"/api/v1/programs/{ProgramA}/students", json);
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Coach_CannotMoveStudentToUnknownGroup_ReturnsBadRequest()
        {
            var client = CreateCoachClient();
            var json = new StringContent("{\"groupId\":\"00000000-0000-0000-0000-000000000099\"}", Encoding.UTF8, "application/json");
            var res = await client.PostAsync($"/api/v1/programs/{ProgramA}/students/55555555-5555-5555-5555-555555555555/move-to-group", json);
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }
    }
}
