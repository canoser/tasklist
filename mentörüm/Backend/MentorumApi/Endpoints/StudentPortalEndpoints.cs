using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Extensions;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class StudentPortalEndpoints
    {
        public static void MapStudentPortalEndpoints(this IEndpointRouteBuilder app)
        {
            var self = app.MapGroup("/api/v1/student").RequireAuthorization("RequireStudentRole");

            self.MapGet("/profile", async ([FromServices] StudentRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                var profile = await repo.GetStudentProfileAsync(studentId.Value);
                return profile == null ? Results.NotFound(new { error = "Profil bulunamadı." }) : Results.Ok(profile);
            });

            self.MapGet("/exams", async ([FromServices] StudentRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStudentExamsAsync(studentId.Value));
            });

            self.MapGet("/curriculum", async ([FromServices] CurriculumRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStudentCurriculumAsync(studentId.Value));
            });

            self.MapGet("/goal", async ([FromServices] StudentRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                var goal = await repo.GetStudentGoalAsync(studentId.Value);
                return goal == null ? Results.NotFound(new { error = "Hedef bulunamadı." }) : Results.Ok(goal);
            });

            self.MapPut("/goal", async ([FromBody] UpdateStudentGoalRequest req, [FromServices] StudentRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                await repo.UpdateStudentGoalAsync(studentId.Value, req);
                return Results.Ok(new { message = "Hedef güncellendi." });
            });

            // M-157: öğrenci kendi görüşmelerini görür + hazırlık notu girer
            self.MapGet("/sessions", async ([FromServices] StudentCoachingToolsRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStudentSessionsAsync(studentId.Value));
            });

            self.MapPatch("/sessions/{sessionId:guid}/prep", async (
                Guid sessionId,
                [FromBody] UpdateSessionPrepRequest req,
                [FromServices] StudentCoachingToolsRepository repo,
                ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.UpdateSessionPrepAsync(studentId.Value, sessionId, req.PrepNotes ?? "");
                return ok ? Results.Ok(new { message = "Hazırlık notu kaydedildi." }) : Results.NotFound(new { error = "Görüşme bulunamadı." });
            });

            // T19: Öğrenci için öğretmen notları (yalnızca STUDENT_VISIBLE ve summary)
            self.MapGet("/teacher-notes", async (
                [FromServices] SchoolAccessRepository repo,
                ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
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
                var studentId = user.GetUserId();
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
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();

                var sessions = await repo.ListAsync(studentId.Value, from, to);
                return Results.Ok(sessions);
            });

            // T23: Öğrenci — kendi konu istatistikleri ve haftalık zaman bütçesi
            self.MapGet("/subject-stats", async (
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();

                var stats = await repo.GetStudentSubjectStatsAsync(studentId.Value);
                return Results.Ok(stats);
            });

            self.MapGet("/time-budget", async (
                [FromServices] ReportsRepository repo,
                ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();

                var budget = await repo.GetWeeklyTimeBudgetAsync(studentId.Value);
                return Results.Ok(budget);
            });

            // --- V10: Günlük Durum (Mood Check-in) ---
            self.MapPut("/checkin", async ([FromBody] UpsertCheckinRequest req, [FromServices] StudentCheckinRepository repo, [FromServices] StudentRepository studentRepo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.Mood)) return Results.BadRequest(new { error = "Durum gerekli." });

                var programId = await studentRepo.GetProgramIdAsync(studentId.Value);
                if (programId == null) return Results.Unauthorized();

                await repo.UpsertAsync(studentId.Value, programId.Value, req.Mood, req.Note);
                return Results.Ok(new { message = "Durum kaydedildi." });
            });

            self.MapGet("/checkins", async ([FromServices] StudentCheckinRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetRecentAsync(studentId.Value));
            });

            // --- V10: Kişisel Notlar (pin + gizlilik) ---
            self.MapGet("/notes", async ([FromServices] StudentNotesRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.ListAsync(studentId.Value));
            });

            self.MapPost("/notes", async ([FromBody] CreatePersonalNoteRequest req, [FromServices] StudentNotesRepository repo, [FromServices] StudentRepository studentRepo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();

                var programId = await studentRepo.GetProgramIdAsync(studentId.Value);
                if (programId == null) return Results.Unauthorized();

                var id = await repo.CreateAsync(studentId.Value, programId.Value, req);
                return Results.Ok(new { id });
            });

            self.MapPut("/notes/{noteId:guid}", async (Guid noteId, [FromBody] UpdatePersonalNoteRequest req, [FromServices] StudentNotesRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.UpdateAsync(studentId.Value, noteId, req);
                return ok ? Results.Ok(new { message = "Not güncellendi." }) : Results.NotFound(new { error = "Not bulunamadı." });
            });

            self.MapDelete("/notes/{noteId:guid}", async (Guid noteId, [FromServices] StudentNotesRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.DeleteAsync(studentId.Value, noteId);
                return ok ? Results.Ok(new { message = "Not silindi." }) : Results.NotFound(new { error = "Not bulunamadı." });
            });

            // --- V10: Takıldığım Konular (Sorulacaklar) ---
            self.MapGet("/questions", async ([FromServices] StudentQuestionsRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.ListAsync(studentId.Value));
            });

            self.MapPost("/questions", async ([FromBody] CreateStudentQuestionRequest req, [FromServices] StudentQuestionsRepository repo, [FromServices] StudentRepository studentRepo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.TopicText)) return Results.BadRequest(new { error = "Konu gerekli." });

                var programId = await studentRepo.GetProgramIdAsync(studentId.Value);
                if (programId == null) return Results.Unauthorized();

                var id = await repo.CreateAsync(studentId.Value, programId.Value, req);
                return Results.Ok(new { id });
            });

            self.MapPatch("/questions/{questionId:guid}", async (Guid questionId, [FromServices] StudentQuestionsRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.SetStatusAsync(studentId.Value, questionId, "RESOLVED");
                return ok ? Results.Ok(new { message = "Çözüldü olarak işaretlendi." }) : Results.NotFound(new { error = "Bulunamadı." });
            });

            // --- V10: Streak ---
            self.MapGet("/streak", async ([FromServices] StudySessionRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetStreakAsync(studentId.Value));
            });

            // --- V10: Okul Haftalık Şablonu ---
            self.MapGet("/school-schedule", async ([FromServices] SchoolScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                return Results.Ok(await repo.ListAsync(studentId.Value));
            });

            self.MapPost("/school-schedule", async ([FromBody] CreateSchoolScheduleRequest req, [FromServices] SchoolScheduleRepository repo, [FromServices] StudentRepository studentRepo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                if (req.DayOfWeek < 1 || req.DayOfWeek > 7 || string.IsNullOrWhiteSpace(req.StartTime) || string.IsNullOrWhiteSpace(req.EndTime))
                    return Results.BadRequest(new { error = "Gün ve saatler gerekli." });

                if (!TimeSpan.TryParse(req.StartTime, out var startTime) || !TimeSpan.TryParse(req.EndTime, out var endTime) || startTime >= endTime)
                    return Results.BadRequest(new { error = "Başlangıç saati bitiş saatinden önce olmalıdır." });

                var programId = await studentRepo.GetProgramIdAsync(studentId.Value);
                if (programId == null) return Results.Unauthorized();

                var id = await repo.CreateAsync(studentId.Value, programId.Value, req);
                return Results.Ok(new { id });
            });

            self.MapDelete("/school-schedule/{scheduleId:guid}", async (Guid scheduleId, [FromServices] SchoolScheduleRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();
                var ok = await repo.DeleteAsync(studentId.Value, scheduleId);
                return ok ? Results.Ok(new { message = "Silindi." }) : Results.NotFound(new { error = "Bulunamadı." });
            });

            // --- V16: Koçluk Araçları (Öğrenci Görünümü - Gizlilik Korumalı: Asla SWOT/Koç Notu Açılmaz) ---
            self.MapGet("/coaching-tools", async ([FromServices] StudentCoachingToolsRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();

                return Results.Ok(await repo.GetStudentCoachingHabitsAsync(studentId.Value));
            });

            self.MapPatch("/coaching-tools/habits", async ([FromBody] ToggleHabitRequest req, [FromServices] StudentCoachingToolsRepository repo, ClaimsPrincipal user) =>
            {
                var studentId = user.GetUserId();
                if (studentId == null) return Results.Unauthorized();

                var updatedJson = await repo.ToggleStudentHabitAsync(studentId.Value, req);
                return Results.Ok(new { message = "Alışkanlık durumu güncellendi.", habitsData = updatedJson });
            });
        }
    }
}

