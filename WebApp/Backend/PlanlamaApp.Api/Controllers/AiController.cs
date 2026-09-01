using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Data;
using System.Text.Json;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AiController : ControllerBase
    {
        private readonly IAiProvider _aiProvider;
        private readonly IWorkspaceRepository _workspaceRepository;
        private readonly ITaskRepository _taskRepository;
        private readonly ITaskAssignmentRepository _taskAssignmentRepository;
        private readonly IQuotaManager _quotaManager;
        private readonly IDbConnection _dbConnection;

        public AiController(
            IAiProvider aiProvider,
            IWorkspaceRepository workspaceRepository,
            ITaskRepository taskRepository,
            ITaskAssignmentRepository taskAssignmentRepository,
            IQuotaManager quotaManager,
            IDbConnection dbConnection,
            ITenantProvider tenantProvider)
        {
            _aiProvider = aiProvider;
            _workspaceRepository = workspaceRepository;
            _taskRepository = taskRepository;
            _taskAssignmentRepository = taskAssignmentRepository;
            _quotaManager = quotaManager;
            _dbConnection = dbConnection;
            _tenantProvider = tenantProvider;
        }

        private readonly ITenantProvider _tenantProvider;

        private string? GetCurrentUserId()
        {
            return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        }

        [HttpPost("command-plan")]
        public async Task<IActionResult> GeneratePlan([FromBody] AiPlanRequest request, [FromQuery] int workspaceId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var members = await _workspaceRepository.GetMembersAsync(workspaceId);
            if (!members.Any(m => m.UserId == userId))
                return Forbid();

            // 1. Ekip üyelerini çekip bağlamı (context) zenginleştiriyoruz.
            request.TeamMembers = members.Select(m => new WorkspaceMemberDto
            {
                Id = m.UserId,
                Name = string.IsNullOrWhiteSpace(m.DisplayName) ? "İsimsiz Üye" : m.DisplayName,
                Role = m.Role
            }).ToList();

            var systemPrompt = @"Sen bir öğretmen ve öğrenci görev yönetim asistanısın. Görevin, sana verilen doğal dildeki talimatları analiz edip, sana sağlanan fonksiyonlardan (tools) uygun olanları çağırmaktır. Eğer istenen şey doğrudan sana verilen araçlarla (tools) yapılabiliyorsa, tool çağrısını döndür. Yapılamıyorsa veya eksik bilgi varsa, kullanıcıdan açıklama isteyen düz bir metin (Message) döndür. Şu anki saat: " + request.Today.ToString("yyyy-MM-dd HH:mm") + ". Ekip üyeleri: " + JsonSerializer.Serialize(request.TeamMembers) + ". JSON dönerken asla markdown code block (```json) kullanma, sadece ham JSON kullan.";

            // 2. IAiProvider (OpenAiProvider vb.) üzerinden plan üret. Kota DÜŞMEZ.
            var plan = await _aiProvider.GeneratePlanAsync(request, systemPrompt);
            return Ok(plan);
        }

        [HttpPost("command-execute")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> ExecutePlan([FromBody] AiExecuteRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            if (request.Plan == null || request.Plan.ToolCalls.Count == 0)
                return BadRequest("Yürütülecek hiçbir plan bulunamadı.");

            var members = await _workspaceRepository.GetMembersAsync(request.WorkspaceId);
            if (!members.Any(m => m.UserId == userId))
                return Forbid();

            var tenantId = _tenantProvider.GetTenantId();

            // 0. İş Kuralları Doğrulaması (Pre-validation)
            foreach (var call in request.Plan.ToolCalls)
            {
                if (call.ToolName == "create_task_chain")
                {
                    var paramsJson = JsonSerializer.Serialize(call.Parameters);
                    var args = JsonSerializer.Deserialize<CreateTaskChainArgs>(paramsJson);
                    if (args != null && args.ChainLength > 5)
                    {
                        return BadRequest("Yapay zeka ile tek seferde en fazla 5 görevlik zincir oluşturulabilir. Daha fazla görev için lütfen planı bölünüz.");
                    }
                }
            }

            int totalCreateTasks = request.Plan.ToolCalls.Count(c => c.ToolName == "create_task");
            if (totalCreateTasks > 10)
            {
                return BadRequest("Yapay zeka ile tek seferde en fazla 10 adet tekli görev oluşturulabilir.");
            }

            if (_dbConnection.State != ConnectionState.Open)
                _dbConnection.Open();

            using var transaction = _dbConnection.BeginTransaction();
            try
            {
                var callerMember = members.FirstOrDefault(m => m.UserId == userId);
                bool isTeacher = callerMember != null && (callerMember.Role == "Owner" || callerMember.Role == "Teacher" || callerMember.Role == "Admin" || callerMember.Role == "Leader");

                // 1. Kota düşüşü yap (Transaction içinde)
                var quotaDeducted = await _quotaManager.TryDeductAsync(tenantId, "Free", "AiCommand", 1, transaction);
                if (!quotaDeducted)
                {
                    transaction.Rollback();
                    return StatusCode(402, "Yetersiz AI komut kotası."); // Payment Required
                }

                var createdTaskIds = new List<int>();
                var postponedChains = new List<PostponeChainArgs>();

                foreach (var call in request.Plan.ToolCalls)
                {
                    // JSON'dan gelen sayısal parametreler genelde JsonElement olarak gelir,
                    // Parse ederken güvenli hale getiriyoruz.
                    var paramsJson = JsonSerializer.Serialize(call.Parameters);

                    if (call.ToolName == "create_task")
                    {
                        var args = JsonSerializer.Deserialize<CreateTaskArgs>(paramsJson);
                        if (args != null)
                        {
                            if (!members.Any(m => m.UserId == args.AssignedUserId))
                            {
                                transaction.Rollback();
                                return BadRequest("Atanan kullanıcı bu çalışma alanının üyesi değil.");
                            }

                            if (!isTeacher && args.AssignedUserId != userId)
                            {
                                transaction.Rollback();
                                return Forbid(); // Sadece öğretmenler başkasına görev atayabilir
                            }
                            var taskId = await HandleCreateTask(args, request.WorkspaceId, userId, isTeacher, transaction);
                            createdTaskIds.Add(taskId);
                        }
                    }
                    else if (call.ToolName == "create_task_chain")
                    {
                        var args = JsonSerializer.Deserialize<CreateTaskChainArgs>(paramsJson);
                        if (args != null)
                        {
                            if (args.AssignedUserIds.Any(id => !members.Any(m => m.UserId == id)))
                            {
                                transaction.Rollback();
                                return BadRequest("Atanan kullanıcılardan biri bu çalışma alanının üyesi değil.");
                            }

                            if (!isTeacher && (args.AssignedUserIds.Count != 1 || args.AssignedUserIds[0] != userId))
                            {
                                transaction.Rollback();
                                return Forbid(); // Sadece öğretmenler başkasına görev atayabilir
                            }
                            var taskIds = await HandleCreateTaskChain(args, request.WorkspaceId, userId, isTeacher, transaction);
                            createdTaskIds.AddRange(taskIds);
                        }
                    }
                    else if (call.ToolName == "postpone_chain")
                    {
                        var args = JsonSerializer.Deserialize<PostponeChainArgs>(paramsJson);
                        if (args != null)
                        {
                            bool success = await HandlePostponeChain(args, userId, isTeacher, transaction);
                            if (!success)
                            {
                                transaction.Rollback();
                                return Forbid();
                            }
                            postponedChains.Add(args);
                        }
                    }
                    else if (call.ToolName == "delete_task")
                    {
                        // Gelecekte eklenebilir.
                    }
                }

                transaction.Commit();
                return Ok(new { Success = true, Message = "Plan başarıyla yürütüldü." });
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                return StatusCode(500, $"Plan yürütülürken hata oluştu: {ex.Message}");
            }
        }

        // --- Yardımcı İşleyici (Handler) Metotlar ---

        private async Task<int> HandleCreateTask(CreateTaskArgs args, int workspaceId, string currentUserId, bool isTeacher, IDbTransaction transaction)
        {
            var taskItem = new TaskItem
            {
                UserId = args.AssignedUserId,
                CategoryId = args.CategoryId,
                Title = args.Title,
                TaskType = "Test", // Default veya args'dan alınabilir
                Deadline = DateTime.TryParse(args.Deadline, out var d1) ? d1 : DateTime.UtcNow.AddDays(1),
                OriginalDeadline = DateTime.TryParse(args.Deadline, out var d2) ? d2 : DateTime.UtcNow.AddDays(1),
                WorkspaceId = workspaceId,
                AssignedBy = currentUserId,
                IsTeacherAssigned = isTeacher,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var taskId = await _taskRepository.CreateAsync(taskItem, transaction);

            var assignment = new TaskAssignment
            {
                TaskItemId = taskId,
                AssignedUserId = args.AssignedUserId,
                CreatedByUserId = currentUserId,
                WorkspaceId = workspaceId,
                Status = "Pending"
            };

            await _taskAssignmentRepository.AssignAsync(assignment, transaction);
            return taskId;
        }

        private async Task<List<int>> HandleCreateTaskChain(CreateTaskChainArgs args, int workspaceId, string currentUserId, bool isTeacher, IDbTransaction transaction)
        {
            var createdIds = new List<int>();
            var chainId = Guid.NewGuid().ToString("N");
            var deadline = DateTime.TryParse(args.Deadline, out var d) ? d : DateTime.UtcNow.AddDays(1);
            var chainLength = Math.Clamp(args.ChainLength, 1, 5); // Pre-validation'dan geçse de ek güvenlik
            var questionCount = Math.Max(args.QuestionCount, 1);

            foreach (var assignedUserId in args.AssignedUserIds)
            {
                for (int order = 1; order <= chainLength; order++)
                {
                    var taskDeadline = deadline.AddDays(order - 1);
                    var taskItem = new TaskItem
                    {
                        UserId = assignedUserId,
                        CategoryId = args.CategoryId,
                        Title = $"{args.Title} (Bölüm {order})",
                        TaskType = "Test",
                        Deadline = taskDeadline,
                        OriginalDeadline = taskDeadline,
                        TargetCount = questionCount,
                        WorkspaceId = workspaceId,
                        IsHomework = true,
                        AssignedBy = currentUserId,
                        IsTeacherAssigned = isTeacher,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    var taskId = await _taskRepository.CreateAsync(taskItem, transaction);

                    var assignment = new TaskAssignment
                    {
                        TaskItemId = taskId,
                        AssignedUserId = assignedUserId,
                        CreatedByUserId = currentUserId,
                        WorkspaceId = workspaceId,
                        Status = "Pending"
                    };

                    await _taskAssignmentRepository.AssignAsync(assignment, transaction);
                    createdIds.Add(taskId);
                }
            }
            return createdIds;
        }

        private async Task<bool> HandlePostponeChain(PostponeChainArgs args, string currentUserId, bool isTeacher, IDbTransaction transaction)
        {
            var existingTask = await _taskRepository.GetByIdAsync(args.TaskId);
            if (existingTask == null) return true; // Başarılı sayalım ki iptal etmesin ama bir şey de yapmasın

            // IDOR koruması: Sadece sahibi veya atayan kişi erteleyebilir.
            if (existingTask.UserId != currentUserId && existingTask.AssignedBy != currentUserId)
                return false;

            int shiftDays = Math.Max(1, args.DaysToShift); // Asla negatif olamaz (Bulgu 13)

            if (args.PostponeAllChain && existingTask.ChainTemplateId.HasValue)
            {
                await _taskRepository.PostponeChainAsync(existingTask.ChainTemplateId.Value, existingTask.UserId, existingTask.Deadline ?? DateTime.MinValue, shiftDays, transaction);
            }
            else
            {
                if (existingTask.Deadline.HasValue)
                {
                    existingTask.Deadline = existingTask.Deadline.Value.AddDays(shiftDays);
                }
                existingTask.UpdatedAt = DateTime.UtcNow;
                await _taskRepository.UpdateAsync(existingTask, transaction);
            }
            return true;
        }

        // DTO'lar (Sadece bu controller'a özel)
        private class CreateTaskArgs
        {
            public string Title { get; set; } = string.Empty;
            public int CategoryId { get; set; }
            public string Deadline { get; set; } = string.Empty;
            public string AssignedUserId { get; set; } = string.Empty;
        }

        private class CreateTaskChainArgs
        {
            public string Title { get; set; } = string.Empty;
            public int CategoryId { get; set; }
            public string Deadline { get; set; } = string.Empty;
            public int ChainLength { get; set; }
            public int QuestionCount { get; set; }
            public List<string> AssignedUserIds { get; set; } = new();
        }

        private class PostponeChainArgs
        {
            public int TaskId { get; set; }
            public int DaysToShift { get; set; }
            public bool PostponeAllChain { get; set; }
        }
    }
}
