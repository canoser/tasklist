using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class ScheduleEndpoints
    {
        public static void MapScheduleEndpoints(this IEndpointRouteBuilder app)
        {
            // Koç CRUD
            var coach = app.MapGroup("/api/v1/programs/{programId:guid}/schedule").RequireAuthorization("RequireCoachRole");

            coach.MapGet("/", async (Guid programId, [FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetSlotsAsync(programId, coachId.Value));
            });

            coach.MapPost("/", async (Guid programId, [FromBody] CreateScheduleSlotRequest req, [FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                try
                {
                    var id = await repo.CreateSlotAsync(programId, coachId.Value, req);
                    return Results.Ok(new { id });
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.NotFound(new { error = "Program bulunamadı veya yetkiniz yok." });
                }
                catch (InvalidOperationException ex) when (ex.Message == "EXACTLY_ONE_TARGET")
                {
                    return Results.BadRequest(new { error = "Ders, grup veya öğrenciden tam olarak biri seçilmeli." });
                }
                catch (InvalidOperationException ex) when (ex.Message == "TARGET_NOT_IN_PROGRAM")
                {
                    return Results.BadRequest(new { error = "Hedef bu programda bulunamadı." });
                }
            });

            coach.MapPut("/{slotId:guid}", async (Guid programId, Guid slotId, [FromBody] UpdateScheduleSlotRequest req, [FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.UpdateSlotAsync(programId, slotId, coachId.Value, req);
                return ok ? Results.Ok(new { message = "Güncellendi." }) : Results.NotFound(new { error = "Slot bulunamadı." });
            });

            coach.MapDelete("/{slotId:guid}", async (Guid programId, Guid slotId, [FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.DeleteSlotAsync(programId, slotId, coachId.Value);
                return ok ? Results.Ok(new { message = "Slot silindi." }) : Results.NotFound(new { error = "Slot bulunamadı." });
            });

            // Öğretmen okuma
            var teacher = app.MapGroup("/api/v1/teacher/schedule").RequireAuthorization("RequireTeacherRole");
            teacher.MapGet("/", async ([FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var teacherId = GetUserId(user);
                if (teacherId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetTeacherSlotsAsync(teacherId.Value));
            });

            // Öğrenci okuma
            var student = app.MapGroup("/api/v1/student/schedule").RequireAuthorization("RequireStudentRole");
            student.MapGet("/", async ([FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetUserId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStudentSlotsAsync(studentId.Value));
            });

            // Veli okuma
            var parent = app.MapGroup("/api/v1/parent/schedule").RequireAuthorization("RequireParentRole");
            parent.MapGet("/", async ([FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var parentId = GetUserId(user);
                if (parentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetParentSlotsAsync(parentId.Value));
            });
        }

        private static Guid? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }
}
