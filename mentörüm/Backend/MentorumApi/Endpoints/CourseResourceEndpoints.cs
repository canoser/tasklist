using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class CourseResourceEndpoints
    {
        public static void MapCourseResourceEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/programs/{programId:guid}/courses/{courseId:guid}/resources").RequireAuthorization("RequireCoachRole");

            group.MapGet("/", async (Guid programId, Guid courseId, [FromServices] CourseResourceRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetResourcesAsync(programId, courseId, coachId.Value));
            });

            group.MapPost("/", async (Guid programId, Guid courseId, [FromBody] CreateCourseResourceRequest req, [FromServices] CourseResourceRepository repo, [FromServices] NotificationRepository notifications, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                try
                {
                    var id = await repo.CreateResourceAsync(programId, courseId, coachId.Value, req);
                    await notifications.NotifyCourseStudentsAsync(courseId, programId, "RESOURCE_ASSIGNED", "Yeni Kaynak", $"'{req.Title}' kaynağı eklendi.");
                    return Results.Ok(new { id });
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.NotFound(new { error = "Program bulunamadı veya yetkiniz yok." });
                }
                catch (InvalidOperationException ex) when (ex.Message == "COURSE_NOT_IN_PROGRAM")
                {
                    return Results.NotFound(new { error = "Ders bu programda bulunamadı." });
                }
            });

            group.MapPut("/{resourceId:guid}", async (Guid programId, Guid courseId, Guid resourceId, [FromBody] UpdateCourseResourceRequest req, [FromServices] CourseResourceRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.UpdateResourceAsync(programId, resourceId, coachId.Value, req);
                return ok ? Results.Ok(new { message = "Güncellendi." }) : Results.NotFound(new { error = "Kaynak bulunamadı." });
            });

            group.MapDelete("/{resourceId:guid}", async (Guid programId, Guid courseId, Guid resourceId, [FromServices] CourseResourceRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.DeleteResourceAsync(programId, resourceId, coachId.Value);
                return ok ? Results.Ok(new { message = "Kaynak silindi." }) : Results.NotFound(new { error = "Kaynak bulunamadı." });
            });

            // Öğrenci: kaynaklar + ilerleme
            var student = app.MapGroup("/api/v1/student").RequireAuthorization("RequireStudentRole");

            student.MapGet("/courses", async ([FromServices] SchoolAccessRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetUserId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStudentCoursesAsync(studentId.Value));
            });

            student.MapGet("/courses/{courseId:guid}/resources", async (Guid courseId, [FromServices] CourseResourceRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetUserId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStudentCourseResourcesAsync(courseId, studentId.Value));
            });

            student.MapPut("/resources/{resourceId:guid}/progress", async (Guid resourceId, [FromBody] UpdateResourceProgressRequest req, [FromServices] CourseResourceRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetUserId(user);
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.UpsertProgressAsync(resourceId, studentId.Value, req);
                return ok ? Results.Ok(new { message = "İlerleme kaydedildi." }) : Results.NotFound(new { error = "Kaynak bulunamadı veya derste değilsiniz." });
            });
        }

        private static Guid? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }
}
