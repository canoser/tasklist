using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class HomeworkEndpoints
    {
        public static void MapHomeworkEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/homework").RequireAuthorization("RequireCoachRole");

            group.MapPost("/templates", async (
                [FromBody] CreateHomeworkTemplateRequest req,
                [FromServices] HomeworkRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var templateId = await repo.CreateTemplateAsync(coachId, req);
                return Results.Ok(new { templateId });
            });

            group.MapPost("/assignments", async (
                [FromBody] AssignHomeworkRequest req,
                [FromServices] HomeworkRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                if (req.StudentId.HasValue)
                {
                    try
                    {
                        await guard.EnsureCoachOwnsStudentAsync(coachId, req.StudentId.Value);
                    }
                    catch (UnauthorizedAccessException)
                    {
                        return Results.Json(new { error = "Öğrenci bulunamadı veya size ait değil." }, statusCode: 403);
                    }
                }

                var assignmentId = await repo.AssignHomeworkAsync(coachId, req);
                if (assignmentId == null) return Results.BadRequest(new { error = "Öğrenci bulunamadı veya size ait değil." });

                return Results.Ok(new { assignmentId });
            });

            // Koç, bir öğrencinin tüm ödevlerini listeler (IDOR: program_coaches üyeliği)
            group.MapGet("/student/{studentId:guid}", async (
                Guid studentId,
                [FromServices] HomeworkRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                try
                {
                    await guard.EnsureCoachOwnsStudentAsync(coachId, studentId);
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.Json(new { error = "Bu öğrenci bu koça ait değil." }, statusCode: 403);
                }

                var homeworks = await repo.GetStudentHomeworksAsync(coachId, studentId);
                return Results.Ok(homeworks);
            });

            // Idempotency (Mükerrer İstek Önleme) destekli ödev tamamlama endpoint'i
            var completionGroup = app.MapGroup("/api/v1/homework").RequireAuthorization();
            completionGroup.MapPost("/assignments/{assignmentId:guid}/complete", async (
                Guid assignmentId,
                [FromBody] CompleteHomeworkRequest req,
                [FromServices] DbConnectionFactory dbFactory,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();
                
                var role = user.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                string whereClause = role == "Coach" ? "AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @UserId)" : "AND student_id = @UserId";
                
                int percentage = req.CompletionPercentage >= 0 && req.CompletionPercentage <= 100 ? req.CompletionPercentage : 100;
                string status = percentage == 100 ? "DONE" : "PENDING";

                using var db = dbFactory.CreateConnection();
                if (db != null)
                {
                    var updated = await Dapper.SqlMapper.ExecuteAsync(db, 
                        $"UPDATE homework_assignments SET status = @Status, completed_at = @Now, completion_percentage = @Pct, student_note = CASE WHEN @Note IS NULL THEN student_note ELSE @Note END WHERE id = @Id {whereClause}", 
                        new { Now = percentage == 100 ? DateTime.UtcNow : (DateTime?)null, Status = status, Pct = percentage, Id = assignmentId, UserId = userId, Note = req.Note });
                        
                    if (updated == 0) return Results.BadRequest(new { error = "Ödev bulunamadı veya yetkiniz yok." });

                    // T09: Öğrencinin yüklediği ekleri (resim) bu ödeve bağla (IDOR: sender_user_id = kullanıcı).
                    if (req.AttachmentIds != null && req.AttachmentIds.Count > 0)
                    {
                        foreach (var attachId in req.AttachmentIds)
                        {
                            await Dapper.SqlMapper.ExecuteAsync(db,
                                "UPDATE uploads SET homework_id = @HomeworkId, updated_at = NOW() WHERE id = @UploadId AND sender_user_id = @UserId AND status = 'UPLOADED'",
                                new { HomeworkId = assignmentId, UploadId = attachId, UserId = userId });
                        }
                    }
                }

                return Results.Ok(new { message = "Ödev ilerlemesi kaydedildi." });
            })
            .AddEndpointFilter<MentorumApi.Filters.IdempotencyFilter>();

            // ÖĞRENCİ KENDİ ÖDEVLERİNİ ÇEKER (Cronsuz, Anında OVERDUE Hesaplaması ile)
            var studentGroup = app.MapGroup("/api/v1/homework").RequireAuthorization("RequireStudentRole");
            studentGroup.MapGet("/me", async (
                [FromServices] DbConnectionFactory dbFactory,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

                using var db = dbFactory.CreateConnection();
                // Harika Kurgu: Eğer status PENDING ise ve due_date geçmişse anında OVERDUE döndürür! Cron'a gerek kalmaz!
                var homeworks = await Dapper.SqlMapper.QueryAsync<HomeworkItemDto>(db, @"
                    SELECT 
                        h.id as Id, 
                        h.snapshot_title as SnapshotTitle, 
                        h.snapshot_desc as SnapshotDesc, 
                        h.due_date as DueDate, 
                        h.completed_at as CompletedAt,
                        h.completion_percentage as CompletionPercentage,
                        h.student_note as StudentNote,
                        CASE 
                            WHEN h.status = 'PENDING' AND h.due_date < CURRENT_DATE THEN 'OVERDUE'
                            ELSE h.status 
                        END as Status,
                        s.name as SubjectName,
                        ct.topic_name as TopicName
                    FROM homework_assignments h
                    LEFT JOIN subjects s ON s.id = h.subject_id
                    LEFT JOIN curriculum_topics ct ON ct.id = h.curriculum_topic_id
                    WHERE h.student_id = @UserId
                    ORDER BY h.due_date ASC
                ", new { UserId = userId });

                return Results.Ok(homeworks);
            });

            // V10 T04: Ödev ek süre talebi → koç onay merkezine düşer
            studentGroup.MapPost("/{assignmentId:guid}/request-extension", async (
                Guid assignmentId,
                [FromBody] HomeworkExtensionRequest req,
                [FromServices] DbConnectionFactory dbFactory,
                [FromServices] ApprovalRepository approvalRepo,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

                using var db = dbFactory.CreateConnection();
                var programId = await Dapper.SqlMapper.QuerySingleOrDefaultAsync<Guid?>(db,
                    "SELECT program_id FROM homework_assignments WHERE id = @Id AND student_id = @UserId",
                    new { Id = assignmentId, UserId = userId });

                if (programId == null) return Results.BadRequest(new { error = "Ödev bulunamadı." });

                var hasPending = await Dapper.SqlMapper.ExecuteScalarAsync<int>(db,
                    "SELECT 1 FROM approval_items WHERE entity_type = 'HOMEWORK_EXTENSION' AND entity_id = @Id AND status = 'PENDING' LIMIT 1",
                    new { Id = assignmentId });
                if (hasPending > 0)
                {
                    return Results.BadRequest(new { error = "Bu ödev için zaten değerlendirme bekleyen bir ek süre talebiniz bulunmaktadır." });
                }

                var payload = System.Text.Json.JsonSerializer.Serialize(new { homeworkId = assignmentId, reason = req.Reason, requestedDueDate = req.RequestedDueDate });
                var id = await approvalRepo.CreateAsync(programId.Value, "HOMEWORK_EXTENSION", assignmentId, payload, userId);
                return Results.Ok(new { id, message = "Ek süre talebi koçunuza iletildi." });
            });

            // VELİ ÇOCUĞUNUN ÖDEVLERİNİ ÇEKER (Salt Okunur)
            var parentGroup = app.MapGroup("/api/v1/homework/children").RequireAuthorization("RequireParentRole");
            parentGroup.MapGet("/{studentId:guid}", async (
                Guid studentId,
                [FromServices] DbConnectionFactory dbFactory,
                ClaimsPrincipal user) =>
            {
                var parentIdStr = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(parentIdStr, out var parentId)) return Results.Unauthorized();

                using var db = dbFactory.CreateConnection();
                
                // Veli bu öğrencinin velisi mi kontrolü
                var relation = await Dapper.SqlMapper.ExecuteScalarAsync<int>(db,
                    "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1",
                    new { ParentId = parentId, StudentId = studentId });

                if (relation == 0) return Results.Forbid();

                var homeworks = await Dapper.SqlMapper.QueryAsync<HomeworkItemDto>(db, @"
                    SELECT 
                        h.id as Id, 
                        h.snapshot_title as SnapshotTitle, 
                        h.snapshot_desc as SnapshotDesc, 
                        h.due_date as DueDate, 
                        h.completed_at as CompletedAt,
                        h.completion_percentage as CompletionPercentage,
                        h.student_note as StudentNote,
                        CASE 
                            WHEN h.status = 'PENDING' AND h.due_date < CURRENT_DATE THEN 'OVERDUE'
                            ELSE h.status 
                        END as Status,
                        s.name as SubjectName,
                        ct.topic_name as TopicName
                    FROM homework_assignments h
                    LEFT JOIN subjects s ON s.id = h.subject_id
                    LEFT JOIN curriculum_topics ct ON ct.id = h.curriculum_topic_id
                    WHERE h.student_id = @StudentId
                    ORDER BY h.due_date ASC
                ", new { StudentId = studentId });

                return Results.Ok(homeworks);
            });
        }
    }
}
