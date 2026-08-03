# SQLite → PostgreSQL Geçiş Yönergeleri (Ajan İçin)

> **UYARI:** Bu dosya bir yapay zeka ajanı tarafından birebir uygulanmak üzere yazılmıştır.
> Her adımı sırayla uygula. Atlama, sıra değiştirme veya "bence daha iyisi" ile değiştirme **YASAK.**
> Adım sonlarındaki doğrulama komutlarını çalıştır ve hata varsa o adımdan devam et.

---

## ÖN BİLGİ — NEDEN YAPIYORUZ?

Projenin backend'i şu an SQLite kullanıyor. Canlı sunucuda (Fly.io) PostgreSQL (Neon) kullanılacak.
Geliştirme ortamında da Docker ile yerel PostgreSQL kullanılacak.
**Amaç:** Hem test hem canlı ortamda aynı veritabanı dili konuşulması.

---

## KURAL: DOKUNULMAYACAK DOSYALAR

Aşağıdaki dosyalara **KESİNLİKLE** dokunma. Bunlar zaten veritabanından bağımsız çalışıyor:

- `PlanlamaApp.Domain/` → Tüm klasör (Entity'ler, IDbConnection bilmez)
- `PlanlamaApp.Application/` → Tüm klasör (Interface'ler, SQL bilmez)
- `PlanlamaApp.Infrastructure/Repositories/BaseRepository.cs` → **DOKUNMA.** `IDbConnection` ile çalışır, veritabanı bağımsız.
- `WebApp/Frontend/` → Tüm klasör (JavaScript, veritabanıyla alakası yok)

---

## ADIM 1: NuGet Paket Değişimi

**Dosya:** `WebApp/Backend/PlanlamaApp.Infrastructure/PlanlamaApp.Infrastructure.csproj`

**Yapılacak:**
- `Microsoft.Data.Sqlite` satırını **SİL**
- Yerine `Npgsql` ekle

**Önce (satır 10):**
```xml
<PackageReference Include="Microsoft.Data.Sqlite" Version="10.0.10" />
```

**Sonra:**
```xml
<PackageReference Include="Npgsql" Version="8.0.6" />
```

**Dosyanın diğer hiçbir satırına dokunma.**

### Test projesinde de değiştir

**Dosya:** `WebApp/Backend/Tests/PlanlamaApp.IntegrationTests/` altındaki `.csproj` dosyası

Bu dosyada da `Microsoft.Data.Sqlite` varsa aynı şekilde `Npgsql` ile değiştir.

### Doğrulama:

```powershell
cd C:\YazilimCalisma\planlama_app\WebApp\Backend
dotnet restore PlanlamaApp.sln
```

Hata çıkarsa: Paket adını veya versiyonu kontrol et. `Npgsql` büyük-küçük harf duyarlıdır.

---

## ADIM 2: Program.cs — Bağlantı Değişikliği

**Dosya:** `WebApp/Backend/PlanlamaApp.Api/Program.cs`

### 2a) using satırını değiştir

**Önce (satır 5):**
```csharp
using Microsoft.Data.Sqlite;
```

**Sonra:**
```csharp
using Npgsql;
```

### 2b) IDbConnection kaydını değiştir

**Önce (satır 90):**
```csharp
builder.Services.AddScoped<IDbConnection>(sp => new SqliteConnection("Data Source=planlama_app.db"));
```

**Sonra:**
```csharp
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection bulunamadı! appsettings.json kontrol edin.");
builder.Services.AddScoped<IDbConnection>(sp => new NpgsqlConnection(connectionString));
```

### 2c) Migration çağrısını değiştir

**Önce (satır 144):**
```csharp
var dbConnectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=planlama_app.db";
DatabaseMigration.Run(dbConnectionString);
```

**Sonra:**
```csharp
DatabaseMigration.Run(connectionString);
```

**NOT:** `connectionString` değişkeni 2b adımında zaten tanımlandı. İkinci kez tanımlama.

---

## ADIM 3: appsettings Dosyalarını Güncelle

### 3a) Geliştirme ortamı

**Dosya:** `WebApp/Backend/PlanlamaApp.Api/appsettings.Development.json`

Eğer dosya yoksa oluştur. Varsa `ConnectionStrings` bölümünü ekle/güncelle:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=planlamaapp_dev;Username=dev;Password=dev123"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

### 3b) Üretim ortamı

**Dosya:** `WebApp/Backend/PlanlamaApp.Api/appsettings.Production.json`

Eğer yoksa oluştur:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": ""
  },
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "api.dersmatris.com;*.fly.dev"
}
```

**NOT:** Production'daki `DefaultConnection` boş bırakılacak. Gerçek değer Fly.io ortam değişkenlerinden (`flyctl secrets set`) gelecek.

---

## ADIM 4: DatabaseMigration.cs — Tam Yeniden Yazım

**Dosya:** `WebApp/Backend/PlanlamaApp.Infrastructure/DatabaseMigration.cs`

Bu dosyanın **TAMAMINI** sil ve aşağıdaki içerikle değiştir.

**DEĞİŞEN ŞEYLERİN LİSTESİ (neden değiştiğini bil):**

| SQLite (Eski) | PostgreSQL (Yeni) | Açıklama |
|:---|:---|:---|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` | PostgreSQL'de otomatik artan sayı |
| `TEXT` (tarih alanları) | `TIMESTAMPTZ` | Gerçek zaman tipi, karşılaştırma yapılabilir |
| `INTEGER NOT NULL DEFAULT 0` (bool) | `BOOLEAN NOT NULL DEFAULT FALSE` | PostgreSQL'de gerçek boolean var |
| `INSERT OR IGNORE` | `INSERT INTO ... ON CONFLICT DO NOTHING` | Farklı sözdizimi |
| `TEXT PRIMARY KEY` (UUID) | `TEXT PRIMARY KEY` | **Aynı kalır** — C# tarafında üretiliyor |
| `ALTER TABLE ... ADD COLUMN` (try/catch) | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` | PostgreSQL bunu destekler, try/catch gerekmez |
| `UNIQUE(x, y)` (tablo içi) | `UNIQUE(x, y)` | **Aynı kalır** |

**YENİ İÇERİK:**

```csharp
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
                CREATE TABLE IF NOT EXISTS ""Users"" (
                    ""Id""              TEXT    PRIMARY KEY,
                    ""Email""           TEXT    NOT NULL UNIQUE,
                    ""Name""            TEXT    NOT NULL,
                    ""PasswordHash""    TEXT,
                    ""GoogleId""        TEXT,
                    ""SubscriptionPlan"" TEXT   NOT NULL DEFAULT 'free',
                    ""CreatedAt""       TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            ");

            // SubscriptionPlan sütunu eklenmemişse ekle
            connection.Execute(@"
                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""SubscriptionPlan"" TEXT NOT NULL DEFAULT 'free';
            ");

            // ── UsageTracking ──────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ""UsageTracking"" (
                    ""Id""                    TEXT    PRIMARY KEY,
                    ""TenantId""              TEXT    NOT NULL,
                    ""ResourceType""          TEXT    NOT NULL,
                    ""UsedAmount""            INTEGER NOT NULL DEFAULT 0,
                    ""MaxLimit""              INTEGER NOT NULL DEFAULT 0,
                    ""ResetDate""             TIMESTAMPTZ NOT NULL,
                    ""EarnedLimit""           INTEGER NOT NULL DEFAULT 0,
                    ""EarnedLimitExpiration"" TIMESTAMPTZ,
                    UNIQUE(""TenantId"", ""ResourceType"")
                );
            ");

            // EarnedLimit sütunları eklenmemişse ekle
            connection.Execute(@"ALTER TABLE ""UsageTracking"" ADD COLUMN IF NOT EXISTS ""EarnedLimit"" INTEGER NOT NULL DEFAULT 0;");
            connection.Execute(@"ALTER TABLE ""UsageTracking"" ADD COLUMN IF NOT EXISTS ""EarnedLimitExpiration"" TIMESTAMPTZ;");

            // ── UserRoles ──────────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ""UserRoles"" (
                    ""Id""        SERIAL  PRIMARY KEY,
                    ""TenantId""  TEXT    NOT NULL,
                    ""UserId""    TEXT    NOT NULL,
                    ""RoleName""  TEXT    NOT NULL,
                    ""IsActive""  BOOLEAN NOT NULL DEFAULT TRUE,
                    ""DeletedAt"" TIMESTAMPTZ,
                    ""CreatedAt"" TIMESTAMPTZ NOT NULL,
                    ""UpdatedAt"" TIMESTAMPTZ NOT NULL
                );
            ");

            // ── TaskAssignments ────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ""TaskAssignments"" (
                    ""Id""              SERIAL  PRIMARY KEY,
                    ""TenantId""        TEXT    NOT NULL,
                    ""TaskItemId""      INTEGER NOT NULL,
                    ""AssignedUserId""  TEXT    NOT NULL,
                    ""CreatedByUserId"" TEXT    NOT NULL,
                    ""RoleId""          INTEGER,
                    ""WorkspaceId""     INTEGER,
                    ""Status""          TEXT    NOT NULL DEFAULT 'Bekliyor',
                    ""AssignedAt""      TIMESTAMPTZ NOT NULL,
                    UNIQUE(""TaskItemId"", ""AssignedUserId"")
                );
            ");

            // ── Workspaces ─────────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ""Workspaces"" (
                    ""Id""          SERIAL  PRIMARY KEY,
                    ""TenantId""    TEXT    NOT NULL,
                    ""OwnerId""     TEXT    NOT NULL,
                    ""Name""        TEXT    NOT NULL,
                    ""Description"" TEXT,
                    ""InviteCode""  TEXT    NOT NULL UNIQUE,
                    ""IsActive""    BOOLEAN NOT NULL DEFAULT TRUE,
                    ""CreatedAt""   TIMESTAMPTZ NOT NULL,
                    ""UpdatedAt""   TIMESTAMPTZ NOT NULL
                );
            ");

            // ── WorkspaceMembers ───────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ""WorkspaceMembers"" (
                    ""Id""          SERIAL  PRIMARY KEY,
                    ""TenantId""    TEXT    NOT NULL,
                    ""WorkspaceId"" INTEGER NOT NULL,
                    ""UserId""      TEXT    NOT NULL,
                    ""DisplayName"" TEXT    NOT NULL,
                    ""JoinedAt""    TIMESTAMPTZ NOT NULL,
                    UNIQUE(""WorkspaceId"", ""UserId"")
                );
            ");

            // ── IdempotencyKeys ────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ""IdempotencyKeys"" (
                    ""Key""         TEXT    NOT NULL,
                    ""TenantId""    TEXT    NOT NULL,
                    ""RequestPath"" TEXT    NOT NULL,
                    ""CreatedAt""   TIMESTAMPTZ NOT NULL,
                    PRIMARY KEY(""Key"", ""TenantId"")
                );
            ");

            // ── TaskItems ──────────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ""TaskItems"" (
                    ""Id""                SERIAL  PRIMARY KEY,
                    ""TenantId""          TEXT    NOT NULL,
                    ""UserId""            TEXT    NOT NULL,
                    ""CategoryId""        INTEGER,
                    ""Title""             TEXT    NOT NULL,
                    ""Description""       TEXT,
                    ""TaskType""          TEXT    NOT NULL,
                    ""Deadline""          TIMESTAMPTZ,
                    ""IsTeacherAssigned"" BOOLEAN NOT NULL DEFAULT FALSE,
                    ""IsCompleted""       BOOLEAN NOT NULL DEFAULT FALSE,
                    ""CompletedAt""       TIMESTAMPTZ,
                    ""TargetCount""       INTEGER,
                    ""Metadata""          TEXT,
                    ""CreatedAt""         TIMESTAMPTZ NOT NULL,
                    ""UpdatedAt""         TIMESTAMPTZ NOT NULL
                );
            ");

            // ── Categories ─────────────────────────────────────────────────
            // (DatabaseMigration'da mevcut değildi ama repository kullanıyor)
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ""Categories"" (
                    ""Id""             SERIAL  PRIMARY KEY,
                    ""TenantId""       TEXT    NOT NULL,
                    ""Name""           TEXT    NOT NULL,
                    ""ParentId""       INTEGER,
                    ""IsFromTemplate"" BOOLEAN NOT NULL DEFAULT FALSE,
                    ""SortOrder""      INTEGER NOT NULL DEFAULT 0,
                    ""CreatedAt""      TIMESTAMPTZ NOT NULL,
                    ""UpdatedAt""      TIMESTAMPTZ NOT NULL
                );
            ");

            // ── PerformanceRecords ─────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ""PerformanceRecords"" (
                    ""Id""         SERIAL  PRIMARY KEY,
                    ""TenantId""   TEXT    NOT NULL,
                    ""UserId""     TEXT    NOT NULL,
                    ""TaskItemId"" INTEGER,
                    ""CategoryId"" INTEGER,
                    ""CorrectCount"" INTEGER NOT NULL DEFAULT 0,
                    ""WrongCount""   INTEGER NOT NULL DEFAULT 0,
                    ""EmptyCount""   INTEGER NOT NULL DEFAULT 0,
                    ""NetScore""     REAL    NOT NULL DEFAULT 0,
                    ""RecordDate""   TIMESTAMPTZ NOT NULL,
                    ""CreatedAt""    TIMESTAMPTZ NOT NULL
                );
            ");

            // ── SystemSettings ─────────────────────────────────────────────
            connection.Execute(@"
                CREATE TABLE IF NOT EXISTS ""SystemSettings"" (
                    ""Key""         TEXT    PRIMARY KEY,
                    ""Value""       TEXT    NOT NULL,
                    ""Description"" TEXT,
                    ""UpdatedAt""   TIMESTAMPTZ NOT NULL
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
                    INSERT INTO ""SystemSettings"" (""Key"", ""Value"", ""Description"", ""UpdatedAt"")
                    VALUES (@Key, @Value, @Description, @UpdatedAt)
                    ON CONFLICT (""Key"") DO NOTHING
                ", new { setting.Key, setting.Value, setting.Description, UpdatedAt = DateTime.UtcNow });
            }
        }
    }
}
```

**ÖNEMLİ NOTLAR:**
1. Tüm tablo ve sütun adları çift tırnak (`""`) içinde. PostgreSQL büyük-küçük harf duyarlıdır, tırnaksız yazarsan hepsini küçük harfe çevirir.
2. `SERIAL PRIMARY KEY` = PostgreSQL'in `AUTOINCREMENT` karşılığı.
3. `TIMESTAMPTZ` = Zaman dilimli tarih. Artık tarihler `TEXT` olarak saklanmıyor.
4. `BOOLEAN` = PostgreSQL'de gerçek true/false. SQLite'taki `INTEGER 0/1` yerine.
5. `INSERT ... ON CONFLICT DO NOTHING` = SQLite'taki `INSERT OR IGNORE` karşılığı.

---

## ADIM 5: Repository SQL Düzeltmeleri

### KRİTİK KURAL: `ON CONFLICT ... DO UPDATE SET` sözdizimi

SQLite ve PostgreSQL'de `ON CONFLICT` **neredeyse aynı** çalışır. Ama şu fark var:
- SQLite: `ON CONFLICT(col) DO UPDATE SET col = excluded.col`
- PostgreSQL: `ON CONFLICT (col) DO UPDATE SET col = EXCLUDED.col`

`EXCLUDED` büyük-küçük harf fark etmez, sözdizimi aynı. **Bu satırlar değişmez.**

### 5a) `last_insert_rowid()` → `RETURNING "Id"`

**Bu değişiklik 7 dosyada yapılacak.** Her birinde aynı kalıp var:

| Dosya | Satır |
|:---|:---|
| `CategoryRepository.cs` | 47 |
| `TaskRepository.cs` | 60 |
| `TaskAssignmentRepository.cs` | 65 |
| `WorkspaceRepository.cs` | 58, 98 |
| `UserRoleRepository.cs` | 69 |
| `PerformanceRepository.cs` | 62 |

**Kalıp — her dosyada aynı değişiklik:**

**Önce:**
```csharp
                        SELECT last_insert_rowid();";
```

**Sonra:**
```csharp
                        RETURNING "Id";";
```

**VE** aynı metotta `ExecuteScalarAsync<int>` çağrısı aynen kalır. `RETURNING "Id"` PostgreSQL'de son eklenen satırın `Id` değerini döner.

**DİKKAT — TaskAssignmentRepository.cs özel durum:**

Bu dosyada `INSERT ... ON CONFLICT ... DO UPDATE SET ... SELECT last_insert_rowid();` kalıbı var. Burada değişiklik biraz farklı:

**Önce (satır 58-65):**
```csharp
            var sql = @"INSERT INTO TaskAssignments (TenantId, TaskItemId, AssignedUserId, CreatedByUserId, RoleId, WorkspaceId, Status, AssignedAt)
                        VALUES (@TenantId, @TaskItemId, @AssignedUserId, @CreatedByUserId, @RoleId, @WorkspaceId, @Status, @AssignedAt)
                        ON CONFLICT(TaskItemId, AssignedUserId) DO UPDATE SET
                            RoleId = excluded.RoleId,
                            WorkspaceId = excluded.WorkspaceId,
                            Status = excluded.Status,
                            AssignedAt = excluded.AssignedAt;
                        SELECT last_insert_rowid();";
```

**Sonra:**
```csharp
            var sql = @"INSERT INTO ""TaskAssignments"" (""TenantId"", ""TaskItemId"", ""AssignedUserId"", ""CreatedByUserId"", ""RoleId"", ""WorkspaceId"", ""Status"", ""AssignedAt"")
                        VALUES (@TenantId, @TaskItemId, @AssignedUserId, @CreatedByUserId, @RoleId, @WorkspaceId, @Status, @AssignedAt)
                        ON CONFLICT(""TaskItemId"", ""AssignedUserId"") DO UPDATE SET
                            ""RoleId"" = EXCLUDED.""RoleId"",
                            ""WorkspaceId"" = EXCLUDED.""WorkspaceId"",
                            ""Status"" = EXCLUDED.""Status"",
                            ""AssignedAt"" = EXCLUDED.""AssignedAt""
                        RETURNING ""Id"";";
```

### 5b) `INSERT OR IGNORE` → `INSERT ... ON CONFLICT DO NOTHING`

**2 dosyada var:**

**Dosya 1: `WorkspaceRepository.cs` (satır 96-98)**

**Önce:**
```csharp
            var sql = @"
                INSERT OR IGNORE INTO WorkspaceMembers (TenantId, WorkspaceId, UserId, DisplayName, JoinedAt)
                VALUES (@TenantId, @WorkspaceId, @UserId, @DisplayName, @JoinedAt);
                SELECT last_insert_rowid();
            ";
```

**Sonra:**
```csharp
            var sql = @"
                INSERT INTO ""WorkspaceMembers"" (""TenantId"", ""WorkspaceId"", ""UserId"", ""DisplayName"", ""JoinedAt"")
                VALUES (@TenantId, @WorkspaceId, @UserId, @DisplayName, @JoinedAt)
                ON CONFLICT(""WorkspaceId"", ""UserId"") DO NOTHING
                RETURNING ""Id"";
            ";
```

**Dosya 2: `DatabaseMigration.cs`** — Zaten ADIM 4'te tamamen yeniden yazıldı. Tekrar dokunma.

### 5c) `UsageTrackingRepository.cs` — `datetime('now')` düzeltmesi

**Dosya:** `WebApp/Backend/PlanlamaApp.Infrastructure/Repositories/UsageTrackingRepository.cs`

Bu dosyada SQLite'a özel `datetime('now')` ve `datetime('now', '+1 day')` ifadeleri var. **Bunları C# tarafında hesaplat, SQL'e parametre olarak gönder.**

**IncrementUsageAsync metodu — Önce (satır 19-54):**

Tüm `IncrementUsageAsync` metodunu şununla değiştir:

```csharp
        public async Task<bool> IncrementUsageAsync(string tenantId, string resourceType, int maxLimit, DateTime resetDate)
        {
            var now = DateTime.UtcNow;
            var p = new
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                ResourceType = resourceType,
                MaxLimit = maxLimit,
                ResetDate = resetDate,
                Now = now
            };

            var sql = @"
                INSERT INTO ""UsageTracking"" (""Id"", ""TenantId"", ""ResourceType"", ""UsedAmount"", ""MaxLimit"", ""ResetDate"", ""EarnedLimit"", ""EarnedLimitExpiration"")
                VALUES (@Id, @TenantId, @ResourceType, 1, @MaxLimit, @ResetDate, 0, NULL)
                ON CONFLICT(""TenantId"", ""ResourceType"") DO UPDATE SET 
                    ""UsedAmount"" = CASE 
                                    WHEN ""UsageTracking"".""ResetDate"" < @Now THEN 1 
                                    ELSE ""UsageTracking"".""UsedAmount"" + 1 
                                 END,
                    ""MaxLimit"" = @MaxLimit,
                    ""ResetDate"" = CASE 
                                    WHEN ""UsageTracking"".""ResetDate"" < @Now THEN @ResetDate 
                                    ELSE ""UsageTracking"".""ResetDate"" 
                                END,
                    ""EarnedLimit"" = CASE
                                    WHEN ""UsageTracking"".""EarnedLimitExpiration"" IS NOT NULL AND ""UsageTracking"".""EarnedLimitExpiration"" < @Now THEN 0
                                    ELSE ""UsageTracking"".""EarnedLimit""
                                   END
                WHERE (""UsageTracking"".""ResetDate"" < @Now) OR (""UsageTracking"".""UsedAmount"" < (@MaxLimit + CASE WHEN ""UsageTracking"".""EarnedLimitExpiration"" IS NOT NULL AND ""UsageTracking"".""EarnedLimitExpiration"" >= @Now THEN ""UsageTracking"".""EarnedLimit"" ELSE 0 END));
            ";

            var rowsAffected = await _dbConnection.ExecuteAsync(sql, p);
            return rowsAffected > 0;
        }
```

**AddEarnedLimitAsync metodu — Önce (satır 71-101):**

Tüm `AddEarnedLimitAsync` metodunu şununla değiştir:

```csharp
        public async Task<bool> AddEarnedLimitAsync(string tenantId, string resourceType, int amount, DateTime expirationDate)
        {
            var now = DateTime.UtcNow;
            var nextDay = now.AddDays(1);

            var sql = @"
                INSERT INTO ""UsageTracking"" (""Id"", ""TenantId"", ""ResourceType"", ""UsedAmount"", ""MaxLimit"", ""ResetDate"", ""EarnedLimit"", ""EarnedLimitExpiration"")
                VALUES (@Id, @TenantId, @ResourceType, 0, 0, @NextDay, @Amount, @ExpirationDate)
                ON CONFLICT(""TenantId"", ""ResourceType"") DO UPDATE SET 
                    ""EarnedLimit"" = CASE
                                    WHEN ""UsageTracking"".""EarnedLimitExpiration"" IS NOT NULL AND ""UsageTracking"".""EarnedLimitExpiration"" < @Now THEN @Amount
                                    ELSE ""UsageTracking"".""EarnedLimit"" + @Amount
                                   END,
                    ""EarnedLimitExpiration"" = CASE
                                    WHEN ""UsageTracking"".""EarnedLimitExpiration"" IS NOT NULL AND ""UsageTracking"".""EarnedLimitExpiration"" > @ExpirationDate THEN ""UsageTracking"".""EarnedLimitExpiration""
                                    ELSE @ExpirationDate
                                   END;
            ";
            
            var insertP = new { 
                Id = Guid.NewGuid().ToString(), 
                TenantId = tenantId, 
                ResourceType = resourceType, 
                Amount = amount, 
                ExpirationDate = expirationDate,
                Now = now,
                NextDay = nextDay
            };

            var rowsAffected = await _dbConnection.ExecuteAsync(sql, insertP);
            return rowsAffected > 0;
        }
```

**GetUsageAsync ve DecrementUsageAsync** — Bu iki metot standart SQL, **değişiklik gerekmez.**

### 5d) `SystemSettingsRepository.cs` — using satırını değiştir

**Dosya:** `WebApp/Backend/PlanlamaApp.Infrastructure/Repositories/SystemSettingsRepository.cs`

**Önce (satır 5):**
```csharp
using Microsoft.Data.Sqlite;
```

**Sonra:**
Bu satırı **SİL**. Bu dosyada `SqliteConnection` doğrudan kullanılmıyor, sadece gereksiz bir using. Silmek yeterli.

### 5e) Tarih Operasyonları (Date Functions)
* **SQLite (Mevcut):** `datetime(Deadline, '+3 days')`
* **PostgreSQL (Hedef):** `Deadline + INTERVAL '3 days'`
  * _İlgili Dosya:_ `TaskRepository.cs` -> `PostponeChainAsync` metodu içerisinde bu dialect farkı dikkate alınarak (şimdilik SQLite syntax'ı) yazılmıştır. Eğer geçiş yapılırsa `[POSTGRES_PORT_TODO]` ile işaretlenmiş bu sorgunun PostgreSQL formatına çevrilmesi gerekir.

## Tablo DDL ve Sütun Tiplerini tırnak içine alma

**ÖNEMLİ KARAR:** PostgreSQL'de tablo/sütun adları büyük harfle yazıldığında çift tırnak zorunludur. Ancak mevcut kodda `BaseRepository.InjectTenantFilter()` tırnaksız tablo adları bekliyor ve Dapper parametreleri otomatik eşleşiyor.

**YAPMA:** Repository'lerdeki SELECT, UPDATE, DELETE sorgularındaki tablo adlarını tırnak içine alma. PostgreSQL tırnaksız isimleri otomatik küçük harfe çevirir ve `CREATE TABLE` da tırnaklı ise eşleşme bozulur.

**DÜZELTME:** `DatabaseMigration.cs`'deki tablo oluşturma komutlarındaki tırnakları **KALDIR.** Tüm tablo ve sütun adları tırnaksız (küçük harfe dönüşecek) olmalı ki repository sorgularıyla eşleşsin.

**ADIM 4'ÜN DÜZELTİLMİŞ VERSİYONU:**

DatabaseMigration.cs'de tüm `""TableName""` ve `""ColumnName""` ifadelerini tırnaksız yaz:

```sql
-- DOĞRU (tırnaksız, PostgreSQL küçük harfe çevirir):
CREATE TABLE IF NOT EXISTS UsageTracking (
    Id TEXT PRIMARY KEY,
    TenantId TEXT NOT NULL,
    ...
);

-- YANLIŞ (tırnaklı, repository sorguları eşleşmez):
CREATE TABLE IF NOT EXISTS "UsageTracking" (
    "Id" TEXT PRIMARY KEY,
    "TenantId" TEXT NOT NULL,
    ...
);
```

**AYNI ŞEKİLDE** ADIM 5c'deki UsageTrackingRepository SQL'lerindeki tırnaklı tablo/sütun adlarını da **tırnaksız** yaz.

---

## ADIM 6: Docker Geliştirme Ortamı

**Dosya:** `WebApp/Backend/docker-compose.dev.yml` (yeni dosya oluştur)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: planlamaapp_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev123
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## ADIM 7: Test Projesini Güncelle

**Dosya:** `WebApp/Backend/Tests/PlanlamaApp.IntegrationTests/Infrastructure/CustomWebApplicationFactory.cs`

Bu dosyada `SqliteConnection` kullanılıyor (in-memory test veritabanı). Testler şimdilik PostgreSQL'e çevrilmeyecek.

**YAPILACAK:** Bu dosyaya **DOKUNMA.** Test altyapısı ayrı bir adımda ele alınacak. Şimdilik testler derlenmeyebilir — bu beklenen bir durum.

Eğer derlemede sadece test projesi hata veriyorsa, test projesini geçici olarak çözümden çıkarabilirsin:

```powershell
dotnet sln PlanlamaApp.sln remove Tests/PlanlamaApp.IntegrationTests/PlanlamaApp.IntegrationTests.csproj
```

---

## ADIM 8: Derleme ve Doğrulama

```powershell
cd C:\YazilimCalisma\planlama_app\WebApp\Backend
dotnet build PlanlamaApp.sln -c Release
```

**Beklenen sonuç:** `0 Hata, 0 Uyarı` (test projesi çıkarıldıysa)

**Olası hatalar ve çözümleri:**

| Hata | Çözüm |
|:---|:---|
| `CS0246: SqliteConnection bulunamadı` | O dosyada hâlâ `using Microsoft.Data.Sqlite;` veya `new SqliteConnection(...)` var. Bul ve düzelt. |
| `CS0103: connectionString bulunamadı` | Program.cs'te ADIM 2b'deki değişken tanımı ADIM 2c'den önce gelmiyor. Sırayı kontrol et. |
| `Npgsql paketi bulunamadı` | `dotnet restore` çalıştır. |

---

## ADIM 9: Docker ile Yerel Test

```powershell
# 1. PostgreSQL'i başlat
cd C:\YazilimCalisma\planlama_app\WebApp\Backend
docker compose -f docker-compose.dev.yml up -d

# 2. 5 saniye bekle (DB'nin ayağa kalkması için)
Start-Sleep -Seconds 5

# 3. API'yi çalıştır
dotnet run --project PlanlamaApp.Api
```

**Beklenen:** Swagger UI açılır, migration tabloları oluşturulur, hata yok.

**Doğrulama:**
```powershell
# Başka bir terminalde PostgreSQL'e bağlan ve tabloları kontrol et
docker exec -it backend-postgres-1 psql -U dev -d planlamaapp_dev -c "\dt"
```

Tüm tablolar listeleniyorsa geçiş başarılı.

---

## YAPILMAYACAKLAR LİSTESİ

1. ❌ `BaseRepository.cs`'e dokunma
2. ❌ `PlanlamaApp.Domain/` klasörüne dokunma
3. ❌ `PlanlamaApp.Application/` klasörüne dokunma
4. ❌ `WebApp/Frontend/` klasörüne dokunma
5. ❌ Kendi başına yeni tablo ekleme
6. ❌ Entity sınıflarındaki property tiplerini değiştirme (bool, int, string hepsi aynı kalır — Dapper otomatik eşler)
7. ❌ Repository'lerdeki iş mantığını değiştirme — sadece SQL sözdizimini düzelt
8. ❌ `AGENTS.md` dosyasını değiştirme
9. ❌ Git commit veya push yapma

---

*Oluşturulma: 2 Ağustos 2026*
