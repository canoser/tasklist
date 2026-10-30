using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetSlotsAsync(programId, coachId.Value));
            });

            coach.MapPost("/", async (Guid programId, [FromBody] CreateScheduleSlotRequest req, [FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
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
                catch (ScheduleConflictException ex)
                {
                    return Results.Conflict(new { error = "Ders çakışması tespit edildi.", code = "SCHEDULE_CONFLICT", conflictDetails = ex.Conflicts });
                }
                catch (InvalidOperationException ex) when (ex.Message == "EXACTLY_ONE_TARGET")
                {
                    return Results.BadRequest(new { error = "Ders, grup veya öğrenciden tam olarak biri seçilmeli." });
                }
                catch (InvalidOperationException ex) when (ex.Message == "TARGET_NOT_IN_PROGRAM")
                {
                    return Results.BadRequest(new { error = "Hedef bu programda bulunamadı." });
                }
                catch (InvalidOperationException ex) when (ex.Message == "INVALID_DAY_OF_WEEK")
                {
                    return Results.BadRequest(new { error = "Gün değeri 1-7 arasında olmalıdır." });
                }
                catch (InvalidOperationException ex) when (ex.Message == "INVALID_TIME_RANGE")
                {
                    return Results.BadRequest(new { error = "Başlangıç saati bitişten küçük olmalıdır." });
                }
            });

            coach.MapPut("/{slotId:guid}", async (Guid programId, Guid slotId, [FromBody] UpdateScheduleSlotRequest req, [FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                try
                {
                    var ok = await repo.UpdateSlotAsync(programId, slotId, coachId.Value, req);
                    return ok ? Results.Ok(new { message = "Güncellendi." }) : Results.NotFound(new { error = "Slot bulunamadı." });
                }
                catch (ScheduleConflictException ex)
                {
                    return Results.Conflict(new { error = "Ders çakışması tespit edildi.", code = "SCHEDULE_CONFLICT", conflictDetails = ex.Conflicts });
                }
                catch (InvalidOperationException ex) when (ex.Message == "INVALID_DAY_OF_WEEK")
                {
                    return Results.BadRequest(new { error = "Gün değeri 1-7 arasında olmalıdır." });
                }
                catch (InvalidOperationException ex) when (ex.Message == "INVALID_TIME_RANGE")
                {
                    return Results.BadRequest(new { error = "Başlangıç saati bitişten küçük olmalıdır." });
                }
            });

            coach.MapDelete("/{slotId:guid}", async (Guid programId, Guid slotId, [FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.DeleteSlotAsync(programId, slotId, coachId.Value);
                return ok ? Results.Ok(new { message = "Slot silindi." }) : Results.NotFound(new { error = "Slot bulunamadı." });
            });

            // Öğretmen okuma
            var teacher = app.MapGroup("/api/v1/teacher/schedule").RequireAuthorization("RequireTeacherRole");
            teacher.MapGet("/", async ([FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var teacherId = user.GetUserId();
                if (teacherId == null) return Results.Unauthorized();
                var slots = await repo.GetTeacherSlotsAsync(teacherId.Value);
                var sanitized = slots.Select(s => s.IsBusyOnly ? new ScheduleSlotDto
                {
                    Id = s.Id,
                    DayOfWeek = s.DayOfWeek,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    IsBusyOnly = true,
                    Title = null,
                    CourseId = null,
                    GroupId = null,
                    StudentId = null,
                    ProgramId = null,
                    Color = "#94A3B8"
                } : s);
                return Results.Ok(sanitized);
            });

            // Öğrenci okuma
            var student = app.MapGroup("/api/v1/student/schedule").RequireAuthorization("RequireStudentRole");
            student.MapGet("/", async ([FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStudentSlotsAsync(studentId.Value));
            });

            // Veli okuma
            var parent = app.MapGroup("/api/v1/parent").RequireAuthorization("RequireParentRole");
            parent.MapGet("/schedule", async ([FromServices] ScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var parentId = user.GetUserId();
                if (parentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetParentSlotsAsync(parentId.Value));
            });

            // Veli — belirli çocuğun programı (çocuk seçici; çok çocuklu velide karışmayı önler)
            parent.MapGet("/children/{studentId:guid}/schedule", async (Guid studentId, [FromServices] ScheduleRepository repo, [FromServices] ParentVisibilityRepository parentRepo, ClaimsPrincipal user) =>
            {
                var parentId = user.GetUserId();
                if (parentId == null) return Results.Unauthorized();
                if (!await parentRepo.CanViewCalendarAsync(parentId.Value, studentId))
                    return Results.Forbid();
                return Results.Ok(await repo.GetStudentSlotsAsync(studentId));
            });
        }
    }
}
