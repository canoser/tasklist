using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Dapper;
using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MentorumApi.Tests
{
    public class V21GradeReportingAndHistoryTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly DbConnectionFactory _db;

        private static readonly Guid CoachA = Guid.Parse("11111111-1111-1111-1111-111111111111");
        private static readonly Guid ProgramA = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

        public V21GradeReportingAndHistoryTests(IntegrationTestFixture fx, WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            _factory = factory;
            _db = _factory.Services.GetRequiredService<DbConnectionFactory>();
        }

        private HttpClient CreateClient(Guid userId, string role, bool isAdmin = false)
        {
            var client = _factory.WithWebHostBuilder(b => b.ConfigureServices(s =>
            {
                s.AddAuthentication(o =>
                {
                    o.DefaultAuthenticateScheme = TestAuthHandler.DefaultScheme;
                    o.DefaultChallengeScheme = TestAuthHandler.DefaultScheme;
                }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.DefaultScheme, _ => { });
            })).CreateClient();

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.DefaultScheme);
            client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());
            client.DefaultRequestHeaders.Add("X-Test-Role", role);
            if (isAdmin)
            {
                client.DefaultRequestHeaders.Add("X-Test-IsAdmin", "true");
            }
            return client;
        }

        [Fact]
        public void V21_NetCalculator_Formulas_And_PenaltyModes_AreAccurate()
        {
            // 1. Ortaokul / LGS (6, 7, 8) -> OFFICIAL modda 3 Yanlış = 1 Doğru
            var lgsNet = NetCalculator.ComputeNet(17, 3, 0, "LGS", "LGS", 8, NetCalculator.PenaltyModeOfficial);
            Assert.Equal(16.00m, lgsNet);

            // 2. Lise / YKS (9..13) -> OFFICIAL modda 4 Yanlış = 1 Doğru
            var tytNet = NetCalculator.ComputeNet(32, 4, 4, "SAY", "TYT", 12, NetCalculator.PenaltyModeOfficial);
            Assert.Equal(31.00m, tytNet);

            // 3. NO_PENALTY modda yanlış doğruyu götürmez
            var noPenaltyNet = NetCalculator.ComputeNet(17, 3, 0, "LGS", "LGS", 8, NetCalculator.PenaltyModeNoPenalty);
            Assert.Equal(17.00m, noPenaltyNet);

            // 4. Okul Yazılısı her zaman cezasızdır (divisor = 0)
            var schoolNet = NetCalculator.ComputeNet(18, 2, 0, "SAY", NetCalculator.ExamTypeOkul, 9, NetCalculator.PenaltyModeOfficial);
            Assert.Equal(18.00m, schoolNet);

            // 5. LGS Katsayılı Puan (4x Ana Branş / 1x Ara Branş, 100..500 ölçeği)
            var fullLgsScore = NetCalculator.ComputeLgsWeightedScore(90m, new List<(string?, decimal)>
            {
                ("Türkçe", 20m), ("Matematik", 20m), ("Fen Bilimleri", 20m),
                ("T.C. İnkılap Tarihi", 10m), ("Din Kültürü", 10m), ("İngilizce", 10m)
            });
            Assert.Equal(500.00m, fullLgsScore);

            // 6. 9. Sınıf OBP Katkısı (0..60) -> 90 ortalama => 54 puan
            Assert.Equal(54.00m, NetCalculator.ComputeObpContribution(90m));

            // 7. 10. Sınıf Alan Seçimi Karar Matrisi (SAY / EA / SOZ)
            var (say, ea, soz, recTrack) = NetCalculator.ComputeTrackAptitudeScores(90m, 85m, 60m, 50m);
            Assert.True(say > ea && say > soz);
            Assert.Equal("SAY", recTrack);

            // 8. 12. Sınıf YKS Birleşik Yerleştirme Puan Tahmini (100..560)
            var yksMax = NetCalculator.ComputeYksCombinedEstimate(120m, 80m, 60m);
            Assert.Equal(560.00m, yksMax);
        }

        [Fact]
        public async Task V21_GradeAdvancement_PreservesGrade9Archive_And_SwitchesToGrade10Profile()
        {
            using var conn = _db.CreateConnection();

            // 1. Ders ve 9. + 10. Sınıf müfredat konularını hazırla
            var subjectId = Guid.NewGuid();
            await conn.ExecuteAsync(
                "INSERT INTO subjects (id, name, short_code, default_color, is_system_subject) VALUES (@Id, 'Matematik V21', 'MAT21', '#4F46E5', 1)",
                new { Id = subjectId });

            var topicGrade9 = Guid.NewGuid();
            var topicGrade10 = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO curriculum_topics (id, subject_id, grade, unit_number, unit_name, topic_name, sort_order) VALUES
                (@T9, @Subj, '9', 1, 'Mantık ve Kümeler', '9. Sınıf Kümeler V21', 1),
                (@T10, @Subj, '10', 1, 'Sayma ve Olasılık', '10. Sınıf Fonksiyonlar V21', 1)",
                new { T9 = topicGrade9, T10 = topicGrade10, Subj = subjectId });

            // 2. 9. Sınıf öğrencisi oluştur
            var studentId = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO users (id, email, role, full_name, approval_status)
                VALUES (@Id, @Email, 'Student', 'V21 Arşiv Öğrencisi', 'APPROVED');
                INSERT INTO students (id, program_id, grade, track, target_university, target_department, target_score, can_edit_goals)
                VALUES (@Id, @Prog, 9, 'SAY', 'İTÜ', 'Bilgisayar Mühendisliği', 510, 1);",
                new { Id = studentId, Email = $"v21_{studentId:N}@test.local", Prog = ProgramA });

            var coachClient = CreateClient(CoachA, "Coach");
            var studentClient = CreateClient(studentId, "Student");

            // 3. Öğrenci 9. sınıftayken sınav, ödev, çalışma oturumu, check-in ve ders hedefi girilir
            var exam9Res = await coachClient.PostAsJsonAsync("/api/v1/exams", new
            {
                studentId,
                examType = "TYT",
                examName = "9. Sınıf Dönem Denemesi",
                examDate = DateTime.UtcNow.AddDays(-10).ToString("yyyy-MM-dd"),
                totalNet = 68.5m,
                errorReasons = "Dikkat Hatası, Süre Yetişmedi",
                scores = new[]
                {
                    new { subjectId, questionCount = 40, correct = 26, wrong = 4, blank = 10, net = 25.0m }
                }
            });
            Assert.Equal(HttpStatusCode.OK, exam9Res.StatusCode);

            var hw9Res = await coachClient.PostAsJsonAsync("/api/v1/homework/assignments", new
            {
                studentId,
                subjectId,
                curriculumTopicId = topicGrade9,
                title = "9. Sınıf Kümeler Soru Çözümü",
                dueDate = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd"),
                priority = "HIGH"
            });
            Assert.Equal(HttpStatusCode.OK, hw9Res.StatusCode);

            await conn.ExecuteAsync(@"
                INSERT INTO student_checkins (id, program_id, student_id, checkin_date, mood, note)
                VALUES (@Id, @Prog, @StudentId, CURRENT_DATE, 'GREAT', 'Çok verimli geçti')",
                new { Id = Guid.NewGuid(), Prog = ProgramA, StudentId = studentId });

            var target9Res = await studentClient.PutAsJsonAsync("/api/v1/student/subject-targets", new
            {
                grade = 9,
                targets = new[] { new { subjectId, targetNet = 32.5m, targetScore = 90m } }
            });
            Assert.Equal(HttpStatusCode.OK, target9Res.StatusCode);

            // 4. 9. Sınıf Raporunu doğrula
            var rep9Initial = await studentClient.GetFromJsonAsync<StudentGradeReportDto>("/api/v1/student/grade-report");
            Assert.NotNull(rep9Initial);
            Assert.Equal(9, rep9Initial!.CurrentGrade);
            Assert.Equal(9, rep9Initial.SelectedGrade);
            Assert.Equal("GRADE_9_OBP_TYT", rep9Initial.Profile.SystemCode);
            Assert.Single(rep9Initial.ExamSeries);
            Assert.Equal("9. Sınıf Dönem Denemesi", rep9Initial.ExamSeries[0].ExamName);
            Assert.True(rep9Initial.Wellbeing.RecentCheckinCount >= 1);
            var mathMastery9 = rep9Initial.SubjectMastery.FirstOrDefault(s => s.SubjectId == subjectId);
            Assert.NotNull(mathMastery9);
            Assert.Equal(32.5m, mathMastery9!.TargetNet);
            Assert.Equal(7.5m, mathMastery9.NetGap);

            // 5. Öğrenci sınıf atlar: 9. Sınıf -> 10. Sınıf
            var updateGradeRes = await coachClient.PutAsJsonAsync($"/api/v1/students/{studentId}", new
            {
                firstName = "V21",
                lastName = "Arşiv Öğrencisi",
                classLevel = 10,
                targetExam = "SAY",
                targetUniversity = "İTÜ",
                targetDepartment = "Bilgisayar Mühendisliği",
                targetScore = 510m
            });
            Assert.Equal(HttpStatusCode.OK, updateGradeRes.StatusCode);

            // 10. Sınıfta yeni bir deneme sınavı girilir
            var exam10Res = await coachClient.PostAsJsonAsync("/api/v1/exams", new
            {
                studentId,
                examType = "TYT",
                examName = "10. Sınıf Açılış Denemesi",
                examDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                totalNet = 78.25m,
                scores = new[]
                {
                    new { subjectId, questionCount = 40, correct = 31, wrong = 3, blank = 6, net = 30.25m }
                }
            });
            Assert.Equal(HttpStatusCode.OK, exam10Res.StatusCode);

            // 6. Aktif rapor artık 10. Sınıf (GRADE_10_TRACK_MATRIX) olmalı ve AvailableGrades hem 10 hem 9 içermeli
            var rep10Active = await coachClient.GetFromJsonAsync<StudentGradeReportDto>($"/api/v1/reports/students/{studentId}/grade-report");
            Assert.NotNull(rep10Active);
            Assert.Equal(10, rep10Active!.CurrentGrade);
            Assert.Equal(10, rep10Active.SelectedGrade);
            Assert.Equal("GRADE_10_TRACK_MATRIX", rep10Active.Profile.SystemCode);
            Assert.Contains(10, rep10Active.AvailableGrades);
            Assert.Contains(9, rep10Active.AvailableGrades);
            Assert.Single(rep10Active.ExamSeries);
            Assert.Equal("10. Sınıf Açılış Denemesi", rep10Active.ExamSeries[0].ExamName);

            // 7. ?grade=9 ile geçmiş dönem arşivine tıklandığında 9. sınıf sınavı ve hedefi eksiksiz gelmeli!
            var rep9Archive = await coachClient.GetFromJsonAsync<StudentGradeReportDto>($"/api/v1/reports/students/{studentId}/grade-report?grade=9");
            Assert.NotNull(rep9Archive);
            Assert.Equal(10, rep9Archive!.CurrentGrade);
            Assert.Equal(9, rep9Archive.SelectedGrade);
            Assert.Equal("GRADE_9_OBP_TYT", rep9Archive.Profile.SystemCode);
            Assert.Single(rep9Archive.ExamSeries);
            Assert.Equal("9. Sınıf Dönem Denemesi", rep9Archive.ExamSeries[0].ExamName);

            // 8. ?grade=0 (Tüm Yıllar) seçildiğinde hem 9. hem 10. sınıf sınavları birlikte gelmeli
            var repAllYears = await coachClient.GetFromJsonAsync<StudentGradeReportDto>($"/api/v1/reports/students/{studentId}/grade-report?grade=0");
            Assert.NotNull(repAllYears);
            Assert.Equal(2, repAllYears!.ExamSeries.Count);

            // 9. Müfredat uçlarında ?grade=9 ile eski sınıfın konuları görüntülenebilmeli
            var curr9 = await studentClient.GetFromJsonAsync<List<StudentCurriculumTopicDto>>("/api/v1/student/curriculum?grade=9");
            Assert.NotNull(curr9);
            Assert.Contains(curr9!, t => t.Id == topicGrade9);

            // 10. Koç kohort ucu 10. sınıf kohortunu döndürmeli
            var cohorts = await coachClient.GetFromJsonAsync<List<GradeCohortSummaryDto>>("/api/v1/reports/cohort-by-grade?grade=10");
            Assert.NotNull(cohorts);
            Assert.Contains(cohorts!, c => c.Grade == 10 && c.Students.Any(s => s.StudentId == studentId));
        }
    }
}
