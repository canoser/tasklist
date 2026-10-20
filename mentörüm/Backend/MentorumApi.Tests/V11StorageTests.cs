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
    // R2'ye bağımlı olmayan, güvenli depolama testleri.
    public class V11StorageTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public V11StorageTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
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
        public async Task Coach_StorageUsage_ReturnsOk()
        {
            var client = CreateCoachClient();
            var res = await client.GetAsync("/api/v1/coach/storage-usage");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Coach_ToggleTeacherFileSharing_ReturnsOk()
        {
            var client = CreateCoachClient();
            var json = new StringContent("{\"allowed\":false}", Encoding.UTF8, "application/json");
            var res = await client.PutAsync("/api/v1/courses/cccccccc-cccc-cccc-cccc-cccccccccccc/teacher-file-sharing", json);
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Coach_ToggleFileSharing_UnknownCourse_ReturnsNotFound()
        {
            var client = CreateCoachClient();
            var json = new StringContent("{\"allowed\":true}", Encoding.UTF8, "application/json");
            var res = await client.PutAsync("/api/v1/courses/00000000-0000-0000-0000-000000000001/teacher-file-sharing", json);
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }

        [Fact]
        public async Task Upload_UnsupportedExtension_ReturnsBadRequest()
        {
            var client = CreateCoachClient();
            var json = new StringContent(
                "{\"fileName\":\"virus.exe\",\"fileSizeInBytes\":100,\"contentType\":\"application/octet-stream\"}",
                Encoding.UTF8, "application/json");
            var res = await client.PostAsync("/api/v1/uploads/url", json);
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task Upload_DocumentOver10Mb_ReturnsBadRequest()
        {
            var client = CreateCoachClient();
            var json = new StringContent(
                "{\"fileName\":\"rapor.pdf\",\"fileSizeInBytes\":12000000,\"contentType\":\"application/pdf\"}",
                Encoding.UTF8, "application/json");
            var res = await client.PostAsync("/api/v1/uploads/url", json);
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }
    }

    public class FakeStorageService : IStorageService
    {
        public string GenerateUploadUrl(string objectKey, string contentType, TimeSpan expiresIn) => "https://fake.example/" + objectKey;
        public string GenerateDownloadUrl(string objectKey, TimeSpan expiresIn) => "https://fake.example/" + objectKey;
        public Task DeleteFileAsync(string objectKey) => Task.CompletedTask;
        public Task<long?> GetObjectInfoAsync(string objectKey) => Task.FromResult<long?>(12345);
    }
}
