using MentorumApi.Data;
using MentorumApi.DTOs;
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
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var assignmentId = await repo.AssignHomeworkAsync(coachId, req);
                if (assignmentId == null) return Results.BadRequest(new { error = "Şablon bulunamadı veya size ait değil." });

                return Results.Ok(new { assignmentId });
            });

            // Idempotency (Mükerrer İstek Önleme) destekli ödev tamamlama endpoint'i
            group.MapPost("/assignments/{assignmentId:guid}/complete", async (
                Guid assignmentId,
                [FromBody] CompleteHomeworkRequest req,
                [FromServices] DbConnectionFactory dbFactory,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();
                
                var role = user.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                string whereClause = role == "Coach" ? "AND coach_id = @UserId" : "AND student_id = @UserId";
                
                int percentage = req.CompletionPercentage >= 0 && req.CompletionPercentage <= 100 ? req.CompletionPercentage : 100;
                string status = percentage == 100 ? "DONE" : "PENDING";

                using var db = dbFactory.CreateConnection();
                if (db != null)
                {
                    var updated = await Dapper.SqlMapper.ExecuteAsync(db, 
                        $"UPDATE homework_assignments SET status = @Status, completed_at = @Now, completion_percentage = @Pct WHERE id = @Id {whereClause}", 
                        new { Now = percentage == 100 ? DateTime.UtcNow : (DateTime?)null, Status = status, Pct = percentage, Id = assignmentId, UserId = userId });
                        
                    if (updated == 0) return Results.BadRequest(new { error = "Ödev bulunamadı veya yetkiniz yok." });
                }

                return Results.Ok(new { message = "Ödev ilerlemesi kaydedildi." });
            })
            .RequireAuthorization()
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
                var homeworks = await Dapper.SqlMapper.QueryAsync<dynamic>(db, @"
                    SELECT 
                        id as Id, 
                        snapshot_title as SnapshotTitle, 
                        snapshot_desc as SnapshotDesc, 
                        due_date as DueDate, 
                        completed_at as CompletedAt,
                        completion_percentage as CompletionPercentage,
                        CASE 
                            WHEN status = 'PENDING' AND due_date < @Now THEN 'OVERDUE'
                            ELSE status 
                        END as Status
                    FROM homework_assignments 
                    WHERE student_id = @UserId
                    ORDER BY due_date ASC
                ", new { UserId = userId, Now = DateTime.UtcNow });

                return Results.Ok(homeworks);
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

                var homeworks = await Dapper.SqlMapper.QueryAsync<dynamic>(db, @"
                    SELECT 
                        id as Id, 
                        snapshot_title as SnapshotTitle, 
                        snapshot_desc as SnapshotDesc, 
                        due_date as DueDate, 
                        completed_at as CompletedAt,
                        completion_percentage as CompletionPercentage,
                        CASE 
                            WHEN status = 'PENDING' AND due_date < @Now THEN 'OVERDUE'
                            ELSE status 
                        END as Status
                    FROM homework_assignments 
                    WHERE student_id = @StudentId
                    ORDER BY due_date ASC
                ", new { StudentId = studentId, Now = DateTime.UtcNow });

                return Results.Ok(homeworks);
            });
        }
    }
}
