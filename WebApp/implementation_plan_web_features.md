# Yeni Nesil Planlama Uygulaması — Web İleri Özellikler Geliştirme Planı (v8 - Tam Kod Taraması)
*(§8, §9, §10, §11 — Tüm Controller'lar, Repository'ler ve Auth akışı okunarak yazılmıştır)*

> [!IMPORTANT]
> Bu plan, mevcut tüm C# kaynak dosyaları (Controller'lar, Repository'ler, Entity'ler, DatabaseMigration, Auth akışı) bizzat satır satır okunarak yazılmıştır. Her bulgu dosya adı ve satır numarasıyla belgelenmiştir.

> [!NOTE]
> **`[MOBILE_PORT_TODO]` İşaretleri Hakkında:** Bu plan boyunca `[MOBILE_PORT_TODO]` etiketi bulunan her madde, native uygulama (Capacitor/iOS/Android) ajanının ilgili dosyaya bir yorum satırı eklemesi ve `PORTABILITY.md` belgesini güncellemesi gereken noktaları göstermektedir. Bu noktalar web ile native arasında farklı implementasyon gerektiren kritik alanlardır.

---

## BÖLÜM 0 — Mevcut Kodlardaki Kritik Hatalar (Yeni Özelliklerden Önce Mutlaka Düzeltilmeli)

### 0.1. TenantId Claim Adı Uyuşmazlığı (Token → Storage Arızası)
- **Kaynak:** `AuthController.cs:172` → `new Claim("TenantId", user.Id)`
- **Sorun:** `StorageController.cs:32` → `User.FindFirstValue("tenant_id")` (küçük harf)
- **Etki:** Eşleşmez. Tüm kullanıcılar `"default_tenant"` olarak görülür. R2'ye yüklenen dosyalar tenant izolasyonu olmadan karışır. Kota takibi çalışmaz.
- **Düzeltme:** `AuthController.IssueJwtCookie` içindeki claim adı `"TenantId"` → `"tenant_id"` olarak değiştirilecek.
- `// [MOBILE_PORT_TODO]: IssueJwtCookie metodu web'e HttpOnly Cookie yazar. Native uygulamada Cookie kullanılamaz. Bu metodun bir overload'u (veya platform flag'iyle dallanmış versiyonu) token'ı JSON response body içinde döndürmeli (Bearer token). Capacitor'da bu token iOS Keychain / Android Keystore'a (Secure Storage) kaydedilmeli ve sonraki tüm isteklerde Authorization: Bearer header olarak gönderilmelidir. Bkz. PORTABILITY.md > 'Auth Token Yönetimi'`

### 0.2. `WorkspaceController.GetMembers` IDOR Açığı
- **Kaynak:** `WorkspaceController.cs:103-107`
- **Sorun:** Üye listesi getirirken `currentUserId` kontrolü yok. Herhangi bir giriş yapmış kullanıcı başkasının workspace'indeki üyeleri görebilir.
- **Düzeltme:** Endpoint'e sahiplik veya üyelik kontrolü eklenecek:
  ```csharp
  var workspace = await _workspaceRepository.GetByIdAsync(workspaceId);
  if (workspace == null) return NotFound();
  var currentUserId = GetCurrentUserId();
  // Lider veya üye değilse reddet
  var members = await _workspaceRepository.GetMembersAsync(workspaceId);
  if (workspace.OwnerId != currentUserId && !members.Any(m => m.UserId == currentUserId))
      return Forbid();
  ```

### 0.3. `PerformanceController.GetByUser` Açık Erişim
- **Kaynak:** `PerformanceController.cs:31-35`
- **Sorun:** `userId` URL'den alınıyor ama JWT claim kontrolü yok. Herhangi bir kullanıcı başkasının performans verisini `GET /api/performance/user/{herhangiBirId}` ile çekebilir.
- **Düzeltme:** Controller'ın tüm `GetByUser`, `GetReport` metodlarında JWT'den alınan `currentUserId` ile `userId` karşılaştırılacak. Eşit değilse Observer kontrolü yapılacak (§0.4).

### 0.4. `PerformanceController` ve `TasksController` Observer Erişim Kuralı
- Observer (Veli) olan bir kullanıcı `WorkspaceMember.ObserverLinkedUserId` üzerinden bağlı olduğu öğrenciye ait verilere okuma hakkı olacak.
- Kontrol akışı (her iki controller'da uygulanacak):
  ```
  currentUser.Id == requestedUserId → İzin ver
  currentUser.Id != requestedUserId →
      WorkspaceMembers'da Role="Observer" AND ObserverLinkedUserId=requestedUserId → İzin ver (sadece GET)
      Aksi → 403 Forbidden
  ```

### 0.5. `TasksController.Create` Kota Kontrolü Eksik
- **Kaynak:** `TasksController.cs:101` — `subscription_plan` alınmış ama kota düşme çağrısı yok.
- **Düzeltme:** `Create` ve ileride eklenecek `CreateChain` metodlarında `_quotaManager.TryDeductAsync(tenantId, plan, "AiTaskCreation")` çağrısı zorunlu. (Normal görev oluşturma kotasız; AI ile oluşturulanlar mutlaka kotadan düşülür.)
- `// [MOBILE_PORT_TODO]: Native uygulamada Free/Premium kullanıcı ayrımı reklam sistemiyle birleşir. Kota dolduğunda (TryDeductAsync=false) web'de sadece 402 döner. Native'de ise önce QuotaController.GetRewardedAdOpportunity kontrolü yapılmalı; kullanıcıya ödüllü reklam izleyerek ek kota kazanma seçeneği sunulmalı. Bu akış AiController ve TasksController'da platform flag'iyle ayrıştırılmalı. Bkz. PORTABILITY.md > 'Reklam ve Kota Entegrasyonu'`

---

## BÖLÜM 1 — Mimari Karar: TaskItem vs TaskAssignment

> [!IMPORTANT]
> Bu karar alınmadan §8.3 (Ödev Dağıtımı) kodlanamaz.

> `// [MOBILE_PORT_TODO]: TaskAssignment tablosu offline-first mimaride çift yazım riski taşır. Native uygulamada IndexedDB yerine SQLite (Capacitor Community SQLite) kullanıldığından, TaskItem+TaskAssignment çift kaydının offline sync kuyruğunda doğru sırayla uygulandığından emin olunmalı. syncService.js'nin native karşılığında (nativeSyncService.ts) bu transaction bütünlüğü test edilmelidir. Bkz. PORTABILITY.md > 'Offline Sync Mimarisi'`

**Mevcut durum:** Sistemde iki paralel mekanizma var:
- `TaskItem`: Kişinin kendi görevi (öğrenci kendi görevini yönetir)
- `TaskAssignment`: Bir kişinin başkasına atadığı görev (öğretmen → öğrenci)

**Karar:** Bu ayrım korunacak, ancak netleştirilecek:
- Öğretmen bir ödev atadığında → `TaskItem` **ve** `TaskAssignment` birlikte oluşturulur.
  - `TaskItem`: Öğrencinin `UserId`'siyle, `AssignedBy = öğretmenId`, `IsHomework = true`
  - `TaskAssignment`: `TaskItemId`, `AssignedUserId = öğrenciId`, `CreatedByUserId = öğretmenId`, `WorkspaceId`
- Bu sayede öğrenci kendi görev listesinde (`GET /api/tasks/user/{id}`) ödevi görür; öğretmen de `GET /api/workspaces/{id}/tasks` ile tüm atamalarını görür.
- AI bulk assign için: her öğrenci için bu çift kayıt **tek bir transaction** içinde oluşturulur.

---

## BÖLÜM 2 — Veritabanı Güncellemeleri (Migration Satırları)

```sql
-- WorkspaceMembers: Rol ve Observer alanları
ALTER TABLE WorkspaceMembers ADD COLUMN IF NOT EXISTS Role TEXT NOT NULL DEFAULT 'Member';
ALTER TABLE WorkspaceMembers ADD COLUMN IF NOT EXISTS ObserverLinkedUserId TEXT;

-- TaskItems: Zincir, ekip ve ödev alanları
ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS WorkspaceId INTEGER;
ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS ChainId TEXT;
ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS ChainOrder INTEGER;
ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS OriginalDeadline TIMESTAMPTZ;
ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS IsHomework BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE TaskItems ADD COLUMN IF NOT EXISTS AssignedBy TEXT;

-- Workspaces: Ekip türü
ALTER TABLE Workspaces ADD COLUMN IF NOT EXISTS Type TEXT NOT NULL DEFAULT 'Eğitim';

-- PerformanceRecords: Eksik alan ve kolon adı düzeltmeleri
-- NOT: Mevcut tabloda EmptyCount var, entity'de BlankCount yazıyor → Entity düzeltilecek
ALTER TABLE PerformanceRecords ADD COLUMN IF NOT EXISTS UpdatedAt TIMESTAMPTZ;
ALTER TABLE PerformanceRecords ADD COLUMN IF NOT EXISTS TeacherFeedback TEXT;

-- ActionHistory: Yeni tablo
CREATE TABLE IF NOT EXISTS ActionHistory (
    Id             TEXT        PRIMARY KEY,
    UserId         TEXT        NOT NULL,
    TenantId       TEXT        NOT NULL,
    ActionType     TEXT        NOT NULL,
    Payload        JSONB       NOT NULL,
    InversePayload JSONB       NOT NULL,
    IsUndone       BOOLEAN     NOT NULL DEFAULT FALSE,
    CreatedAt      TIMESTAMPTZ NOT NULL
);
```

**Entity Düzeltmesi:** `PerformanceRecord.cs` içinde `BlankCount` → `EmptyCount` olarak yeniden adlandırılacak (Migration'daki tablo adıyla eşleşmesi için).

---

## BÖLÜM 3 — Backend: Yeni ve Güncellenen Uç Noktalar

### 3.1. `BaseRepository` Transaction Desteği
`ExecuteAsync`, `QueryAsync`, `QueryFirstOrDefaultAsync` metodlarına `IDbTransaction? transaction = null` parametresi eklenecek. TenantId zırhı transaction içinde de çalışacak.

### 3.2. UserRepository SQL Düzeltmeleri
```csharp
// Önceki (hatalı):
DELETE FROM Workspaces WHERE UserId = @UserId     // OwnerId olmalı
DELETE FROM PerformanceLogs                        // PerformanceRecords olmalı
// Eksik:
DELETE FROM WorkspaceMembers WHERE UserId = @UserId
```

### 3.3. Yeni: Görev Zinciri (Chain) Uç Noktası
`POST /api/tasks/chain` — `List<TaskCreateDto>` alır. Tek ChainId üretir. Her eleman için hem `TaskItem` hem `TaskAssignment` tek bir transaction içinde oluşturulur.

### 3.4. Yeni: Kaskad Erteleme
`PUT /api/tasks/{id}/postpone` — Body: `{ daysToShift, postponeAllChain }`.
```sql
UPDATE TaskItems
SET Deadline = Deadline + (@daysToShift || ' days')::INTERVAL
WHERE ChainId = @chainId AND ChainOrder >= @currentChainOrder
  AND TenantId = @tenantId AND IsCompleted = false;
```

### 3.5. Yeni: AI Komut Motoru
- `POST /api/ai/command-plan`: Sadece plan döner, DB'ye yazmaz. Kota düşmez.
- `POST /api/ai/command-execute`: Kota düşer (`QuotaManager.TryDeductAsync`). Hata olursa `RefundAsync` çağrılır. `executeAll` flag'ine göre tek transaction veya adım adım çalışır. Tek `ActionHistory` kaydı oluşturulur.
- `// [MOBILE_PORT_TODO]: AiController şu an sadece web kullanımı için tasarlandı (60 kişilik grup, ücretsiz Gemini kotası). Native uygulamada AI Asistanı Premium özelliğidir. command-plan çağrısında kullanıcının SubscriptionPlan='premium' olmadığı kontrol edilmeli; değilse önce reklam izletme veya premium satın alma akışına yönlendirilmeli. Günlük limit sistemi web'dekinden (sınırsız) farklı olacak. Bkz. §10.6 ve PORTABILITY.md > 'AI Asistanı Platform Farklılıkları'`

**AI Bağlamı (Token Tasarrufu):** LLM'e sadece `{ today, timezone, teamMembers: [{id, name, team}] }` gönderilir. Görev listesi asla gönderilmez.

**AI Tool Şeması:** `create_task`, `create_task_chain`, `bulk_assign_homework`, `assign_task_to_team`, `postpone_chain`, `delete_task`

### 3.6. Yeni: Undo/Redo
- `GET /api/actions/history`: Son 5 `IsUndone=false` kaydı.
- `POST /api/actions/undo/{id}`: `CreatedAt + 24h < now` ise `410 Gone`. FK koruması: TaskItem silinmeden önce ilgili `PerformanceRecord` silinir. Çakışma kontrolü: `UpdatedAt` karşılaştırması.
- `POST /api/actions/redo/{id}`: `Payload`'dan veri geri yüklenir, yeni ActionHistory satırı açılır.

---

## BÖLÜM 4 — Frontend

> `// [MOBILE_PORT_TODO]: Bu bölümdeki tüm bileşenler web (React/Vite) için yazılmaktadır. Native uygulamaya taşınırken şu kurallara uyulmalı: (1) window.location, document.cookie, localStorage kullanılmamalı — bunlar utils/platform.js üzerinden soyutlanmalı. (2) 100vh yerine 100dvh veya JS tabanlı yükseklik hesabı kullanılmalı. (3) Tüm network istekleri apiClient.js üzerinden yapılmalı, doğrudan fetch/XMLHttpRequest yazılmamalı. Bkz. PORTABILITY.md > 'Frontend Taşınabilirlik Kuralları'`

### 4.1. Rol Tespiti
`GET /api/workspaces/owned/{userId}` + `GET /api/workspaces/member/{userId}` → `AuthContext`'te `ledWorkspaces` ve `memberWorkspaces` tutulur.
- `// [MOBILE_PORT_TODO]: AuthContext token'ı web'de HttpOnly cookie'den okur (otomatik). Native'de Secure Storage'dan (Capacitor) okunan Bearer token'ı apiClient.js header'ına enjekte etmeli. Bu enjeksiyon platform.js içinde soyutlanmalı.`

### 4.2. AI Modal
`AiCommandModal.jsx`: Plan gelince Checkbox listesi. "Tümünü Onayla" → `executeAll: true`. "Seçilileri" → `executeAll: false`. Çift tıklamaya karşı loading overlay + Idempotency-Key.
- `// [MOBILE_PORT_TODO]: AiCommandModal native'de sheet (bottom sheet) veya full-screen modal olarak tasarlanmalı. Web'deki dialog elementleri native'de safe-area-inset ile çakışabilir. Bileşene platform prop'u eklenebilir veya native karşılığı ayrıca yazılabilir.`

### 4.3. Geri Alınamaz İşlemler (§10.4 Kural 3)
`ConfirmDangerModal.jsx`: Metin kutusuna "ONAYLA" yazılmasını zorunlu kılan modal. Dosya silme, üye çıkarma gibi kritik AI adımlarında kullanılır.

### 4.4. Toast ve Geri Al
`react-hot-toast` ile 5 saniyelik bildirim. 410 gelirse: "Bu işlem 24 saatlik süreyi aştığı için geri alınamaz."

### 4.5. Offline 409 Yönetimi
`syncService.js` 409 alırsa işlemi kuyruktan siler ve Toast ile kullanıcıyı uyarır.
- `// [MOBILE_PORT_TODO]: Web'de offline kuyruğu IndexedDB (localforage) + window.addEventListener('online') ile yönetilir. Native Capacitor'da bunun karşılığı: @capacitor/network (çevrimiçi/çevrimdışı dinleme) + Capacitor Community SQLite (yerel kuyruk). syncService.js'in native implementasyonu nativeSyncService.ts olarak ayrı yazılmalı ve platform.js'ten import edilmeli. Bkz. PORTABILITY.md > 'Offline Sync Mimarisi'`

---

## BÖLÜM 5 — Geliştirme Sırası

1. **Yamalar (Mevcut Kod Hataları):**
   - `AuthController` claim adı: `"TenantId"` → `"tenant_id"`
   - `UserRepository` SQL hataları
   - `WorkspaceController.GetMembers` IDOR düzeltmesi
   - `PerformanceController` açık erişim düzeltmesi
   - `PerformanceRecord.BlankCount` → `EmptyCount`

2. **Veritabanı:** Migration ALTER TABLE satırları + ActionHistory tablosu

3. **BaseRepository:** Transaction parametre desteği

4. **API:** WorkspacesController (Role+Observer), TasksController (chain, postpone), AiController, ActionsController

5. **Frontend:** AI Modal, ConfirmDangerModal, Toast, Offline 409

---

## BÖLÜM 6 — Native (Mobil) Ajana Özel Özet

> [!NOTE]
> Native uygulamayı geliştiren ajan, bu plan içindeki `[MOBILE_PORT_TODO]` yorumlarını bulduğu her C# veya JS/TS dosyasına **aynen bu format** ile yorum satırı olarak eklemelidir:
> ```
> // [MOBILE_PORT_TODO]: <açıklama>
> ```
> Aynı zamanda `PORTABILITY.md` dosyasını ilgili başlık altında güncellenmelidir.

| Konu | Web Davranışı | Native Davranışı |
|---|---|---|
| Auth Token | HttpOnly Cookie (otomatik) | Bearer token → Secure Storage (Capacitor) |
| TenantId | JWT claim'den `"tenant_id"` | Aynı — ancak apiClient.js header enjeksiyonu farklı |
| AI Asistanı | Sınırsız (60 kişilik grup, ücretsiz kota) | Sadece Premium; Free için günlük limit + ödüllü reklam |
| Kota Dolunca | `402 Payment Required` | Önce ödüllü reklam teklifi, sonra premium satın alma |
| Offline Kuyruğu | IndexedDB + `window.addEventListener('online')` | `@capacitor/network` + Capacitor SQLite |
| AI Modal | React dialog | Native bottom sheet (safe-area-inset uyumlu) |
| Dosya Yükleme | Presigned PUT (5MB altı) + Multipart (üstü) | `@capacitor/filesystem` + `@capacitor/http` ile binary PUT |
| Geri Al Toast | `react-hot-toast` | Native Toast (Capacitor Toast Plugin) |
