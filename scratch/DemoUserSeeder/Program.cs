using System;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Npgsql;
using Dapper;

namespace DemoUserSeeder
{
    class Program
    {
        private static string GenerateStrongRandomPassword(int length = 32)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
            var bytes = new byte[length];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            var result = new char[length];
            for (int i = 0; i < length; i++)
            {
                result[i] = chars[bytes[i] % chars.Length];
            }
            return new string(result);
        }

        static async Task Main(string[] args)
        {
            var connStr = "Host=ep-withered-wave-b1s7f9m4-pooler.c-5.eu-central-1.aws.neon.tech;Database=mentorum;Username=mentorum_owner;Password=npg_yq6kdUjsgX1D;Ssl Mode=Require;Trust Server Certificate=true;";
            Console.WriteLine("Neon PostgreSQL bağlantısı açılıyor...");

            using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            var users = await conn.QueryAsync<(string Email, string Role, bool IsAdmin)>("SELECT email, role, is_admin FROM users");
            Console.WriteLine("Kullanıcılar:");
            foreach (var u in users)
            {
                Console.WriteLine($" - {u.Email} | Rol: {u.Role} | Admin: {u.IsAdmin}");
            }
            return;
            var coachPass = "demo";
            var teacherPass = GenerateStrongRandomPassword(32);
            var studentPass = GenerateStrongRandomPassword(32);
            var parentPass = GenerateStrongRandomPassword(32);

            var coachHash = BCrypt.Net.BCrypt.HashPassword(coachPass);
            var teacherHash = BCrypt.Net.BCrypt.HashPassword(teacherPass);
            var studentHash = BCrypt.Net.BCrypt.HashPassword(studentPass);
            var parentHash = BCrypt.Net.BCrypt.HashPassword(parentPass);

            using var tx = conn.BeginTransaction();
            try
            {
                // 1. Mevcut aktif bir coaching_program bul veya koç adına oluştur
                var programId = await conn.QueryFirstOrDefaultAsync<Guid?>("SELECT id FROM coaching_programs LIMIT 1", transaction: tx);

                // ── 1. DEMO KOÇ (COACH) ──
                var coachEmail = "demo_coach@dersmatris.com";
                var coachId = await conn.QueryFirstOrDefaultAsync<Guid?>("SELECT id FROM users WHERE email = @Email", new { Email = coachEmail }, tx);
                if (coachId == null)
                {
                    coachId = Guid.NewGuid();
                    await conn.ExecuteAsync(@"
                        INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
                        VALUES (@Id, @Email, @Hash, 'Coach', 'Demo Koç', FALSE, 'APPROVED', 1, NOW(), NOW())",
                        new { Id = coachId, Email = coachEmail, Hash = coachHash }, tx);

                    await conn.ExecuteAsync(@"
                        INSERT INTO coaches (id, plan_type)
                        VALUES (@Id, 'pro') ON CONFLICT (id) DO NOTHING",
                        new { Id = coachId }, tx);
                    Console.WriteLine($"✅ Demo Koç oluşturuldu: {coachEmail}");
                }
                else
                {
                    await conn.ExecuteAsync(@"
                        UPDATE users SET password_hash = @Hash, approval_status = 'APPROVED', is_active = 1, updated_at = NOW() WHERE id = @Id",
                        new { Id = coachId, Hash = coachHash }, tx);
                    Console.WriteLine($"🔄 Demo Koç güncellendi: {coachEmail}");
                }

                // Program yoksa oluştur
                if (programId == null)
                {
                    programId = Guid.NewGuid();
                    await conn.ExecuteAsync(@"
                        INSERT INTO coaching_programs (id, coach_id, name, target_exam, is_active, created_at, updated_at)
                        VALUES (@Id, @CoachId, 'Demo YKS 2026 Programı', 'YKS', 1, NOW(), NOW())",
                        new { Id = programId, CoachId = coachId }, tx);
                    Console.WriteLine($"✅ Demo Program oluşturuldu (Id: {programId})");
                }

                // ── 2. DEMO ÖĞRETMEN (TEACHER) ──
                var teacherEmail = "demo_teacher@dersmatris.com";
                var teacherId = await conn.QueryFirstOrDefaultAsync<Guid?>("SELECT id FROM users WHERE email = @Email", new { Email = teacherEmail }, tx);
                if (teacherId == null)
                {
                    teacherId = Guid.NewGuid();
                    await conn.ExecuteAsync(@"
                        INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
                        VALUES (@Id, @Email, @Hash, 'Teacher', 'Demo Öğretmen', FALSE, 'APPROVED', 1, NOW(), NOW())",
                        new { Id = teacherId, Email = teacherEmail, Hash = teacherHash }, tx);

                    await conn.ExecuteAsync(@"
                        INSERT INTO teachers (id, program_id, is_active, created_at)
                        VALUES (@Id, @ProgramId, 1, NOW()) ON CONFLICT (id) DO NOTHING",
                        new { Id = teacherId, ProgramId = programId }, tx);

                    Console.WriteLine($"✅ Demo Öğretmen oluşturuldu: {teacherEmail}");
                }
                else
                {
                    await conn.ExecuteAsync(@"
                        UPDATE users SET password_hash = @Hash, approval_status = 'APPROVED', is_active = 1, updated_at = NOW() WHERE id = @Id",
                        new { Id = teacherId, Hash = teacherHash }, tx);
                    Console.WriteLine($"🔄 Demo Öğretmen güncellendi: {teacherEmail}");
                }

                // ── 3. DEMO ÖĞRENCİ (STUDENT) ──
                var studentEmail = "demo_student@dersmatris.com";
                var studentId = await conn.QueryFirstOrDefaultAsync<Guid?>("SELECT id FROM users WHERE email = @Email", new { Email = studentEmail }, tx);
                if (studentId == null)
                {
                    studentId = Guid.NewGuid();
                    await conn.ExecuteAsync(@"
                        INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
                        VALUES (@Id, @Email, @Hash, 'Student', 'Demo Öğrenci', FALSE, 'APPROVED', 1, NOW(), NOW())",
                        new { Id = studentId, Email = studentEmail, Hash = studentHash }, tx);

                    await conn.ExecuteAsync(@"
                        INSERT INTO students (id, program_id, grade, track, is_active, coaching_start_date)
                        VALUES (@Id, @ProgramId, 12, 'SAY', 1, CURRENT_DATE) ON CONFLICT (id) DO NOTHING",
                        new { Id = studentId, ProgramId = programId }, tx);
                    Console.WriteLine($"✅ Demo Öğrenci oluşturuldu: {studentEmail}");
                }
                else
                {
                    await conn.ExecuteAsync(@"
                        UPDATE users SET password_hash = @Hash, approval_status = 'APPROVED', is_active = 1, updated_at = NOW() WHERE id = @Id",
                        new { Id = studentId, Hash = studentHash }, tx);
                    Console.WriteLine($"🔄 Demo Öğrenci güncellendi: {studentEmail}");
                }

                // ── 4. DEMO VELİ (PARENT) ──
                var parentEmail = "demo_parent@dersmatris.com";
                var parentId = await conn.QueryFirstOrDefaultAsync<Guid?>("SELECT id FROM users WHERE email = @Email", new { Email = parentEmail }, tx);
                if (parentId == null)
                {
                    parentId = Guid.NewGuid();
                    await conn.ExecuteAsync(@"
                        INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
                        VALUES (@Id, @Email, @Hash, 'Parent', 'Demo Veli', FALSE, 'APPROVED', 1, NOW(), NOW())",
                        new { Id = parentId, Email = parentEmail, Hash = parentHash }, tx);

                    await conn.ExecuteAsync(@"
                        INSERT INTO parents (id)
                        VALUES (@Id) ON CONFLICT (id) DO NOTHING",
                        new { Id = parentId }, tx);

                    await conn.ExecuteAsync(@"
                        INSERT INTO student_parents (id, student_id, parent_id, parent_email, relation, is_accepted, created_at)
                        VALUES (@Id, @StudentId, @ParentId, @Email, 'Veli', 1, NOW())",
                        new { Id = Guid.NewGuid(), StudentId = studentId, ParentId = parentId, Email = parentEmail }, tx);
                    Console.WriteLine($"✅ Demo Veli oluşturuldu: {parentEmail}");
                }
                else
                {
                    await conn.ExecuteAsync(@"
                        UPDATE users SET password_hash = @Hash, approval_status = 'APPROVED', is_active = 1, updated_at = NOW() WHERE id = @Id",
                        new { Id = parentId, Hash = parentHash }, tx);
                    Console.WriteLine($"🔄 Demo Veli güncellendi: {parentEmail}");
                }

                tx.Commit();

                Console.WriteLine("\n================== OLUŞTURULAN GEÇİCİ BİLGİLER ==================");
                Console.WriteLine($"[KOÇ]       E-posta: {coachEmail} | Şifre: {coachPass}");
                Console.WriteLine($"[ÖĞRETMEN]  E-posta: {teacherEmail} | Şifre: {teacherPass}");
                Console.WriteLine($"[ÖĞRENCİ]   E-posta: {studentEmail} | Şifre: {studentPass}");
                Console.WriteLine($"[VELİ]      E-posta: {parentEmail} | Şifre: {parentPass}");
                Console.WriteLine("=================================================================\n");
            }
            catch (Exception ex)
            {
                tx.Rollback();
                Console.WriteLine($"❌ HATA: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Detay: {ex.InnerException.Message}");
                }
            }
        }
    }
}
