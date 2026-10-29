using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
using Microsoft.AspNetCore.Mvc;
using System;
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

            group.MapPost("/", async (
                Guid programId,
                [FromBody] DirectCreateTeacherRequest req,
                [FromServices] TeacherRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.FirstName) || string.IsNullOrWhiteSpace(req.LastName))
                    return Results.BadRequest(new { error = "Ad ve soyad zorunludur." });

                try
                {
                    var teacherId = await repo.DirectCreateTeacherAsync(programId, req, coachId.Value);
                    return Results.Ok(new { teacherId, message = "Öğretmen başarıyla eklendi." });
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

            group.MapGet("/{teacherId:guid}", async (Guid programId, Guid teacherId, [FromServices] TeacherRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var t = await repo.GetTeacherDetailAsync(programId, teacherId, coachId.Value);
                return t == null ? Results.NotFound(new { error = "Öğretmen bulunamadı." }) : Results.Ok(t);
            });

            group.MapDelete("/{teacherId:guid}", async (Guid programId, Guid teacherId, [FromServices] TeacherRepository repo, [FromServices] NotificationRepository notifications, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var r = await repo.DeactivateTeacherAsync(programId, teacherId, coachId.Value);
                if (r == "OK")
                {
                    await notifications.NotifyProgramCoachesAsync(programId, "TEACHER_DEACTIVATED", "Öğretmen pasife alındı", "Bir öğretmen pasife alındı ve dersleri öğretmensiz bırakıldı.");
                    return Results.Ok(new { message = "Öğretmen pasife alındı." });
                }
                return Results.NotFound(new { error = "Öğretmen bulunamadı." });
            });

            group.MapPut("/{teacherId:guid}", async (
                Guid programId,
                Guid teacherId,
                [FromBody] UpdateTeacherRequest req,
                [FromServices] TeacherRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.FullName))
                    return Results.BadRequest(new { error = "Öğretmen adı ve soyadı zorunludur." });

                try
                {
                    var ok = await repo.UpdateTeacherAsync(programId, teacherId, req, coachId.Value);
                    if (!ok) return Results.NotFound(new { error = "Öğretmen bulunamadı veya yetkiniz yok." });
                    return Results.Ok(new { message = "Öğretmen bilgileri başarıyla güncellendi." });
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

            group.MapGet("/{teacherId:guid}/students", async (
                Guid programId,
                Guid teacherId,
                [FromServices] TeacherRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                try
                {
                    var data = await repo.GetTeacherStudentsAsync(programId, teacherId, coachId.Value);
                    return Results.Ok(data);
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.NotFound(new { error = ex.Message });
                }
            });

            group.MapGet("/{teacherId:guid}/homework-stats", async (
                Guid programId,
                Guid teacherId,
                [FromServices] TeacherRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                try
                {
                    var data = await repo.GetTeacherHomeworkStatsAsync(programId, teacherId, coachId.Value);
                    return Results.Ok(data);
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.NotFound(new { error = ex.Message });
                }
            });

            group.MapGet("/{teacherId:guid}/exam-stats", async (
                Guid programId,
                Guid teacherId,
                [FromServices] TeacherRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                try
                {
                    var data = await repo.GetTeacherExamStatsAsync(programId, teacherId, coachId.Value);
                    return Results.Ok(data);
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.NotFound(new { error = ex.Message });
                }
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
                var masked = students.Select(s => SchoolAccessRepository.MaskStudent(s, access));
                return Results.Ok(masked);
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

            // --- Öğretmen kendi profili + oluşturma yetkileri (Aşama 3 & 5) ---
            me.MapGet("/me", async ([FromServices] TeacherRepository repo, ClaimsPrincipal user) =>
            {
                var teacherId = GetCoachId(user);
                if (teacherId == null) return Results.Unauthorized();
                var profile = await repo.GetTeacherProfileAsync(teacherId.Value);
                return profile == null ? Results.NotFound(new { error = "Profil bulunamadı." }) : Results.Ok(profile);
            });

            me.MapPost("/courses/{courseId:guid}/homework", async (Guid courseId, [FromBody] TeacherCreateHomeworkRequest req, [FromServices] SchoolAccessRepository repo, ClaimsPrincipal user) =>
            {
                var teacherId = GetCoachId(user);
                if (teacherId == null) return Results.Unauthorized();
                try
                {
                    var ids = await repo.CreateTeacherHomeworkAsync(courseId, teacherId.Value, req);
                    return Results.Ok(new { ids, count = ids.Count });
                }
                catch (UnauthorizedAccessException) { return Results.NotFound(new { error = "Ders bulunamadı veya öğrenci bu derste değil." }); }
                catch (InvalidOperationException) { return Results.Forbid(); }
            }).AddEndpointFilter<MentorumApi.Filters.IdempotencyFilter>();

            me.MapPost("/courses/{courseId:guid}/exams", async (Guid courseId, [FromBody] TeacherCreateExamRequest req, [FromServices] SchoolAccessRepository repo, ClaimsPrincipal user) =>
            {
                var teacherId = GetCoachId(user);
                if (teacherId == null) return Results.Unauthorized();
                try
                {
                    var id = await repo.CreateTeacherExamAsync(courseId, teacherId.Value, req);
                    return Results.Ok(new { id });
                }
                catch (UnauthorizedAccessException) { return Results.NotFound(new { error = "Ders bulunamadı veya öğrenci bu derste değil." }); }
                catch (InvalidOperationException) { return Results.Forbid(); }
            }).AddEndpointFilter<MentorumApi.Filters.IdempotencyFilter>();

            // Öğretmenin kendi dersindeki ödevi işlemesi (onay/geri bildirim/tamamlama) — koç açtıysa.
            me.MapPost("/courses/{courseId:guid}/homework/{assignmentId:guid}/review", async (
                Guid courseId,
                Guid assignmentId,
                [FromBody] TeacherReviewHomeworkRequest req,
                [FromServices] SchoolAccessRepository repo,
                ClaimsPrincipal user) =>
            {
                var teacherId = GetCoachId(user);
                if (teacherId == null) return Results.Unauthorized();
                try
                {
                    var id = await repo.ReviewTeacherHomeworkAsync(courseId, teacherId.Value, assignmentId, req);
                    return Results.Ok(new { id });
                }
                catch (UnauthorizedAccessException) { return Results.NotFound(new { error = "Ödev bulunamadı veya öğrenci bu derste değil." }); }
                catch (InvalidOperationException ex) when (ex.Message == "CONCURRENCY_CONFLICT")
                {
                    return Results.Conflict(new { error = "Bu kayıt başka bir oturumda güncellenmiş. Lütfen sayfayı yenileyip tekrar deneyin.", code = "CONCURRENCY_CONFLICT" });
                }
                catch (InvalidOperationException) { return Results.Forbid(); }
            }).AddEndpointFilter<MentorumApi.Filters.IdempotencyFilter>();

            // Öğretmenin ders içi performans notu (koç açtıysa: CanAddNotes / CanViewNotes)
            me.MapPost("/courses/{courseId:guid}/students/{studentId:guid}/notes", async (
                Guid courseId,
                Guid studentId,
                [FromBody] TeacherAddNoteRequest req,
                [FromServices] SchoolAccessRepository repo,
                ClaimsPrincipal user) =>
            {
                var teacherId = GetCoachId(user);
                if (teacherId == null) return Results.Unauthorized();
                try
                {
                    var id = await repo.AddTeacherNoteAsync(courseId, teacherId.Value, studentId, req);
                    return Results.Ok(new { id });
                }
                catch (UnauthorizedAccessException) { return Results.NotFound(new { error = "Ders veya öğrenci bulunamadı." }); }
                catch (InvalidOperationException) { return Results.Forbid(); }
            }).AddEndpointFilter<MentorumApi.Filters.IdempotencyFilter>();

            me.MapGet("/courses/{courseId:guid}/students/{studentId:guid}/notes", async (
                Guid courseId,
                Guid studentId,
                [FromServices] SchoolAccessRepository repo,
                ClaimsPrincipal user) =>
            {
                var teacherId = GetCoachId(user);
                if (teacherId == null) return Results.Unauthorized();
                try
                {
                    return Results.Ok(await repo.GetTeacherNotesAsync(courseId, teacherId.Value, studentId));
                }
                catch (UnauthorizedAccessException) { return Results.NotFound(new { error = "Ders veya öğrenci bulunamadı." }); }
                catch (InvalidOperationException) { return Results.Forbid(); }
            });
        }

        private static Guid? GetCoachId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }
}
