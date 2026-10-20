using Dapper;
using MentorumApi.Data;
using MentorumApi.Services;

namespace MentorumApi.Services.Background
{
    /// <summary>Periyodik depolama temizliği: confirm edilmemiş (PENDING) yüklemeleri temizler.</summary>
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
            _logger.LogInformation("Storage Maintenance Service başladı.");
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupOrphanPendingUploadsAsync(stoppingToken);
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Storage Maintenance hatası.");
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
            }
        }

        private async Task CleanupOrphanPendingUploadsAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbFactory = scope.ServiceProvider.GetRequiredService<DbConnectionFactory>();
            var storage = scope.ServiceProvider.GetRequiredService<IStorageService>();

            using var conn = dbFactory.CreateConnection();
            var orphaned = await conn.QueryAsync<OrphanUpload>(
                "SELECT id AS Id, object_key AS ObjectKey FROM uploads WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '15 minutes'");

            foreach (var row in orphaned)
            {
                if (stoppingToken.IsCancellationRequested) break;
                await conn.ExecuteAsync(
                    "UPDATE uploads SET status = 'DELETED', updated_at = NOW() WHERE id = @Id",
                    new { Id = row.Id });
                try
                {
                    await storage.DeleteFileAsync(row.ObjectKey);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "R2 nesnesi silinemedi: {Key}", row.ObjectKey);
                }
            }
        }

        private class OrphanUpload
        {
            public Guid Id { get; set; }
            public string ObjectKey { get; set; } = "";
        }
    }
}
