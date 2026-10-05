using Dapper;
using MentorumApi.Data;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MentorumApi.Services.Background
{
    public interface IJobScheduler
    {
        Task ProcessJobsAsync();
    }

    public class OverdueHomeworkJob : BackgroundService, IJobScheduler
    {
        private readonly ILogger<OverdueHomeworkJob> _logger;
        private readonly IServiceProvider _serviceProvider;

        public OverdueHomeworkJob(ILogger<OverdueHomeworkJob> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OverdueHomeworkJob (Cron) başlatıldı.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessJobsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "OverdueHomeworkJob çalıştırılırken hata oluştu.");
                }

                // MVP için 1 saatte bir çalıştır.
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }

        public async Task ProcessJobsAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var dbFactory = scope.ServiceProvider.GetRequiredService<DbConnectionFactory>();

            using var conn = dbFactory.CreateConnection();
            conn.Open();

            bool hasMore = true;
            int totalProcessed = 0;

            while (hasMore)
            {
                using var transaction = conn.BeginTransaction();
                try
                {
                    var sql = @"
                        UPDATE homework_assignments 
                        SET status = 'OVERDUE', updated_at = @Now 
                        WHERE id IN (
                            SELECT id FROM homework_assignments 
                            WHERE status = 'PENDING' AND due_date < CURRENT_DATE
                            LIMIT 100
                        )
                        RETURNING id, student_id, program_id;";

                    var overdueAssignments = await conn.QueryAsync(sql, new { Now = DateTime.UtcNow }, transaction);
                    
                    if (overdueAssignments.Any())
                    {
                        totalProcessed += overdueAssignments.Count();
                        
                        // Notifikasyonları oluştur
                        var notifSql = @"
                            INSERT INTO notifications (id, user_id, type, title, body, created_at)
                            VALUES (@Id, @UserId, 'HOMEWORK_OVERDUE', 'Gecikmiş Ödev', @Body, @Now)";
                            
                        foreach (var hw in overdueAssignments)
                        {
                            // Öğrenciye bildirim
                            await conn.ExecuteAsync(notifSql, new { Id = Guid.NewGuid(), UserId = hw.student_id, Body = "Bir ödevinizin süresi doldu.", Now = DateTime.UtcNow }, transaction);
                            // Koça bildirim
                            await conn.ExecuteAsync(@"
                                INSERT INTO notifications (id, user_id, type, title, body, created_at)
                                SELECT @Id, pc.coach_id, 'HOMEWORK_OVERDUE', 'Gecikmiş Ödev', @Body, @Now
                                FROM program_coaches pc WHERE pc.program_id = @ProgramId",
                                new { Id = Guid.NewGuid(), ProgramId = hw.program_id, Body = "Bir öğrencinizin ödev süresi doldu.", Now = DateTime.UtcNow }, transaction);
                        }
                    }
                    else
                    {
                        hasMore = false;
                    }

                    transaction.Commit();
                }
                catch (Exception)
                {
                    transaction.Rollback();
                    throw;
                }
            }

            if (totalProcessed > 0)
                _logger.LogInformation("Toplam {Total} gecikmiş ödev işlendi ve bildirim gönderildi.", totalProcessed);
        }
    }
}
