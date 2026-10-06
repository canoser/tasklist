using MentorumApi.Data;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class TeacherEndpoints
    {
        public static void MapTeacherEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/programs/{programId:guid}/teachers").RequireAuthorization("RequireCoachRole");

            group.MapGet("/", async (Guid programId, [FromServices] TeacherRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetTeachersAsync(programId, coachId.Value));
            });

            group.MapGet("/{teacherId:guid}", async (Guid programId, Guid teacherId, [FromServices] TeacherRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var t = await repo.GetTeacherAsync(programId, teacherId, coachId.Value);
                return t == null ? Results.NotFound(new { error = "Öğretmen bulunamadı." }) : Results.Ok(t);
            });

            group.MapDelete("/{teacherId:guid}", async (Guid programId, Guid teacherId, [FromServices] TeacherRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var r = await repo.DeactivateTeacherAsync(programId, teacherId, coachId.Value);
                return r == "OK" ? Results.Ok(new { message = "Öğretmen pasife alındı." }) : Results.NotFound(new { error = "Öğretmen bulunamadı." });
            });
            // Öğretmen tarafı (Aşama 6)
            var me = app.MapGroup("/api/v1/teacher").RequireAuthorization("RequireTeacherRole");

            me.MapGet("/courses", async ([FromServices] SchoolAccessRepository repo, ClaimsPrincipal user) =>
            {
                var teacherId = GetCoachId(user);
                if (teacherId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetTeacherCoursesAsync(teacherId.Value));
            });

            me.MapGet("/courses/{courseId:guid}/students", async (Guid courseId, [FromServices] SchoolAccessRepository repo, ClaimsPrincipal user) =>
            {
                var teacherId = GetCoachId(user);
                if (teacherId == null) return Results.Unauthorized();
                var access = await repo.GetCourseAccessAsync(courseId, teacherId.Value);
                if (access == null) return Results.NotFound(new { error = "Ders bulunamadı." });
                var students = await repo.GetTeacherCourseStudentsAsync(courseId);
                return Results.Ok(students.Select(s => SchoolAccessRepository.MaskStudent(s, access)));
            });

            me.MapGet("/courses/{courseId:guid}/homework", async (Guid courseId, [FromServices] SchoolAccessRepository repo, ClaimsPrincipal user) =>
            {
                var teacherId = GetCoachId(user);
                if (teacherId == null) return Results.Unauthorized();
                var access = await repo.GetCourseAccessAsync(courseId, teacherId.Value);
                if (access == null) return Results.NotFound(new { error = "Ders bulunamadı." });
                if (!access.CanViewHomework) return Results.Forbid();
                return Results.Ok(await repo.GetTeacherCourseHomeworkAsync(courseId));
            });

            me.MapGet("/courses/{courseId:guid}/exams", async (Guid courseId, [FromServices] SchoolAccessRepository repo, ClaimsPrincipal user) =>
            {
                var teacherId = GetCoachId(user);
                if (teacherId == null) return Results.Unauthorized();
                var access = await repo.GetCourseAccessAsync(courseId, teacherId.Value);
                if (access == null) return Results.NotFound(new { error = "Ders bulunamadı." });
                if (!access.CanViewExams) return Results.Forbid();
                return Results.Ok(await repo.GetTeacherCourseExamsAsync(courseId));
            });
        }

        private static Guid? GetCoachId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }
}
