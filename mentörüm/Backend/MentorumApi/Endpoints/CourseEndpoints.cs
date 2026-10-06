using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class CourseEndpoints
    {
        public static void MapCourseEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/programs/{programId:guid}/courses").RequireAuthorization("RequireCoachRole");

            group.MapGet("/", async (Guid programId, [FromServices] CourseRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetCoursesAsync(programId, coachId.Value));
            });

            group.MapPost("/", async (Guid programId, [FromBody] CreateCourseRequest req, [FromServices] CourseRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                try
                {
                    var id = await repo.CreateCourseAsync(programId, coachId.Value, req);
                    return Results.Ok(new { id });
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.NotFound(new { error = "Program bulunamadı veya yetkiniz yok." });
                }
            });

            group.MapGet("/{courseId:guid}", async (Guid programId, Guid courseId, [FromServices] CourseRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var c = await repo.GetCourseAsync(programId, courseId, coachId.Value);
                return c == null ? Results.NotFound(new { error = "Ders bulunamadı." }) : Results.Ok(c);
            });

            group.MapPut("/{courseId:guid}", async (Guid programId, Guid courseId, [FromBody] UpdateCourseRequest req, [FromServices] CourseRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.UpdateCourseAsync(programId, courseId, coachId.Value, req);
                return ok ? Results.Ok(new { message = "Güncellendi." }) : Results.NotFound(new { error = "Ders bulunamadı." });
            });

            group.MapDelete("/{courseId:guid}", async (Guid programId, Guid courseId, [FromServices] CourseRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.DeleteCourseAsync(programId, courseId, coachId.Value);
                return ok ? Results.Ok(new { message = "Ders silindi." }) : Results.NotFound(new { error = "Ders bulunamadı." });
            });

            group.MapPost("/{courseId:guid}/students", async (Guid programId, Guid courseId, [FromBody] AddCourseStudentRequest req, [FromServices] CourseRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var r = await repo.AddStudentToCourseAsync(programId, courseId, req.StudentId, coachId.Value);
                return r switch
                {
                    "OK" => Results.Ok(new { message = "Öğrenci eklendi." }),
                    "FORBIDDEN" => Results.NotFound(new { error = "Program bulunamadı." }),
                    _ => Results.NotFound(new { error = "Öğrenci veya ders bulunamadı." })
                };
            });

            group.MapDelete("/{courseId:guid}/students/{studentId:guid}", async (Guid programId, Guid courseId, Guid studentId, [FromServices] CourseRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var r = await repo.RemoveStudentFromCourseAsync(programId, courseId, studentId, coachId.Value);
                return r == "OK" ? Results.Ok(new { message = "Öğrenci çıkarıldı." }) : Results.NotFound(new { error = "Öğrenci bulunamadı." });
            });

            group.MapPost("/{courseId:guid}/groups", async (Guid programId, Guid courseId, [FromBody] AddCourseGroupRequest req, [FromServices] CourseRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var r = await repo.AddGroupToCourseAsync(programId, courseId, req.GroupId, coachId.Value);
                return r switch
                {
                    "OK" => Results.Ok(new { message = "Grup eklendi." }),
                    "FORBIDDEN" => Results.NotFound(new { error = "Program bulunamadı." }),
                    _ => Results.NotFound(new { error = "Grup veya ders bulunamadı." })
                };
            });

            group.MapDelete("/{courseId:guid}/groups/{groupId:guid}", async (Guid programId, Guid courseId, Guid groupId, [FromServices] CourseRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var r = await repo.RemoveGroupFromCourseAsync(programId, courseId, groupId, coachId.Value);
                return r == "OK" ? Results.Ok(new { message = "Grup çıkarıldı." }) : Results.NotFound(new { error = "Grup bulunamadı." });
            });
        }

        private static Guid? GetCoachId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }
}
