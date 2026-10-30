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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                var templateId = await repo.CreateTemplateAsync(coachId.Value, req);
                return Results.Ok(new { templateId });
            });

            group.MapPost("/assignments", async (
                [FromBody] AssignHomeworkRequest req,
                [FromServices] HomeworkRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                if (req.StudentId.HasValue)
                {
                    await guard.EnsureCoachOwnsStudentAsync(coachId.Value, req.StudentId.Value);
                }

                var assignmentId = await repo.AssignHomeworkAsync(coachId.Value, req);
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, studentId);

                var homeworks = await repo.GetStudentHomeworksAsync(coachId.Value, studentId);
                return Results.Ok(homeworks);
            });

            // Idempotency (Mükerrer İstek Önleme) + Optimistic Concurrency + Transaction destekli ödev tamamlama
            var completionGroup = app.MapGroup("/api/v1/homework").RequireAuthorization();
            completionGroup.MapPost("/assignments/{assignmentId:guid}/complete", async (
                Guid assignmentId,
                [FromBody] CompleteHomeworkRequest req,
                [FromServices] HomeworkRepository repo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                var role = user.GetUserRole();
                var result = await repo.CompleteHomeworkAsync(assignmentId, userId.Value, role, req);

                return result switch
                {
                    "NOT_FOUND" => Results.BadRequest(new { error = "Ödev bulunamadı veya yetkiniz yok." }),
                    "CONCURRENCY_CONFLICT" => Results.Conflict(new { error = "Bu ödev başka bir oturum tarafından güncellendi.", code = "CONCURRENCY_CONFLICT" }),
                    _ => Results.Ok(new { message = "Ödev ilerlemesi kaydedildi." })
                };
            })
            .AddEndpointFilter<MentorumApi.Filters.IdempotencyFilter>();

            // Öğrenci kendi ödevlerini çeker (OverdueHomeworkJob kalıcı statü/bildirim üretir; sorgu ayrıca anlık OVERDUE hesaplar)
            var studentGroup = app.MapGroup("/api/v1/homework").RequireAuthorization("RequireStudentRole");
            studentGroup.MapGet("/me", async (
                [FromServices] HomeworkRepository repo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                var homeworks = await repo.GetStudentHomeworksForPortalAsync(userId.Value);
                return Results.Ok(homeworks);
            });

            // V10 T04: Ödev ek süre talebi → koç onay merkezine düşer
            studentGroup.MapPost("/{assignmentId:guid}/request-extension", async (
                Guid assignmentId,
                [FromBody] HomeworkExtensionRequest req,
                [FromServices] HomeworkRepository repo,
                [FromServices] ApprovalRepository approvalRepo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                var programId = await repo.GetAssignmentProgramIdForStudentAsync(assignmentId, userId.Value);
                if (programId == null) return Results.BadRequest(new { error = "Ödev bulunamadı." });

                if (await repo.HasPendingExtensionAsync(assignmentId))
                {
                    return Results.BadRequest(new { error = "Bu ödev için zaten değerlendirme bekleyen bir ek süre talebiniz bulunmaktadır." });
                }

                var payload = System.Text.Json.JsonSerializer.Serialize(new { homeworkId = assignmentId, reason = req.Reason, requestedDueDate = req.RequestedDueDate });
                var id = await approvalRepo.CreateAsync(programId.Value, "HOMEWORK_EXTENSION", assignmentId, payload, userId.Value);
                return Results.Ok(new { id, message = "Ek süre talebi koçunuza iletildi." });
            });

            // Veli çocuğunun ödevlerini çeker (salt okunur)
            var parentGroup = app.MapGroup("/api/v1/homework/children").RequireAuthorization("RequireParentRole");
            parentGroup.MapGet("/{studentId:guid}", async (
                Guid studentId,
                [FromServices] HomeworkRepository repo,
                ClaimsPrincipal user) =>
            {
                var parentId = user.GetUserId();
                if (parentId == null) return Results.Unauthorized();

                if (!await repo.CanParentViewHomeworkAsync(parentId.Value, studentId))
                    return Results.Forbid();

                var homeworks = await repo.GetStudentHomeworksForPortalAsync(studentId);
                return Results.Ok(homeworks);
            });
        }
    }
}
