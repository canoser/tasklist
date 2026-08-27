using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Data;
using System.Security.Claims;
using Dapper;

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

        public TasksController(
            ITaskRepository taskRepository, 
            IQuotaManager quotaManager,
            ITaskAssignmentRepository taskAssignmentRepository,
            IWorkspaceRepository workspaceRepository,
            IDbConnection dbConnection)
        {
            _taskRepository = taskRepository;
            _quotaManager = quotaManager;
            _taskAssignmentRepository = taskAssignmentRepository;
            _workspaceRepository = workspaceRepository;
            _dbConnection = dbConnection;
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
            if (task.UserId != currentUserId)
                return NotFound(); // Sahiplik kontrolü - IDOR koruması

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
            if (existingTask.UserId != currentUserId) return NotFound(); // IDOR koruması

            task.Id = id;
            task.UserId = currentUserId; // Kimliği manipüle edememesi için sabitliyoruz
            task.UpdatedAt = DateTime.UtcNow;
            
            var success = await _taskRepository.UpdateAsync(task);
            if (!success)
                return NotFound();
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
            if (existingTask.UserId != currentUserId) return NotFound(); // IDOR koruması

            var success = await _taskRepository.MarkAsCompletedAsync(id, DateTime.UtcNow);
            if (!success)
                return NotFound();
            return NoContent();
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
            return NoContent();
        }
        // ── Görev Zinciri (Task Chain) ──────────────────────────────────────────

        /// <summary>Kullanıcının tüm zincir görevlerini gruplu listeler.</summary>
        [HttpGet("chains")]
        public async Task<IActionResult> GetChains()
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            var tasks = await _taskRepository.GetChainTasksByUserIdAsync(currentUserId);

            // ChainId'ye göre grupla
            var chains = tasks
                .GroupBy(t => t.ChainId)
                .Select(g => new
                {
                    ChainId = g.Key,
                    Tasks = g.OrderBy(t => t.ChainOrder).ToList()
                });

            return Ok(chains);
        }

        [HttpPost("chain")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> CreateChain([FromBody] CreateTaskChainRequest request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();
            
            // Atanan kullanıcılar listesi boşsa, isteği yapan kişiye ata
            if (request.AssignedUserIds == null || request.AssignedUserIds.Count == 0)
            {
                request.AssignedUserIds = new List<string> { currentUserId };
            }

            if (request.Tasks == null || request.Tasks.Count == 0)
                return BadRequest("Geçersiz görev zinciri verisi.");

            bool isTeacher = false;
            // Eğer bir Workspace belirtilmişse workspace kontrollerini yap
            if (request.WorkspaceId != null && request.WorkspaceId.Value > 0)
            {
                var members = await _workspaceRepository.GetMembersAsync(request.WorkspaceId.Value);
                var callerMember = members.FirstOrDefault(m => m.UserId == currentUserId);
                if (callerMember == null)
                    return Forbid();

                isTeacher = callerMember.Role == "Owner" || callerMember.Role == "Teacher" || callerMember.Role == "Admin" || callerMember.Role == "Leader";

                if (!isTeacher && (request.AssignedUserIds.Count != 1 || request.AssignedUserIds[0] != currentUserId))
                {
                    return Forbid(); // Öğrenciler başkasına görev atayamaz.
                }

                if (request.AssignedUserIds.Any(id => !members.Any(m => m.UserId == id)))
                {
                    return BadRequest("Atanan kullanıcılardan biri bu çalışma alanının üyesi değil.");
                }
            }

            var chainId = Guid.NewGuid().ToString("N");
            
            if (_dbConnection.State != ConnectionState.Open)
                _dbConnection.Open();

            using var transaction = _dbConnection.BeginTransaction();
            try
            {
                foreach (var userId in request.AssignedUserIds)
                {
                    int order = 1;
                    foreach (var task in request.Tasks)
                    {
                        var taskItem = new TaskItem
                        {
                            UserId = userId,
                            CategoryId = task.CategoryId,
                            Title = task.Title,
                            Description = task.Description,
                            TaskType = task.TaskType,
                            Deadline = task.Deadline,
                            IsTeacherAssigned = isTeacher,
                            TargetCount = task.TargetCount,
                            WorkspaceId = request.WorkspaceId,
                            ChainId = chainId,
                            ChainOrder = order,
                            OriginalDeadline = task.Deadline,
                            IsHomework = request.WorkspaceId != null,
                            AssignedBy = currentUserId,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        
                        var taskId = await _taskRepository.CreateAsync(taskItem, transaction);

                        if (request.WorkspaceId != null && request.WorkspaceId.Value > 0)
                        {
                            var assignment = new TaskAssignment
                            {
                                TaskItemId = taskId,
                                AssignedUserId = userId,
                                CreatedByUserId = currentUserId,
                                WorkspaceId = request.WorkspaceId.Value,
                                Status = "Pending"
                            };
                            
                            await _taskAssignmentRepository.AssignAsync(assignment, transaction);
                        }
                        order++;
                    }
                }
                
                transaction.Commit();
                return Ok(new { ChainId = chainId });
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                var errorMsg = $"[Chain Create Error - {DateTime.UtcNow}]\n{ex}\n----------------------------------\n";
                System.IO.File.AppendAllText("CHAIN_ERROR_LOG.txt", errorMsg);
                return StatusCode(500, new { Message = "Görev zinciri oluşturulurken sunucu hatası oluştu.", ErrorDetails = ex.Message });
            }
        }

        [HttpPut("{id:int}/postpone")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> Postpone(int id, [FromBody] PostponeTaskRequest request)
        {
            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null) return NotFound();

            var currentUserId = GetCurrentUserId();
            // TODO: Eğer veli/öğretmen de erteleyebilecekse HasAccessToUser kontrolü eklenebilir. Şimdilik sadece sahibi erteleyebilir.
            if (existingTask.UserId != currentUserId) return NotFound(); 

            if (_dbConnection.State != ConnectionState.Open)
                _dbConnection.Open();

            using var transaction = _dbConnection.BeginTransaction();
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (request.PostponeAllChain && !string.IsNullOrEmpty(existingTask.ChainId) && !string.IsNullOrEmpty(userId))
                {
                    // Zincirleme erteleme (minOrder = mevcut görevin sırası)
                    await _taskRepository.PostponeChainAsync(existingTask.ChainId, userId, existingTask.ChainOrder ?? 0, request.DaysToShift, transaction);
                }
                else
                {
                    // Tekli görev erteleme
                    if (existingTask.Deadline.HasValue)
                    {
                        existingTask.Deadline = existingTask.Deadline.Value.AddDays(request.DaysToShift);
                    }
                    existingTask.UpdatedAt = DateTime.UtcNow;
                    await _taskRepository.UpdateAsync(existingTask, transaction);
                }
                
                transaction.Commit();
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
