using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class ProgramRepository
    {
        private readonly DbConnectionFactory _connectionFactory;
        public ProgramRepository(DbConnectionFactory connectionFactory) { _connectionFactory = connectionFactory; }

        public async Task<IEnumerable<ProgramDto>> GetProgramsByCoachAsync(Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<ProgramDto>(@"
                SELECT cp.id, cp.name, cp.description, cp.color, cp.is_active, cp.created_by, cp.created_at,
                       pc.role,
                       (SELECT COUNT(1) FROM students s WHERE s.program_id = cp.id) AS student_count
                FROM coaching_programs cp
                JOIN program_coaches pc ON pc.program_id = cp.id AND pc.coach_id = @CoachId
                WHERE cp.is_active = 1
                ORDER BY cp.created_at DESC",
                new { CoachId = coachId });
        }

        public async Task<ProgramDto?> GetProgramAsync(Guid programId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<ProgramDto>(@"
                SELECT cp.id, cp.name, cp.description, cp.color, cp.is_active, cp.created_by, cp.created_at,
                       pc.role,
                       (SELECT COUNT(1) FROM students s WHERE s.program_id = cp.id) AS student_count
                FROM coaching_programs cp
                JOIN program_coaches pc ON pc.program_id = cp.id AND pc.coach_id = @CoachId
                WHERE cp.id = @ProgramId",
                new { ProgramId = programId, CoachId = coachId });
        }

        public async Task<string?> GetCoachRoleAsync(Guid programId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<string?>(@"
                SELECT role FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId",
                new { ProgramId = programId, CoachId = coachId });
        }

        public async Task<Guid> CreateProgramAsync(Guid coachId, CreateProgramRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var maxPrograms = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT COALESCE(c.max_programs, (SELECT value::int FROM system_settings WHERE key = 'default_max_programs'), 3)
                    FROM coaches c WHERE c.id = @CoachId
                    FOR UPDATE",
                    new { CoachId = coachId }, tx);

                var activeAdminCount = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(1) FROM program_coaches pc
                    JOIN coaching_programs cp ON cp.id = pc.program_id AND cp.is_active = 1
                    WHERE pc.coach_id = @CoachId AND pc.role = 'YONETICI'",
                    new { CoachId = coachId }, tx);

                if (activeAdminCount >= (maxPrograms ?? 3))
                {
                    tx.Rollback();
                    throw new InvalidOperationException("PROGRAM_LIMIT_EXCEEDED");
                }

                var programId = Guid.NewGuid();
                await conn.ExecuteAsync(@"
                    INSERT INTO coaching_programs (id, name, description, color, created_by)
                    VALUES (@Id, @Name, @Description, @Color, @CreatedBy)",
                    new { Id = programId, req.Name, req.Description, req.Color, CreatedBy = coachId }, tx);

                await conn.ExecuteAsync(@"
                    INSERT INTO program_coaches (id, program_id, coach_id, role, added_by)
                    VALUES (@Id, @ProgramId, @CoachId, 'YONETICI', @CoachId)",
                    new { Id = Guid.NewGuid(), ProgramId = programId, CoachId = coachId }, tx);

                tx.Commit();
                return programId;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<bool> UpdateProgramAsync(Guid programId, Guid coachId, UpdateProgramRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE coaching_programs cp
                SET name = COALESCE(@Name, cp.name),
                    description = COALESCE(@Description, cp.description),
                    color = COALESCE(@Color, cp.color),
                    updated_at = NOW()
                WHERE cp.id = @ProgramId
                  AND EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = cp.id AND pc.coach_id = @CoachId)",
                new { ProgramId = programId, CoachId = coachId, req.Name, req.Description, req.Color });
            return rows > 0;
        }

        public async Task<string> ArchiveProgramAsync(Guid programId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var role = await conn.ExecuteScalarAsync<string?>(@"
                    SELECT role FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId",
                    new { ProgramId = programId, CoachId = coachId }, tx);
                if (role != "YONETICI") return "FORBIDDEN";

                var studentCount = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(1) FROM students WHERE program_id = @ProgramId",
                    new { ProgramId = programId }, tx);

                if (studentCount == 0)
                    await conn.ExecuteAsync("DELETE FROM coaching_programs WHERE id = @ProgramId", new { ProgramId = programId }, tx);
                else
                    await conn.ExecuteAsync("UPDATE coaching_programs SET is_active = 0, archived_at = NOW() WHERE id = @ProgramId", new { ProgramId = programId }, tx);

                tx.Commit();
                return "OK";
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<IEnumerable<ProgramCoachDto>> GetProgramCoachesAsync(Guid programId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<ProgramCoachDto>(@"
                SELECT pc.coach_id, u.full_name, u.email, pc.role, pc.created_at
                FROM program_coaches pc
                JOIN users u ON u.id = pc.coach_id
                WHERE pc.program_id = @ProgramId
                  AND EXISTS (SELECT 1 FROM program_coaches m WHERE m.program_id = @ProgramId AND m.coach_id = @CoachId)
                ORDER BY (pc.role = 'YONETICI') DESC, pc.created_at",
                new { ProgramId = programId, CoachId = coachId });
        }

        public async Task<string> AddCoachAsync(Guid programId, Guid adminCoachId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var role = await conn.ExecuteScalarAsync<string?>(@"
                    SELECT role FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @AdminCoachId",
                    new { ProgramId = programId, AdminCoachId = adminCoachId }, tx);
                if (role != "YONETICI") return "FORBIDDEN";

                var targetExists = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(1) FROM coaches WHERE id = @CoachId",
                    new { CoachId = coachId }, tx);
                if (targetExists == 0) return "COACH_NOT_FOUND";

                var inserted = await conn.ExecuteAsync(@"
                    INSERT INTO program_coaches (id, program_id, coach_id, role, added_by)
                    VALUES (@Id, @ProgramId, @CoachId, 'YARDIMCI', @AdminCoachId)
                    ON CONFLICT (program_id, coach_id) DO NOTHING",
                    new { Id = Guid.NewGuid(), ProgramId = programId, CoachId = coachId, AdminCoachId = adminCoachId }, tx);

                tx.Commit();
                return inserted > 0 ? "OK" : "ALREADY_MEMBER";
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<string> RemoveCoachAsync(Guid programId, Guid adminCoachId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var adminRole = await conn.ExecuteScalarAsync<string?>(@"
                    SELECT role FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @AdminCoachId",
                    new { ProgramId = programId, AdminCoachId = adminCoachId }, tx);
                if (adminRole != "YONETICI") return "FORBIDDEN";

                var targetRole = await conn.ExecuteScalarAsync<string?>(@"
                    SELECT role FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId",
                    new { ProgramId = programId, CoachId = coachId }, tx);
                if (targetRole == "YONETICI") return "CANNOT_REMOVE_ADMIN";
                if (targetRole == null) return "NOT_MEMBER";

                await conn.ExecuteAsync("DELETE FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId", new { ProgramId = programId, CoachId = coachId }, tx);

                tx.Commit();
                return "OK";
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<string> TransferAdminAsync(Guid programId, Guid adminCoachId, Guid targetCoachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var adminRole = await conn.ExecuteScalarAsync<string?>(@"
                    SELECT role FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @AdminCoachId",
                    new { ProgramId = programId, AdminCoachId = adminCoachId }, tx);
                if (adminRole != "YONETICI") return "FORBIDDEN";

                var targetRole = await conn.ExecuteScalarAsync<string?>(@"
                    SELECT role FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @TargetCoachId",
                    new { ProgramId = programId, TargetCoachId = targetCoachId }, tx);
                if (targetRole != "YARDIMCI") return "TARGET_NOT_ASSISTANT";

                // Önce eski yöneticiyi yardımcıya indir (tek yönetici index'ini ihlal etmemek için)
                await conn.ExecuteAsync(@"
                    UPDATE program_coaches SET role = 'YARDIMCI'
                    WHERE program_id = @ProgramId AND coach_id = @AdminCoachId",
                    new { ProgramId = programId, AdminCoachId = adminCoachId }, tx);

                await conn.ExecuteAsync(@"
                    UPDATE program_coaches SET role = 'YONETICI'
                    WHERE program_id = @ProgramId AND coach_id = @TargetCoachId",
                    new { ProgramId = programId, TargetCoachId = targetCoachId }, tx);

                tx.Commit();
                return "OK";
            }
            catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
            {
                tx.Rollback();
                return "CONFLICT";
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<IEnumerable<dynamic>> GetPendingApprovalsAsync()
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync(@"
                SELECT u.id, u.full_name AS FullName, u.email AS Email, u.role AS Role, u.created_at AS CreatedAt
                FROM users u
                WHERE u.approval_status = 'PENDING'
                ORDER BY u.created_at");
        }

        public async Task<bool> ApproveUserAsync(Guid userId, string role, int? maxPrograms, Guid adminId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                await conn.ExecuteAsync(
                    "UPDATE users SET approval_status = 'APPROVED', role = @Role, is_admin = FALSE WHERE id = @UserId AND approval_status = 'PENDING'",
                    new { UserId = userId, Role = role }, tx);

                if (role == "Coach")
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO coaches (id, plan_type, approval_status, max_programs, approved_by, approved_at)
                        VALUES (@Id, 'free', 'APPROVED', @MaxPrograms, @AdminId, NOW())
                        ON CONFLICT (id) DO UPDATE SET approval_status = 'APPROVED', max_programs = COALESCE(@MaxPrograms, coaches.max_programs), approved_by = @AdminId, approved_at = NOW()",
                        new { Id = userId, MaxPrograms = maxPrograms, AdminId = adminId }, tx);
                }

                tx.Commit();
                return true;
            }
            catch { tx.Rollback(); throw; }
        }

        public async Task<bool> RejectUserAsync(Guid userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(
                "UPDATE users SET approval_status = 'REJECTED' WHERE id = @UserId AND approval_status = 'PENDING'",
                new { UserId = userId });
            return rows > 0;
        }

        public async Task<string> AddUserByAdminAsync(string email, string fullName, string passwordHash, string role)
        {
            email = email.ToLowerInvariant();
            using var conn = _connectionFactory.CreateConnection();
            var exists = await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM users WHERE email = @Email", new { Email = email });
            if (exists > 0) return "EMAIL_EXISTS";

            var userId = Guid.NewGuid();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, created_at, updated_at)
                    VALUES (@Id, @Email, @Hash, @Role, @FullName, FALSE, 'APPROVED', NOW(), NOW())",
                    new { Id = userId, Email = email, Hash = passwordHash, Role = role, FullName = fullName }, tx);

                if (role == "Coach")
                    await conn.ExecuteAsync("INSERT INTO coaches (id, plan_type, approval_status) VALUES (@Id, 'free', 'APPROVED')", new { Id = userId }, tx);

                tx.Commit();
                return "OK";
            }
            catch { tx.Rollback(); throw; }
        }
    }
}


