using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

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

            group.MapGet("/{id:guid}/curriculum", async (
                Guid id,
                [FromServices] StudentRepository studentRepo,
                [FromServices] CurriculumRepository curriculumRepo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var student = await studentRepo.GetStudentDetailAsync(coachId, id);
                if (student == null) return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                var topics = await curriculumRepo.GetStudentCurriculumAsync(id);
                return Results.Ok(topics);
            });

            // Koç, öğrencinin kişisel etkinliklerini salt okunur görür (Koç Görünürlüğü)
            group.MapGet("/{id:guid}/events", async (
                Guid id,
                [FromServices] StudentRepository studentRepo,
                [FromServices] CalendarRepository calendarRepo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var student = await studentRepo.GetStudentDetailAsync(coachId, id);
                if (student == null) return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                return Results.Ok(await calendarRepo.GetStudentPersonalEventsForCoachAsync(coachId, id));
            });

            // Koçluk görüşmeleri (not + aksiyon öğeleri)
            group.MapGet("/{id:guid}/sessions", async (
                Guid id,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var student = await repo.GetStudentDetailAsync(coachId, id);
                if (student == null) return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                return Results.Ok(await repo.GetCoachingSessionsAsync(coachId, id));
            });

            group.MapPost("/{id:guid}/sessions", async (
                Guid id,
                [FromBody] CreateCoachingSessionRequest req,
                [FromServices] StudentRepository repo,
                [FromServices] CalendarRepository calendarRepo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var student = await repo.GetStudentDetailAsync(coachId, id);
                if (student == null) return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                var sessionId = await repo.CreateCoachingSessionAsync(coachId, id, req);

                // Takvim entegrasyonu (M-160): görüşme, koçun kendi takvimine COACHING_SESSION olarak işlenir.
                if (req.SessionDate.HasValue)
                {
                    await calendarRepo.CreatePersonalEventAsync(coachId, new CreatePersonalEventRequest
                    {
                        Title = req.Title ?? "Koçluk Görüşmesi",
                        EventType = "COACHING_SESSION",
                        StartAt = req.SessionDate.Value,
                        EndAt = req.SessionDate.Value.AddHours(1)
                    });
                }

                return Results.Ok(new { id = sessionId });
            });

            // M-161: Veli Bilgilendirme Özeti PDF'i (KVKK: soyad yalnızca ilk harf)
            group.MapGet("/{id:guid}/report.pdf", async (
                Guid id,
                [FromServices] StudentRepository repo,
                [FromServices] ReportsRepository reportsRepo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var student = await repo.GetStudentDetailAsync(coachId, id);
                if (student == null) return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                var report = await reportsRepo.GetStudentReportAsync(coachId, id);
                var exams = await repo.GetStudentExamsAsync(id);

                var maskedName = MaskFullName(student.FullName);

                QuestPDF.Settings.License = LicenseType.Community;
                var pdf = Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(2, Unit.Centimetre);
                        page.Content().Column(col =>
                        {
                            col.Item().Text("Veli Bilgilendirme Özeti").FontSize(18).Bold();
                            col.Item().Text($"Öğrenci: {maskedName}");
                            col.Item().Text($"Sınıf: {(student.Grade?.ToString() ?? "-")} · Alan: {student.Track ?? "-"}");
                            if (!string.IsNullOrEmpty(student.TargetUniversity))
                                col.Item().Text($"Hedef: {student.TargetUniversity}{(student.TargetDepartment != null ? " · " + student.TargetDepartment : "")}");
                            col.Item().Text("").FontSize(8);
                            col.Item().Text("Ödev Durumu").Bold();
                            col.Item().Text($"Toplam Atanan: {report?.TotalAssigned ?? 0}");
                            col.Item().Text($"Tamamlanan: {report?.TotalCompleted ?? 0}");
                            col.Item().Text($"Gecikmiş: {report?.TotalOverdue ?? 0}");
                            col.Item().Text($"Başarı Oranı: %{(int)Math.Round(report?.SuccessRate ?? 0)}");
                            col.Item().Text("").FontSize(8);
                            col.Item().Text("Son Sınav Sonuçları").Bold();
                            foreach (var e in exams.Take(5))
                            {
                                col.Item().Text($"{e.ExamName ?? e.ExamType ?? "Sınav"} · {e.ExamDate?.ToString("dd.MM.yyyy") ?? "-"} · Net: {e.TotalNet ?? 0}");
                            }
                        });
                    });
                }).GeneratePdf();

                return Results.File(pdf, "application/pdf", $"veli-rapor-{student.FullName.Split(' ')[0]}.pdf");
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

            // M-157: öğrenci kendi görüşmelerini görür + hazırlık notu girer
            self.MapGet("/sessions", async ([FromServices] StudentRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStudentSessionsAsync(studentId.Value));
            });

            self.MapPatch("/sessions/{sessionId:guid}/prep", async (
                Guid sessionId,
                [FromBody] UpdateSessionPrepRequest req,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.UpdateSessionPrepAsync(studentId.Value, sessionId, req.PrepNotes ?? "");
                return ok ? Results.Ok(new { message = "Hazırlık notu kaydedildi." }) : Results.NotFound(new { error = "Görüşme bulunamadı." });
            });
        }

        private static Guid? GetStudentId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }

        private static string MaskFullName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "";
            var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 1) return parts[0];
            return $"{parts[0]} {parts[^1][0]}.";
        }
    }
}
