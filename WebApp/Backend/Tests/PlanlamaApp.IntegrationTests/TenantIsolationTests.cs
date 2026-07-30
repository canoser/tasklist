using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.IntegrationTests.Infrastructure;
using Xunit;

namespace PlanlamaApp.IntegrationTests
{
    public class TenantIsolationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;

        public TenantIsolationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task QuotaManager_TenantA_ShouldNotAffectTenantB()
        {
            using var scope = _factory.Services.CreateScope();
            var quotaManager = scope.ServiceProvider.GetRequiredService<IQuotaManager>();
            var plan = TestAuthHandler.DefaultPlan;

            string tenantA = "tenant-A";
            string tenantB = "tenant-B";

            // Tenant A exhausts their AiTaskCreation quota (limit is 5)
            for (int i = 0; i < 5; i++)
            {
                await quotaManager.TryDeductAsync(tenantA, plan, "AiTaskCreation");
            }
            var tenantA_Exceeded = await quotaManager.TryDeductAsync(tenantA, plan, "AiTaskCreation");
            tenantA_Exceeded.Should().BeFalse("Tenant A has reached their limit.");

            // Tenant B should still have their full quota
            var tenantB_Success = await quotaManager.TryDeductAsync(tenantB, plan, "AiTaskCreation");
            tenantB_Success.Should().BeTrue("Tenant B's quota should be isolated from Tenant A's usage.");
        }
    }
}
