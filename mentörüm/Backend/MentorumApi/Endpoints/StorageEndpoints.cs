using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class StorageEndpoints
    {
        private static readonly string[] ImageExts = { ".png", ".jpg", ".jpeg", ".webp" };
        private static readonly string[] DocExts = { ".pdf", ".docx" };
        private const long MaxDocBytes = 10L * 1024 * 1024;
        private const long MaxImageBytes = 20L * 1024 * 1024;

        public static void MapStorageEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/uploads").RequireAuthorization();

            group.MapPost("/url", async (
                [FromBody] CreateUploadUrlRequest req,
                [FromServices] UploadRepository repo,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] IStorageService storage,
                ClaimsPrincipal user) =>
            {
                var senderId = GetUserId(user);
                if (senderId == null) return Results.Unauthorized();
                var role = user.FindFirst(ClaimTypes.Role)?.Value;

                var ext = Path.GetExtension(req.FileName).ToLowerInvariant();
                var isImage = ImageExts.Contains(ext);
                var isDoc = DocExts.Contains(ext);
                if (!isImage && !isDoc)
                    return Results.BadRequest(new { error = "Desteklenmeyen dosya türü. Resim (png/jpg/jpeg/webp), PDF veya DOCX yükleyebilirsiniz." });
                if (isDoc && req.FileSizeInBytes > MaxDocBytes)
                    return Results.BadRequest(new { error = "Belge dosyası 10 MB'ı aşamaz." });
                if (isImage && req.FileSizeInBytes > MaxImageBytes)
                    return Results.BadRequest(new { error = "Resim dosyası 20 MB'ı aşamaz." });

                if (role == "Teacher" && req.CourseId.HasValue && !await guard.CanTeacherShareFilesAsync(senderId.Value, req.CourseId.Value))
                    return Results.Json(new { error = "Bu derste dosya paylaşım yetkiniz yok." }, statusCode: 403);

                var ctx = await ResolveContextAsync(repo, guard, senderId.Value, role ?? "", req);
                if (ctx == null)
                    return Results.BadRequest(new { error = "Program veya alıcı bulunamadı / yetkisiz." });
                var (programId, recipientUserId, courseId, homeworkId, questionId) = ctx.Value;

                var ownerCoachId = await repo.GetProgramOwnerCoachIdAsync(programId);
                var settings = await repo.GetProgramStorageAsync(programId);
                var usedBytes = ownerCoachId.HasValue ? await repo.GetUsedBytesAsync(ownerCoachId.Value) : 0L;
                if (usedBytes + req.FileSizeInBytes > (long)settings.QuotaMb * 1024 * 1024)
                    return Results.Json(new { error = "Depolama kotası dolu." }, statusCode: 400);

                var entity = homeworkId.HasValue ? "homework" : questionId.HasValue ? "question" : courseId.HasValue ? "course" : "general";
                var objectKey = $"{programId}/{entity}/{Guid.NewGuid():N}{ext}";
                var uploadUrl = storage.GenerateUploadUrl(objectKey, req.ContentType, TimeSpan.FromMinutes(15));
                var uploadId = await repo.CreatePendingAsync(programId, senderId.Value, recipientUserId, courseId, homeworkId, questionId, objectKey, req.ContentType, req.FileSizeInBytes, req.FileName);

                return Results.Ok(new { uploadId, uploadUrl, objectKey });
            });

            group.MapPost("/{id:guid}/confirm", async (Guid id, [FromServices] UploadRepository repo, [FromServices] IStorageService storage, ClaimsPrincipal user) =>
            {
                var senderId = GetUserId(user);
                if (senderId == null) return Results.Unauthorized();
                var upload = await repo.GetByIdAsync(id);
                if (upload == null || upload.SenderUserId != senderId.Value)
                    return Results.NotFound(new { error = "Yükleme bulunamadı." });

                var actual = await storage.GetObjectInfoAsync(upload.ObjectKey);
                if (actual == null || actual.Value != upload.SizeBytes)
                {
                    if (actual != null) await storage.DeleteFileAsync(upload.ObjectKey);
                    await repo.MarkFailedAsync(id, senderId.Value);
                    return Results.BadRequest(new { error = "Dosya boyutu uyuşmazlığı. Yükleme iptal edildi." });
                }

                await repo.ConfirmAsync(id, senderId.Value);
                return Results.Ok(new { message = "Yükleme doğrulandı." });
            });

            group.MapGet("/{id:guid}/url", async (Guid id, [FromServices] UploadRepository repo, [FromServices] ProgramAccessGuard guard, [FromServices] IStorageService storage, ClaimsPrincipal user) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Unauthorized();
                var role = user.FindFirst(ClaimTypes.Role)?.Value;
                var upload = await repo.GetByIdAsync(id);
                if (upload == null) return Results.NotFound(new { error = "Dosya bulunamadı." });
                if (upload.Status == "DELETED") return Results.NotFound(new { error = "Dosya artık bulutta değil." });

                var allowed = role switch
                {
                    "Coach" => await guard.IsCoachInProgramAsync(userId.Value, upload.ProgramId),
                    "Teacher" => upload.CourseId.HasValue
                        && await guard.IsTeacherOfCourseAsync(userId.Value, upload.CourseId.Value)
                        && await guard.CanTeacherShareFilesAsync(userId.Value, upload.CourseId.Value),
                    "Student" => upload.SenderUserId == userId.Value || upload.RecipientUserId == userId.Value,
                    "Parent" => upload.SenderUserId == userId.Value || upload.RecipientUserId == userId.Value,
                    _ => false
                };

                if (!allowed) return Results.Json(new { error = "Bu dosyaya erişim yetkiniz yok." }, statusCode: 403);

                var url = storage.GenerateDownloadUrl(upload.ObjectKey, TimeSpan.FromMinutes(10));
                return Results.Ok(new { url, contentType = upload.ContentType, originalName = upload.OriginalName });
            });

            group.MapPost("/{id:guid}/deliver", async (Guid id, [FromBody] DeliverRequest req, [FromServices] UploadRepository repo, [FromServices] IStorageService storage, ClaimsPrincipal user) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Unauthorized();
                var upload = await repo.GetByIdAsync(id);
                if (upload == null || upload.RecipientUserId != userId.Value)
                    return Results.NotFound(new { error = "Dosya bulunamadı." });

                var (objectKey, deleteFromCloud) = await repo.MarkDeliveredAsync(id, userId.Value, req.DeviceId, req.LocalPath, req.FileHash);
                if (deleteFromCloud && !string.IsNullOrEmpty(objectKey))
                    await storage.DeleteFileAsync(objectKey);

                return Results.Ok(new { message = "Teslimat kaydedildi.", deletedFromCloud = deleteFromCloud });
            });

            group.MapGet("/", async ([FromServices] UploadRepository repo, ClaimsPrincipal user) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Unauthorized();
                return Results.Ok(await repo.ListForUserAsync(userId.Value));
            });

            group.MapGet("/recipients", async ([FromQuery] Guid courseId, [FromServices] UploadRepository repo, [FromServices] ProgramAccessGuard guard, ClaimsPrincipal user) =>
            {
                var studentId = GetUserId(user);
                if (studentId == null) return Results.Unauthorized();
                if (!await guard.IsStudentInCourseAsync(studentId.Value, courseId))
                    return Results.Json(new { error = "Derse erişiminiz yok." }, statusCode: 403);
                return Results.Ok(await repo.GetRecipientsAsync(courseId));
            });

            var coachGroup = app.MapGroup("/api/v1/coach").RequireAuthorization("RequireCoachRole");
            coachGroup.MapGet("/storage-usage", async ([FromServices] UploadRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                var usedBytes = await repo.GetUsedBytesAsync(coachId.Value);
                var settings = await repo.GetCoachStorageAsync(coachId.Value);
                var usedMb = usedBytes / (1024.0 * 1024.0);
                var usedPercent = settings.QuotaMb > 0 ? usedMb / settings.QuotaMb * 100 : 100;
                return Results.Ok(new StorageUsageDto
                {
                    UsedMb = Math.Round(usedMb, 2),
                    QuotaMb = settings.QuotaMb,
                    UsedPercent = Math.Round(usedPercent, 1),
                    WarnPercent = settings.WarnPercent,
                    ShouldWarn = usedPercent >= settings.WarnPercent,
                    StorageMode = settings.StorageMode
                });
            });

            var adminGroup = app.MapGroup("/api/v1/admin").RequireAuthorization("RequireAdminRole");
            adminGroup.MapPut("/coaches/{coachId:guid}/storage", async (Guid coachId, [FromBody] AdminUpdateCoachStorageRequest req, [FromServices] UploadRepository repo) =>
            {
                if (req.StorageMode != null && req.StorageMode != "LOCAL" && req.StorageMode != "ONLINE")
                    return Results.BadRequest(new { error = "storage_mode yalnızca 'LOCAL' veya 'ONLINE' olabilir." });
                await repo.UpdateCoachStorageSettingsAsync(coachId, req.QuotaMb, req.WarnPercent, req.StorageMode);
                return Results.Ok(new { message = "Depolama ayarları güncellendi." });
            });

            // T09: Koç, bir ödevin eklerini (resim) listeler.
            var homeworkAttach = app.MapGroup("/api/v1/homework").RequireAuthorization("RequireCoachRole");
            homeworkAttach.MapGet("/{homeworkId:guid}/attachments", async (Guid homeworkId, [FromServices] UploadRepository repo, [FromServices] ProgramAccessGuard guard, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                var programId = await repo.GetHomeworkProgramIdAsync(homeworkId);
                if (programId == null || !await guard.IsCoachInProgramAsync(coachId.Value, programId.Value))
                    return Results.NotFound(new { error = "Ödev bulunamadı veya yetkiniz yok." });
                return Results.Ok(await repo.ListByHomeworkAsync(homeworkId));
            });

            // T13: Koç, öğretmenin dosya paylaşım yetkisini açar/kapatır.
            var shareToggle = app.MapGroup("/api/v1/courses").RequireAuthorization("RequireCoachRole");
            shareToggle.MapPut("/{courseId:guid}/teacher-file-sharing", async (Guid courseId, [FromBody] TeacherFileSharingRequest req, [FromServices] UploadRepository repo, [FromServices] ProgramAccessGuard guard, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                if (!await guard.IsCoachOfCourseAsync(coachId.Value, courseId))
                    return Results.NotFound(new { error = "Ders bulunamadı." });
                await repo.UpdateTeacherFileSharingAsync(courseId, req.Allowed);
                return Results.Ok(new { message = "Öğretmen dosya paylaşım yetkisi güncellendi." });
            });
        }

        private static async Task<(Guid ProgramId, Guid RecipientUserId, Guid? CourseId, Guid? HomeworkId, Guid? QuestionId)?> ResolveContextAsync(
            UploadRepository repo, ProgramAccessGuard guard, Guid senderId, string role, CreateUploadUrlRequest req)
        {
            Guid? courseId = req.CourseId;
            Guid? homeworkId = req.HomeworkId;
            Guid? questionId = req.StudentQuestionId;

            Guid? programId = req.ProgramId;
            if (!programId.HasValue)
            {
                if (courseId.HasValue) programId = await repo.GetCourseProgramIdAsync(courseId.Value);
                else if (homeworkId.HasValue) programId = await repo.GetHomeworkProgramIdAsync(homeworkId.Value);
                else if (questionId.HasValue) programId = await repo.GetQuestionProgramIdAsync(questionId.Value);
                else if (role == "Student") programId = await repo.GetStudentProgramIdAsync(senderId);
            }

            if (!programId.HasValue) return null;

            Guid recipient;
            if (role == "Student")
            {
                if (courseId.HasValue && !await guard.IsStudentInCourseAsync(senderId, courseId.Value)) return null;
                if (req.RecipientUserId.HasValue)
                {
                    recipient = req.RecipientUserId.Value;
                    var isTeacher = await guard.IsTeacherInProgramAsync(recipient, programId.Value);
                    var isCoach = await guard.IsCoachInProgramAsync(recipient, programId.Value);
                    if (!isTeacher && !isCoach) return null;
                }
                else
                {
                    var def = await repo.GetDefaultRecipientIdAsync(programId.Value, courseId);
                    if (!def.HasValue) return null;
                    recipient = def.Value;
                }
            }
            else if (role == "Coach")
            {
                if (!await guard.IsCoachInProgramAsync(senderId, programId.Value)) return null;
                if (!req.RecipientUserId.HasValue) return null;
                recipient = req.RecipientUserId.Value;
                if (!await guard.IsStudentInProgramAsync(recipient, programId.Value)) return null;
            }
            else if (role == "Teacher")
            {
                if (!courseId.HasValue) return null;
                if (!await guard.IsTeacherOfCourseAsync(senderId, courseId.Value)) return null;
                if (!await guard.CanTeacherShareFilesAsync(senderId, courseId.Value)) return null;
                if (!req.RecipientUserId.HasValue) return null;
                recipient = req.RecipientUserId.Value;
                if (!await guard.IsStudentInProgramAsync(recipient, programId.Value)) return null;
            }
            else
            {
                return null;
            }

            return (programId.Value, recipient, courseId, homeworkId, questionId);
        }

        private static Guid? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }
}
