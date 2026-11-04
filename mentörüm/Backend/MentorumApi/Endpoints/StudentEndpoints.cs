using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Extensions;
using MentorumApi.Services;
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                var students = await repo.GetStudentsByCoachAsync(coachId.Value);
                return Results.Ok(students);
            });

            group.MapGet("/{id:guid}", async (
                Guid id,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                var student = await repo.GetStudentDetailAsync(coachId.Value, id);
                if (student == null) return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                return Results.Ok(student);
            });

            group.MapDelete("/{id:guid}", async (
                Guid id,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                var success = await repo.DeleteStudentAsync(coachId.Value, id);
                if (!success) return Results.NotFound(new { error = "Öğrenci bulunamadı veya silme yetkiniz yok." });

                return Results.Ok(new { message = "Öğrenci başarıyla silindi." });
            });

            group.MapGet("/{id:guid}/curriculum", async (
                Guid id,
                [FromQuery] int? grade,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] CurriculumRepository curriculumRepo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                if (await guard.GetOwnedStudentProgramAsync(coachId.Value, id) == null)
                    return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                var topics = await curriculumRepo.GetStudentCurriculumAsync(id, grade);
                return Results.Ok(topics);
            });

            // Koç, öğrencinin kişisel etkinliklerini salt okunur görür (Koç Görünürlüğü)
            group.MapGet("/{id:guid}/events", async (
                Guid id,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] CalendarRepository calendarRepo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                if (await guard.GetOwnedStudentProgramAsync(coachId.Value, id) == null)
                    return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                return Results.Ok(await calendarRepo.GetStudentPersonalEventsForCoachAsync(coachId.Value, id));
            });

            // Koçluk görüşmeleri (not + aksiyon öğeleri)
            group.MapGet("/{id:guid}/sessions", async (
                Guid id,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] StudentCoachingToolsRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                if (await guard.GetOwnedStudentProgramAsync(coachId.Value, id) == null)
                    return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                return Results.Ok(await repo.GetCoachingSessionsAsync(id));
            });

            group.MapPost("/{id:guid}/sessions", async (
                Guid id,
                [FromBody] CreateCoachingSessionRequest req,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] StudentCoachingToolsRepository repo,
                [FromServices] CalendarRepository calendarRepo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                if (await guard.GetOwnedStudentProgramAsync(coachId.Value, id) == null)
                    return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                var sessionId = await repo.CreateCoachingSessionAsync(coachId.Value, id, req);

                // Takvim entegrasyonu (M-160): görüşme, koçun kendi takvimine COACHING_SESSION olarak işlenir.
                if (req.SessionDate.HasValue)
                {
                    await calendarRepo.CreatePersonalEventAsync(coachId.Value, new CreatePersonalEventRequest
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                var student = await repo.GetStudentDetailAsync(coachId.Value, id);
                if (student == null) return Results.NotFound(new { error = "Öğrenci bulunamadı veya erişim yetkiniz yok." });

                var report = await reportsRepo.GetStudentReportAsync(coachId.Value, id);
                var gradeReport = await reportsRepo.GetStudentGradeReportAsync(id, null, false);
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
                            col.Item().Text(gradeReport?.Profile?.SystemTitle ?? "Veli Bilgilendirme Özeti").FontSize(16).Bold();
                            if (!string.IsNullOrEmpty(gradeReport?.Profile?.WrongPenaltyRule))
                                col.Item().Text($"Net Hesaplama Kuralı: {gradeReport.Profile.WrongPenaltyRule}").FontSize(10);
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
                            if (gradeReport?.Wellbeing != null)
                            {
                                col.Item().Text("").FontSize(8);
                                col.Item().Text("İyi Oluş & Motivasyon (Son 14 Gün)").Bold();
                                col.Item().Text($"Check-in Sayısı: {gradeReport.Wellbeing.RecentCheckinCount} · Pozitif Duygu: %{gradeReport.Wellbeing.PositiveMoodRate} · GROW Seansı: {gradeReport.Wellbeing.CompletedGrowSessionsCount}");
                            }
                            if (gradeReport?.SubjectMastery?.Count > 0)
                            {
                                col.Item().Text("").FontSize(8);
                                col.Item().Text("Ders Bazlı Müfredat ve Başarı Özeti").Bold();
                                foreach (var sm in gradeReport.SubjectMastery.Take(8))
                                {
                                    col.Item().Text($"{sm.SubjectName}: Konu %{sm.TopicCompletionPercent} ({sm.CompletedTopics}/{sm.TotalTopics}) · Son Net: {sm.LastExamNet}{(sm.TargetNet.HasValue ? $" · Hedef: {sm.TargetNet.Value}" : "")}");
                                }
                            }
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                var notes = await repo.GetStudentNotesAsync(coachId.Value, id);
                return Results.Ok(notes);
            });

            group.MapPost("/{id:guid}/notes", async (
                Guid id,
                [FromBody] CreateStudentNoteRequest req,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                if (await guard.GetOwnedStudentProgramAsync(coachId.Value, id) == null)
                    return Results.NotFound(new { error = "Öğrenci bulunamadı." });

                await repo.AddStudentNoteAsync(coachId.Value, id, req.Content);
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, studentId);

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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, studentId);

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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);

                var stats = await repo.GetStudentSubjectStatsAsync(id);
                return Results.Ok(stats);
            });

            group.MapGet("/{id:guid}/time-budget", async (
                Guid id,
                [FromServices] ReportsRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);

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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);

                var notes = await repo.GetStudentTeacherNotesForCoachAsync(id);
                return Results.Ok(notes);
            });

            // U18: Koçun öğrencisi için ders bazlı değerlendirme / öğretmen notu eklemesi
            group.MapPost("/{id:guid}/teacher-notes", async (
                Guid id,
                [FromBody] CoachAddCourseNoteRequest req,
                [FromServices] SchoolAccessRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.Note)) return Results.BadRequest(new { error = "Not alanı zorunludur." });

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);

                try
                {
                    var noteId = await repo.AddCoachCourseNoteAsync(coachId.Value, id, req);
                    return Results.Ok(new { id = noteId });
                }
                catch (InvalidOperationException ex) when (ex.Message == "COURSE_NOT_FOUND")
                {
                    return Results.NotFound(new { error = "Ders bulunamadı." });
                }
            }).AddEndpointFilter<MentorumApi.Filters.IdempotencyFilter>();

            // U18: Koç için öğrencinin kayıtlı olduğu dersler ve öğretmenleri
            group.MapGet("/{id:guid}/courses", async (
                Guid id,
                [FromServices] SchoolAccessRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);

                var courses = await repo.GetStudentCoursesAsync(id);
                return Results.Ok(courses);
            });

            group.MapGet("/recent-teacher-notes", async (
                [FromServices] SchoolAccessRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();

                var notes = await repo.GetRecentTeacherNotesForCoachAsync(coachId.Value, 10);
                return Results.Ok(notes);
            });

            // --- V10: Koç için öğrenci günlük durumu + koç görünür notları ---
            group.MapGet("/{id:guid}/checkins", async (Guid id, [FromServices] StudentCheckinRepository repo, [FromServices] ProgramAccessGuard guard, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);
                return Results.Ok(await repo.GetRecentAsync(id));
            });

            group.MapGet("/{id:guid}/student-notes", async (Guid id, [FromServices] StudentNotesRepository repo, [FromServices] ProgramAccessGuard guard, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);
                return Results.Ok(await repo.GetForCoachAsync(id));
            });

            group.MapGet("/{id:guid}/questions", async (Guid id, [FromServices] StudentQuestionsRepository repo, [FromServices] ProgramAccessGuard guard, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);
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
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);

                var ok = await repo.ReplyByCoachAsync(id, questionId, coachId.Value, req.Reply, req.Status);
                if (!ok) return Results.NotFound(new { error = "Soru bulunamadı veya yetkiniz yok." });

                return Results.Ok(new { message = "Soru koç tarafından yanıtlandı." });
            });

            group.MapGet("/{id:guid}/coaching-tools", async (
                Guid id,
                [FromServices] StudentCoachingToolsRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);

                return Results.Ok(await repo.GetCoachStudentToolsAsync(id));
            });

            group.MapPut("/{id:guid}/coaching-tools", async (
                Guid id,
                [FromBody] UpdateCoachingToolsRequest req,
                [FromServices] StudentCoachingToolsRepository repo,
                [FromServices] ProgramAccessGuard guard,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);

                await repo.UpsertCoachingToolsAsync(id, coachId.Value, req);
                return Results.Ok(new { message = "Koçluk araçları başarıyla güncellendi." });
            });

            // --- V20: Bağımsız öğrenci arama, bağlantı istekleri, 6'lı yetki matrisi, konu ve kaynak yönetimi ---
            group.MapGet("/search-independent", async (
                [FromQuery] string? q,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                var isAdmin = user.HasClaim("is_admin", "true") || user.IsInRole("Admin");
                return Results.Ok(await repo.SearchIndependentStudentsAsync(coachId.Value, q ?? "", isAdmin));
            });

            group.MapGet("/connection-requests", async (
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetConnectionRequestsAsync(coachId.Value, isCoach: true));
            });

            group.MapPost("/connection-requests", async (
                [FromBody] CreateConnectionRequestDto req,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                var res = await repo.CreateConnectionRequestAsync(coachId.Value, req.TargetUserId, "Coach", req.Note);
                return res switch
                {
                    "ALREADY_HAS_COACH" => Results.BadRequest(new { error = "Bu öğrenci zaten bir koç ile çalışıyor." }),
                    "ALREADY_PENDING" => Results.Conflict(new { error = "Bu öğrenci için zaten bekleyen bir istek var." }),
                    _ => Results.Ok(new { message = "Bağlantı isteği öğrenciye gönderildi." })
                };
            });

            group.MapPost("/connection-requests/{requestId:guid}/respond", async (
                Guid requestId,
                [FromBody] RespondConnectionRequestDto req,
                [FromServices] StudentRepository repo,
                [FromServices] ProgramRepository programRepo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                var res = await repo.RespondConnectionRequestAsync(requestId, coachId.Value, actorIsCoach: true, req.Accept, programRepo);
                return res switch
                {
                    "NOT_FOUND" => Results.NotFound(new { error = "İstek bulunamadı veya sonuçlandırılmış." }),
                    "FORBIDDEN" => Results.Forbid(),
                    "REJECTED" => Results.Ok(new { status = "REJECTED", message = "İstek reddedildi." }),
                    _ => Results.Ok(new { status = "ACCEPTED", message = "Öğrenci çalışma alanınıza bağlandı." })
                };
            });

            group.MapPost("/{id:guid}/unlink", async (
                Guid id,
                [FromServices] StudentRepository repo,
                [FromServices] ProgramRepository programRepo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.UnlinkCoachStudentAsync(id, coachId.Value, programRepo);
                return ok
                    ? Results.Ok(new { message = "Öğrenci koçluk programından ayrıldı ve bağımsız moda geçirildi." })
                    : Results.NotFound(new { error = "Öğrenci bulunamadı veya yetkiniz yok." });
            });

            group.MapPut("/{id:guid}/permissions", async (
                Guid id,
                [FromBody] UpdateStudentPermissionsRequest req,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.UpdateStudentPermissionsAsync(coachId.Value, id, req);
                return ok
                    ? Results.Ok(new { message = "Öğrenci yetkileri güncellendi." })
                    : Results.NotFound(new { error = "Öğrenci bulunamadı veya yetkiniz yok." });
            });

            group.MapPut("/{id:guid}/curriculum/{topicId:guid}/status", async (
                Guid id,
                Guid topicId,
                [FromBody] ToggleTopicStatusRequest req,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] CurriculumRepository curriculumRepo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);
                var ok = await curriculumRepo.UpsertTopicProgressAsync(id, topicId, req.IsCompleted, "Coach");
                return ok ? Results.Ok(new { message = "Konu durumu güncellendi." }) : Results.NotFound(new { error = "Konu bulunamadı." });
            });

            group.MapGet("/{id:guid}/resources", async (
                Guid id,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);
                return Results.Ok(await repo.GetStudentResourcesAsync(id));
            });

            group.MapPost("/{id:guid}/resources", async (
                Guid id,
                [FromBody] CreateStudentResourceRequest req,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.Title)) return Results.BadRequest(new { error = "Kaynak adı zorunludur." });
                var programId = await guard.GetOwnedStudentProgramAsync(coachId.Value, id);
                if (programId == null) return Results.Forbid();
                var resourceId = await repo.CreateStudentResourceAsync(id, programId.Value, req, "Coach");
                return Results.Ok(new { id = resourceId, message = "Kaynak eklendi." });
            });

            group.MapPatch("/{id:guid}/resources/{resourceId:guid}", async (
                Guid id,
                Guid resourceId,
                [FromBody] UpdateStudentResourceRequest req,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);
                var ok = await repo.UpdateStudentResourceAsync(id, resourceId, req);
                return ok ? Results.Ok(new { message = "Kaynak güncellendi." }) : Results.NotFound(new { error = "Kaynak bulunamadı." });
            });

            group.MapDelete("/{id:guid}/resources/{resourceId:guid}", async (
                Guid id,
                Guid resourceId,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] StudentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);
                var ok = await repo.DeleteStudentResourceAsync(id, resourceId);
                return ok ? Results.Ok(new { message = "Kaynak silindi." }) : Results.NotFound(new { error = "Kaynak bulunamadı." });
            });

            group.MapDelete("/{id:guid}/exams/{examId:guid}", async (
                Guid id,
                Guid examId,
                [FromServices] ProgramAccessGuard guard,
                [FromServices] ExamRepository examRepo,
                ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                await guard.EnsureCoachOwnsStudentAsync(coachId.Value, id);
                var ok = await examRepo.DeleteExamResultAsync(coachId.Value, examId, isCoach: true);
                return ok ? Results.Ok(new { message = "Sınav sonucu silindi." }) : Results.NotFound(new { error = "Sınav bulunamadı." });
            });
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
