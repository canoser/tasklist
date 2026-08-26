using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using Dapper;

namespace PlanlamaApp.Infrastructure.Services
{
    public class StorageMaintenanceService : BackgroundService
    {
        private readonly ILogger<StorageMaintenanceService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public StorageMaintenanceService(ILogger<StorageMaintenanceService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Storage Maintenance Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupExpiredReservationsAsync(stoppingToken);
                    // R2 Sync (Calibration) logic can be called here periodically based on DateTime
                    await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing Storage Maintenance tasks.");
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); // Hata durumunda 1 dk bekle
                }
            }
        }

        private async Task CleanupExpiredReservationsAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbConnection = scope.ServiceProvider.GetRequiredService<System.Data.IDbConnection>();
            var quotaManager = scope.ServiceProvider.GetRequiredService<IQuotaManager>();
            var tenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();
            
            // Son 15 dakikada 'Pending' kalmış dosyaları bul
            var expirationTime = DateTime.UtcNow.AddMinutes(-15);
            var sql = @"
                SELECT Id, TenantId, FileSizeInBytes 
                FROM WorkspaceFiles 
                WHERE UploadStatus = 'Pending' AND CreatedAt < @ExpirationTime;
            ";

            var expiredFiles = await dbConnection.QueryAsync<WorkspaceFile>(sql, new { ExpirationTime = expirationTime });

            foreach (var file in expiredFiles)
            {
                if (stoppingToken.IsCancellationRequested) break;

                // Kotayı iade et (Refund)
                // Note: We need a transaction or simply rely on atomic Refund.
                await quotaManager.RefundAsync(file.TenantId, "free", "TotalStorage", file.FileSizeInBytes);
                
                // Kaydı sil (Soft delete de yapılabilir ama taslak olduğu için hard delete daha temiz)
                await dbConnection.ExecuteAsync("DELETE FROM WorkspaceFiles WHERE Id = @Id", new { Id = file.Id });
                
                _logger.LogInformation($"Expired pending file reservation refunded. TenantId: {file.TenantId}, Size: {file.FileSizeInBytes}");
            }
        }
    }
}
