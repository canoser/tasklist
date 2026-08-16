using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Data;
using Dapper;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "AdminOnly")] // Sadece canoser@gmail.com erişebilir
    public class AdminController : ControllerBase
    {
        private readonly ISettingsService _settingsService;

        public AdminController(ISettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await _settingsService.GetAllSettingsAsync();
            return Ok(settings);
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
            return Ok(new { Message = "Kullanıcı başarıyla onaylandı ve Premium yapıldı." });
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
                TotalUsers = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users WHERE IsActive = true;"),
                TotalUsersDeleted = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users WHERE IsActive = false;"),
                PremiumUsers = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users WHERE SubscriptionPlan = 'premium' AND IsActive = true;"),
                PremiumUsersDeleted = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users WHERE SubscriptionPlan = 'premium' AND IsActive = false;"),
                TotalWorkspaces = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Workspaces WHERE IsActive = true;"),
                TotalWorkspacesDeleted = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Workspaces WHERE IsActive = false;"),
                TotalTasks = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM TaskItems;")
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
