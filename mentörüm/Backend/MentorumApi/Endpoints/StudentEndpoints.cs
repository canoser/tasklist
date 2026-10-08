using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class StudentEndpoints
    {
        public static void MapStudentEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/students").RequireAuthorization("RequireCoachRole");

            group.MapGet("/", async (
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) => 
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var students = await repo.GetStudentsByCoachAsync(coachId);
                return Results.Ok(students);
            });

            group.MapGet("/{id:guid}", async (
                Guid id,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var student = await repo.GetStudentDetailAsync(coachId, id);
                if (student == null) return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                return Results.Ok(student);
            });

            group.MapGet("/{id:guid}/notes", async (
                Guid id,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var notes = await repo.GetStudentNotesAsync(coachId, id);
                return Results.Ok(notes);
            });

            group.MapPost("/{id:guid}/notes", async (
                Guid id,
                [FromBody] CreateStudentNoteRequest req,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                // İlk olarak öğrencinin gerçekten bu koça ait olup olmadığını teyit et (IDOR Check for INSERT)
                var student = await repo.GetStudentDetailAsync(coachId, id);
                if (student == null) return Results.NotFound(new { error = "Öğrenci bulunamadı." });

                await repo.AddStudentNoteAsync(coachId, id, req.Content);
                return Results.Ok(new { message = "Not başarıyla eklendi." });
            });

            // --- Öğrenci kendi verisi (Aşama 1) ---
            var self = app.MapGroup("/api/v1/student").RequireAuthorization("RequireStudentRole");

            self.MapGet("/profile", async ([FromServices] StudentRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                var profile = await repo.GetStudentProfileAsync(studentId.Value);
                return profile == null ? Results.NotFound(new { error = "Profil bulunamadı." }) : Results.Ok(profile);
            });

            self.MapGet("/exams", async ([FromServices] StudentRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStudentExamsAsync(studentId.Value));
            });

            self.MapGet("/curriculum", async ([FromServices] CurriculumRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStudentCurriculumAsync(studentId.Value));
            });

            self.MapGet("/goal", async ([FromServices] StudentRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                var goal = await repo.GetStudentGoalAsync(studentId.Value);
                return goal == null ? Results.NotFound(new { error = "Hedef bulunamadı." }) : Results.Ok(goal);
            });

            self.MapPut("/goal", async ([FromBody] UpdateStudentGoalRequest req, [FromServices] StudentRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                await repo.UpdateStudentGoalAsync(studentId.Value, req);
                return Results.Ok(new { message = "Hedef güncellendi." });
            });
        }

        private static Guid? GetStudentId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }
}
