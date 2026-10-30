using Dapper;
using MentorumApi.DTOs;
using MentorumApi.Models;
using MentorumApi.Services;

namespace MentorumApi.Data
{
    public class InviteQueryModel
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public Guid? RelatedId { get; set; }
        public DateTime ExpiresAt { get; set; }
        public int IsUsed { get; set; }
    }

    public class InviteRepository
    {
        private readonly DbConnectionFactory _db;

        public InviteRepository(DbConnectionFactory db)
        {
            _db = db;
        }

        public async Task<bool> CanCoachInviteParentAsync(Guid coachId, Guid studentId)
        {
            using var conn = _db.CreateConnection();
            var studentOwned = await conn.QuerySingleOrDefaultAsync<int?>(
                @"SELECT 1 FROM students s JOIN program_coaches pc ON pc.program_id = s.program_id AND pc.coach_id = @CoachId WHERE s.id = @RelatedId",
                new { RelatedId = studentId, CoachId = coachId });
            return studentOwned != null;
        }

        public async Task<bool> IsCoachProgramAdminAsync(Guid coachId, Guid programId)
        {
            using var conn = _db.CreateConnection();
            var isAdmin = await conn.QuerySingleOrDefaultAsync<int?>(
                "SELECT 1 FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId AND role = 'YONETICI'",
                new { ProgramId = programId, CoachId = coachId });
            return isAdmin != null;
        }

        public async Task<bool> IsTeacherLimitExceededAsync(Guid programId)
        {
            using var conn = _db.CreateConnection();
            var maxTeachers = await conn.QuerySingleOrDefaultAsync<int?>(
                @"SELECT COALESCE(c.max_teachers, (SELECT value::int FROM system_settings WHERE key = 'default_max_teachers'))
                  FROM coaches c
                  WHERE c.id = (SELECT coach_id FROM program_coaches WHERE program_id = @ProgramId AND role = 'YONETICI' LIMIT 1)",
                new { ProgramId = programId });
            if (!maxTeachers.HasValue) return false;

            var teacherCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM teachers WHERE program_id = @ProgramId AND is_active = 1",
                new { ProgramId = programId });
            return teacherCount >= maxTeachers.Value;
        }

        public async Task<User?> GetUserByEmailAsync(string email)
        {
            using var conn = _db.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<User>(
                "SELECT id AS Id, email AS Email, role AS Role, full_name AS FullName FROM users WHERE email = @Email",
                new { Email = email });
        }

        public async Task<Guid?> GetStudentProgramIdAsync(Guid studentId)
        {
            using var conn = _db.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT program_id FROM students WHERE id = @StudentId",
                new { StudentId = studentId });
        }

        public async Task AddExistingStudentToProgramAsync(Guid studentId, Guid programId)
        {
            using var conn = _db.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO students (id, program_id, is_active)
                VALUES (@Id, @ProgramId, 1)",
                new { Id = studentId, ProgramId = programId });
        }

        public async Task CreateInviteTokenAsync(Guid token, string code, string email, string role, Guid? relatedId, DateTime expiresAt)
        {
            using var conn = _db.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO invite_tokens (id, token, code, email, role, related_id, expires_at)
                VALUES (@Id, @Token, @Code, @Email, @Role, @RelatedId, @ExpiresAt)",
                new
                {
                    Id = Guid.NewGuid(),
                    Token = token,
                    Code = code,
                    Email = email,
                    Role = role,
                    RelatedId = relatedId,
                    ExpiresAt = expiresAt
                });
        }

        public async Task<IEnumerable<dynamic>> GetPendingInvitesForCoachAsync(Guid coachId)
        {
            using var conn = _db.CreateConnection();
            return await conn.QueryAsync(@"
                SELECT it.id, it.email, it.code, it.role, it.created_at AS CreatedAt, it.expires_at AS ExpiresAt,
                       COALESCE(cp.name, cp_parent.name, 'Genel') AS ProgramName,
                       COALESCE(it.related_id, s.program_id) AS ProgramId
                FROM invite_tokens it
                LEFT JOIN coaching_programs cp ON cp.id = it.related_id AND it.role != 'Parent'
                LEFT JOIN students s ON s.id = it.related_id AND it.role = 'Parent'
                LEFT JOIN coaching_programs cp_parent ON cp_parent.id = s.program_id
                WHERE (
                    (it.role != 'Parent' AND it.related_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId))
                    OR
                    (it.role = 'Parent' AND s.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId))
                )
                  AND it.is_used = 0
                  AND it.expires_at > NOW()
                ORDER BY it.created_at DESC",
                new { CoachId = coachId });
        }

        public async Task<InviteQueryModel?> GetInviteByCodeAsync(string token)
        {
            using var conn = _db.CreateConnection();
            var code = InviteCode.Normalize(token);
            return await conn.QuerySingleOrDefaultAsync<InviteQueryModel>(
                "SELECT id AS Id, email AS Email, role AS Role, related_id AS RelatedId, expires_at AS ExpiresAt, is_used AS IsUsed FROM invite_tokens WHERE code = @Code",
                new { Code = code });
        }

        public async Task<(User? User, bool AlreadyUsed)> AcceptInviteAsync(InviteQueryModel invite, InviteAcceptRequest req, string refreshToken)
        {
            using var conn = _db.CreateConnection();
            conn.Open();

            var existingUserId = await conn.ExecuteScalarAsync<Guid?>(
                "SELECT id FROM users WHERE email = @Email",
                new { Email = invite.Email });

            Guid userId;
            User user;
            var isPasswordReset = existingUserId.HasValue;

            if (isPasswordReset)
            {
                userId = existingUserId.Value;
                user = await conn.QuerySingleOrDefaultAsync<User>(
                    "SELECT id AS Id, email AS Email, password_hash AS PasswordHash, google_id AS GoogleId, role AS Role, full_name AS FullName, avatar_url AS AvatarUrl, is_active AS IsActive, is_admin AS IsAdmin, approval_status AS ApprovalStatus, created_at AS CreatedAt, updated_at AS UpdatedAt FROM users WHERE id = @Id",
                    new { Id = userId })
                    ?? throw new InvalidOperationException("Kullanıcı bulunamadı.");
            }
            else
            {
                userId = Guid.NewGuid();
                user = new User
                {
                    Id = userId,
                    Email = invite.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                    Role = invite.Role,
                    FullName = req.FullName,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
            }

            using var tx = conn.BeginTransaction();
            try
            {
                if (isPasswordReset)
                {
                    var newHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
                    await conn.ExecuteAsync(
                        "UPDATE users SET password_hash = @Hash, updated_at = NOW() WHERE id = @Id",
                        new { Hash = newHash, Id = userId }, tx);

                    if (invite.Role == "Parent" && invite.RelatedId != null)
                    {
                        await conn.ExecuteAsync(
                            "INSERT INTO parents (id) VALUES (@Id) ON CONFLICT (id) DO NOTHING",
                            new { Id = userId }, tx);
                        await conn.ExecuteAsync(@"
                            INSERT INTO student_parents (id, student_id, parent_id, parent_email, is_accepted, can_view_exams, can_view_homework, can_view_calendar, can_view_study_stats, can_view_payments)
                            VALUES (@Id, @StudentId, @ParentId, @ParentEmail, 1, 1, 1, 1, 1, 0)
                            ON CONFLICT DO NOTHING",
                            new { Id = Guid.NewGuid(), StudentId = invite.RelatedId, ParentId = userId, ParentEmail = user.Email }, tx);
                    }
                }
                else
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO users (id, email, password_hash, role, full_name, created_at, updated_at) 
                        VALUES (@Id, @Email, @PasswordHash, @Role, @FullName, @CreatedAt, @UpdatedAt)",
                        user, tx);

                    if (user.Role == "Student")
                    {
                        await conn.ExecuteAsync(@"
                            INSERT INTO students (id, program_id, is_active) 
                            VALUES (@Id, @ProgramId, 1)",
                            new { Id = userId, ProgramId = invite.RelatedId }, tx);
                    }
                    else if (user.Role == "Parent")
                    {
                        await conn.ExecuteAsync(
                            "INSERT INTO parents (id) VALUES (@Id) ON CONFLICT (id) DO NOTHING",
                            new { Id = userId }, tx);

                        if (invite.RelatedId != null)
                        {
                            await conn.ExecuteAsync(@"
                                INSERT INTO student_parents (id, student_id, parent_id, parent_email, is_accepted, can_view_exams, can_view_homework, can_view_calendar, can_view_study_stats, can_view_payments)
                                VALUES (@Id, @StudentId, @ParentId, @ParentEmail, 1, 1, 1, 1, 1, 0)
                                ON CONFLICT DO NOTHING",
                                new { Id = Guid.NewGuid(), StudentId = invite.RelatedId, ParentId = userId, ParentEmail = user.Email }, tx);
                        }
                    }
                    else if (user.Role == "Teacher")
                    {
                        await conn.ExecuteAsync(
                            "INSERT INTO teachers (id, program_id, is_active) VALUES (@Id, @ProgramId, 1)",
                            new { Id = userId, ProgramId = invite.RelatedId }, tx);
                        await conn.ExecuteAsync(@"
                            INSERT INTO program_teachers (id, program_id, teacher_id)
                            VALUES (@Id, @ProgramId, @TeacherId)",
                            new { Id = Guid.NewGuid(), ProgramId = invite.RelatedId, TeacherId = userId }, tx);
                    }
                    else if (user.Role == "Coach")
                    {
                        await conn.ExecuteAsync(@"
                            INSERT INTO coaches (id, plan_type, approval_status, max_programs)
                            VALUES (@Id, 'free', 'APPROVED', 0)",
                            new { Id = userId }, tx);
                        await conn.ExecuteAsync(@"
                            INSERT INTO program_coaches (id, program_id, coach_id, role)
                            VALUES (@Id, @ProgramId, @CoachId, 'YARDIMCI')",
                            new { Id = Guid.NewGuid(), ProgramId = invite.RelatedId, CoachId = userId }, tx);
                    }
                }

                var inviteClaimed = await conn.ExecuteAsync(
                    "UPDATE invite_tokens SET is_used = 1 WHERE id = @Id AND is_used = 0",
                    new { Id = invite.Id }, tx);
                if (inviteClaimed == 0)
                {
                    tx.Rollback();
                    return (null, true);
                }

                tx.Commit();
            }
            catch
            {
                tx.Rollback();
                throw;
            }

            await conn.ExecuteAsync(@"
                INSERT INTO refresh_tokens (id, user_id, token, expires_at)
                VALUES (@Id, @UserId, @Token, @ExpiresAt)",
                new { Id = Guid.NewGuid(), UserId = user.Id, Token = refreshToken, ExpiresAt = DateTime.UtcNow.AddDays(7) });

            return (user, false);
        }
    }
}

