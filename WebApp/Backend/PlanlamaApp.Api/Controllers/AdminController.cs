using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Data;
using Dapper;
using Microsoft.AspNetCore.SignalR;
using PlanlamaApp.Api.Hubs;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "AdminOnly")] // Sadece canoser@gmail.com erişebilir
    public class AdminController : ControllerBase
    {
        private readonly ISettingsService _settingsService;
        private readonly IHubContext<AppHub> _hubContext;

        public AdminController(ISettingsService settingsService, IHubContext<AppHub> hubContext)
        {
            _settingsService = settingsService;
            _hubContext = hubContext;
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await _settingsService.GetAllSettingsAsync();
            return Ok(settings);
        }

        [HttpGet("system-errors")]
        public async Task<IActionResult> GetSystemErrors([FromServices] ISystemErrorRepository systemErrorRepository)
        {
            var errors = await systemErrorRepository.GetRecentErrorsAsync(100);
            return Ok(errors);
        }

        public class UpdateSettingRequest
        {
            public string Value { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
        }

        [HttpPut("settings/{key}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> UpdateSetting(string key, [FromBody] UpdateSettingRequest request)
        {
            if (string.IsNullOrEmpty(request.Value))
            {
                return BadRequest("Value alanı boş olamaz.");
            }

            await _settingsService.UpdateSettingAsync(key, request.Value, request.Description);
            
            return Ok(new { Message = $"{key} ayarı başarıyla güncellendi." });
        }

        [HttpGet("users/pending")]
        public async Task<IActionResult> GetPendingUsers([FromServices] IUserRepository userRepository)
        {
            var users = await userRepository.GetPendingUsersAsync();
            return Ok(users);
        }

        public class ApproveUserRequest
        {
            public int? CustomAiLimit { get; set; }
            public int? CustomStorageLimit { get; set; }
        }

        [HttpPost("users/{userId}/approve")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> ApproveUser(string userId, [FromBody] ApproveUserRequest request, [FromServices] IUserRepository userRepository)
        {
            await userRepository.ApproveUserAsPremiumAsync(userId, request.CustomAiLimit, request.CustomStorageLimit);
            
            // SignalR üzerinden onay bekleyen kullanıcı tablosunu (Admin) ve onaylanan kullanıcıyı uyar
            await _hubContext.Clients.Group("AdminGroup").SendAsync("PendingUsersUpdated");
            await _hubContext.Clients.User(userId).SendAsync("UserApproved");
            
            return Ok(new { Message = "Kullanıcı başarıyla onaylandı ve Premium yapıldı." });
        }

        [HttpDelete("users/{userId}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> RejectUser(string userId, [FromServices] IUserRepository userRepository)
        {
            var success = await userRepository.DeleteUserAsync(userId);
            if (!success)
            {
                return BadRequest(new { Message = "Kullanıcı silinemedi." });
            }

            // SignalR ile Admin'leri ve Kullanıcıyı uyar (Eğer WebSocket'e hala bağlıysa)
            await _hubContext.Clients.Group("AdminGroup").SendAsync("PendingUsersUpdated");
            await _hubContext.Clients.User(userId).SendAsync("UserRejected"); // Opsiyonel, genelde bağlı olmaz
            
            return Ok(new { Message = "Kullanıcı reddedildi ve silindi." });
        }

        [HttpGet("users/search")]
        public async Task<IActionResult> SearchUsers([FromQuery] string email, [FromServices] IUserRepository userRepository)
        {
            if (string.IsNullOrEmpty(email)) return BadRequest(new { Message = "Email parametresi gereklidir." });
            var users = await userRepository.SearchUsersByEmailAsync(email);
            return Ok(users);
        }

        public class OverrideUserLimitsRequest
        {
            public string SubscriptionPlan { get; set; } = "free";
            public int? CustomAiLimit { get; set; }
            public int? CustomStorageLimit { get; set; }
            public int? CustomWorkspaceLimit { get; set; }
        }

        [HttpPut("users/{userId}/override")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> OverrideUserLimits(string userId, [FromBody] OverrideUserLimitsRequest request, [FromServices] IUserRepository userRepository)
        {
            var success = await userRepository.UpdateUserLimitsAsync(
                userId, 
                request.SubscriptionPlan, 
                request.CustomAiLimit, 
                request.CustomStorageLimit, 
                request.CustomWorkspaceLimit);
                
            if (!success) return NotFound(new { Message = "Kullanıcı bulunamadı veya güncelleme başarısız." });
            
            return Ok(new { Message = "Kullanıcı limitleri başarıyla güncellendi." });
        }

        [HttpGet("usage-metrics")]
        public async Task<IActionResult> GetGlobalUsageMetrics([FromServices] IUsageTrackingRepository usageTrackingRepository)
        {
            var metrics = await usageTrackingRepository.GetGlobalUsageMetricsAsync();
            return Ok(metrics);
        }

        [HttpGet("system-stats")]
        public async Task<IActionResult> GetSystemStats([FromServices] IDbConnection dbConnection)
        {
            var stats = new
            {
                TotalUsers = await dbConnection.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Users WHERE IsActive = true;"),
                TotalUsersDeleted = await dbConnection.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Users WHERE IsActive = false;"),
                PremiumUsers = await dbConnection.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Users WHERE SubscriptionPlan = 'premium' AND IsActive = true;"),
                PremiumUsersDeleted = await dbConnection.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Users WHERE SubscriptionPlan = 'premium' AND IsActive = false;"),
                TotalWorkspaces = await dbConnection.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Workspaces WHERE IsActive = true;"),
                TotalWorkspacesDeleted = await dbConnection.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Workspaces WHERE IsActive = false;"),
                TotalTasks = await dbConnection.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM TaskItems;")
            };
            return Ok(stats);
        }

        [HttpGet("cloudflare-stats")]
        public async Task<IActionResult> GetCloudflareStats([FromServices] IStorageService storageService)
        {
            var stats = await storageService.GetBucketStatsAsync();
            return Ok(new
            {
                totalSizeInBytes = stats.TotalSizeInBytes,
                objectCount = stats.ObjectCount
            });
        }

        [HttpGet("resource-expenses")]
        public async Task<IActionResult> GetResourceExpenses([FromServices] IDbConnection dbConnection)
        {
            var sql = @"
                SELECT 
                    u.Id as UserId,
                    u.Name as UserName,
                    u.Email as UserEmail,
                    u.SubscriptionPlan,
                    ut.UsedAmount as TotalStorageUsed
                FROM Users u
                LEFT JOIN UsageTracking ut ON u.Id = ut.TenantId AND ut.ResourceType = 'TotalStorage'
                ORDER BY ut.UsedAmount DESC NULLS LAST;
            ";
            
            var expenses = await dbConnection.QueryAsync(sql);
            return Ok(expenses);
        }

        [HttpPost("sync-r2-storage")]
        public async Task<IActionResult> SyncR2Storage([FromServices] IStorageService storageService, [FromServices] IDbConnection dbConnection)
        {
            // Note: Normalde tüm objeleri listeleyip klasör (TenantId) bazlı gruplayarak UsageTracking tablosunu update etmeliyiz.
            // Bu basit bir kalibrasyon örneğidir. Gerçek senaryoda StorageMaintenanceService üzerinden çağrılır.
            
            var stats = await storageService.GetBucketStatsAsync();
            
            // Sadece bilgilendirme dönüyoruz. Detaylı tenant bazlı senkronizasyon için 
            // AWS S3 ListObjects'den dönen Prefix'lerin parse edilmesi gerekir.
            return Ok(new { 
                Message = "R2 ile bağlantı kuruldu ve genel istatistikler çekildi. Kullanıcı kotaları arkaplanda eşitlenecektir.", 
                TotalSizeInBytes = stats.TotalSizeInBytes,
                ObjectCount = stats.ObjectCount
            });
        }

        // ==========================================
        // WORKSPACE MANAGEMENT (ADMIN)
        // ==========================================

        public class AdminWorkspaceDto
        {
            public int Id { get; set; }
            public string? TenantId { get; set; }
            public string? OwnerId { get; set; }
            public string Name { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string? InviteCode { get; set; }
            public string Type { get; set; } = "Group";
            public string? Settings { get; set; }
            public bool IsActive { get; set; }
            public System.DateTime CreatedAt { get; set; }
            public System.DateTime UpdatedAt { get; set; }
            public string OwnerEmail { get; set; } = string.Empty;
            public string OwnerName { get; set; } = string.Empty;
        }

        [HttpGet("workspaces")]
        public async Task<IActionResult> GetAllWorkspaces([FromServices] IDbConnection dbConnection)
        {
            var sql = @"
                SELECT w.*, u.Email as OwnerEmail, u.Name as OwnerName
                FROM Workspaces w
                LEFT JOIN Users u ON w.OwnerId = u.Id
                ORDER BY w.Name ASC;
            ";
            var workspaces = await dbConnection.QueryAsync<AdminWorkspaceDto>(sql);
            return Ok(workspaces);
        }

        public class AdminUpdateWorkspaceRequest
        {
            public string Name { get; set; } = string.Empty;
            public string? Description { get; set; }
        }

        [HttpPut("workspaces/{id}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> UpdateWorkspace(int id, [FromBody] AdminUpdateWorkspaceRequest request, [FromServices] IDbConnection dbConnection)
        {
            if (string.IsNullOrEmpty(request.Name)) return BadRequest("Alan adı boş olamaz.");

            var sql = "UPDATE Workspaces SET Name = @Name, Description = @Description, UpdatedAt = @UpdatedAt WHERE Id = @Id";
            var affected = await dbConnection.ExecuteAsync(sql, new { 
                Name = request.Name, 
                Description = request.Description, 
                UpdatedAt = System.DateTime.UtcNow,
                Id = id 
            });

            if (affected == 0) return NotFound("Çalışma alanı bulunamadı.");
            
            await _hubContext.Clients.Group("AdminGroup").SendAsync("WorkspaceListUpdated");
            await _hubContext.Clients.Group($"Workspace_{id}").SendAsync("WorkspaceDetailsUpdated", id);
            
            return Ok(new { Message = "Çalışma alanı güncellendi." });
        }

        [HttpPost("workspaces/{id}/restore")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> RestoreWorkspace(int id, [FromServices] IDbConnection dbConnection)
        {
            var sql = "UPDATE Workspaces SET IsActive = true, UpdatedAt = @UpdatedAt WHERE Id = @Id";
            var affected = await dbConnection.ExecuteAsync(sql, new { UpdatedAt = System.DateTime.UtcNow, Id = id });

            if (affected == 0) return NotFound("Çalışma alanı bulunamadı.");
            
            await _hubContext.Clients.Group("AdminGroup").SendAsync("WorkspaceListUpdated");
            
            return Ok(new { Message = "Çalışma alanı tekrar aktif edildi." });
        }

        [HttpDelete("workspaces/{id}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> DeleteWorkspace(int id, [FromQuery] bool hardDelete, [FromServices] IDbConnection dbConnection)
        {
            dbConnection.Open();
            using var transaction = dbConnection.BeginTransaction();
            try 
            {
                if (hardDelete)
                {
                    // Hard Delete: Delete all members, tasks, and then workspace
                    await dbConnection.ExecuteAsync("DELETE FROM WorkspaceMembers WHERE WorkspaceId = @Id", new { Id = id }, transaction);
                    await dbConnection.ExecuteAsync("DELETE FROM TaskItems WHERE WorkspaceId = @Id", new { Id = id }, transaction);
                    var affected = await dbConnection.ExecuteAsync("DELETE FROM Workspaces WHERE Id = @Id", new { Id = id }, transaction);
                    if (affected == 0) throw new System.Exception("Çalışma alanı bulunamadı.");
                }
                else
                {
                    // Soft Delete
                    var affected = await dbConnection.ExecuteAsync("UPDATE Workspaces SET IsActive = false, UpdatedAt = @UpdatedAt WHERE Id = @Id", new { UpdatedAt = System.DateTime.UtcNow, Id = id }, transaction);
                    if (affected == 0) throw new System.Exception("Çalışma alanı bulunamadı.");
                }
                
                transaction.Commit();
                
                await _hubContext.Clients.Group("AdminGroup").SendAsync("WorkspaceListUpdated");
                await _hubContext.Clients.Group($"Workspace_{id}").SendAsync("WorkspaceDeleted", id);
                
                return Ok(new { Message = hardDelete ? "Çalışma alanı ve tüm verileri kalıcı olarak silindi." : "Çalışma alanı pasife alındı (yumuşak silme)." });
            }
            catch (System.Exception ex)
            {
                transaction.Rollback();
                return BadRequest(new { Message = "Silme işlemi sırasında hata oluştu.", Error = ex.Message });
            }
            finally
            {
                dbConnection.Close();
            }
        }

        [HttpGet("calendar/export-template")]
        public IActionResult ExportTemplate()
        {
            var template = new PlanlamaApp.Application.DTOs.CalendarImportExportDto
            {
                Categories = new System.Collections.Generic.List<PlanlamaApp.Application.DTOs.CategoryExportDto>
                {
                    new PlanlamaApp.Application.DTOs.CategoryExportDto { ImportId = "cat_1", Name = "Örnek Ders", SortOrder = 1 },
                    new PlanlamaApp.Application.DTOs.CategoryExportDto { ImportId = "cat_2", Name = "Örnek Konu", ParentImportId = "cat_1", SortOrder = 1 }
                },
                Tasks = new System.Collections.Generic.List<PlanlamaApp.Application.DTOs.TaskExportDto>
                {
                    new PlanlamaApp.Application.DTOs.TaskExportDto
                    {
                        Title = "Örnek Görev",
                        Description = "Bu bir şablon görevidir",
                        TaskType = "Soru Çözme",
                        Deadline = System.DateTime.UtcNow.AddDays(1),
                        TargetCount = 20,
                        CategoryImportId = "cat_2",
                        ChainId = "zincir_1",
                        ChainOrder = 1,
                        Metadata = "{}"
                    }
                }
            };
            return Ok(template);
        }

        [HttpGet("calendar/export-current")]
        public async Task<IActionResult> ExportCurrent(
            [FromServices] ITaskRepository taskRepository,
            [FromServices] ICategoryRepository categoryRepository)
        {
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

            var categories = await categoryRepository.GetAllAsync();
            var tasks = await taskRepository.GetByUserIdAsync(currentUserId);

            var exportDto = new PlanlamaApp.Application.DTOs.CalendarImportExportDto();

            foreach (var cat in categories)
            {
                exportDto.Categories.Add(new PlanlamaApp.Application.DTOs.CategoryExportDto
                {
                    ImportId = $"cat_{cat.Id}",
                    Name = cat.Name,
                    ParentImportId = cat.ParentId.HasValue ? $"cat_{cat.ParentId}" : null,
                    SortOrder = cat.SortOrder
                });
            }

            foreach (var t in tasks)
            {
                exportDto.Tasks.Add(new PlanlamaApp.Application.DTOs.TaskExportDto
                {
                    Title = t.Title,
                    Description = t.Description,
                    TaskType = t.TaskType,
                    Deadline = t.Deadline,
                    TargetCount = t.TargetCount,
                    CategoryImportId = t.CategoryId.HasValue ? $"cat_{t.CategoryId}" : null,
                    ChainId = t.ChainId,
                    ChainOrder = t.ChainOrder,
                    Metadata = t.Metadata,
                    IsHomework = t.IsHomework,
                    IsTeacherAssigned = t.IsTeacherAssigned,
                    OriginalDeadline = t.OriginalDeadline
                });
            }

            return Ok(exportDto);
        }

        [HttpPost("calendar/import")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> ImportCalendar(
            [FromBody] PlanlamaApp.Application.DTOs.CalendarImportExportDto request,
            [FromServices] ICategoryRepository categoryRepository,
            [FromServices] ITaskRepository taskRepository,
            [FromServices] System.Data.IDbConnection dbConnection)
        {
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

            dbConnection.Open();
            using var transaction = dbConnection.BeginTransaction();

            try
            {
                var idMap = new System.Collections.Generic.Dictionary<string, int>();

                // Kategorileri sırayla ekle
                foreach (var catDto in request.Categories)
                {
                    int? newParentId = null;
                    if (!string.IsNullOrEmpty(catDto.ParentImportId))
                    {
                        if (idMap.TryGetValue(catDto.ParentImportId, out var mappedId))
                        {
                            newParentId = mappedId;
                        }
                        else
                        {
                            throw new System.Exception($"Kategori referansı bulunamadı: {catDto.ParentImportId}. Lütfen üst kategorileri JSON'da alt kategorilerden önce tanımlayın.");
                        }
                    }

                    var newCategory = new Category
                    {
                        Name = catDto.Name,
                        ParentId = newParentId,
                        SortOrder = catDto.SortOrder,
                        IsFromTemplate = false,
                        CreatedAt = System.DateTime.UtcNow,
                        UpdatedAt = System.DateTime.UtcNow
                        // TenantId, Repository içindeki CreateAsync metodu tarafından BaseRepository üzerinden ayarlanır.
                    };

                    var newId = await categoryRepository.CreateAsync(newCategory, transaction);
                    if (!string.IsNullOrEmpty(catDto.ImportId))
                    {
                        idMap[catDto.ImportId] = newId;
                    }
                }

                // Görevleri ekle
                foreach (var taskDto in request.Tasks)
                {
                    int? newCategoryId = null;
                    if (!string.IsNullOrEmpty(taskDto.CategoryImportId))
                    {
                        if (idMap.TryGetValue(taskDto.CategoryImportId, out var mappedId))
                        {
                            newCategoryId = mappedId;
                        }
                        // Eğer idMap içinde yoksa DB'de zaten var olan bir ID referans ediliyor olabilir mi? 
                        // Şu an sadece yeni eklenenler destekleniyor veya ImportId formatında olmalı.
                    }

                    var newTask = new TaskItem
                    {
                        UserId = currentUserId,
                        Title = taskDto.Title,
                        Description = taskDto.Description,
                        TaskType = taskDto.TaskType ?? "Soru Çözme",
                        Deadline = taskDto.Deadline,
                        TargetCount = taskDto.TargetCount,
                        CategoryId = newCategoryId,
                        ChainId = taskDto.ChainId,
                        ChainOrder = taskDto.ChainOrder,
                        Metadata = taskDto.Metadata,
                        IsHomework = taskDto.IsHomework,
                        IsTeacherAssigned = taskDto.IsTeacherAssigned,
                        OriginalDeadline = taskDto.OriginalDeadline,
                        CreatedAt = System.DateTime.UtcNow,
                        UpdatedAt = System.DateTime.UtcNow
                        // TenantId Repository'de çözülecek.
                    };

                    await taskRepository.CreateAsync(newTask, transaction);
                }

                transaction.Commit();
                return Ok(new { Message = "Toplu veri aktarımı başarıyla tamamlandı." });
            }
            catch (System.Exception ex)
            {
                transaction.Rollback();
                return BadRequest(new { Message = "İçe aktarma sırasında bir hata oluştu. İşlem geri alındı.", Error = ex.Message });
            }
            finally
            {
                dbConnection.Close();
            }
        }
    }
}
