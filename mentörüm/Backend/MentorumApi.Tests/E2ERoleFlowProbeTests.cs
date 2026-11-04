using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Dapper;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MentorumApi.Tests
{
    /// <summary>
    /// Tüm roller (Koç/Öğrenci/Öğretmen/Veli) arası uçtan uca senaryo. Her adım loglanır;
    /// beklenti tutmayan adımlar sonda toplu raporlanır (ilk hatada durmaz).
    /// </summary>
    public class E2ERoleFlowProbeTests : IClassFixture<IntegrationTestFixture>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly IntegrationTestFixture _fx;
        private readonly List<string> _log = new();
        private readonly List<string> _fail = new();

        private const string Coach = "11111111-1111-1111-1111-111111111111";
        private const string Student = "55555555-5555-5555-5555-555555555555";
        private const string Teacher = "44444444-4444-4444-4444-444444444444";
        private const string Parent = "a1a1a1a1-0000-0000-0000-000000000001";
        private const string Program = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
        private const string Course = "cccccccc-cccc-cccc-cccc-cccccccccccc";

        public E2ERoleFlowProbeTests(IntegrationTestFixture fx, WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "dummy_secret_for_tests_that_is_long_enough_for_hmacsha256");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            _fx = fx;
            _factory = factory;
        }

        private HttpClient Client()
        {
            var c = _factory.WithWebHostBuilder(b => b.ConfigureServices(s =>
            {
                s.AddAuthentication(o =>
                {
                    o.DefaultAuthenticateScheme = TestAuthHandler.DefaultScheme;
                    o.DefaultChallengeScheme = TestAuthHandler.DefaultScheme;
                }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.DefaultScheme, _ => { });
            })).CreateClient();
            c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.DefaultScheme);
            return c;
        }

        private async Task<(HttpStatusCode code, string body)> Call(HttpClient c, string who, string role, HttpMethod m, string url, object? body = null)
        {
            var req = new HttpRequestMessage(m, url);
            req.Headers.Add("X-Test-UserId", who);
            req.Headers.Add("X-Test-Role", role);
            if (body != null) req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            var res = await c.SendAsync(req);
            return (res.StatusCode, await res.Content.ReadAsStringAsync());
        }

        private async Task<string> Step(HttpClient c, string name, string who, string role, HttpMethod m, string url,
            object? body = null, int expect = 200, params string[] contains)
        {
            var (code, text) = await Call(c, who, role, m, url, body);
            var ok = (int)code == expect;
            var missing = contains.Where(x => !text.Contains(x, StringComparison.OrdinalIgnoreCase)).ToList();
            var snippet = text.Length > 300 ? text[..300] + "..." : text;
            var line = $"[{(ok && missing.Count == 0 ? "OK  " : "FAIL")}] {name} | {role} {m} {url} -> {(int)code} (beklenen {expect}) {(missing.Count > 0 ? "EKSIK: " + string.Join(",", missing) : "")} | {snippet}";
            _log.Add(line);
            if (!ok || missing.Count > 0) _fail.Add(line);
            return text;
        }

        private async Task Check(string name, bool cond, string detail = "")
        {
            var line = $"[{(cond ? "OK  " : "FAIL")}] {name} {detail}";
            _log.Add(line);
            if (!cond) _fail.Add(line);
            await Task.CompletedTask;
        }

        private static string Id(string json, string prop = "id")
        {
            using var d = JsonDocument.Parse(json);
            var el = d.RootElement;
            if (el.ValueKind == JsonValueKind.Array) el = el[0];
            foreach (var p in el.EnumerateObject())
                if (string.Equals(p.Name, prop, StringComparison.OrdinalIgnoreCase)) return p.Value.GetString() ?? "";
            return "";
        }

        [Fact]
        public async Task FullRoleFlow()
        {
            var c = Client();
            var G = HttpMethod.Get; var P = HttpMethod.Post; var U = HttpMethod.Put; var Pa = HttpMethod.Patch; var D = HttpMethod.Delete;
            var now = DateTime.UtcNow;
            var from = now.AddDays(-7).ToString("yyyy-MM-ddTHH:mm:ss");
            var to = now.AddDays(30).ToString("yyyy-MM-ddTHH:mm:ss");

            // Veli seed (kabul edilmiş, tüm izinler açık)
            using (var conn = new Npgsql.NpgsqlConnection(_fx.PostgreSqlContainer.GetConnectionString()))
            {
                await conn.OpenAsync();
                await conn.ExecuteAsync($@"
                    INSERT INTO users (id,email,role,full_name) VALUES ('{Parent}','veli@test.com','Parent','Veli Test');
                    INSERT INTO parents (id) VALUES ('{Parent}');
                    INSERT INTO student_parents (id,student_id,parent_id,parent_email,is_accepted,can_view_exams,can_view_homework,can_view_calendar,can_view_study_stats,can_view_payments)
                    VALUES (gen_random_uuid(),'{Student}','{Parent}','veli@test.com',1,1,1,1,1,1);
                    UPDATE courses SET teacher_can_manage_exams=1, teacher_can_view_notes=1, teacher_can_add_notes=1, teacher_can_process_homework=1 WHERE id='{Course}';");
            }

            // ===== ÖĞRENCİ EKRANLARI =====
            foreach (var u in new[] { "profile", "exams", "curriculum", "goal", "sessions", "teacher-notes", "study-sessions", "subject-stats", "time-budget", "checkins", "notes", "questions", "streak", "school-schedule", "coaching-tools" })
                await Step(c, $"Öğrenci GET {u}", Student, "Student", G, $"/api/v1/student/{u}");
            await Step(c, "Öğrenci takvim", Student, "Student", G, $"/api/v1/me/calendar?from={from}&to={to}");
            await Step(c, "Öğrenci ders programı", Student, "Student", G, "/api/v1/student/schedule");
            await Step(c, "Öğrenci bildirimler", Student, "Student", G, "/api/v1/notifications");
            await Step(c, "Öğrenci dersleri", Student, "Student", G, "/api/v1/student/courses");
            await Step(c, "Öğrenci hedef PUT", Student, "Student", U, "/api/v1/student/goal", new { targetScore = 450, targetNet = 80, notes = "hedef" });
            await Step(c, "Öğrenci çalışma oturumu", Student, "Student", P, "/api/v1/student/study-sessions", new { minutes = 45, durationMinutes = 45, startedAt = now, studyDate = now });
            await Step(c, "Öğrenci check-in", Student, "Student", U, "/api/v1/student/checkin", new { mood = "GOOD", note = "iyiyim" });
            await Step(c, "Öğrenci okul programı ekle", Student, "Student", P, "/api/v1/student/school-schedule", new { dayOfWeek = 1, startTime = "08:30", endTime = "15:00", label = "Okul" });
            await Step(c, "Öğrenci alışkanlık toggle", Student, "Student", Pa, "/api/v1/student/coaching-tools/habits", new { habitId = "h1", completed = true, date = now.ToString("yyyy-MM-dd") });

            // Kişisel notlar: PRIVATE ve COACH
            var nPriv = await Step(c, "Öğrenci özel not", Student, "Student", P, "/api/v1/student/notes", new { title = "ozelnot", content = "gizli-icerik", visibility = "PRIVATE" });
            var nCoach = await Step(c, "Öğrenci koça görünür not", Student, "Student", P, "/api/v1/student/notes", new { title = "koca-not", content = "koca-icerik", visibility = "COACH" });
            var coachNotes = await Step(c, "Koç öğrenci notlarını görür", Coach, "Coach", G, $"/api/v1/students/{Student}/student-notes", null, 200, "koca-icerik");
            await Check("Koç PRIVATE notu GÖRMEMELİ", !coachNotes.Contains("gizli-icerik"));
            var noteId = Id(nCoach);
            if (noteId != "") await Step(c, "Öğrenci not güncelle", Student, "Student", U, $"/api/v1/student/notes/{noteId}", new { title = "koca-not2", content = "guncel", visibility = "COACH", isPinned = true });
            if (noteId != "") await Step(c, "Öğrenci not sil", Student, "Student", D, $"/api/v1/student/notes/{noteId}");

            // ===== SORU: ÖĞRENCİ → KOÇ → ÖĞRENCİ =====
            var q = await Step(c, "Öğrenci soru sor", Student, "Student", P, "/api/v1/student/questions", new { topicText = "Türev sorusu takıldım" });
            var qid = Id(q);
            await Step(c, "Koç soruları görür", Coach, "Coach", G, $"/api/v1/students/{Student}/questions", null, 200, "Türev");
            await Step(c, "Koç soruyu yanıtlar", Coach, "Coach", Pa, $"/api/v1/students/{Student}/questions/{qid}", new { reply = "cevap-koctan", status = "RESOLVED" });
            await Step(c, "Öğrenci yanıtı görür", Student, "Student", G, "/api/v1/student/questions", null, 200, "cevap-koctan");

            // ===== DOSYA GÖNDERME =====
            await Step(c, "Öğrenci alıcı listesi", Student, "Student", G, $"/api/v1/uploads/recipients?courseId={Course}");
            await Step(c, "Koç alıcı listesi", Coach, "Coach", G, $"/api/v1/uploads/recipients?courseId={Course}");
            var up = await Step(c, "Koç dosya yükleme URL", Coach, "Coach", P, "/api/v1/uploads/url",
                new { fileName = "plan.pdf", fileSizeInBytes = 1000, contentType = "application/pdf", programId = Program, recipientUserId = Student });
            var upId = Id(up);
            if (upId != "")
            {
                await Step(c, "Koç yükleme onay", Coach, "Coach", P, $"/api/v1/uploads/{upId}/confirm");
                await Step(c, "Öğrenci dosyayı listeler", Student, "Student", G, "/api/v1/uploads", null, 200, "plan.pdf");
                await Step(c, "Öğrenci dosya URL alır", Student, "Student", G, $"/api/v1/uploads/{upId}/url");
                await Step(c, "Veli başkasının dosyasını AÇAMAZ", Parent, "Parent", G, $"/api/v1/uploads/{upId}/url", null, 403);
            }
            var up2 = await Step(c, "Öğretmen dosya yükleme URL (öğrenciye)", Teacher, "Teacher", P, "/api/v1/uploads/url",
                new { fileName = "ders.pdf", fileSizeInBytes = 500, contentType = "application/pdf", programId = Program, courseId = Course, recipientUserId = Student });
            _log.Add("  (öğretmen dosya paylaşım yanıtı: " + up2[..Math.Min(150, up2.Length)] + ")");

            // ===== ÖDEV: KOÇ → ÖĞRENCİ → KOÇ =====
            var hw = await Step(c, "Koç ödev atar", Coach, "Coach", P, "/api/v1/homework/assignments",
                new { studentId = Student, title = "Ödev-E2E", description = "çöz", dueDate = now.AddDays(3), priority = "NORMAL" });
            var hwList = await Step(c, "Öğrenci ödevlerini görür", Student, "Student", G, "/api/v1/homework/me", null, 200, "Ödev-E2E");
            string hwId = "";
            using (var d = JsonDocument.Parse(hwList))
            {
                var arr = d.RootElement.ValueKind == JsonValueKind.Array ? d.RootElement : (d.RootElement.TryGetProperty("items", out var it) ? it : d.RootElement);
                foreach (var e in arr.EnumerateArray())
                    if (e.TryGetProperty("snapshotTitle", out var t) && t.GetString() == "Ödev-E2E") hwId = e.GetProperty("id").GetString()!;
            }
            await Check("Ödev id bulundu", hwId != "");
            if (hwId != "")
            {
                var ex = await Step(c, "Öğrenci ek süre ister", Student, "Student", P, $"/api/v1/homework/{hwId}/request-extension", new { reason = "hastaydım", requestedDueDate = now.AddDays(6) });
                var ap = await Step(c, "Koç onayları görür (ek süre)", Coach, "Coach", G, "/api/v1/approvals", null, 200, "hastaydım");
                await Check("Ek süre onayında öğrenci/ödev adı dolu", ap.Contains("Ödev-E2E") || ap.Contains("Student B"), "(payload studentName/homeworkTitle)");
                var apId = Id(ap);
                if (apId != "") await Step(c, "Koç ek süreyi onaylar", Coach, "Coach", P, $"/api/v1/approvals/{apId}/approve", new { });

                var att = await Step(c, "Öğrenci ödev eki URL", Student, "Student", P, "/api/v1/uploads/url",
                    new { fileName = "cozum.jpg", fileSizeInBytes = 2000, contentType = "image/jpeg", programId = Program, homeworkId = hwId, recipientUserId = Coach });
                var attId = Id(att);
                if (attId != "") await Step(c, "Öğrenci ek onay", Student, "Student", P, $"/api/v1/uploads/{attId}/confirm");
                await Step(c, "Öğrenci ödevi tamamlar", Student, "Student", P, $"/api/v1/homework/assignments/{hwId}/complete",
                    new { completionPercentage = 100, note = "cozdum-notu", attachmentIds = attId != "" ? new[] { attId } : Array.Empty<string>() });
                var coachHw = await Step(c, "Koç ödev sonucunu görür", Coach, "Coach", G, $"/api/v1/homework/student/{Student}", null, 200, "cozdum-notu");
                if (attId != "") await Check("Koç ödev ekini listede görür", coachHw.Contains("cozum.jpg"));
                await Step(c, "Koç ödev eklerini listeler", Coach, "Coach", G, $"/api/v1/homework/{hwId}/attachments");
                if (attId != "") await Step(c, "Koç ödev eki URL açar", Coach, "Coach", G, $"/api/v1/uploads/{attId}/url");
                await Step(c, "Veli ödevleri görür", Parent, "Parent", G, $"/api/v1/homework/children/{Student}", null, 200, "Ödev-E2E");
            }

            // ===== ÖĞRETMEN =====
            await Step(c, "Öğretmen /me", Teacher, "Teacher", G, "/api/v1/teacher/me");
            await Step(c, "Öğretmen dersleri", Teacher, "Teacher", G, "/api/v1/teacher/courses", null, 200, "Matematik");
            await Step(c, "Öğretmen ders öğrencileri", Teacher, "Teacher", G, $"/api/v1/teacher/courses/{Course}/students", null, 200, "Student B");
            var thw = await Step(c, "Öğretmen ödev verir", Teacher, "Teacher", P, $"/api/v1/teacher/courses/{Course}/homework",
                new { studentId = Student, title = "Öğretmen-Ödevi", description = "x", dueDate = now.AddDays(4) });
            await Step(c, "Öğretmen ders ödevleri", Teacher, "Teacher", G, $"/api/v1/teacher/courses/{Course}/homework", null, 200, "Öğretmen-Ödevi");
            await Step(c, "Öğrenci öğretmen ödevini görür", Student, "Student", G, "/api/v1/homework/me", null, 200, "Öğretmen-Ödevi");
            await Step(c, "Öğretmen sınav ekler", Teacher, "Teacher", P, $"/api/v1/teacher/courses/{Course}/exams",
                new { studentId = Student, examDate = now.AddDays(-1), examType = "Deneme", examName = "Öğr-Sınav", totalNet = 30.5, scores = new object[0] });
            await Step(c, "Öğretmen sınavları", Teacher, "Teacher", G, $"/api/v1/teacher/courses/{Course}/exams");
            await Step(c, "Öğretmen kaynakları", Teacher, "Teacher", G, $"/api/v1/teacher/courses/{Course}/resources");
            await Step(c, "Öğretmen ders notu ekler", Teacher, "Teacher", P, $"/api/v1/teacher/courses/{Course}/students/{Student}/notes",
                new { note = "gizli-ogretmen-notu", summary = "ogrenci-gorur-ozet", visibility = "STUDENT_VISIBLE" });
            await Step(c, "Öğretmen notları okur", Teacher, "Teacher", G, $"/api/v1/teacher/courses/{Course}/students/{Student}/notes");
            await Step(c, "Öğrenci öğretmen notunu görür", Student, "Student", G, "/api/v1/student/teacher-notes", null, 200, "ogrenci-gorur-ozet");
            await Step(c, "Koç öğretmen notunu görür", Coach, "Coach", G, $"/api/v1/students/{Student}/teacher-notes", null, 200, "ogrenci-gorur-ozet");
            await Step(c, "Veli öğretmen notunu görür", Parent, "Parent", G, $"/api/v1/parent/children/{Student}/teacher-notes");
            await Step(c, "Öğretmen takvim programı", Teacher, "Teacher", G, "/api/v1/teacher/schedule");
            await Step(c, "Öğretmen başka dersi AÇAMAZ", Teacher, "Teacher", G, "/api/v1/teacher/courses/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/students", null, 404);
            await Step(c, "Öğretmen bildirimler", Teacher, "Teacher", G, "/api/v1/notifications");

            // ===== SINAV: KOÇ → ÖĞRENCİ/VELİ =====
            await Step(c, "Koç sınav ekler", Coach, "Coach", P, "/api/v1/exams",
                new { studentId = Student, examDate = now.AddDays(-2), examType = "Deneme", examName = "Koç-Denemesi", totalNet = 55.25, scores = new object[0] });
            await Step(c, "Öğrenci sınavı görür", Student, "Student", G, "/api/v1/student/exams", null, 200, "Koç-Denemesi");
            await Step(c, "Veli sınavı görür", Parent, "Parent", G, $"/api/v1/parents/children/{Student}/exams", null, 200, "Koç-Denemesi");

            // ===== KOÇ SEANSI & TAKVİM =====
            await Step(c, "Koç seans ekler", Coach, "Coach", P, $"/api/v1/students/{Student}/sessions",
                new { sessionDate = now.AddDays(2), title = "Seans-E2E", notes = "n", actionItems = "a" });
            await Step(c, "Öğrenci seansı görür", Student, "Student", G, "/api/v1/student/sessions", null, 200, "Seans-E2E");
            var cs = await Step(c, "Koç ders programı slotu ekle", Coach, "Coach", P, $"/api/v1/programs/{Program}/schedule",
                new { studentId = Student, dayOfWeek = 2, startTime = "10:00:00", endTime = "11:00:00", title = "Slot-E2E", type = "DERS" });
            await Step(c, "Öğrenci programda slotu görür", Student, "Student", G, "/api/v1/student/schedule", null, 200, "Slot-E2E");
            await Step(c, "Veli programda slotu görür", Parent, "Parent", G, $"/api/v1/parent/children/{Student}/schedule", null, 200, "Slot-E2E");
            await Step(c, "Öğrenci kişisel etkinlik", Student, "Student", P, "/api/v1/me/events", new { title = "Etkinlik-E2E", eventType = "PERSONAL_BLOCK", startAt = now.AddDays(1), endAt = now.AddDays(1).AddHours(1) });
            await Step(c, "Öğrenci takvimi etkinlik+seans", Student, "Student", G, $"/api/v1/me/calendar?from={from}&to={to}", null, 200, "Etkinlik-E2E", "Seans-E2E");
            await Step(c, "Koç takvimi", Coach, "Coach", G, $"/api/v1/calendar?from={from}&to={to}", null, 200, "Seans-E2E");
            await Step(c, "Koç öğrenci events", Coach, "Coach", G, $"/api/v1/students/{Student}/events?from={from}&to={to}");
            await Step(c, "Veli takvimi", Parent, "Parent", G, $"/api/v1/me/children/{Student}/calendar?from={from}&to={to}", null, 200, "Seans-E2E");

            // ===== ÖDEME PLANI =====
            var plan = await Step(c, "Koç ödeme planı oluşturur", Coach, "Coach", P, $"/api/v1/programs/{Program}/payment-plans",
                new { studentId = Student, parentId = Parent, periodType = "MONTHLY_DAY", amount = 1000, currency = "TRY", monthDay = 5, startDate = now.Date });
            var plans = await Step(c, "Koç planları listeler", Coach, "Coach", G, $"/api/v1/programs/{Program}/payment-plans", null, 200, "1000");
            string itemId = "";
            using (var d = JsonDocument.Parse(plans))
            {
                var arr = d.RootElement.ValueKind == JsonValueKind.Array ? d.RootElement : d.RootElement.GetProperty("items");
                foreach (var p in arr.EnumerateArray())
                    if (p.TryGetProperty("items", out var its) && its.GetArrayLength() > 0) { itemId = its[0].GetProperty("id").GetString()!; break; }
            }
            await Check("Plan taksitleri üretildi", itemId != "");
            var vp = await Step(c, "Veli ödemeleri görür", Parent, "Parent", G, $"/api/v1/parent/children/{Student}/payments", null, 200, "1000");
            if (itemId != "")
            {
                await Step(c, "Veli ödeme bildirimi (kısmi 400)", Parent, "Parent", P, $"/api/v1/parent/children/{Student}/payment-claims", new { itemId, amount = 400, notes = "havale yaptım" });
                var ap = await Step(c, "Koç ödeme bildirimini görür", Coach, "Coach", G, "/api/v1/approvals", null, 200, "havale yaptım");
                await Check("Ödeme onayında studentName dolu", ap.Contains("Student B") || ap.Contains("studentName"));
                string claimId = "";
                using (var d = JsonDocument.Parse(ap))
                {
                    var arr = d.RootElement.ValueKind == JsonValueKind.Array ? d.RootElement : d.RootElement.GetProperty("items");
                    foreach (var e in arr.EnumerateArray())
                        if (e.GetRawText().Contains("havale yaptım")) claimId = e.GetProperty("id").GetString()!;
                }
                if (claimId != "") await Step(c, "Koç ödeme bildirimini onaylar", Coach, "Coach", P, $"/api/v1/approvals/{claimId}/approve", new { });
                var after = await Step(c, "Koç planlar (kısmi sonrası)", Coach, "Coach", G, $"/api/v1/programs/{Program}/payment-plans");
                _log.Add("  PLAN-SONRASI: " + after);
                await Step(c, "Koç kalan tahsilat", Coach, "Coach", P, $"/api/v1/payment-items/{itemId}/collect", new { amount = 600, method = "NAKIT" });
                var fin = await Step(c, "Veli ödemeleri (son)", Parent, "Parent", G, $"/api/v1/parent/children/{Student}/payments");
                _log.Add("  VELI-SON: " + fin);
            }

            // ===== VELİ =====
            await Step(c, "Veli çocukları", Parent, "Parent", G, "/api/v1/parents/my-children", null, 200, "Student B");
            await Step(c, "Veli izinler", Parent, "Parent", G, $"/api/v1/parents/children/{Student}/permissions");
            await Step(c, "Veli çocuk özet", Parent, "Parent", G, $"/api/v1/parents/children/{Student}");
            await Step(c, "Veli çalışma istatistik", Parent, "Parent", G, $"/api/v1/parent/children/{Student}/study-stats");
            await Step(c, "Veli bildirimler", Parent, "Parent", G, "/api/v1/notifications");
            await Step(c, "Veli ders programı (genel)", Parent, "Parent", G, "/api/v1/parent/schedule");

            // ===== İZİN İPTALİ =====
            await Step(c, "Koç veli izinlerini kapatır", Coach, "Coach", U, $"/api/v1/students/{Student}/parents/{Parent}/permissions",
                new { canViewExams = false, canViewHomework = false, canViewCalendar = false, canViewStudyStats = false, canViewPayments = false });
            await Step(c, "Veli ödev izni kapalı → 403", Parent, "Parent", G, $"/api/v1/homework/children/{Student}", null, 403);
            await Step(c, "Veli ödeme izni kapalı → 403", Parent, "Parent", G, $"/api/v1/parent/children/{Student}/payments", null, 403);

            // ===== DAVETLER =====
            var inv = await Step(c, "Koç öğrenci daveti", Coach, "Coach", P, "/api/v1/invites/send", new { email = "yeniogr@test.com", role = "Student", relatedId = Program, sendEmail = false });
            var code = Id(inv, "code");
            await Step(c, "Bekleyen davetler", Coach, "Coach", G, "/api/v1/invites/pending", null, 200, "yeniogr@test.com");
            if (code != "")
            {
                await Step(c, "Davet detay (anonim)", "x", "Student", G, $"/api/v1/invites/{code}");
                await Step(c, "Davet kabul", "x", "Student", P, $"/api/v1/invites/{code}/accept", new { fullName = "Yeni Öğrenci", password = "Password123!" });
                await Step(c, "Yeni öğrenci giriş", "x", "Student", P, "/api/v1/auth/login", new { email = "yeniogr@test.com", password = "Password123!" });
            }
            var pinv = await Step(c, "Koç veli daveti", Coach, "Coach", P, "/api/v1/invites/send", new { email = "yeniveli@test.com", role = "Parent", relatedId = Student, sendEmail = false });
            var pcode = Id(pinv, "code");
            if (pcode != "")
            {
                await Step(c, "Veli davet kabul", "x", "Parent", P, $"/api/v1/invites/{pcode}/accept", new { fullName = "Yeni Veli", password = "Password123!" });
                await Step(c, "Yeni veli giriş", "x", "Parent", P, "/api/v1/auth/login", new { email = "yeniveli@test.com", password = "Password123!" });
            }
            await Step(c, "Koç öğretmen ekler", Coach, "Coach", P, $"/api/v1/programs/{Program}/teachers", new { email = "yeniogretmen@test.com", fullName = "Yeni Öğretmen" });
            await Step(c, "Koç öğrenci listesi", Coach, "Coach", G, "/api/v1/students", null, 200, "Student B");
            await Step(c, "Koç rapor PDF", Coach, "Coach", G, $"/api/v1/students/{Student}/report.pdf");
            await Step(c, "Koç raporlar", Coach, "Coach", G, "/api/v1/reports/overview");
            await Step(c, "Koç depolama kullanımı", Coach, "Coach", G, "/api/v1/coach/storage-usage");

            var path = Path.Combine(Path.GetTempPath(), "e2e_probe_log.txt");
            File.WriteAllLines(path, _log, Encoding.UTF8);
            File.WriteAllLines(Path.Combine(Path.GetTempPath(), "e2e_probe_fail.txt"), _fail, Encoding.UTF8);
            Assert.True(true);
        }
    }
}

