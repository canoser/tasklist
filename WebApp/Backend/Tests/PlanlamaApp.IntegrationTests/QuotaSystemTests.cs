using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PlanlamaApp.Api.Controllers;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using PlanlamaApp.IntegrationTests.Infrastructure;
using Xunit;

namespace PlanlamaApp.IntegrationTests
{
    public class QuotaSystemTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;

        public QuotaSystemTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task StandardTaskCreation_ShouldNotDeductQuota()
        {
            // Arrange
            var taskData = new
            {
                Title = "Integration Test Task",
                TaskType = "Homework"
            };

            // Act
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/tasks");
            request.Content = JsonContent.Create(taskData);
            request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
            var response = await _client.SendAsync(request);

            // Assert
            if (response.StatusCode != HttpStatusCode.Created)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                Assert.Fail($"Status Code was {response.StatusCode}. Content: {errorContent}");
            }
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            
            // Check quota status to ensure nothing was deducted for DailyTaskLimit (which no longer exists) or AiTaskCreation
            var quotaResponse = await _client.GetAsync("/api/quota/status/AiTaskCreation");
            quotaResponse.EnsureSuccessStatusCode();
            
            var quotaData = await quotaResponse.Content.ReadFromJsonAsync<QuotaStatusResponse>();
            quotaData.Should().NotBeNull();
            quotaData.Used.Should().Be(0, "Creating a standard task should not consume AiTaskCreation quota.");
        }

        [Fact]
        public async Task QuotaManager_AiTaskCreation_ShouldDeductAndRejectWhenExceeded()
        {
            // Act & Assert using the actual QuotaManager from DI
            using var scope = _factory.Services.CreateScope();
            var quotaManager = scope.ServiceProvider.GetRequiredService<IQuotaManager>();
            var tenantId = "tenant-exceed-test-" + Guid.NewGuid().ToString();
            var plan = TestAuthHandler.DefaultPlan;

            // The default limit for AiTaskCreation is 5.
            for (int i = 0; i < 5; i++)
            {
                var success = await quotaManager.TryDeductAsync(tenantId, plan, "AiTaskCreation");
                success.Should().BeTrue($"Deduction {i + 1} should succeed within limit 5.");
            }

            // The 6th deduction should fail
            var exceeded = await quotaManager.TryDeductAsync(tenantId, plan, "AiTaskCreation");
            exceeded.Should().BeFalse("Deduction should fail after reaching the limit of 5.");

        }

        [Fact]
        public async Task RewardedAd_ShouldGrant5Credits()
        {
            // Arrange
            var rewardRequest = new QuotaController.RewardRequest
            {
                ResourceType = "AiTaskCreation",
                AdToken = "DEV_TEST_TOKEN"
            };

            // Act
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/quota/reward");
            request.Content = JsonContent.Create(rewardRequest);
            request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
            var response = await _client.SendAsync(request);

            // Assert
            if (response.StatusCode != HttpStatusCode.OK)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                Assert.Fail($"Status Code was {response.StatusCode}. Content: {errorContent}");
            }
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var quotaResponse = await _client.GetAsync("/api/quota/status/AiTaskCreation");
            var quotaData = await quotaResponse.Content.ReadFromJsonAsync<QuotaStatusResponse>();
            
            quotaData.EarnedLimit.Should().Be(5);
        }

        private class QuotaStatusResponse
        {
            public bool IsPremium { get; set; }
            public int Used { get; set; }
            public int BaseLimit { get; set; }
            public int EarnedLimit { get; set; }
            public int Remaining { get; set; }
            public bool AdsEnabled { get; set; }
            public string Region { get; set; }
        }
    }
}
