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
                    CustomWorkspaceLimit INTEGER,
                    IsActive        BOOLEAN NOT NULL DEFAULT TRUE,
                    DeletedAt       TIMESTAMPTZ,
                    CreatedAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // SubscriptionPlan ve Kota sütunları eklenmemişse ekle
            connection.Execute(@"
                ALTER TABLE Users ADD COLUMN IF NOT EXISTS SubscriptionPlan TEXT NOT NULL DEFAULT 'free';
                ALTER TABLE Users ADD COLUMN IF NOT EXISTS CustomAiLimit INTEGER;
                ALTER TABLE Users ADD COLUMN IF NOT EXISTS CustomStorageLimit INTEGER;
                ALTER TABLE Users ADD COLUMN IF NOT EXISTS CustomWorkspaceLimit INTEGER;
                ALTER TABLE Users ADD COLUMN IF NOT EXISTS IsActive BOOLEAN NOT NULL DEFAULT TRUE;
                ALTER TABLE Users ADD COLUMN IF NOT EXISTS DeletedAt TIMESTAMPTZ;
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
                    Type        TEXT    NOT NULL DEFAULT 'Group',
                    Settings    TEXT,
                    RequiresApproval BOOLEAN NOT NULL DEFAULT TRUE,
                    IsActive    BOOLEAN NOT NULL DEFAULT TRUE,
                    DeletedAt   TIMESTAMPTZ,
                    CreatedAt   TIMESTAMPTZ NOT NULL,
                    UpdatedAt   TIMESTAMPTZ NOT NULL
                );
            ");

            // Migration Update: Add missing columns if table already exists
            connection.Execute(@"
                ALTER TABLE Workspaces ADD COLUMN IF NOT EXISTS Type TEXT NOT NULL DEFAULT 'Group';
                ALTER TABLE Workspaces ADD COLUMN IF NOT EXISTS Settings TEXT;
                ALTER TABLE Workspaces ADD COLUMN IF NOT EXISTS RequiresApproval BOOLEAN NOT NULL DEFAULT TRUE;
                ALTER TABLE Workspaces ADD COLUMN IF NOT EXISTS DeletedAt TIMESTAMPTZ;
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
                ALTER TABLE WorkspaceMembers ADD COLUMN IF NOT EXISTS ApprovalStatus TEXT NOT NULL DEFAULT 'Approved';
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

            // ── ChainTemplates ───────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ChainTemplates (
                    Id                SERIAL  PRIMARY KEY,
                    TenantId          TEXT    NOT NULL,
                    UserId            TEXT    NOT NULL,
                    CategoryId        INTEGER,
                    Title             TEXT    NOT NULL,
                    Description       TEXT,
                    TaskType          TEXT    NOT NULL DEFAULT 'Soru Çözme',
                    TargetCount       INTEGER,
                    RecurrenceType    TEXT    NOT NULL,
                    DaysOfWeek        TEXT,
                    CustomDates       TEXT,
                    StartDate         TIMESTAMPTZ,
                    EndDate           TIMESTAMPTZ,
                    IsActive          BOOLEAN NOT NULL DEFAULT TRUE,
                    LastGeneratedDate DATE,
                    IsDeleted         BOOLEAN NOT NULL DEFAULT FALSE,
                    CreatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UpdatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            connection.Execute(@"
                ALTER TABLE ChainTemplates ADD COLUMN IF NOT EXISTS UserId TEXT NOT NULL DEFAULT '';
                ALTER TABLE ChainTemplates ADD COLUMN IF NOT EXISTS Description TEXT;
                ALTER TABLE ChainTemplates ADD COLUMN IF NOT EXISTS TaskType TEXT NOT NULL DEFAULT 'Soru Çözme';
                ALTER TABLE ChainTemplates ADD COLUMN IF NOT EXISTS TargetCount INTEGER;
                ALTER TABLE ChainTemplates ADD COLUMN IF NOT EXISTS DaysOfWeek TEXT;
                ALTER TABLE ChainTemplates ADD COLUMN IF NOT EXISTS CustomDates TEXT;
                ALTER TABLE ChainTemplates ADD COLUMN IF NOT EXISTS StartDate TIMESTAMPTZ;
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

            // Eksik olabilecek yeni kolonları ekle ve eskileri düşür (Migration Update)
            connection.Execute(@"
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS WorkspaceId INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS ChainTemplateId INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS OriginalDeadline TIMESTAMPTZ;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS IsHomework BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS AssignedBy TEXT;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS AssignedByWorkspaceId INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS AssignedByUserId TEXT;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS UserTaskSnapshot TEXT;
            ");

            try 
            {
                // Unique constraint for Race Condition prevention in Lazy Generator
                connection.Execute(@"
                    CREATE UNIQUE INDEX IF NOT EXISTS UX_TaskItems_ChainTemplateId_Deadline 
                    ON TaskItems(ChainTemplateId, Deadline) 
                    WHERE ChainTemplateId IS NOT NULL;
                ");

                // Drop legacy columns (Migration)
                connection.Execute(@"ALTER TABLE TaskItems DROP COLUMN IF EXISTS ChainId;");
                connection.Execute(@"ALTER TABLE TaskItems DROP COLUMN IF EXISTS ChainOrder;");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Column drop or index creation failed (safe to ignore if already done): " + ex.Message);
            }

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

            // ── WorkspaceFiles ─────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS WorkspaceFiles (
                    Id              SERIAL  PRIMARY KEY,
                    TenantId        TEXT    NOT NULL,
                    WorkspaceId     INTEGER NOT NULL,
                    UploaderId      TEXT    NOT NULL,
                    FileName        TEXT    NOT NULL,
                    FileUrl         TEXT    NOT NULL,
                    FileSizeInBytes BIGINT  NOT NULL,
                    FileType        TEXT    NOT NULL,
                    Description     TEXT,
                    UploadStatus    TEXT    NOT NULL DEFAULT 'Pending',
                    IsDeleted       BOOLEAN NOT NULL DEFAULT FALSE,
                    DeletedAt       TIMESTAMPTZ,
                    CreatedAt       TIMESTAMPTZ NOT NULL,
                    UpdatedAt       TIMESTAMPTZ NOT NULL
                );
            ");

            // ── TaskFileAttachments ────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS TaskFileAttachments (
                    Id              SERIAL  PRIMARY KEY,
                    TenantId        TEXT    NOT NULL,
                    TaskId          INTEGER NOT NULL,
                    FileId          INTEGER NOT NULL,
                    AttachedAt      TIMESTAMPTZ NOT NULL,
                    AttachedBy      TEXT    NOT NULL,
                    UNIQUE(TaskId, FileId)
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

            // ── SystemErrors ───────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS SystemErrors (
                    Id           SERIAL  PRIMARY KEY,
                    TenantId     TEXT,
                    UserId       TEXT,
                    Path         TEXT    NOT NULL,
                    HttpMethod   TEXT    NOT NULL,
                    ErrorMessage TEXT    NOT NULL,
                    StackTrace   TEXT    NOT NULL,
                    CreatedAt    TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // Seed default settings
            var defaultSettings = new[]
            {
                new { Key = "AiTaskCreation", Value = "5", Description = "Günlük ücretsiz AI ile görev oluşturma limiti" },
                new { Key = "TotalStorageLimit", Value = "524288000", Description = "Ücretsiz kümülatif dosya yükleme limiti (Byte) - Varsayılan: 500 MB" },
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

            // ── Coaching Module (Faz 1) ────────────────────────────────────
            
            // TaskItems Updates
            connection.Execute(@"
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS DurationMinutes INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS TargetTestCount INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS TargetPageCount INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS TargetBookCount DECIMAL;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS RequirePerformanceEntry BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS ActualDurationMinutes INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS ActualTestCount INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS ActualPageCount INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS PostponeCount INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS CoachSubject TEXT;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS CoachTopic TEXT;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS CoachDescription TEXT;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS AssignedToUserId TEXT;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS ResourceLinkId INTEGER;
                ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS IsRejectedByCoach BOOLEAN NOT NULL DEFAULT FALSE;
            ");

            // PerformanceRecords Updates
            connection.Execute(@"
                ALTER TABLE PerformanceRecords ADD COLUMN IF NOT EXISTS ExamRecordId INTEGER;
                ALTER TABLE PerformanceRecords ADD COLUMN IF NOT EXISTS StudyDurationMinutes INTEGER;
                ALTER TABLE PerformanceRecords ADD COLUMN IF NOT EXISTS TestCount INTEGER;
                ALTER TABLE PerformanceRecords ADD COLUMN IF NOT EXISTS PageCount INTEGER;
                ALTER TABLE PerformanceRecords ADD COLUMN IF NOT EXISTS Notes TEXT;
                ALTER TABLE PerformanceRecords ADD COLUMN IF NOT EXISTS TeacherFeedback TEXT;
            ");

            // StudentProfiles
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS StudentProfiles (
                    Id          SERIAL PRIMARY KEY,
                    TenantId    TEXT NOT NULL,
                    UserId      TEXT NOT NULL,
                    CoachUserId TEXT NOT NULL,
                    WorkspaceId INTEGER,
                    TargetExam  TEXT,
                    TargetYear  INTEGER,
                    TargetScore DECIMAL,
                    SchoolName  TEXT,
                    Grade       TEXT,
                    ParentName  TEXT,
                    ParentPhone TEXT,
                    CoachNotes  TEXT,
                    CreatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UpdatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // ExamRecords
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ExamRecords (
                    Id          SERIAL PRIMARY KEY,
                    TenantId    TEXT NOT NULL,
                    StudentId   TEXT NOT NULL,
                    CoachUserId TEXT,
                    WorkspaceId INTEGER,
                    ExamType    TEXT NOT NULL,
                    ExamName    TEXT,
                    ExamDate    DATE NOT NULL,
                    TotalNet    DECIMAL,
                    TotalCorrect INTEGER,
                    TotalWrong  INTEGER,
                    TotalEmpty  INTEGER,
                    Notes       TEXT,
                    CreatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // ExamSubjectResults
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ExamSubjectResults (
                    Id           SERIAL PRIMARY KEY,
                    TenantId     TEXT NOT NULL,
                    ExamRecordId INTEGER NOT NULL REFERENCES ExamRecords(Id) ON DELETE CASCADE,
                    CategoryId   INTEGER,
                    SubjectName  TEXT NOT NULL,
                    Correct      INTEGER NOT NULL DEFAULT 0,
                    Wrong        INTEGER NOT NULL DEFAULT 0,
                    Empty        INTEGER NOT NULL DEFAULT 0,
                    Net          DECIMAL NOT NULL DEFAULT 0,
                    QuestionCount INTEGER
                );
            ");

            // LessonRecords
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS LessonRecords (
                    Id          SERIAL PRIMARY KEY,
                    TenantId    TEXT NOT NULL,
                    CoachUserId TEXT NOT NULL,
                    StudentId   TEXT,
                    WorkspaceId INTEGER,
                    CategoryId  INTEGER,
                    SubjectName TEXT,
                    LessonDate  TIMESTAMPTZ NOT NULL,
                    DurationMinutes INTEGER NOT NULL DEFAULT 60,
                    Status      TEXT NOT NULL DEFAULT 'Planned',
                    CoachNote   TEXT,
                    CreatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UpdatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // PaymentRecords
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS PaymentRecords (
                    Id          SERIAL PRIMARY KEY,
                    TenantId    TEXT NOT NULL,
                    CoachUserId TEXT NOT NULL,
                    StudentId   TEXT NOT NULL,
                    WorkspaceId INTEGER,
                    Amount      DECIMAL NOT NULL,
                    Currency    TEXT NOT NULL DEFAULT 'TRY',
                    PaymentType TEXT NOT NULL,
                    Status      TEXT NOT NULL DEFAULT 'Planned',
                    DueDate     DATE NOT NULL,
                    PaidDate    DATE,
                    PaymentMethod TEXT,
                    Notes       TEXT,
                    CreatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // SharedLinks
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS SharedLinks (
                    Id          SERIAL PRIMARY KEY,
                    TenantId    TEXT NOT NULL,
                    CreatedByUserId TEXT NOT NULL,
                    StudentId   TEXT NOT NULL,
                    Token       TEXT NOT NULL UNIQUE,
                    PinHash     TEXT NOT NULL,
                    LinkType    TEXT NOT NULL,
                    Scope       TEXT,
                    ScopeCategoryId INTEGER,
                    IsActive    BOOLEAN NOT NULL DEFAULT TRUE,
                    FailedAttempts INTEGER NOT NULL DEFAULT 0,
                    LockedUntil TIMESTAMPTZ,
                    LastAccessedAt TIMESTAMPTZ,
                    LastAccessIP TEXT,
                    CreatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // SharedLinkAccessLogs
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS SharedLinkAccessLogs (
                    Id          SERIAL PRIMARY KEY,
                    SharedLinkId INTEGER NOT NULL REFERENCES SharedLinks(Id) ON DELETE CASCADE,
                    AccessedAt  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    IPAddress   TEXT,
                    Success     BOOLEAN NOT NULL,
                    UserAgent   TEXT
                );
            ");

            // StudentResources
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS StudentResources (
                    Id          SERIAL PRIMARY KEY,
                    TenantId    TEXT NOT NULL,
                    StudentId   TEXT NOT NULL,
                    CoachUserId TEXT NOT NULL,
                    Name        TEXT NOT NULL,
                    Url         TEXT NOT NULL,
                    CreatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // WeeklySchedules
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS WeeklySchedules (
                    Id              SERIAL PRIMARY KEY,
                    TenantId        TEXT NOT NULL,
                    StudentId       TEXT NOT NULL,
                    WorkspaceId     INTEGER,
                    Version         INTEGER NOT NULL DEFAULT 1,
                    IsLatest        BOOLEAN NOT NULL DEFAULT TRUE,
                    UpdatedByUserId TEXT NOT NULL,
                    CreatedAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // WeeklyScheduleBlocks
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS WeeklyScheduleBlocks (
                    Id               SERIAL PRIMARY KEY,
                    TenantId         TEXT NOT NULL,
                    WeeklyScheduleId INTEGER NOT NULL REFERENCES WeeklySchedules(Id) ON DELETE CASCADE,
                    DayOfWeek        INTEGER NOT NULL,
                    StartTime        TIME NOT NULL,
                    EndTime          TIME NOT NULL,
                    Label            TEXT NOT NULL,
                    BlockType        TEXT NOT NULL DEFAULT 'Study',
                    IsLockedByCoach  BOOLEAN NOT NULL DEFAULT FALSE
                );
            ");

            // ── Data Cleanup ───────────────────────────────────────────────
            // Delete legacy tasks that were accidentally assigned to workspace owners
            try 
            {
                connection.Execute(@"
                    DELETE FROM TaskItems 
                    WHERE AssignedByWorkspaceId IS NOT NULL 
                      AND UserId IN (
                          SELECT OwnerId FROM Workspaces WHERE Workspaces.Id = TaskItems.AssignedByWorkspaceId
                      )
                ");

                // Fix incorrect TenantIds created before the bypass fix
                connection.Execute(@"
                    UPDATE TaskItems 
                    SET TenantId = UserId 
                    WHERE AssignedByWorkspaceId IS NOT NULL 
                      AND TenantId != UserId
                ");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Cleanup migration failed (safe to ignore if columns don't exist yet): " + ex.Message);
            }
        }
    }
}
