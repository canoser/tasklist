using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Data;
using System.Security.Claims;
using Dapper;
using Microsoft.AspNetCore.SignalR;
using PlanlamaApp.Api.Hubs;

namespace PlanlamaApp.Api.Controllers
{
    /// <summary>
    /// Görev (TaskItem) yönetimi uçları.
    /// Tüm uçlar [Authorize] ile JWT doğrulaması gerektirir.
    /// Veri değiştiren uçlar (POST/PUT) [ServiceFilter(IdempotencyFilter)] ile mükerrer işleme karşı korunur.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TasksController : ControllerBase
    {
        private readonly ITaskRepository _taskRepository;
        private readonly IQuotaManager _quotaManager;
        private readonly ITaskAssignmentRepository _taskAssignmentRepository;
        private readonly IWorkspaceRepository _workspaceRepository;
        private readonly IDbConnection _dbConnection;
        private readonly IHubContext<AppHub> _hubContext;

        public TasksController(
            ITaskRepository taskRepository, 
            IQuotaManager quotaManager,
            ITaskAssignmentRepository taskAssignmentRepository,
            IWorkspaceRepository workspaceRepository,
            IDbConnection dbConnection,
            IHubContext<AppHub> hubContext)
        {
            _taskRepository = taskRepository;
            _quotaManager = quotaManager;
            _taskAssignmentRepository = taskAssignmentRepository;
            _workspaceRepository = workspaceRepository;
            _dbConnection = dbConnection;
            _hubContext = hubContext;
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        }

        // ── GET ──────────────────────────────────────────────────────────────────

        /// <summary>Belirli bir kullanıcının tüm görevlerini listeler. URL'deki userId ezilir.</summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUser(string userId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            // Sadece kendi görevlerini alabilir
            var tasks = await _taskRepository.GetByUserIdAsync(currentUserId);
            return Ok(tasks);
        }

        /// <summary>Belirli bir kategoriye ait görevleri listeler.</summary>
        [HttpGet("category/{categoryId:int}")]
        public async Task<IActionResult> GetByCategory(int categoryId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var tasks = await _taskRepository.GetByCategoryIdAsync(categoryId);
            // Kendi görevleri olmayanları filtrele
            var userTasks = tasks.Where(t => t.UserId == currentUserId).ToList();
            
            return Ok(userTasks);
        }

        /// <summary>
        /// Zaman Çizelgesi (Timeline) için belirtilen tarih aralığındaki görevleri getirir.
        /// </summary>
        [HttpGet("user/{userId}/timeline")]
        public async Task<IActionResult> GetTimeline(string userId, [FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            if (start >= end)
                return BadRequest("Başlangıç tarihi bitiş tarihinden önce olmalıdır.");

            // Sadece kendi timeline'ını görebilir
            var tasks = await _taskRepository.GetByDateRangeAsync(currentUserId, start, end);
            return Ok(tasks);
        }

        /// <summary>Tek bir görevi Id ile getirir.</summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var task = await _taskRepository.GetByIdAsync(id);
            if (task is null)
                return NotFound(); // IDOR protection: Avoid exposing existence if not owned? Actually NotFound is standard.
                
            var currentUserId = GetCurrentUserId();
            // IDOR koruması: Sadece görevin sahibi veya atayan kişi görebilir
            if (task.UserId != currentUserId && task.AssignedBy != currentUserId)
                return NotFound();

            var tenantId = User.FindFirstValue("tenant_id") ?? "default_tenant";
            var attachmentsSql = @"
                SELECT f.* 
                FROM WorkspaceFiles f
                INNER JOIN TaskFileAttachments tfa ON f.Id = tfa.FileId
                WHERE tfa.TaskId = @TaskId AND f.TenantId = @TenantId AND f.UploadStatus = 'Uploaded' AND f.IsDeleted = FALSE;
            ";
            var attachments = await _dbConnection.QueryAsync<WorkspaceFile>(attachmentsSql, new { TaskId = id, TenantId = tenantId });
            task.Attachments = attachments.ToList();

            return Ok(task);
        }

        // ── POST / PUT / PATCH ───────────────────────────────────────────────────

        /// <summary>Yeni görev oluşturur. Idempotency-Key header zorunludur.</summary>
        [HttpPost]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Create([FromBody] TaskItem task)
        {
            var currentUserId = GetCurrentUserId();
            var subscriptionPlan = User.FindFirst("subscription_plan")?.Value ?? "free";
            if (currentUserId == null) return Unauthorized();

            task.UserId = currentUserId; // Her zaman JWT'den alır
            task.CreatedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;
            var newId = await _taskRepository.CreateAsync(task);
            
            return CreatedAtAction(nameof(GetById), new { id = newId }, new { Id = newId });
        }

        /// <summary>Mevcut görevi günceller. Idempotency-Key header zorunludur.</summary>
        [HttpPut("{id:int}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Update(int id, [FromBody] TaskItem task)
        {
            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null) return NotFound();

            var currentUserId = GetCurrentUserId();
            bool isOwner = existingTask.UserId == currentUserId;
            bool isAssigner = existingTask.AssignedBy == currentUserId;

            if (!isOwner && !isAssigner) return NotFound(); // IDOR koruması

            task.Id = id;
            task.UserId = existingTask.UserId; // Kimliği manipüle edememesi için sabitliyoruz
            task.UpdatedAt = DateTime.UtcNow;
            
            bool success;
            if (isAssigner && !isOwner)
            {
                success = await _taskRepository.UpdateByAssignerAsync(task);
            }
            else
            {
                success = await _taskRepository.UpdateAsync(task);
            }

            if (!success)
                return NotFound();
            
            if (existingTask.AssignedByWorkspaceId.HasValue)
            {
                await _hubContext.Clients.Group($"Workspace_{existingTask.AssignedByWorkspaceId.Value}").SendAsync("WorkspaceTasksUpdated", existingTask.AssignedByWorkspaceId.Value);
            }
            return NoContent();
        }

        /// <summary>
        /// Görevi tamamlandı olarak işaretler ve Detay Kartı'nda skor girişine hazır hale getirir.
        /// </summary>
        [HttpPatch("{id:int}/complete")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> MarkComplete(int id)
        {
            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null) return NotFound();

            var currentUserId = GetCurrentUserId();
            bool isOwner = existingTask.UserId == currentUserId;
            bool isAssigner = existingTask.AssignedBy == currentUserId;

            if (!isOwner && !isAssigner) return NotFound(); // IDOR koruması



            bool success;
            if (isAssigner && !isOwner)
            {
                success = await _taskRepository.MarkAsCompletedByAssignerAsync(id, DateTime.UtcNow);
            }
            else
            {
                success = await _taskRepository.MarkAsCompletedAsync(id, DateTime.UtcNow);
            }

            if (!success)
                return NotFound();

            if (existingTask.AssignedByWorkspaceId.HasValue)
            {
                await _hubContext.Clients.Group($"Workspace_{existingTask.AssignedByWorkspaceId.Value}").SendAsync("WorkspaceTasksUpdated", existingTask.AssignedByWorkspaceId.Value);
            }
            
            return NoContent();
        }

        public class PartialCompleteRequest
        {
            public int DoneAmount { get; set; }
            public DateTime TargetDate { get; set; }
        }

        /// <summary>
        /// Görevin bir kısmını tamamlandı olarak işaretler, kalan kısmı için yeni bir görev oluşturur.
        /// </summary>
        [HttpPost("{id:int}/partial-complete")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> PartialComplete(int id, [FromBody] PartialCompleteRequest request)
        {
            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null) return NotFound();

            var currentUserId = GetCurrentUserId();
            bool isOwner = existingTask.UserId == currentUserId;
            bool isAssigner = existingTask.AssignedBy == currentUserId;

            if (!isOwner && !isAssigner) return NotFound(); // IDOR koruması



            int originalTarget = existingTask.TargetCount ?? 10;
            if (request.DoneAmount >= originalTarget)
            {
                // Eğer tamamı yapıldıysa normal complete çağrılabilir ama buradan da halledelim
                return await MarkComplete(id);
            }

            if (_dbConnection.State != ConnectionState.Open)
                _dbConnection.Open();

            using var transaction = _dbConnection.BeginTransaction();
            try
            {
                // 1. Orijinal görevi güncelle (IsCompleted = 1, TargetCount = DoneAmount)
                existingTask.TargetCount = request.DoneAmount;
                existingTask.IsCompleted = true;
                existingTask.CompletedAt = DateTime.UtcNow;
                existingTask.UpdatedAt = DateTime.UtcNow;

                bool updateSuccess;
                if (isAssigner && !isOwner)
                {
                    updateSuccess = await _taskRepository.UpdateByAssignerAsync(existingTask, transaction);
                }
                else
                {
                    updateSuccess = await _taskRepository.UpdateAsync(existingTask, transaction);
                }

                if (!updateSuccess)
                {
                    transaction.Rollback();
                    return NotFound();
                }

                // 2. Kalan kısım için yeni görev oluştur (Deadline = TargetDate, TargetCount = Remainder)
                var newTask = new TaskItem
                {
                    UserId = existingTask.UserId, // Aynı kişiye kalıyor
                    CategoryId = existingTask.CategoryId,
                    Title = existingTask.Title + " (Kalan)", // " (Kalan)" eklemek anlaşılırlığı artırır
                    Description = existingTask.Description,
                    TaskType = existingTask.TaskType,
                    Deadline = request.TargetDate,
                    IsTeacherAssigned = existingTask.IsTeacherAssigned,
                    TargetCount = originalTarget - request.DoneAmount,
                    WorkspaceId = existingTask.WorkspaceId,
                    ChainTemplateId = existingTask.ChainTemplateId,
                    OriginalDeadline = existingTask.OriginalDeadline,
                    IsHomework = existingTask.IsHomework,
                    AssignedBy = existingTask.AssignedBy,
                    AssignedByWorkspaceId = existingTask.AssignedByWorkspaceId,
                    AssignedByUserId = existingTask.AssignedByUserId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // CreateAsync TenantId by-passını zaten kendisi _dbConnection üzerinden yapar
                var newTaskId = await _taskRepository.CreateAsync(newTask, transaction);

                // Eğer workspace görevi ise atamasını da oluştur
                if (newTask.AssignedByWorkspaceId.HasValue)
                {
                    var assignment = new TaskAssignment
                    {
                        TaskItemId = newTaskId,
                        AssignedUserId = newTask.UserId,
                        CreatedByUserId = newTask.AssignedBy ?? currentUserId,
                        WorkspaceId = newTask.AssignedByWorkspaceId.Value,
                        Status = "Pending"
                    };
                    await _taskAssignmentRepository.AssignAsync(assignment, transaction);
                }

                transaction.Commit();

                if (existingTask.AssignedByWorkspaceId.HasValue)
                {
                    await _hubContext.Clients.Group($"Workspace_{existingTask.AssignedByWorkspaceId.Value}").SendAsync("WorkspaceTasksUpdated", existingTask.AssignedByWorkspaceId.Value);
                }

                return Ok(new { OriginalTask = existingTask, NewTaskId = newTaskId });
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                return StatusCode(500, $"Kısmi tamamlama sırasında hata: {ex.Message}");
            }
        }

        public class AttachFileRequest
        {
            public int FileId { get; set; }
        }

        /// <summary>
        /// Bir dosyayı bir göreve bağlar.
        /// </summary>
        [HttpPost("{id:int}/attach-file")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> AttachFile(int id, [FromBody] AttachFileRequest request)
        {
            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null) return NotFound("Görev bulunamadı.");

            var currentUserId = GetCurrentUserId();
            if (existingTask.UserId != currentUserId && existingTask.AssignedBy != currentUserId) 
                return Forbid(); 

            var tenantId = User.FindFirstValue("tenant_id") ?? "default_tenant";

            var file = await _dbConnection.QueryFirstOrDefaultAsync<WorkspaceFile>(
                "SELECT * FROM WorkspaceFiles WHERE Id = @FileId AND TenantId = @TenantId AND UploadStatus = 'Uploaded' AND IsDeleted = FALSE",
                new { FileId = request.FileId, TenantId = tenantId });

            if (file == null) return NotFound("Dosya bulunamadı veya henüz yüklenmemiş.");

            var sql = @"
                INSERT INTO TaskFileAttachments (TenantId, TaskId, FileId, AttachedAt, AttachedBy)
                VALUES (@TenantId, @TaskId, @FileId, @AttachedAt, @AttachedBy)
                ON CONFLICT (TaskId, FileId) DO NOTHING;
            ";

            await _dbConnection.ExecuteAsync(sql, new {
                TenantId = tenantId,
                TaskId = id,
                FileId = request.FileId,
                AttachedAt = DateTime.UtcNow,
                AttachedBy = currentUserId
            });

            return Ok(new { Message = "Dosya göreve başarıyla bağlandı." });
        }

        // ── DELETE ───────────────────────────────────────────────────────────────

        /// <summary>Görevi siler.</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null) return NotFound();

            var currentUserId = GetCurrentUserId();
            if (existingTask.UserId != currentUserId && existingTask.AssignedBy != currentUserId) 
                return NotFound(); // IDOR koruması: Sadece sahibi veya atayan silebilir.

            if (existingTask.UserId == currentUserId && existingTask.IsTeacherAssigned)
            {
                // Öğrenci, öğretmen tarafından atanan görevi silemez.
                return Forbid(); 
            }

            var success = await _taskRepository.DeleteAsync(id);
            if (!success)
                return NotFound();
            
            if (existingTask.AssignedByWorkspaceId.HasValue)
            {
                await _hubContext.Clients.Group($"Workspace_{existingTask.AssignedByWorkspaceId.Value}").SendAsync("WorkspaceTasksUpdated", existingTask.AssignedByWorkspaceId.Value);
            }
            return NoContent();
        }


        [HttpPut("{id:int}/postpone")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Postpone(int id, [FromBody] PostponeTaskRequest request)
        {
            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null) return NotFound();

            var currentUserId = GetCurrentUserId();
            bool isOwner = existingTask.UserId == currentUserId;
            bool isAssigner = existingTask.AssignedBy == currentUserId;

            if (!isOwner && !isAssigner) return NotFound(); 

            if (_dbConnection.State != ConnectionState.Open)
                _dbConnection.Open();

            using var transaction = _dbConnection.BeginTransaction();
            try
            {
                var userId = existingTask.UserId; // İşlemi yapanın değil, görevin sahibinin ID'sini kullanıyoruz (zincir sahibini bulmak için)
                if (request.PostponeAllChain && existingTask.ChainTemplateId.HasValue && !string.IsNullOrEmpty(userId))
                {
                    // Zincirleme erteleme
                    if (isAssigner && !isOwner)
                    {
                        await _taskRepository.PostponeChainByAssignerAsync(existingTask.ChainTemplateId.Value, userId, existingTask.Deadline ?? DateTime.MinValue, request.DaysToShift, transaction);
                    }
                    else
                    {
                        await _taskRepository.PostponeChainAsync(existingTask.ChainTemplateId.Value, userId, existingTask.Deadline ?? DateTime.MinValue, request.DaysToShift, transaction);
                    }
                }
                else
                {
                    // Tekli görev erteleme
                    if (existingTask.Deadline.HasValue)
                    {
                        existingTask.Deadline = existingTask.Deadline.Value.AddDays(request.DaysToShift);
                    }
                    existingTask.UpdatedAt = DateTime.UtcNow;

                    if (isAssigner && !isOwner)
                    {
                        await _taskRepository.UpdateByAssignerAsync(existingTask, transaction);
                    }
                    else
                    {
                        await _taskRepository.UpdateAsync(existingTask, transaction);
                    }
                }
                
                transaction.Commit();

                if (existingTask.AssignedByWorkspaceId.HasValue)
                {
                    await _hubContext.Clients.Group($"Workspace_{existingTask.AssignedByWorkspaceId.Value}").SendAsync("WorkspaceTasksUpdated", existingTask.AssignedByWorkspaceId.Value);
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                return StatusCode(500, $"Erteleme sırasında hata: {ex.Message}");
            }
        }
    }
}
