using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using PlanlamaApp.IntegrationTests.Infrastructure;
using Xunit;

namespace PlanlamaApp.IntegrationTests
{
    public class IdempotencyTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public IdempotencyTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task DoublePost_WithSameIdempotencyKey_ShouldReturnConflict()
        {
            // Arrange
            var taskData = new
            {
                Title = "Idempotency Offline Sync Retry Task",
                TaskType = "Homework"
            };

            var idempotencyKey = Guid.NewGuid().ToString();

            var request1 = new HttpRequestMessage(HttpMethod.Post, "/api/tasks");
            request1.Content = JsonContent.Create(taskData);
            request1.Headers.Add("Idempotency-Key", idempotencyKey);

            var request2 = new HttpRequestMessage(HttpMethod.Post, "/api/tasks");
            request2.Content = JsonContent.Create(taskData);
            request2.Headers.Add("Idempotency-Key", idempotencyKey);

            // Act
            var response1 = await _client.SendAsync(request1);
            var response2 = await _client.SendAsync(request2);

            // Assert
            response1.StatusCode.Should().Be(HttpStatusCode.Created);
            response2.StatusCode.Should().Be(HttpStatusCode.Conflict, "The second request with the same idempotency key should be blocked.");
        }
    }
}
