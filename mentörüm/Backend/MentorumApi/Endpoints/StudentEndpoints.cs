using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
using Dapper;
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

            group.MapDelete("/{id:guid}", async (
                Guid id,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var success = await repo.DeleteStudentAsync(coachId, id);
                if (!success) return Results.NotFound(new { error = "Öğrenci bulunamadı veya silme yetkiniz yok." });

                return Results.Ok(new { message = "Öğrenci başarıyla silindi." });
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

            // T16: Veli görünürlük bayrakları
            group.MapGet("/{studentId:guid}/parents/{parentId:guid}/permissions", async (
                Guid studentId,
                Guid parentId,
                [FromServices] ParentVisibilityRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                try
                {
                    await guard.EnsureCoachOwnsStudentAsync(coachId, studentId);
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.Json(new { error = "Bu öğrenci bu koça ait değil." }, statusCode: 403);
                }

                var permissions = await repo.GetParentPermissionsAsync(studentId, parentId);
                if (permissions == null) return Results.NotFound(new { error = "Veli kaydı bulunamadı." });

                return Results.Ok(permissions);
            });

            group.MapPut("/{studentId:guid}/parents/{parentId:guid}/permissions", async (
                Guid studentId,
                Guid parentId,
                [FromBody] UpdateParentPermissionsRequest req,
                [FromServices] ParentVisibilityRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                try
                {
                    await guard.EnsureCoachOwnsStudentAsync(coachId, studentId);
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.Json(new { error = "Bu öğrenci bu koça ait değil." }, statusCode: 403);
                }

                var ok = await repo.UpdateParentPermissionsAsync(studentId, parentId, req);
                if (!ok) return Results.NotFound(new { error = "Veli kaydı bulunamadı veya güncellenemedi." });

                return Results.Ok(new { message = "Veli yetkileri güncellendi." });
            });

            // T23: Koç — öğrenci konu istatistikleri ve haftalık zaman bütçesi
            group.MapGet("/{id:guid}/subject-stats", async (
                Guid id,
                [FromServices] ReportsRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                try
                {
                    await guard.EnsureCoachOwnsStudentAsync(coachId, id);
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.Json(new { error = "Bu öğrenci bu koça ait değil." }, statusCode: 403);
                }

                var stats = await repo.GetStudentSubjectStatsAsync(id);
                return Results.Ok(stats);
            });

            group.MapGet("/{id:guid}/time-budget", async (
                Guid id,
                [FromServices] ReportsRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                try
                {
                    await guard.EnsureCoachOwnsStudentAsync(coachId, id);
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.Json(new { error = "Bu öğrenci bu koça ait değil." }, statusCode: 403);
                }

                var budget = await repo.GetWeeklyTimeBudgetAsync(id);
                return Results.Ok(budget);
            });

            // T30: Koç için öğrencinin tüm öğretmen notları
            group.MapGet("/{id:guid}/teacher-notes", async (
                Guid id,
                [FromServices] SchoolAccessRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                try
                {
                    await guard.EnsureCoachOwnsStudentAsync(coachId, id);
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.Json(new { error = "Bu öğrenci bu koça ait değil." }, statusCode: 403);
                }

                var notes = await repo.GetStudentTeacherNotesForCoachAsync(id);
                return Results.Ok(notes);
            });

            group.MapGet("/recent-teacher-notes", async (
                [FromServices] SchoolAccessRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();

                var notes = await repo.GetRecentTeacherNotesForCoachAsync(coachId, 10);
                return Results.Ok(notes);
            });

            // --- V10: Koç için öğrenci günlük durumu + koç görünür notları ---
            group.MapGet("/{id:guid}/checkins", async (Guid id, [FromServices] StudentCheckinRepository repo, [FromServices] ProgramAccessGuard guard, ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();
                try { await guard.EnsureCoachOwnsStudentAsync(coachId, id); }
                catch (UnauthorizedAccessException) { return Results.Json(new { error = "Yetkiniz yok." }, statusCode: 403); }
                return Results.Ok(await repo.GetRecentAsync(id));
            });

            group.MapGet("/{id:guid}/student-notes", async (Guid id, [FromServices] StudentNotesRepository repo, [FromServices] ProgramAccessGuard guard, ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();
                try { await guard.EnsureCoachOwnsStudentAsync(coachId, id); }
                catch (UnauthorizedAccessException) { return Results.Json(new { error = "Yetkiniz yok." }, statusCode: 403); }
                return Results.Ok(await repo.GetForCoachAsync(id));
            });

            group.MapGet("/{id:guid}/questions", async (Guid id, [FromServices] StudentQuestionsRepository repo, [FromServices] ProgramAccessGuard guard, ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();
                try { await guard.EnsureCoachOwnsStudentAsync(coachId, id); }
                catch (UnauthorizedAccessException) { return Results.Json(new { error = "Yetkiniz yok." }, statusCode: 403); }
                return Results.Ok(await repo.ListAsync(id));
            });

            group.MapPatch("/{id:guid}/questions/{questionId:guid}", async (
                Guid id,
                Guid questionId,
                [FromBody] CoachReplyQuestionRequest req,
                [FromServices] StudentQuestionsRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();
                try { await guard.EnsureCoachOwnsStudentAsync(coachId, id); }
                catch (UnauthorizedAccessException) { return Results.Json(new { error = "Yetkiniz yok." }, statusCode: 403); }

                var ok = await repo.ReplyByCoachAsync(id, questionId, coachId, req.Reply, req.Status);
                if (!ok) return Results.NotFound(new { error = "Soru bulunamadı veya yetkiniz yok." });

                return Results.Ok(new { message = "Soru koç tarafından yanıtlandı." });
            });

            group.MapGet("/{id:guid}/coaching-tools", async (
                Guid id,
                [FromServices] DbConnectionFactory db,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();
                try { await guard.EnsureCoachOwnsStudentAsync(coachId, id); }
                catch (UnauthorizedAccessException) { return Results.Json(new { error = "Yetkiniz yok." }, statusCode: 403); }

                using var conn = db.CreateConnection();
                var tools = await conn.QuerySingleOrDefaultAsync<(string? SwotData, string? WheelData, string? HabitsData, DateTime? UpdatedAt)>(@"
                    SELECT swot_data::text AS SwotData, wheel_data::text AS WheelData, habits_data::text AS HabitsData, updated_at AS UpdatedAt
                    FROM student_coaching_tools
                    WHERE student_id = @StudentId",
                    new { StudentId = id });

                var autoSwot = new AutoSwotSummaryDto();
                var recentExams = (await conn.QueryAsync<(string? ExamName, float? TotalNet, string? ErrorReasons)>(@"
                    SELECT exam_name, total_net, error_reasons 
                    FROM exam_results 
                    WHERE student_id = @StudentId 
                    ORDER BY exam_date DESC LIMIT 5",
                    new { StudentId = id })).ToList();

                var highScores = recentExams.Where(e => (e.TotalNet ?? 0) >= 70).ToList();
                if (highScores.Count > 0)
                    autoSwot.Strengths.Add($"Son denemelerde {highScores.Count} sınavda 70+ net başarısı.");

                var errorTexts = recentExams.Where(e => !string.IsNullOrWhiteSpace(e.ErrorReasons)).Select(e => e.ErrorReasons!).ToList();
                if (errorTexts.Any(t => t.Contains("DİKKATSİZLİK", StringComparison.OrdinalIgnoreCase) || t.Contains("DIKKATSIZLIK", StringComparison.OrdinalIgnoreCase)))
                    autoSwot.Weaknesses.Add("Sınav analizlerinde dikkat hataları yoğunlukta.");
                if (errorTexts.Any(t => t.Contains("BİLGİ_EKSİĞİ", StringComparison.OrdinalIgnoreCase) || t.Contains("BILGI", StringComparison.OrdinalIgnoreCase)))
                    autoSwot.Weaknesses.Add("Konu eksiklerinden kaynaklanan yanlışlar tespit edildi.");
                if (errorTexts.Any(t => t.Contains("SÜRE", StringComparison.OrdinalIgnoreCase) || t.Contains("SURE", StringComparison.OrdinalIgnoreCase)))
                    autoSwot.Threats.Add("Zaman yönetimi ve süre yetiştirme riski.");

                var overdueCount = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(1) FROM homework_assignments 
                    WHERE student_id = @StudentId AND status = 'PENDING' AND due_date < CURRENT_DATE",
                    new { StudentId = id });
                if (overdueCount > 0)
                    autoSwot.Threats.Add($"{overdueCount} adet gecikmiş ödev birikmiş durumda.");

                var openQuestions = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(1) FROM student_questions WHERE student_id = @StudentId AND status = 'OPEN'",
                    new { StudentId = id });
                if (openQuestions > 0)
                    autoSwot.Opportunities.Add($"{openQuestions} adet çözüm bekleyen soru ile eksik kapatma fırsatı.");
                else
                    autoSwot.Strengths.Add("Tüm çözülemeyen sorular yanıtlanmış veya temiz.");

                return Results.Ok(new CoachStudentToolsResponseDto
                {
                    StudentId = id,
                    SwotData = tools.SwotData ?? "{}",
                    WheelData = tools.WheelData ?? "{}",
                    HabitsData = tools.HabitsData ?? "[]",
                    AutoSwot = autoSwot,
                    UpdatedAt = tools.UpdatedAt
                });
            });

            group.MapPut("/{id:guid}/coaching-tools", async (
                Guid id,
                [FromBody] UpdateCoachingToolsRequest req,
                [FromServices] DbConnectionFactory db,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(coachIdStr, out var coachId)) return Results.Unauthorized();
                try { await guard.EnsureCoachOwnsStudentAsync(coachId, id); }
                catch (UnauthorizedAccessException) { return Results.Json(new { error = "Yetkiniz yok." }, statusCode: 403); }

                using var conn = db.CreateConnection();
                await conn.ExecuteAsync(@"
                    INSERT INTO student_coaching_tools (student_id, swot_data, wheel_data, habits_data, updated_by, updated_at)
                    VALUES (
                        @StudentId,
                        COALESCE(CAST(@SwotData AS jsonb), '{}'::jsonb),
                        COALESCE(CAST(@WheelData AS jsonb), '{}'::jsonb),
                        COALESCE(CAST(@HabitsData AS jsonb), '[]'::jsonb),
                        @CoachId,
                        NOW()
                    )
                    ON CONFLICT (student_id) DO UPDATE SET
                        swot_data = COALESCE(CAST(@SwotData AS jsonb), student_coaching_tools.swot_data),
                        wheel_data = COALESCE(CAST(@WheelData AS jsonb), student_coaching_tools.wheel_data),
                        habits_data = COALESCE(CAST(@HabitsData AS jsonb), student_coaching_tools.habits_data),
                        updated_by = @CoachId,
                        updated_at = NOW()",
                    new {
                        StudentId = id,
                        SwotData = req.SwotData,
                        WheelData = req.WheelData,
                        HabitsData = req.HabitsData,
                        CoachId = coachId
                    });

                return Results.Ok(new { message = "Koçluk araçları başarıyla güncellendi." });
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

            // T19: Öğrenci için öğretmen notları (yalnızca STUDENT_VISIBLE ve summary)
            self.MapGet("/teacher-notes", async (
                [FromServices] SchoolAccessRepository repo,
                ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                var notes = await repo.GetStudentVisibleTeacherNotesAsync(studentId.Value);
                return Results.Ok(notes);
            });

            // T21: Çalışma Oturumları (kronometre / manuel / hızlı kayıt)
            self.MapPost("/study-sessions", async (
                [FromBody] CreateStudySessionRequest req,
                [FromServices] StudySessionRepository repo,
                ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();

                try
                {
                    var id = await repo.CreateAsync(studentId.Value, req);
                    return Results.Ok(new { id });
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.NotFound(new { error = "Öğrenci profili bulunamadı." });
                }
            });

            self.MapGet("/study-sessions", async (
                [FromQuery] DateTime? from,
                [FromQuery] DateTime? to,
                [FromServices] StudySessionRepository repo,
                ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();

                var sessions = await repo.ListAsync(studentId.Value, from, to);
                return Results.Ok(sessions);
            });

            // T23: Öğrenci — kendi konu istatistikleri ve haftalık zaman bütçesi
            self.MapGet("/subject-stats", async (
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();

                var stats = await repo.GetStudentSubjectStatsAsync(studentId.Value);
                return Results.Ok(stats);
            });

            self.MapGet("/time-budget", async (
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();

                var budget = await repo.GetWeeklyTimeBudgetAsync(studentId.Value);
                return Results.Ok(budget);
            });

            // --- V10: Günlük Durum (Mood Check-in) ---
            self.MapPut("/checkin", async ([FromBody] UpsertCheckinRequest req, [FromServices] StudentCheckinRepository repo, [FromServices] DbConnectionFactory db, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.Mood)) return Results.BadRequest(new { error = "Durum gerekli." });

                using var conn = db.CreateConnection();
                var programId = await conn.ExecuteScalarAsync<Guid?>("SELECT program_id FROM students WHERE id = @Id", new { Id = studentId.Value });
                if (programId == null) return Results.Unauthorized();

                await repo.UpsertAsync(studentId.Value, programId.Value, req.Mood, req.Note);
                return Results.Ok(new { message = "Durum kaydedildi." });
            });

            self.MapGet("/checkins", async ([FromServices] StudentCheckinRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetRecentAsync(studentId.Value));
            });

            // --- V10: Kişisel Notlar (pin + gizlilik) ---
            self.MapGet("/notes", async ([FromServices] StudentNotesRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.ListAsync(studentId.Value));
            });

            self.MapPost("/notes", async ([FromBody] CreatePersonalNoteRequest req, [FromServices] StudentNotesRepository repo, [FromServices] DbConnectionFactory db, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();

                using var conn = db.CreateConnection();
                var programId = await conn.ExecuteScalarAsync<Guid?>("SELECT program_id FROM students WHERE id = @Id", new { Id = studentId.Value });
                if (programId == null) return Results.Unauthorized();

                var id = await repo.CreateAsync(studentId.Value, programId.Value, req);
                return Results.Ok(new { id });
            });

            self.MapPut("/notes/{noteId:guid}", async (Guid noteId, [FromBody] UpdatePersonalNoteRequest req, [FromServices] StudentNotesRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.UpdateAsync(studentId.Value, noteId, req);
                return ok ? Results.Ok(new { message = "Not güncellendi." }) : Results.NotFound(new { error = "Not bulunamadı." });
            });

            self.MapDelete("/notes/{noteId:guid}", async (Guid noteId, [FromServices] StudentNotesRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.DeleteAsync(studentId.Value, noteId);
                return ok ? Results.Ok(new { message = "Not silindi." }) : Results.NotFound(new { error = "Not bulunamadı." });
            });

            // --- V10: Takıldığım Konular (Sorulacaklar) ---
            self.MapGet("/questions", async ([FromServices] StudentQuestionsRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.ListAsync(studentId.Value));
            });

            self.MapPost("/questions", async ([FromBody] CreateStudentQuestionRequest req, [FromServices] StudentQuestionsRepository repo, [FromServices] DbConnectionFactory db, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.TopicText)) return Results.BadRequest(new { error = "Konu gerekli." });

                using var conn = db.CreateConnection();
                var programId = await conn.ExecuteScalarAsync<Guid?>("SELECT program_id FROM students WHERE id = @Id", new { Id = studentId.Value });
                if (programId == null) return Results.Unauthorized();

                var id = await repo.CreateAsync(studentId.Value, programId.Value, req);
                return Results.Ok(new { id });
            });

            self.MapPatch("/questions/{questionId:guid}", async (Guid questionId, [FromServices] StudentQuestionsRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.SetStatusAsync(studentId.Value, questionId, "RESOLVED");
                return ok ? Results.Ok(new { message = "Çözüldü olarak işaretlendi." }) : Results.NotFound(new { error = "Bulunamadı." });
            });

            // --- V10: Streak ---
            self.MapGet("/streak", async ([FromServices] StudySessionRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStreakAsync(studentId.Value));
            });

            // --- V10: Okul Haftalık Şablonu ---
            self.MapGet("/school-schedule", async ([FromServices] SchoolScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.ListAsync(studentId.Value));
            });

            self.MapPost("/school-schedule", async ([FromBody] CreateSchoolScheduleRequest req, [FromServices] SchoolScheduleRepository repo, [FromServices] DbConnectionFactory db, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                if (req.DayOfWeek < 1 || req.DayOfWeek > 7 || string.IsNullOrWhiteSpace(req.StartTime) || string.IsNullOrWhiteSpace(req.EndTime))
                    return Results.BadRequest(new { error = "Gün ve saatler gerekli." });

                if (!TimeSpan.TryParse(req.StartTime, out var startTime) || !TimeSpan.TryParse(req.EndTime, out var endTime) || startTime >= endTime)
                    return Results.BadRequest(new { error = "Başlangıç saati bitiş saatinden önce olmalıdır." });

                using var conn = db.CreateConnection();
                var programId = await conn.ExecuteScalarAsync<Guid?>("SELECT program_id FROM students WHERE id = @Id", new { Id = studentId.Value });
                if (programId == null) return Results.Unauthorized();

                var id = await repo.CreateAsync(studentId.Value, programId.Value, req);
                return Results.Ok(new { id });
            });

            self.MapDelete("/school-schedule/{scheduleId:guid}", async (Guid scheduleId, [FromServices] SchoolScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.DeleteAsync(studentId.Value, scheduleId);
                return ok ? Results.Ok(new { message = "Silindi." }) : Results.NotFound(new { error = "Bulunamadı." });
            });

            // --- V16: Koçluk Araçları (Öğrenci Görünümü - Gizlilik Korumalı: Asla SWOT/Koç Notu Açılmaz) ---
            self.MapGet("/coaching-tools", async ([FromServices] DbConnectionFactory db, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();

                using var conn = db.CreateConnection();
                var tools = await conn.QuerySingleOrDefaultAsync<string?>(@"
                    SELECT habits_data::text FROM student_coaching_tools WHERE student_id = @StudentId",
                    new { StudentId = studentId.Value });

                var target = await conn.QuerySingleOrDefaultAsync<(string? Milestone, int? TargetMins, int? TargetQs)>(@"
                    SELECT monthly_milestone, weekly_target_minutes, weekly_target_questions 
                    FROM students WHERE id = @StudentId",
                    new { StudentId = studentId.Value });

                return Results.Ok(new StudentCoachingHabitsDto
                {
                    StudentId = studentId.Value,
                    HabitsData = tools ?? "[]",
                    MonthlyMilestone = target.Milestone,
                    WeeklyTargetMinutes = target.TargetMins,
                    WeeklyTargetQuestions = target.TargetQs
                });
            });

            self.MapPatch("/coaching-tools/habits", async ([FromBody] ToggleHabitRequest req, [FromServices] DbConnectionFactory db, ClaimsPrincipal user) =>
            {
                var studentId = GetStudentId(user);
                if (studentId == null) return Results.Unauthorized();

                using var conn = db.CreateConnection();
                var currentHabitsJson = await conn.QuerySingleOrDefaultAsync<string?>(@"
                    SELECT habits_data::text FROM student_coaching_tools WHERE student_id = @StudentId",
                    new { StudentId = studentId.Value });

                var dateStr = string.IsNullOrWhiteSpace(req.Date) ? DateTime.UtcNow.ToString("yyyy-MM-dd") : req.Date;
                var rootNode = string.IsNullOrWhiteSpace(currentHabitsJson) 
                    ? new System.Text.Json.Nodes.JsonArray() 
                    : System.Text.Json.Nodes.JsonNode.Parse(currentHabitsJson) as System.Text.Json.Nodes.JsonArray ?? new System.Text.Json.Nodes.JsonArray();

                foreach (var item in rootNode)
                {
                    if (item is System.Text.Json.Nodes.JsonObject obj && obj["id"]?.ToString() == req.HabitId)
                    {
                        var datesArr = obj["completedDates"] as System.Text.Json.Nodes.JsonArray;
                        if (datesArr == null)
                        {
                            datesArr = new System.Text.Json.Nodes.JsonArray();
                            obj["completedDates"] = datesArr;
                        }

                        var existingList = datesArr.Select(d => d?.ToString()).ToList();
                        if (req.Completed && !existingList.Contains(dateStr))
                        {
                            datesArr.Add(dateStr);
                        }
                        else if (!req.Completed && existingList.Contains(dateStr))
                        {
                            for (int i = datesArr.Count - 1; i >= 0; i--)
                            {
                                if (datesArr[i]?.ToString() == dateStr)
                                    datesArr.RemoveAt(i);
                            }
                        }
                        break;
                    }
                }

                var updatedJson = rootNode.ToJsonString();
                await conn.ExecuteAsync(@"
                    INSERT INTO student_coaching_tools (student_id, habits_data, updated_at)
                    VALUES (@StudentId, CAST(@HabitsData AS jsonb), NOW())
                    ON CONFLICT (student_id) DO UPDATE SET
                        habits_data = CAST(@HabitsData AS jsonb),
                        updated_at = NOW()",
                    new { StudentId = studentId.Value, HabitsData = updatedJson });

                return Results.Ok(new { message = "Alışkanlık durumu güncellendi.", habitsData = updatedJson });
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
