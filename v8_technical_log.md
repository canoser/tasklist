# v8 Teknik Değişiklik Günlüğü (Technical Log)

Bu dosya, v8 güncellemesi sırasında ajanlar tarafından yapılan kod değişikliklerinin (metot seviyesinde) tam bir kaydıdır. Gelecekteki ajanlar ve geliştiriciler, yapılan güvenlik yamalarının ve yeni özelliklerin tam olarak hangi dosyalarda ve hangi metotlarda yer aldığını bulmak için bu dosyayı referans alabilir.

## 1. Güvenlik Yamaları ve IDOR Düzeltmeleri

### `PlanlamaApp.Api.Controllers.AuthController`
* **Metotlar (Token Üretimi):** JWT oluşturma mantığındaki `TenantId` claim'i, standartlara uyması amacıyla `tenant_id` olarak güncellendi.

### `PlanlamaApp.Api.Controllers.WorkspaceController`
* **Metot (`IsOwnerAsync`):** IDOR kontrolleri için yardımcı metot olarak eklendi.
* **Metotlar (`Create`, `Update`, `AddMember`, `UpdateMemberDisplayName`):** Çift tıklama/tekrarlı istekleri önlemek amacıyla `[ServiceFilter(typeof(IdempotencyFilter))]` eklendi.
* **Metotlar (`Update`, `Delete`, `GetMembers`, `AddMember`, `UpdateMemberDisplayName`, `RemoveMember`, `GetWorkspaceTasks`):** Yalnızca yetkili kişilerin (Owner veya ilgili Workspace üyesi) verilere erişebilmesini sağlayan IDOR (Insecure Direct Object Reference) kontrolleri eklendi.

### `PlanlamaApp.Api.Controllers.PerformanceController`
* **Metot (`HasAccessToUserAsync`):** İstek yapan kişinin, hedeflenen kullanıcının "Observer"ı (Velisi) olup olmadığını kontrol eden yardımcı metot eklendi.
* **Metotlar (`GetByUser`, `GetByTask`, `GetReport`):** İzinsiz erişimi engellemek için `HasAccessToUserAsync` kullanılarak IDOR düzeltmeleri eklendi.

### Diğer Controller'lara IdempotencyFilter Eklenmesi
* **`UserRolesController` (`AddRole`, `RestoreRole`):** IdempotencyFilter eklendi.
* **`QuotaController` (`GrantReward`):** IdempotencyFilter eklendi.
* **`AdminController` (`UpdateSetting`):** IdempotencyFilter eklendi.

### `PlanlamaApp.Infrastructure.Repositories.UserRepository`
* **Metot (`DeleteAllUserDataAsync`):** SQL komutları güncellendi. Kullanıcı silinirken `WorkspaceMembers` tablosundaki kayıtlarının silinmesi eklendi. Artık kullanılmayan `PerformanceLogs` referansı kaldırıldı.

## 2. Entity ve Repository Genişletmeleri (Yeni Alanlar)

### `PlanlamaApp.Domain.Entities.WorkspaceMember`
* **Eklenen Özellikler:** `Role` ("Member", "Observer"), `ObserverLinkedUserId`.

### `PlanlamaApp.Domain.Entities.Workspace`
* **Eklenen Özellikler:** `Type` ("Personal", "Group", "Class"), `Settings` (JSON string).

### `PlanlamaApp.Domain.Entities.TaskItem`
* **Eklenen Özellikler:** `WorkspaceId`, `ChainId`, `ChainOrder`, `OriginalDeadline`, `IsHomework`, `AssignedBy`.

### `PlanlamaApp.Domain.Entities.PerformanceRecord`
* **Değiştirilen Özellik:** `BlankCount` alanı, veritabanı şemasıyla birebir uyumlu olması için `EmptyCount` olarak değiştirildi.
* **Eklenen Özellikler:** `StudyDurationMinutes`, `ExpectedDurationMinutes`.

### `PlanlamaApp.Application.Interfaces.IWorkspaceRepository` & `WorkspaceRepository`
* **Metot (`GetMemberByIdAsync`):** IDOR kontrolleri sırasında üye bilgisini doğrudan çekebilmek için eklendi.
* **Metot (`IsObserverAsync`):** Belirli bir kullanıcının, diğer kullanıcının "Observer"ı olup olmadığını SQL üzerinden hızlıca doğrulamak için eklendi.
* **Metotlar (`CreateAsync`, `UpdateAsync`):** SQL sorgularına `Type` ve `Settings` alanları dahil edildi.

### `PlanlamaApp.Infrastructure.Repositories.TaskRepository`
* **Metotlar (`CreateAsync`, `UpdateAsync`):** SQL sorgularına yeni eklenen `WorkspaceId`, `ChainId`, `ChainOrder`, `OriginalDeadline`, `IsHomework`, `AssignedBy` alanları dahil edildi.

### `PlanlamaApp.Infrastructure.Repositories.PerformanceRepository`
* **Metotlar (`CreateAsync`, `UpdateAsync`):** `BlankCount` kullanımı `EmptyCount` ile değiştirildi. SQL sorgularına `StudyDurationMinutes` ve `ExpectedDurationMinutes` alanları dahil edildi.

## 3. Yeni Entity'ler ve Veritabanı (Migration) Değişiklikleri

### `PlanlamaApp.Domain.Entities.ActionHistory`
* **Yeni Entity:** AI Command Engine ve Undo/Redo özellikleri için eylem geçmişi kaydını tutacak `ActionHistory` sınıfı oluşturuldu (`ActionType`, `PayloadJson`, `IsReverted` vb.).

### `PlanlamaApp.Infrastructure.DatabaseMigration`
* **Metot (`Run`):** Tablo oluşturma (`CREATE TABLE`) komutlarına yukarıda bahsedilen tüm yeni alanlar (`TaskItems`, `Workspaces`, `WorkspaceMembers`, `PerformanceRecords`) eklendi.
* **Düzeltme:** `PerformanceRecords` tablosundaki `RecordDate` sütun ismi kodla tam uyumlu olması için `RecordedAt` olarak güncellendi ve `Notes` sütunu eklendi.
* **Yeni Tablo:** `ActionHistory` tablosu SQL scriptine eklendi.

### Çöp Dosya Temizliği
* **Silinen Dosya:** Kullanılmayan ve çakışma yaratan `C:\YazilimCalisma\planlama_app\WebApp\Backend\PlanlamaApp.Domain\Entities\AppUser.cs` dosyası silindi (Sistemin tek doğrusu `User.cs`).

## 4. BaseRepository Transaction (İşlem) Desteği

### `PlanlamaApp.Infrastructure.Repositories.BaseRepository`
* **Metotlar (`QueryAsync`, `QueryFirstOrDefaultAsync`, `ExecuteAsync`):** Parametrelerine `IDbTransaction? transaction = null` eklendi. Metotların içindeki Dapper çağrılarına bu transaction paslandı. `TenantId` zırhı (InjectTenantFilter) transaction durumunda bile korunmaya devam ediyor.
* **Yeni Metot (`ExecuteScalarAsync<T>`):** Alt repository'lerde doğrudan `_dbConnection.ExecuteScalarAsync` kullanımını engellemek ve `TenantId` zırhını/transaction'ı merkezileştirmek için `ExecuteScalarAsync` metodu `BaseRepository`'ye kazandırıldı.

### Tüm Alt Repository'lerin Transaction Desteğine (ExecuteScalarAsync) Geçirilmesi
Doğrudan `_dbConnection.ExecuteScalarAsync` (veya ExecuteAsync) kullanan aşağıdaki metotlar, BaseRepository'nin yeni metotlarına geçirilerek tam güvenli ve Transaction destekli hale getirildi:
* **`WorkspaceRepository`:** `CreateAsync` ve `AddMemberAsync` metotlarındaki INSERT sorguları.
* **`UserRoleRepository`:** `CreateTagAsync` (INSERT) ve `GetTaskCountByRoleIdAsync` (COUNT) metotları.
* **`TaskAssignmentRepository`:** `UpsertAssignmentAsync` (INSERT/UPDATE) metodu.
* **`PerformanceRepository`:** `CreateAsync` (INSERT) metodu.
* **`CategoryRepository`:** `CreateAsync` (INSERT) metodu.
* **`UserRepository`:** `DeleteAllUserDataAsync` metodu içindeki manuel (5 satırlık) "DELETE FROM" işlemleri `BaseRepository.ExecuteAsync`'e taşındı. `TenantId` ekleme redundancy'si temizlendi.

## 5. Ekip Sistemi ve Görev Zinciri API Genişletmeleri (Adım 4 ve Adım 5)

### `PlanlamaApp.Api.Controllers.WorkspaceController`
* **Yeni Uç Nokta (`POST /join`):** `JoinWorkspaceRequest` DTO'su ile davet kodu kullanılarak gruba katılma işlevi eklendi. Katılım sırasında `LinkedUserId` iletilirse kullanıcıya otomatik olarak "Observer" rolü atanıyor.
* **Metot Güncellemesi (`GetMembers`):** "Observer" rolüne sahip kullanıcıların sadece kendilerini ve bağlı oldukları (LinkedUserId) öğrenciyi görebilmesi için IDOR koruması ve rol bazlı filtreleme eklendi.

### `PlanlamaApp.Application.Interfaces.ITaskRepository` & `TaskRepository`
* **İşlem (Transaction) Parametreleri:** Veri manipüle eden `CreateAsync`, `UpdateAsync`, `DeleteAsync`, `MarkAsCompletedAsync` metotlarına `System.Data.IDbTransaction? transaction = null` opsiyonel parametresi eklendi.
* **Yeni Metot (`PostponeChainAsync`):** Kaskad görev ertelemeyi veritabanı seviyesinde tek bir SQL sorgusu ile yapan metot oluşturuldu. Sorguda `ChainOrder >= @MinOrder` ve `IsCompleted = 0` filtresi kullanıldı.

### `PlanlamaApp.Application.Interfaces.ITaskAssignmentRepository` & `TaskAssignmentRepository`
* **İşlem Parametreleri:** `AssignAsync` metoduna `System.Data.IDbTransaction? transaction = null` parametresi eklendi. `RemoveRoleFromAssignmentsAsync` metodu doğrudan `_dbConnection.ExecuteAsync` kullanmak yerine `BaseRepository.ExecuteAsync`'e geçirildi.

### `PlanlamaApp.Api.Controllers.TasksController`
* **Bağımlılıklar (DI):** Görev ve atama işlemlerini aynı işlem(transaction) içerisinde gerçekleştirebilmek için `ITaskAssignmentRepository` ve `IDbConnection` constructor'a enjekte edildi.
* **Yeni Uç Nokta (`POST /chain`):** Belirtilen kullanıcılara, belirli görevleri zincir (`ChainId`) ve sıraya (`ChainOrder`) bağlayarak tek transaction içinde hem `TaskItem` hem de `TaskAssignment` oluşturacak toplu görev atama motoru yazıldı.
* **Yeni Uç Nokta (`PUT /{id}/postpone`):** İsteğe bağlı olarak tek bir görevi veya `request.PostponeAllChain` tetiklenmişse tüm zinciri (seçili görevden sonrakileri) kaskad erteleyen uç nokta oluşturuldu. İşlem yine tek transaction içerisinde `PostponeChainAsync` veya `UpdateAsync` üzerinden güvenle işletiliyor.

## 6. Performans Takibi ve Değerlendirme (Adım 6)

### `PlanlamaApp.Domain.Entities.PerformanceRecord` & `DatabaseMigration`
* **Yeni Alan (`TeacherFeedback`):** Öğretmenin veya velinin öğrenci performansına geri bildirim (not) bırakabilmesi için `TeacherFeedback` string alanı eklendi.
* **Migration Güncellemesi:** `DatabaseMigration.cs` dosyasındaki `CREATE TABLE` sorgusu güncellendi ve mevcut veritabanlarına güvenle eklenebilmesi için `ALTER TABLE PerformanceRecords ADD COLUMN IF NOT EXISTS TeacherFeedback TEXT;` komutu eklendi.

### `PlanlamaApp.Infrastructure.Repositories.PerformanceRepository`
* **Sorgu Güncellemeleri:** `CreateAsync` (INSERT) ve `UpdateAsync` (UPDATE) metotlarındaki SQL sorgularına `TeacherFeedback` parametresi dahil edildi.

### `PlanlamaApp.Api.Controllers.PerformanceController`
* **IDOR ve Yetki Koruması (Observer):** `GetByCategory`, `GetById`, `Create`, `Update`, ve `Delete` uç noktalarının tamamına `HasAccessToUserAsync` metodu ile kimlik doğrulama zırhı eklendi. Gözlemciler (Veli/Öğretmen) yalnızca bağlı oldukları öğrencilerin kayıtlarını görebilir/düzenleyebilir.
* **Dinamik Net Puan Hesaplama:** Kullanıcıdan gelen Doğru/Yanlış oranına göre `NetScore = CorrectCount - (WrongCount / 4.0m)` formülü `Create` ve `Update` metotlarında sunucu tarafında hesaplanıp ezilerek DB'ye yazılması sağlandı.
* **Yetki Ayrıştırma (Update):** Performans kaydı güncellenirken, işlemi yapanın **öğrenci** mi yoksa **gözlemci (Observer)** mi olduğu ayırt edildi. Gözlemciler _yalnızca_ `TeacherFeedback` ekleyebilirken, öğrenci sadece Doğru/Yanlış sayısını ve kendi `Notes` alanını değiştirebilmekte, böylece veri bütünlüğü sağlanmaktadır.

## 7. AI Komut Motoru ve Çoklu Sağlayıcı Altyapısı (Adım 7)

### Abstraction ve Konfigürasyon
* **`IAiProvider` Arayüzü:** Herhangi bir modele (Vendor-Lock olmadan) geçiş yapabilmek adına, yapay zekaya komut gönderip `AiPlanResponse` dönecek standart `IAiProvider` arayüzü tasarlandı.
* **Sağlayıcı Sınıfları (Providers):** OpenAI API (gpt-4o-mini hedefli) ile tam uyumlu çalışan `OpenAiProvider` sınıfı ve Google Gemini API için taslak `GeminiProvider` sınıfları oluşturuldu.
* **Dependency Injection (DI):** `Program.cs` dosyasına `appsettings.json`'daki `AiSettings:ActiveProvider` ayarına bakarak (OpenAI veya Gemini) ilgili servisi `HttpClient` ile DI kapsayıcısına ekleyen dinamik Factory pattern kodlandı.

### Veri Modelleri ve Tool Schema
* **`AiDTOs.cs`:** Kullanıcı tarafı ile haberleşmek için `AiPlanRequest`, `AiPlanResponse` ve Tool çağrılarını strongly-typed yapıda tutan DTO'lar oluşturuldu.
* **`AiToolSchemas.cs`:** `create_task`, `create_task_chain`, `postpone_chain` araçlarının tanımlandığı, LLM'in anlaması için özel olarak formatlanmış C# JSON Schema modelleri (static) oluşturuldu.

### `PlanlamaApp.Api.Controllers.AiController`
* **`command-plan` (Kota düşmez):** Sadece ekip üyelerini çekip sistemi zenginleştirerek (context) LLM'e araç seçtiren uç nokta oluşturuldu. Veritabanına dokunmaz.
* **`command-execute` (Execution Phase):** LLM'den gelen ve onaylanan planı (`AiToolCall` array) sırayla işler. İşleme başlamadan önce kotayı kontrol eder ve düşer. Tüm işlemleri `IDbTransaction` içinde yapar; hata çıkarsa hepsini geri alır (`Rollback`). `HandleCreateTask`, `HandleCreateTaskChain` ve `HandlePostponeChain` yardımcı metotları ile DTO - Repository bağlantısını kurar.

 -   ` I Q u o t a M a n a g e r `   a r a y � z �   v e   i m p l e m e n t a s y o n u ,   d 1_a r 1d a n   ` I D b T r a n s a c t i o n `   a l a c a k   _e k i l d e   g e n i _l e t i l d i . 
 -   ` U s a g e T r a c k i n g R e p o s i t o r y ` ,   i _l e m l e r i n i   ( I n c r e m e n t / D e c r e m e n t )   T r a n s a c t i o n   � z e r i n d e n   y � r � t m e y e   u y g u n   h a l e   g e t i r i l d i . 
 
 # #   [ 2 0 2 6 - 0 8 - 0 3 ]   S e c u r i t y   &   L o g i c   A u d i t   F i x e s   ( 1 4 - P o i n t   P l a n ) 
 -   * * I D O R   K o r u m a s 1: * *   ` A i C o n t r o l l e r . H a n d l e P o s t p o n e C h a i n `   m e t o d u n a   g � r e v   s a h i b i   d o r u l a m a   e k l e n d i . 
 -   * * A I   R u n a w a y   K o r u m a s 1: * *   A I   p l a n 1n d a   t e k   s e f e r d e   1 0 `  
 '  
 d a n   f a z l a   ` c r e a t e _ t a s k `   o l u _t u r u l m a s 1  e n g e l l e n d i . 
 -   * * Y e t k i   A _1m 1  K o r u m a s 1  ( P r i v i l e g e   E s c a l a t i o n ) : * *   ` T a s k s C o n t r o l l e r . C r e a t e C h a i n `   m e t o d u n d a   � r e n c i l e r i n   s t a t i k   ` I s T e a c h e r A s s i g n e d   =   t r u e `   a t a m a s 1  v e   b a _k a   w o r k s p a c e   � y e l e r i n e   g � r e v   a t a m a s 1  e n g e l l e n d i . 
 -   * * T o k e n   T h e f t   K o r u m a s 1: * *   ` A u t h C o n t r o l l e r `   G o o g l e   L o g i n   e n d p o i n t `  
 '  
 i n d e   ` A u d i e n c e `   d o r u l a m a s 1  a k t i f l e _t i r i l d i   ( ` A u t h e n t i c a t i o n : G o o g l e : C l i e n t I d s ` ) . 
 -   * * M e m o r y   L e a k   &   F a l s e   S u c c e s s   F i x   ( I d e m p o t e n c y ) : * *   ` I d e m p o t e n c y F i l t e r `   i � i n d e k i   ` S e m a p h o r e S l i m `   y a p 1s 1  r e f e r a n s   s a y a c 1n a   ( R e f C o u n t )   b a l a n d 1  v e   b e l l e k   s 1z 1n t 1s 1  � � z � l d � .   S a d e c e   ` S t a t u s C o d e   > =   2 0 0   & &   S t a t u s C o d e   <   3 0 0 `   o l a n   i s t e k l e r i n   I d e m p o t e n c y   o l a r a k   k a y d e d i l m e s i   s a l a n d 1. 
 -   * * S Q L i t e   D a t a   I n t e g r i t y : * *   B o o l e a n   i f a d e l e r i n d e k i   S Q L i t e   u y u m s u z l u u   ( ` I s C o m p l e t e d   =   f a l s e `   - >   ` =   0 ` )   g i d e r i l d i .   E r t e l e m e   e s n a s 1n d a   ` O r i g i n a l D e a d l i n e `  
 '  
 1n   � z e r i n e   y a z 1l m a s 1  e n g e l l e n d i . 
 -   * * M u l t i - T e n a n t   S a f e t y : * *   C a s c a d e   s i l m e l e r d e   ` T e n a n t I d `   z o r u n l u l u u   s a l a n d 1  v e   ` B a s e R e p o s i t o r y . I n j e c t T e n a n t F i l t e r `   k a r m a _1k   s o r g u l a r a   ( U N I O N   v b . )   k a r _1  g � v e n l i   h a l e   g e t i r i l d i . 
 -   * * Q u o t a   F a l l b a c k : * *   D B `  
 '  
 d e n   A I   l i m i t i   g e l m e d i i n d e   s i s t e m i n   k i l i t l e n m e s i n i   e n g e l l e m e k   i � i n   v a r s a y 1l a n   f a l l b a c k   d e e r i   e k l e n d i .  
 
 # #   6 .   F r o n t e n d :   P h a s e   9   ( A I   C o m m a n d   M o d a l ) 
 *   * * A P I   S e r v i s   K a t m a n 1  ( ` a i S e r v i c e . j s ` ) : * *   B a c k e n d `  
 '  
 d e k i   ` / a p i / a i / c o m m a n d - p l a n `   v e   ` / a p i / a i / c o m m a n d - e x e c u t e `   u � l a r 1n a   b a l a n a n   s e r v i s   y a z 1l d 1.   I d e m p o t e n c y - K e y   i n t e r c e p t o r `  
 '  
 d a n   f a y d a l a n 1l a r a k   � i f t e   k a y 1t l a r   � n l e n d i . 
 *   * * A k 1l l 1  M o d a l   ( ` A i C o m m a n d M o d a l . j s x `   &   C S S   M o d u l e s ) : * *   0k i   a _a m a l 1,   s � r g � l e r l e   ( s l i d e r )   z i n c i r   u z u n l u u   ( 1 - 5 )   v e   s o r u   s a y 1s 1n 1n   ( 1 - 5 0 )   b e l i r l e n d i i ,   c a m   e f e k t i   ( G l a s s m o r p h i s m )   b a r 1n d 1r a n   m o d a l   k o d l a n d 1.   O n a y   a _a m a s 1n d a   y a p a y   z e k a n 1n   t a s a r l a d 11  T o o l C a l l `  
 '  
 l a r   l i s t e l e n e r e k   k u l l a n 1c 1y a   s e � i m   y a p m a   ( C h e c k b o x )   i m k a n 1  s u n u l d u . 
 *   * * E n t e g r a s y o n : * *   ` D a s h b o a r d . j s x `   v e   ` S m a r t A s s i s t a n t . j s x `   g � n c e l l e n e r e k   F A B   b u t o n u n u n   d o r u d a n   A I   M o d a l 1n 1  t e t i k l e m e s i   s a l a n d 1.   N a t i v e   u y u m l u l u k   i � i n   ` [ M O B I L E _ P O R T _ T O D O ] `   e t i k e t l e r i   d � _� l d � . 
 *   * * B a 1m l 1l 1k l a r : * *   T o a s t   b i l d i r i m l e r i   i � i n   ` r e a c t - h o t - t o a s t `   k � t � p h a n e s i   N P M   � z e r i n d e n   p r o j e y e   d a h i l   e d i l d i .  
 
 # #   7 .   A u t h :   F i r e b a s e   D e - i n t e g r a t i o n   &   D i r e c t   G o o g l e   I d e n t i t y   S e r v i c e s   ( G I S ) 
 *   * * P a k e t   B a 1m l 1l 1k l a r 1: * *   F i r e b a s e   t a m a m e n   s � k � l d �   ( ` f i r e b a s e `   u n i n s t a l l e d ) .   Y e r i n e   r e s m i   ` @ r e a c t - o a u t h / g o o g l e `   k u r u l d u .   P a k e t   b o y u t u n d a   1 1 1   K B   t a s a r r u f   s a l a n d 1. 
 *   * * F r o n t e n d   E n t e g r a s y o n u : * *   ` s r c / c o n f i g / g o o g l e A u t h . j s `   o l u _t u r u l d u .   ` m a i n . j s x `   ` < G o o g l e O A u t h P r o v i d e r > `   i l e   s a r m a l a n d 1.   ` A u t h M o d a l . j s x `   r e s m i   ` G o o g l e L o g i n `   b i l e _e n i   i l e   g � n c e l l e n d i . 
 *   * * B a c k e n d   U y u m : * *   G o o g l e `  
 '  
 d a n   a l 1n a n   ` c r e d e n t i a l `   ( I D   T o k e n )   ` / a p i / a u t h / g o o g l e `   u c u n a   i l e t i l d i .   C #   b a c k e n d   ` G o o g l e J s o n W e b S i g n a t u r e `   d o r u l a m a s 1  v e   ` H t t p O n l y   C o o k i e `   J W T   o t u r u m u   s o r u n s u z   � a l 1_t 1. 
 *   * * D e r l e m e : * *   ` n p m   r u n   b u i l d `   0   H a t a   i l e   6 3 5 m s `  
 '  
 d e   b a _a r 1y l a   d e r l e n d i .  
 