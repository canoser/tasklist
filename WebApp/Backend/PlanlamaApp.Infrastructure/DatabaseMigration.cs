using System;
using Dapper;
using Npgsql;

namespace PlanlamaApp.Infrastructure
{
    public static class DatabaseMigration
    {
        public static void Run(string connectionString)
        {
            using var connection = new NpgsqlConnection(connectionString);
            connection.Open();
            Run(connection);
        }

        public static void Run(System.Data.IDbConnection connection)
        {
            // ── Users ──────────────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS Users (
                    Id              TEXT    PRIMARY KEY,
                    Email           TEXT    NOT NULL UNIQUE,
                    Name            TEXT    NOT NULL,
                    PasswordHash    TEXT,
                    GoogleId        TEXT,
                    SubscriptionPlan TEXT   NOT NULL DEFAULT 'free',
                    CustomAiLimit   INTEGER,
                    CustomStorageLimit INTEGER,
                    CreatedAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // SubscriptionPlan ve Kota sütunları eklenmemişse ekle
            connection.Execute(@"
                ALTER TABLE Users ADD COLUMN IF NOT EXISTS SubscriptionPlan TEXT NOT NULL DEFAULT 'free';
                ALTER TABLE Users ADD COLUMN IF NOT EXISTS CustomAiLimit INTEGER;
                ALTER TABLE Users ADD COLUMN IF NOT EXISTS CustomStorageLimit INTEGER;
            ");

            // ── UsageTracking ──────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS UsageTracking (
                    Id                    TEXT    PRIMARY KEY,
                    TenantId              TEXT    NOT NULL,
                    ResourceType          TEXT    NOT NULL,
                    UsedAmount            INTEGER NOT NULL DEFAULT 0,
                    MaxLimit              INTEGER NOT NULL DEFAULT 0,
                    ResetDate             TIMESTAMPTZ NOT NULL,
                    EarnedLimit           INTEGER NOT NULL DEFAULT 0,
                    EarnedLimitExpiration TIMESTAMPTZ,
                    UNIQUE(TenantId, ResourceType)
                );
            ");

            connection.Execute(@"ALTER TABLE UsageTracking ADD COLUMN IF NOT EXISTS EarnedLimit INTEGER NOT NULL DEFAULT 0;");
            connection.Execute(@"ALTER TABLE UsageTracking ADD COLUMN IF NOT EXISTS EarnedLimitExpiration TIMESTAMPTZ;");

            // ── UserRoles ──────────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS UserRoles (
                    Id        SERIAL  PRIMARY KEY,
                    TenantId  TEXT    NOT NULL,
                    UserId    TEXT    NOT NULL,
                    RoleName  TEXT    NOT NULL,
                    IsActive  BOOLEAN NOT NULL DEFAULT TRUE,
                    DeletedAt TIMESTAMPTZ,
                    CreatedAt TIMESTAMPTZ NOT NULL,
                    UpdatedAt TIMESTAMPTZ NOT NULL
                );
            ");

            // ── TaskAssignments ────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS TaskAssignments (
                    Id              SERIAL  PRIMARY KEY,
                    TenantId        TEXT    NOT NULL,
                    TaskItemId      INTEGER NOT NULL,
                    AssignedUserId  TEXT    NOT NULL,
                    CreatedByUserId TEXT    NOT NULL,
                    RoleId          INTEGER,
                    WorkspaceId     INTEGER,
                    Status          TEXT    NOT NULL DEFAULT 'Bekliyor',
                    AssignedAt      TIMESTAMPTZ NOT NULL,
                    UNIQUE(TaskItemId, AssignedUserId)
                );
            ");

            // ── Workspaces ─────────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS Workspaces (
                    Id          SERIAL  PRIMARY KEY,
                    TenantId    TEXT    NOT NULL,
                    OwnerId     TEXT    NOT NULL,
                    Name        TEXT    NOT NULL,
                    Description TEXT,
                    InviteCode  TEXT    NOT NULL UNIQUE,
                    IsActive    BOOLEAN NOT NULL DEFAULT TRUE,
                    CreatedAt   TIMESTAMPTZ NOT NULL,
                    UpdatedAt   TIMESTAMPTZ NOT NULL
                );
            ");

            // ── WorkspaceMembers ───────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS WorkspaceMembers (
                    Id          SERIAL  PRIMARY KEY,
                    TenantId    TEXT    NOT NULL,
                    WorkspaceId INTEGER NOT NULL,
                    UserId      TEXT    NOT NULL,
                    DisplayName TEXT    NOT NULL,
                    JoinedAt    TIMESTAMPTZ NOT NULL,
                    UNIQUE(WorkspaceId, UserId)
                );
            ");

            connection.Execute(@"
                ALTER TABLE WorkspaceMembers ADD COLUMN IF NOT EXISTS Role TEXT NOT NULL DEFAULT 'Member';
                ALTER TABLE WorkspaceMembers ADD COLUMN IF NOT EXISTS ObserverLinkedUserId TEXT;
                ALTER TABLE WorkspaceMembers ADD COLUMN IF NOT EXISTS IsActiveMember BOOLEAN NOT NULL DEFAULT TRUE;
            ");

            // ── IdempotencyKeys ────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS IdempotencyKeys (
                    Key         TEXT    NOT NULL,
                    TenantId    TEXT    NOT NULL,
                    RequestPath TEXT    NOT NULL,
                    CreatedAt   TIMESTAMPTZ NOT NULL,
                    PRIMARY KEY(Key, TenantId)
                );
            ");

            // ── TaskItems ──────────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS TaskItems (
                    Id                SERIAL  PRIMARY KEY,
                    TenantId          TEXT    NOT NULL,
                    UserId            TEXT    NOT NULL,
                    CategoryId        INTEGER,
                    Title             TEXT    NOT NULL,
                    Description       TEXT,
                    TaskType          TEXT    NOT NULL,
                    Deadline          TIMESTAMPTZ,
                    IsTeacherAssigned BOOLEAN NOT NULL DEFAULT FALSE,
                    IsCompleted       BOOLEAN NOT NULL DEFAULT FALSE,
                    CompletedAt       TIMESTAMPTZ,
                    TargetCount       INTEGER,
                    Metadata          TEXT,
                    CreatedAt         TIMESTAMPTZ NOT NULL,
                    UpdatedAt         TIMESTAMPTZ NOT NULL
                );
            ");

            // Eksik olabilecek yeni kolonları ekle (Migration Update)
            connection.Execute(@"
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS WorkspaceId INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS ChainId TEXT;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS ChainOrder INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS OriginalDeadline TIMESTAMPTZ;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS IsHomework BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS AssignedBy TEXT;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS AssignedByWorkspaceId INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS AssignedByUserId TEXT;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS UserTaskSnapshot TEXT;
            ");

            // ── Categories ─────────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS Categories (
                    Id             SERIAL  PRIMARY KEY,
                    TenantId       TEXT    NOT NULL,
                    Name           TEXT    NOT NULL,
                    ParentId       INTEGER,
                    IsFromTemplate BOOLEAN NOT NULL DEFAULT FALSE,
                    SortOrder      INTEGER NOT NULL DEFAULT 0,
                    CreatedAt      TIMESTAMPTZ NOT NULL,
                    UpdatedAt      TIMESTAMPTZ NOT NULL
                );
            ");

            // ── PerformanceRecords ─────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS PerformanceRecords (
                    Id         SERIAL  PRIMARY KEY,
                    TenantId   TEXT    NOT NULL,
                    UserId     TEXT    NOT NULL,
                    TaskItemId INTEGER,
                    CategoryId INTEGER,
                    CorrectCount INTEGER NOT NULL DEFAULT 0,
                    WrongCount   INTEGER NOT NULL DEFAULT 0,
                    EmptyCount   INTEGER NOT NULL DEFAULT 0,
                    NetScore     REAL    NOT NULL DEFAULT 0,
                    RecordDate   TIMESTAMPTZ NOT NULL,
                    CreatedAt    TIMESTAMPTZ NOT NULL
                );
            ");

            // ── SystemSettings ─────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS SystemSettings (
                    Key         TEXT    PRIMARY KEY,
                    Value       TEXT    NOT NULL,
                    Description TEXT,
                    UpdatedAt   TIMESTAMPTZ NOT NULL
                );
            ");

            // Seed default settings
            var defaultSettings = new[]
            {
                new { Key = "AiTaskCreation", Value = "5", Description = "Günlük ücretsiz AI ile görev oluşturma limiti" },
                new { Key = "FileStorage", Value = "50", Description = "Günlük ücretsiz dosya yükleme limiti (MB)" },
                new { Key = "RewardedAdWatches", Value = "3", Description = "Günlük maksimum ödüllü reklam izleme sınırı" }
            };

            foreach (var setting in defaultSettings)
            {
                connection.Execute(@"
                    INSERT INTO SystemSettings (Key, Value, Description, UpdatedAt)
                    VALUES (@Key, @Value, @Description, @UpdatedAt)
                    ON CONFLICT (Key) DO NOTHING
                ", new { setting.Key, setting.Value, setting.Description, UpdatedAt = DateTime.UtcNow });
            }
        }
    }
}
