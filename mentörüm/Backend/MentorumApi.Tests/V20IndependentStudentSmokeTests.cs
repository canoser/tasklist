using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
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
    public class V20IndependentStudentSmokeTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly DbConnectionFactory _db;

        private static readonly Guid CoachA = Guid.Parse("11111111-1111-1111-1111-111111111111");
        private static readonly Guid CoachB = Guid.Parse("22222222-2222-2222-2222-222222222222");

        public V20IndependentStudentSmokeTests(IntegrationTestFixture fx, WebApplicationFactory<Program> factory)
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
        public async Task V20_EndToEnd_IndependentStudent_Connect_DataMigration_Permissions_HomeworkApproval_And_Unlink()
        {
            using var conn = _db.CreateConnection();

            // 0. Ensure CoachA has phone for phone search test, and ensure a curriculum topic exists
            await conn.ExecuteAsync("UPDATE coaches SET phone = '05551112233', approval_status = 'APPROVED' WHERE id = @Id", new { Id = CoachA });
            await conn.ExecuteAsync("UPDATE coaches SET phone = '05554445566', approval_status = 'APPROVED' WHERE id = @Id", new { Id = CoachB });

            var subjectId = await conn.ExecuteScalarAsync<Guid?>("SELECT id FROM subjects LIMIT 1");
            if (subjectId == null)
            {
                subjectId = Guid.NewGuid();
                await conn.ExecuteAsync("INSERT INTO subjects (id, name, short_code, default_color, is_system_subject) VALUES (@Id, 'Matematik V20', 'MAT_V20', '#4F46E5', 1)", new { Id = subjectId });
            }
            var topicId = await conn.ExecuteScalarAsync<Guid?>("SELECT id FROM curriculum_topics WHERE subject_id = @SubjectId LIMIT 1", new { SubjectId = subjectId });
            if (topicId == null)
            {
                topicId = Guid.NewGuid();
                await conn.ExecuteAsync(
                    "INSERT INTO curriculum_topics (id, subject_id, grade, unit_number, unit_name, topic_name, sort_order) VALUES (@Id, @SubjectId, '12', 1, 'Cebir', 'Fonksiyonlar V20', 1)",
                    new { Id = topicId, SubjectId = subjectId });
            }

            // 1. Register a new pending user and approve as Independent Student (AssignCoachId = null)
            var soloStudentId = Guid.NewGuid();
            var soloEmail = $"solo_{soloStudentId:N}@v20.local";
            await conn.ExecuteAsync(@"
                INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status)
                VALUES (@Id, @Email, 'hash', 'Coach', 'Bağımsız Öğrenci V20', FALSE, 'PENDING')",
                new { Id = soloStudentId, Email = soloEmail });

            var adminClient = CreateClient(CoachA, "Coach", isAdmin: true);
            var approveRes = await adminClient.PostAsJsonAsync($"/api/v1/admin/users/{soloStudentId}/approve", new
            {
                role = "Student",
                maxStudents = 10,
                maxTeachers = 2,
                storageQuotaMb = 100,
                assignCoachId = (Guid?)null
            });
            Assert.Equal(HttpStatusCode.OK, approveRes.StatusCode);

            await conn.ExecuteAsync("UPDATE students SET phone = '05559998877', grade = 12, track = 'SAY' WHERE id = @Id", new { Id = soloStudentId });

            // 2. Verify Independent Student Profile has HasCoach == false and all 6 permissions == true
            var studentClient = CreateClient(soloStudentId, "Student");
            var profileRes = await studentClient.GetAsync("/api/v1/student/profile");
            Assert.Equal(HttpStatusCode.OK, profileRes.StatusCode);
            var profile = await profileRes.Content.ReadFromJsonAsync<StudentProfileDto>();
            Assert.NotNull(profile);
            Assert.False(profile!.HasCoach);
            Assert.True(profile.Permissions.CanCompleteTopics);
            Assert.True(profile.Permissions.CanEditGoals);
            Assert.True(profile.Permissions.CanCompleteHomework);
            Assert.True(profile.Permissions.CanAddExamResults);
            Assert.True(profile.Permissions.CanManageResources);
            Assert.True(profile.Permissions.CanSelfAssignWork);

            // 3. Independent Student exercises all 6 capabilities
            // (a) Update Goal
            var goalRes = await studentClient.PutAsJsonAsync("/api/v1/student/goal", new
            {
                targetUniversity = "ODTÜ",
                targetDepartment = "Bilgisayar Mühendisliği",
                targetScore = 515.5
            });
            Assert.Equal(HttpStatusCode.OK, goalRes.StatusCode);

            // (b) Toggle Curriculum Topic Completion
            var topicToggleRes = await studentClient.PutAsJsonAsync($"/api/v1/student/curriculum/{topicId}/status", new
            {
                isCompleted = true
            });
            Assert.Equal(HttpStatusCode.OK, topicToggleRes.StatusCode);

            // (c) Add Resource / Video Course
            var addResResp = await studentClient.PostAsJsonAsync("/api/v1/student/resources", new
            {
                subjectId = subjectId,
                title = "3D TYT Matematik Soru Bankası",
                resourceType = "BOOK",
                urlOrAuthor = "https://example.com/3d-mat",
                totalUnits = 25,
                completedUnits = 1
            });
            Assert.Equal(HttpStatusCode.OK, addResResp.StatusCode);
            var resourceId = (await addResResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

            // (d) Add Exam Result
            var addExamResp = await studentClient.PostAsJsonAsync("/api/v1/student/exams", new
            {
                examName = "Özdebir TYT Deneme 1",
                examType = "TYT",
                examDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                totalNet = 94.25m,
                scores = Array.Empty<object>()
            });
            Assert.Equal(HttpStatusCode.OK, addExamResp.StatusCode);

            // (e) Self-assign Homework
            var selfHwResp = await studentClient.PostAsJsonAsync("/api/v1/student/homework", new
            {
                subjectId = subjectId,
                title = "Paragraf 40 Soru Çözümü",
                description = "Sabah rutini",
                dueDate = DateTime.UtcNow.AddDays(2),
                priority = "HIGH"
            });
            Assert.Equal(HttpStatusCode.OK, selfHwResp.StatusCode);
            var selfHwId = (await selfHwResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

            // (f) Complete Homework directly while independent
            var completeSelfHwResp = await studentClient.PostAsJsonAsync($"/api/v1/homework/assignments/{selfHwId}/complete", new
            {
                completionPercentage = 100,
                note = "Tamamlandı"
            });
            Assert.Equal(HttpStatusCode.OK, completeSelfHwResp.StatusCode);
            var completeSelfHwJson = await completeSelfHwResp.Content.ReadFromJsonAsync<JsonElement>();
            Assert.False(completeSelfHwJson.GetProperty("pendingApproval").GetBoolean());

            // 4. Privacy & Search Before Connection: CoachB can see solo student by phone/email
            var coachBClient = CreateClient(CoachB, "Coach");
            var searchBeforeRes = await coachBClient.GetAsync("/api/v1/students/search-independent?q=05559998877");
            Assert.Equal(HttpStatusCode.OK, searchBeforeRes.StatusCode);
            var searchBeforeList = await searchBeforeRes.Content.ReadFromJsonAsync<List<ConnectionSearchCandidateDto>>();
            Assert.NotNull(searchBeforeList);
            Assert.Contains(searchBeforeList!, x => x.Id == soloStudentId);

            // 5. Independent Student searches CoachA by phone and sends connection request
            var searchCoachRes = await studentClient.GetAsync("/api/v1/student/search-coaches?q=05551112233");
            Assert.Equal(HttpStatusCode.OK, searchCoachRes.StatusCode);
            var foundCoaches = await searchCoachRes.Content.ReadFromJsonAsync<List<ConnectionSearchCandidateDto>>();
            Assert.NotNull(foundCoaches);
            Assert.Contains(foundCoaches!, c => c.Id == CoachA);

            var sendReqRes = await studentClient.PostAsJsonAsync("/api/v1/student/connection-requests", new
            {
                targetUserId = CoachA,
                note = "Merhaba hocam, birlikte çalışmak istiyorum."
            });
            Assert.Equal(HttpStatusCode.OK, sendReqRes.StatusCode);

            // 6. CoachA views incoming request and accepts it
            var coachAClient = CreateClient(CoachA, "Coach");
            var coachReqsRes = await coachAClient.GetAsync("/api/v1/students/connection-requests");
            Assert.Equal(HttpStatusCode.OK, coachReqsRes.StatusCode);
            var coachReqs = await coachReqsRes.Content.ReadFromJsonAsync<List<ConnectionRequestDto>>();
            var pendingReq = coachReqs!.FirstOrDefault(r => r.StudentId == soloStudentId && r.Status == "PENDING");
            Assert.NotNull(pendingReq);

            var acceptRes = await coachAClient.PostAsJsonAsync($"/api/v1/students/connection-requests/{pendingReq!.Id}/respond", new
            {
                accept = true
            });
            Assert.Equal(HttpStatusCode.OK, acceptRes.StatusCode);

            // 7. Verify Privacy After Connection: CoachB can NO LONGER see the student in search!
            var searchAfterRes = await coachBClient.GetAsync("/api/v1/students/search-independent?q=05559998877");
            Assert.Equal(HttpStatusCode.OK, searchAfterRes.StatusCode);
            var searchAfterList = await searchAfterRes.Content.ReadFromJsonAsync<List<ConnectionSearchCandidateDto>>();
            Assert.DoesNotContain(searchAfterList!, x => x.Id == soloStudentId);

            // Admin CAN still see the student in search
            var adminSearchRes = await adminClient.GetAsync("/api/v1/students/search-independent?q=05559998877");
            var adminSearchList = await adminSearchRes.Content.ReadFromJsonAsync<List<ConnectionSearchCandidateDto>>();
            Assert.Contains(adminSearchList!, x => x.Id == soloStudentId);

            // 8. Verify Data Migration & Default Permissions (3 Open / 3 Closed) on CoachA's Student Detail
            var detailRes = await coachAClient.GetAsync($"/api/v1/students/{soloStudentId}");
            Assert.Equal(HttpStatusCode.OK, detailRes.StatusCode);
            var detail = await detailRes.Content.ReadFromJsonAsync<StudentDetailDto>();
            Assert.NotNull(detail);
            Assert.True(detail!.Permissions.CanCompleteTopics);
            Assert.True(detail.Permissions.CanEditGoals);
            Assert.True(detail.Permissions.CanCompleteHomework);
            Assert.False(detail.Permissions.CanAddExamResults);
            Assert.False(detail.Permissions.CanManageResources);
            Assert.False(detail.Permissions.CanSelfAssignWork);
            Assert.Equal("ODTÜ", detail.TargetUniversity);
            Assert.Contains(detail.ExamResults, e => e.ExamName == "Özdebir TYT Deneme 1" && e.CreatedByStudent);

            var coachResourcesRes = await coachAClient.GetAsync($"/api/v1/students/{soloStudentId}/resources");
            var coachResources = await coachResourcesRes.Content.ReadFromJsonAsync<List<StudentResourceDto>>();
            Assert.Contains(coachResources!, r => r.Id == resourceId && r.CreatedBy == "Student");

            // 9. Verify Closed Permission Enforcement (CanSelfAssignWork == false -> 403 Forbidden)
            var forbiddenHwRes = await studentClient.PostAsJsonAsync("/api/v1/student/homework", new
            {
                title = "İzinsiz Ödev",
                dueDate = DateTime.UtcNow.AddDays(1)
            });
            Assert.Equal(HttpStatusCode.Forbidden, forbiddenHwRes.StatusCode);

            // 10. CoachA turns OFF CanCompleteHomework -> Student completion routes to HOMEWORK_DONE approval
            var updatePermRes = await coachAClient.PutAsJsonAsync($"/api/v1/students/{soloStudentId}/permissions", new
            {
                canCompleteTopics = true,
                canEditGoals = true,
                canCompleteHomework = false,
                canAddExamResults = false,
                canManageResources = false,
                canSelfAssignWork = false
            });
            Assert.Equal(HttpStatusCode.OK, updatePermRes.StatusCode);

            // CoachA assigns a new homework to the student
            var coachAssignRes = await coachAClient.PostAsJsonAsync("/api/v1/homework/assignments", new
            {
                studentId = soloStudentId,
                title = "Koç Onaylı Türev Testi",
                dueDate = DateTime.UtcNow.AddDays(3),
                priority = "NORMAL"
            });
            Assert.Equal(HttpStatusCode.OK, coachAssignRes.StatusCode);
            var coachHwId = (await coachAssignRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("assignmentId").GetGuid();

            // Student marks it 100% -> must return pendingApproval = true and NOT mark homework DONE yet
            var studentCompleteRes = await studentClient.PostAsJsonAsync($"/api/v1/homework/assignments/{coachHwId}/complete", new
            {
                completionPercentage = 100,
                note = "Hocam bitirdim, onayınıza sunuyorum."
            });
            Assert.Equal(HttpStatusCode.OK, studentCompleteRes.StatusCode);
            var studentCompleteJson = await studentCompleteRes.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(studentCompleteJson.GetProperty("pendingApproval").GetBoolean());

            var hwStatusBeforeApprove = await conn.ExecuteScalarAsync<string>(
                "SELECT status FROM homework_assignments WHERE id = @Id", new { Id = coachHwId });
            Assert.Equal("PENDING", hwStatusBeforeApprove);

            // CoachA approves HOMEWORK_DONE in Approval Center
            var approvalId = await conn.ExecuteScalarAsync<Guid>(
                "SELECT id FROM approval_items WHERE entity_type = 'HOMEWORK_DONE' AND entity_id = @HwId AND status = 'PENDING'",
                new { HwId = coachHwId });
            var approveHwRes = await coachAClient.PostAsJsonAsync($"/api/v1/approvals/{approvalId}/approve", new { });
            Assert.Equal(HttpStatusCode.OK, approveHwRes.StatusCode);

            var hwStatusAfterApprove = await conn.ExecuteScalarAsync<string>(
                "SELECT status FROM homework_assignments WHERE id = @Id", new { Id = coachHwId });
            Assert.Equal("DONE", hwStatusAfterApprove);

            // 11. Symmetric Unlink: CoachA unlinks student -> student returns to Independent Mode with all data intact
            var unlinkRes = await coachAClient.PostAsJsonAsync($"/api/v1/students/{soloStudentId}/unlink", new { });
            Assert.Equal(HttpStatusCode.OK, unlinkRes.StatusCode);

            var profileAfterUnlink = await (await studentClient.GetAsync("/api/v1/student/profile")).Content.ReadFromJsonAsync<StudentProfileDto>();
            Assert.NotNull(profileAfterUnlink);
            Assert.False(profileAfterUnlink!.HasCoach);
            Assert.True(profileAfterUnlink.Permissions.CanSelfAssignWork);

            var studentResourcesAfterUnlink = await (await studentClient.GetAsync("/api/v1/student/resources")).Content.ReadFromJsonAsync<List<StudentResourceDto>>();
            Assert.Contains(studentResourcesAfterUnlink!, r => r.Id == resourceId);
        }
    }
}
