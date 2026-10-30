using Dapper;
using MentorumApi.DTOs;
using MentorumApi.Models;

namespace MentorumApi.Data
{
    public class RefreshTokenQueryModel
    {
        public Guid UserId { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    public class AuthRepository
    {
        private readonly DbConnectionFactory _db;

        public AuthRepository(DbConnectionFactory db)
        {
            _db = db;
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            using var conn = _db.CreateConnection();
            var exists = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM users WHERE email = @Email",
                new { Email = email });
            return exists > 0;
        }

        public async Task RegisterCoachAsync(User user, bool isAdmin)
        {
            using var conn = _db.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, created_at, updated_at) 
                    VALUES (@Id, @Email, @PasswordHash, @Role, @FullName, @IsAdmin, @ApprovalStatus, @CreatedAt, @UpdatedAt)",
                    user, tx);

                if (user.Role == "Coach")
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO coaches (id, plan_type, approval_status) 
                        VALUES (@Id, 'free', @Approval)",
                        new { Id = user.Id, Approval = isAdmin ? "APPROVED" : "PENDING" }, tx);
                }

                tx.Commit();
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task InsertRefreshTokenAsync(Guid userId, string tokenHash, DateTime expiresAt)
        {
            using var conn = _db.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO refresh_tokens (id, user_id, token, expires_at)
                VALUES (@Id, @UserId, @Token, @ExpiresAt)",
                new { Id = Guid.NewGuid(), UserId = userId, Token = tokenHash, ExpiresAt = expiresAt });
        }

        public async Task<User?> GetActiveUserByEmailAsync(string email)
        {
            using var conn = _db.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<User>(
                "SELECT id AS Id, email AS Email, password_hash AS PasswordHash, google_id AS GoogleId, role AS Role, full_name AS FullName, avatar_url AS AvatarUrl, is_active AS IsActive, is_admin AS IsAdmin, approval_status AS ApprovalStatus, created_at AS CreatedAt, updated_at AS UpdatedAt FROM users WHERE email = @Email AND is_active = 1",
                new { Email = email });
        }

        public async Task PromoteSuperAdminAsync(Guid userId)
        {
            using var conn = _db.CreateConnection();
            await conn.ExecuteAsync(
                "UPDATE users SET is_admin = TRUE, approval_status = 'APPROVED' WHERE id = @Id",
                new { Id = userId });
        }

        public async Task<RefreshTokenQueryModel?> GetValidRefreshTokenAsync(string tokenHash, string rawToken)
        {
            using var conn = _db.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<RefreshTokenQueryModel>(
                "SELECT user_id AS UserId, expires_at AS ExpiresAt FROM refresh_tokens WHERE (token = @TokenHash OR token = @RawToken) AND is_revoked = 0",
                new { TokenHash = tokenHash, RawToken = rawToken });
        }

        public async Task<User?> GetActiveUserByIdAsync(Guid id)
        {
            using var conn = _db.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<User>(
                "SELECT id AS Id, email AS Email, google_id AS GoogleId, role AS Role, full_name AS FullName, avatar_url AS AvatarUrl, is_active AS IsActive, is_admin AS IsAdmin, approval_status AS ApprovalStatus FROM users WHERE id = @Id AND is_active = 1",
                new { Id = id });
        }

        public async Task<bool> RotateRefreshTokenAsync(Guid userId, string oldTokenHash, string oldRawToken, string newTokenHash, DateTime expiresAt)
        {
            using var conn = _db.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var affected = await conn.ExecuteAsync(
                    "UPDATE refresh_tokens SET is_revoked = 1 WHERE (token = @TokenHash OR token = @RawToken) AND is_revoked = 0",
                    new { TokenHash = oldTokenHash, RawToken = oldRawToken }, tx);
                if (affected == 0)
                {
                    tx.Rollback();
                    return false;
                }

                await conn.ExecuteAsync(@"
                    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
                    VALUES (@Id, @UserId, @Token, @ExpiresAt)",
                    new { Id = Guid.NewGuid(), UserId = userId, Token = newTokenHash, ExpiresAt = expiresAt }, tx);

                tx.Commit();
                return true;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task RevokeRefreshTokenAsync(string tokenHash, string rawToken)
        {
            using var conn = _db.CreateConnection();
            await conn.ExecuteAsync(
                "UPDATE refresh_tokens SET is_revoked = 1 WHERE (token = @TokenHash OR token = @RawToken)",
                new { TokenHash = tokenHash, RawToken = rawToken });
        }

        public async Task<(User? User, bool ConflictInviteAlreadyUsed, bool Inactive)> GetOrCreateGoogleUserAsync(
            string email, string subject, string? name, string? picture, bool isAdmin)
        {
            using var conn = _db.CreateConnection();
            var user = await conn.QuerySingleOrDefaultAsync<User>(
                "SELECT id AS Id, email AS Email, google_id AS GoogleId, role AS Role, full_name AS FullName, avatar_url AS AvatarUrl, is_active AS IsActive, is_admin AS IsAdmin, approval_status AS ApprovalStatus, created_at AS CreatedAt, updated_at AS UpdatedAt FROM users WHERE email = @Email",
                new { Email = email });

            if (user == null)
            {
                var validInvite = await conn.QuerySingleOrDefaultAsync<InviteQueryModel>(
                    "SELECT id AS Id, role AS Role, related_id AS RelatedId FROM invite_tokens WHERE email = @Email AND is_used = 0 AND expires_at > NOW() LIMIT 1",
                    new { Email = email });

                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    GoogleId = subject,
                    Role = validInvite?.Role ?? "Coach",
                    FullName = name ?? "Google User",
                    AvatarUrl = picture,
                    IsAdmin = isAdmin,
                    ApprovalStatus = (isAdmin || validInvite != null) ? "APPROVED" : "PENDING",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                if (conn.State != System.Data.ConnectionState.Open) conn.Open();
                using var tx = conn.BeginTransaction();
                try
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO users (id, email, google_id, role, full_name, avatar_url, is_admin, approval_status, created_at, updated_at) 
                        VALUES (@Id, @Email, @GoogleId, @Role, @FullName, @AvatarUrl, @IsAdmin, @ApprovalStatus, @CreatedAt, @UpdatedAt)",
                        user, tx);

                    if (validInvite != null)
                    {
                        if (user.Role == "Student")
                        {
                            await conn.ExecuteAsync(@"
                                INSERT INTO students (id, program_id, is_active)
                                VALUES (@Id, @ProgramId, 1)",
                                new { Id = user.Id, ProgramId = validInvite.RelatedId }, tx);
                        }
                        else if (user.Role == "Parent")
                        {
                            await conn.ExecuteAsync("INSERT INTO parents (id) VALUES (@Id)", new { Id = user.Id }, tx);
                            if (validInvite.RelatedId != null)
                            {
                                await conn.ExecuteAsync(@"
                                    INSERT INTO student_parents (id, student_id, parent_id, parent_email, is_accepted)
                                    VALUES (gen_random_uuid(), @StudentId, @ParentId, @ParentEmail, 1)",
                                    new { StudentId = validInvite.RelatedId, ParentId = user.Id, ParentEmail = user.Email }, tx);
                            }
                        }
                        else if (user.Role == "Teacher")
                        {
                            await conn.ExecuteAsync(@"
                                INSERT INTO teachers (id, program_id, is_active)
                                VALUES (@Id, @ProgramId, 1)",
                                new { Id = user.Id, ProgramId = validInvite.RelatedId }, tx);

                            await conn.ExecuteAsync(@"
                                INSERT INTO program_teachers (id, program_id, teacher_id)
                                VALUES (gen_random_uuid(), @ProgramId, @Id)",
                                new { ProgramId = validInvite.RelatedId, Id = user.Id }, tx);
                        }
                        else if (user.Role == "Coach")
                        {
                            await conn.ExecuteAsync(@"
                                INSERT INTO coaches (id, plan_type, approval_status, max_programs)
                                VALUES (@Id, 'free', 'APPROVED', 0)",
                                new { Id = user.Id }, tx);

                            await conn.ExecuteAsync(@"
                                INSERT INTO program_coaches (id, program_id, coach_id, role)
                                VALUES (gen_random_uuid(), @ProgramId, @CoachId, 'YARDIMCI')",
                                new { ProgramId = validInvite.RelatedId, CoachId = user.Id }, tx);
                        }

                        var inviteClaimed = await conn.ExecuteAsync(
                            "UPDATE invite_tokens SET is_used = 1 WHERE id = @Id AND is_used = 0",
                            new { Id = validInvite.Id }, tx);
                        if (inviteClaimed == 0)
                        {
                            tx.Rollback();
                            return (null, true, false);
                        }
                    }
                    else
                    {
                        await conn.ExecuteAsync(@"
                            INSERT INTO coaches (id, plan_type, approval_status)
                            VALUES (@Id, 'free', @Approval)",
                            new { Id = user.Id, Approval = isAdmin ? "APPROVED" : "PENDING" }, tx);
                    }

                    tx.Commit();
                }
                catch
                {
                    tx.Rollback();
                    throw;
                }
            }
            else if (user.IsActive == 0)
            {
                return (null, false, true);
            }
            else if (string.IsNullOrEmpty(user.GoogleId))
            {
                user.GoogleId = subject;
                if (conn.State != System.Data.ConnectionState.Open) conn.Open();
                await conn.ExecuteAsync(
                    "UPDATE users SET google_id = @GoogleId, updated_at = @UpdatedAt WHERE id = @Id",
                    new { GoogleId = user.GoogleId, UpdatedAt = DateTime.UtcNow, Id = user.Id });
            }

            return (user, false, false);
        }

        public async Task<bool> CreatePasswordResetTokenAsync(string email, string token)
        {
            using var conn = _db.CreateConnection();
            var userId = await conn.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT id FROM users WHERE email = @Email AND is_active = 1",
                new { Email = email });
            if (userId == null) return false;

            await conn.ExecuteAsync(@"
                INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
                VALUES (gen_random_uuid(), @UserId, @Token, NOW() + interval '1 hour')",
                new { UserId = userId.Value, Token = token });
            return true;
        }

        public async Task<bool> ResetPasswordWithTokenAsync(string token, string passwordHash)
        {
            using var conn = _db.CreateConnection();
            var userId = await conn.QuerySingleOrDefaultAsync<Guid?>(@"
                SELECT user_id FROM password_reset_tokens
                WHERE token = @Token AND is_used = FALSE AND expires_at > NOW()",
                new { Token = token });

            if (userId == null) return false;

            await conn.ExecuteAsync("UPDATE users SET password_hash = @Hash WHERE id = @Id", new { Hash = passwordHash, Id = userId.Value });
            await conn.ExecuteAsync("UPDATE password_reset_tokens SET is_used = TRUE WHERE token = @Token", new { Token = token });
            return true;
        }

        public async Task<UserDto?> GetMeAsync(Guid id)
        {
            using var conn = _db.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<UserDto>(@"
                SELECT u.id AS Id, u.email AS Email, u.role AS Role, u.full_name AS FullName, u.avatar_url AS AvatarUrl, u.is_admin AS IsAdmin,
                       c.bio AS Bio, c.specialty AS Specialty, u.theme_mode AS ThemeMode, u.theme_style AS ThemeStyle
                FROM users u
                LEFT JOIN coaches c ON c.id = u.id
                WHERE u.id = @Id AND u.is_active = 1",
                new { Id = id });
        }

        public async Task<bool> UpdateCoachProfileAsync(Guid id, string? bio, string? specialty)
        {
            using var conn = _db.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE coaches SET bio = @Bio, specialty = @Specialty WHERE id = @Id",
                new { Id = id, Bio = bio, Specialty = specialty });
            return rows > 0;
        }

        public async Task SetPasswordAsync(Guid id, string passwordHash)
        {
            using var conn = _db.CreateConnection();
            await conn.ExecuteAsync(
                "UPDATE users SET password_hash = @Hash WHERE id = @Id",
                new { Hash = passwordHash, Id = id });
        }

        public async Task UpdateThemeAsync(Guid id, string mode, string style)
        {
            using var conn = _db.CreateConnection();
            await conn.ExecuteAsync(
                "UPDATE users SET theme_mode = @Mode, theme_style = @Style WHERE id = @Id",
                new { Id = id, Mode = mode, Style = style });
        }
    }
}

