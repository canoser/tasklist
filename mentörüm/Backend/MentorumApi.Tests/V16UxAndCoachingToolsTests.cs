using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;
using Dapper;
using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MentorumApi.Tests
{
    public class V16UxAndCoachingToolsTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly DbConnectionFactory _db;

        private static readonly Guid CoachA = Guid.Parse("11111111-1111-1111-1111-111111111111");
        private static readonly Guid CoachB = Guid.Parse("22222222-2222-2222-2222-222222222222");
        private static readonly Guid StudentB = Guid.Parse("55555555-5555-5555-5555-555555555555");
        private static readonly Guid ProgramA = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

        public V16UxAndCoachingToolsTests(IntegrationTestFixture fixture, WebApplicationFactory<Program> factory)
        {
            _factory = factory;
            _db = _factory.Services.GetRequiredService<DbConnectionFactory>();
        }

        private HttpClient CreateClient(Guid userId, string role)
        {
            var client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = ConfigurableTestAuthHandler.DefaultScheme;
                        options.DefaultChallengeScheme = ConfigurableTestAuthHandler.DefaultScheme;
                    })
                    .AddScheme<AuthenticationSchemeOptions, ConfigurableTestAuthHandler>(ConfigurableTestAuthHandler.DefaultScheme, options => { });
                });
            }).CreateClient();

            client.DefaultRequestHeaders.Add("X-Test-User-Id", userId.ToString());
            client.DefaultRequestHeaders.Add("X-Test-Role", role);
            return client;
        }

        [Fact]
        public async Task MoveToIndividual_DoesNotCreateDuplicateOzelDersCourse()
        {
            using var scope = _factory.Services.CreateScope();
            var studentRepo = scope.ServiceProvider.GetRequiredService<StudentRepository>();

            // 1. Öğrenciyi iki kez bireysele çekmeyi dene
            await studentRepo.MoveToIndividualAsync(ProgramA, StudentB);
            await studentRepo.MoveToIndividualAsync(ProgramA, StudentB);

            // 2. Aktif OZEL_DERS sayısını kontrol et: tam 1 olmalı
            using var conn = _db.CreateConnection();
            var count = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(1)
                FROM courses c
                JOIN course_students cs ON cs.course_id = c.id
                WHERE cs.student_id = @StudentId AND c.type = 'OZEL_DERS' AND c.is_active = 1 AND cs.is_active = 1",
                new { StudentId = StudentB });

            Assert.Equal(1, count);
        }

        [Fact]
        public async Task CoachCanAnswerStudentQuestion_WithIdorProtection()
        {
            // 1. Student B için soru oluştur
            using var conn = _db.CreateConnection();
            var questionId = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO student_questions (id, program_id, student_id, topic_text, status, created_at)
                VALUES (@Id, @ProgramId, @StudentId, 'Türev alma kuralı', 'OPEN', NOW())
                ON CONFLICT (id) DO NOTHING",
                new { Id = questionId, ProgramId = ProgramA, StudentId = StudentB });

            // 2. Yetkisiz koç (Coach B) cevaplamaya çalışır -> 403 veya 404 dönmeli
            var unauthClient = CreateClient(CoachB, "Coach");
            var replyReq = new CoachReplyQuestionRequest { Reply = "Hileli cevap", Status = "RESOLVED" };
            var unauthRes = await unauthClient.PatchAsJsonAsync($"/api/v1/students/{StudentB}/questions/{questionId}", replyReq);
            Assert.True(unauthRes.StatusCode == HttpStatusCode.Forbidden || unauthRes.StatusCode == HttpStatusCode.NotFound);

            // 3. Yetkili koç (Coach A) cevaplar -> 200 OK
            var authClient = CreateClient(CoachA, "Coach");
            var authReq = new CoachReplyQuestionRequest { Reply = "Türev formülü: nx^(n-1)", Status = "RESOLVED" };
            var authRes = await authClient.PatchAsJsonAsync($"/api/v1/students/{StudentB}/questions/{questionId}", authReq);
            Assert.Equal(HttpStatusCode.OK, authRes.StatusCode);

            // 4. Veritabanında kontrol et
            var updated = await conn.QuerySingleOrDefaultAsync<(string? Reply, string? Status)>(@"
                SELECT coach_reply, status FROM student_questions WHERE id = @Id",
                new { Id = questionId });
            Assert.Equal("RESOLVED", updated.Status);
            Assert.Contains("Türev formülü", updated.Reply);
        }

        [Fact]
        public async Task CoachingTools_StudentPrivacyGuaranteed()
        {
            // 1. Koç A, Student B için SWOT ve alışkanlık tanımlar
            var coachClient = CreateClient(CoachA, "Coach");
            var updateReq = new UpdateCoachingToolsRequest
            {
                SwotData = "{\"strengths\":[\"Hızlı öğreniyor\"],\"threats\":[\"Dikkat dağınıklığı gizli koç notu\"]}",
                WheelData = "{\"math\":8,\"geometry\":6}",
                HabitsData = "[{\"id\":\"h1\",\"title\":\"Günde 50 paragraf\",\"completedDates\":[]}]"
            };
            var putRes = await coachClient.PutAsJsonAsync($"/api/v1/students/{StudentB}/coaching-tools", updateReq);
            Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);

            // 2. Koç GET ile AutoSwot ve tüm alanları görür
            var coachGetRes = await coachClient.GetAsync($"/api/v1/students/{StudentB}/coaching-tools");
            Assert.Equal(HttpStatusCode.OK, coachGetRes.StatusCode);
            var coachBody = await coachGetRes.Content.ReadAsStringAsync();
            Assert.Contains("Hızlı öğreniyor", coachBody);
            Assert.Contains("autoSwot", coachBody, StringComparison.OrdinalIgnoreCase);

            // 3. Öğrenci kendi endpoint'ini çağırır -> Asla SWOT veya gizli notları göremez!
            var studentClient = CreateClient(StudentB, "Student");
            var studentRes = await studentClient.GetAsync("/api/v1/student/coaching-tools");
            Assert.Equal(HttpStatusCode.OK, studentRes.StatusCode);
            var studentBody = await studentRes.Content.ReadAsStringAsync();

            Assert.DoesNotContain("Hızlı öğreniyor", studentBody);
            Assert.DoesNotContain("threats", studentBody, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("swotData", studentBody, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("Günde 50 paragraf", studentBody); // Alışkanlığı görebilir
        }

        [Fact]
        public async Task ParentCannotViewExams_WhenPermissionIsZero()
        {
            // 1. Veli oluştur ve can_view_exams = 0 olarak ata
            var parentId = Guid.NewGuid();
            var parentEmail = $"parent_{parentId:N}@test.com";
            using var conn = _db.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO users (id, email, role, full_name)
                VALUES (@Id, @Email, 'Parent', 'Veli Test')
                ON CONFLICT (id) DO NOTHING",
                new { Id = parentId, Email = parentEmail });

            await conn.ExecuteAsync(@"
                INSERT INTO parents (id) VALUES (@Id) ON CONFLICT (id) DO NOTHING",
                new { Id = parentId });

            await conn.ExecuteAsync(@"
                INSERT INTO student_parents (id, student_id, parent_id, parent_email, is_accepted, can_view_exams, can_view_homework, can_view_calendar)
                VALUES (gen_random_uuid(), @StudentId, @ParentId, @Email, 1, 0, 1, 1)",
                new { StudentId = StudentB, ParentId = parentId, Email = parentEmail });

            // 2. Sınavları çekmeyi dene -> 403 Forbid dönmeli
            var parentClient = CreateClient(parentId, "Parent");
            var res = await parentClient.GetAsync($"/api/v1/parents/children/{StudentB}/exams");
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);

            // 3. İzin 1 yapıldığında erişebilmeli
            await conn.ExecuteAsync(@"
                UPDATE student_parents SET can_view_exams = 1 WHERE parent_id = @ParentId AND student_id = @StudentId",
                new { ParentId = parentId, StudentId = StudentB });

            var resOk = await parentClient.GetAsync($"/api/v1/parents/children/{StudentB}/exams");
            Assert.Equal(HttpStatusCode.OK, resOk.StatusCode);
        }

        [Fact]
        public async Task WeeklyTimeBudget_IncludesSchoolScheduleMinutes()
        {
            // 1. Student B için okul saatleri ekle (5 gün x 6 saat = 1.800 dk)
            using var conn = _db.CreateConnection();
            await conn.ExecuteAsync(@"DELETE FROM school_schedules WHERE student_id = @StudentId", new { StudentId = StudentB });

            for (int day = 1; day <= 5; day++)
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO school_schedules (id, program_id, student_id, day_of_week, start_time, end_time, label)
                    VALUES (gen_random_uuid(), @ProgramId, @StudentId, @Day, '08:30:00'::time, '14:30:00'::time, 'Okul')",
                    new { ProgramId = ProgramA, StudentId = StudentB, Day = day });
            }

            // 2. Zaman bütçesini hesapla
            using var scope = _factory.Services.CreateScope();
            var reportsRepo = scope.ServiceProvider.GetRequiredService<ReportsRepository>();
            var budget = await reportsRepo.GetWeeklyTimeBudgetAsync(StudentB);

            // 3. SCHOOL kategorisi en az 1800 dk olmalı
            var schoolCat = budget.Categories.FirstOrDefault(c => string.Equals(c.Category, "SCHOOL", StringComparison.OrdinalIgnoreCase));
            Assert.NotNull(schoolCat);
            Assert.True(schoolCat.TotalMinutes >= 1800);
            Assert.True(budget.TotalTrackedMinutes >= 1800);
        }

        [Fact]
        public async Task StudentDetail_Curriculum_Sessions_Events_And_TeacherStudents_Return200()
        {
            var coachClient = CreateClient(CoachA, "Coach");

            var detailRes = await coachClient.GetAsync($"/api/v1/students/{StudentB}");
            Assert.Equal(HttpStatusCode.OK, detailRes.StatusCode);

            var currRes = await coachClient.GetAsync($"/api/v1/students/{StudentB}/curriculum");
            Assert.Equal(HttpStatusCode.OK, currRes.StatusCode);

            var sessRes = await coachClient.GetAsync($"/api/v1/students/{StudentB}/sessions");
            Assert.Equal(HttpStatusCode.OK, sessRes.StatusCode);

            var eventsRes = await coachClient.GetAsync($"/api/v1/students/{StudentB}/events");
            Assert.Equal(HttpStatusCode.OK, eventsRes.StatusCode);

            // Öğretmen öğrencileri uç noktası
            using var conn = _db.CreateConnection();
            var teacherId = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO users (id, email, role, full_name)
                VALUES (@Id, @Email, 'Teacher', 'Test Teacher')
                ON CONFLICT (id) DO NOTHING",
                new { Id = teacherId, Email = $"t_{teacherId:N}@test.com" });
            await conn.ExecuteAsync(@"
                INSERT INTO teachers (id, program_id, is_active)
                VALUES (@Id, @ProgramId, 1)
                ON CONFLICT (id) DO NOTHING",
                new { Id = teacherId, ProgramId = ProgramA });

            var teacherStudentsRes = await coachClient.GetAsync($"/api/v1/programs/{ProgramA}/teachers/{teacherId}/students");
            Assert.Equal(HttpStatusCode.OK, teacherStudentsRes.StatusCode);
        }
    }
}
