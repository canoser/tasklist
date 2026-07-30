using System.Data;
using System.Linq;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PlanlamaApp.Infrastructure;

namespace PlanlamaApp.IntegrationTests.Infrastructure
{
    public class CustomWebApplicationFactory : WebApplicationFactory<Program>
    {
        private SqliteConnection _connection;

        public CustomWebApplicationFactory()
        {
            // Keep the connection open so the in-memory database doesn't disappear
            _connection = new SqliteConnection("Data Source=InMemorySample;Mode=Memory;Cache=Shared");
            _connection.Open();
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureTestServices(services =>
            {
                // 1. Remove the existing IDbConnection registration
                var dbDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(IDbConnection));
                if (dbDescriptor != null)
                {
                    services.Remove(dbDescriptor);
                }

                // 2. Add our In-Memory SQLite connection
                services.AddScoped<IDbConnection>(sp => 
                {
                    var conn = new SqliteConnection("Data Source=InMemorySample;Mode=Memory;Cache=Shared");
                    // We don't open it here because Dapper/Repositories will open it when needed,
                    // but since _connection is open at class level, the DB state persists.
                    return conn;
                });

                // 3. Override ITenantProvider
                var tenantDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(PlanlamaApp.Application.Interfaces.ITenantProvider));
                if (tenantDescriptor != null) services.Remove(tenantDescriptor);
                
                services.AddScoped<PlanlamaApp.Application.Interfaces.ITenantProvider>(sp => 
                {
                    var mock = new Moq.Mock<PlanlamaApp.Application.Interfaces.ITenantProvider>();
                    mock.Setup(m => m.GetTenantId()).Returns(TestAuthHandler.DefaultTenantId);
                    return mock.Object;
                });

                // 4. Migrate the database
                DatabaseMigration.Run(_connection);

                // 4. Override Authentication to use our TestAuthHandler
                services.AddAuthentication("TestAuth")
                        .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestAuth", options => { });
                
                // Force default challenge scheme to be TestAuth
                services.PostConfigure<AuthenticationOptions>(options =>
                {
                    options.DefaultAuthenticateScheme = "TestAuth";
                    options.DefaultChallengeScheme = "TestAuth";
                });
            });
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _connection?.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
