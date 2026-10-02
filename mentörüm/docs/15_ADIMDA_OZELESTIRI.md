# 🕵️‍♂️ Mentörüm — 15 Aşamalı Derin Öz-Eleştiri ve Risk Analizi
> **Tarih:** 23 Eylül 2026
> **Amaç:** Ürün ve Kod planlarını tekrar tekrar (15 kez) okuyarak, gelecekte kullanımda veya kodlama aşamasında yaşanabilecek "görünmez" hataları, mantık açıklarını ve mimari problemleri tespit etmek. Dosyaları değiştirmeden, tüm bulguları burada topluyoruz.

---

### 🔄 Döngü 1: Veri Modeli — Ödev Atama Mantığı (Tamamlanma Durumu)
* **Sorun:** Ödevler `PENDING` veya `DONE` (ikili durum) olarak tutuluyor. Peki ya öğretmen 50 sayfalık ödev verirse ve öğrenci "yarısını yaptım" demek isterse? Şu anki modelde kısmi tamamlama yok.
* **Kodlama Riski:** İleride "İlerleme Yüzdesi" eklendiğinde `Status` kolonu yetersiz kalacak.
* **Çözüm Notu:** MVP için ikili durum kalsa bile, veri modeline `CompletionPercentage` (0-100) eklemek, ileride büyük bir refactor'ı önler.

### 🔄 Döngü 2: Güvenlik — Dapper ve BaseRepository İzolasyonu
* **Sorun:** Planlarda `BaseRepository`'nin `WHERE coach_id = @id` ekleyeceği yazıyor. Ancak Entity Framework aksine, Dapper'da sorguları string olarak yazıyoruz. Geliştirici manuel olarak SQL stringine `AND CoachId = @Id` eklemeyi unutursa, doğrudan IDOR açığı oluşur.
* **Kodlama Riski:** İnsan hatasına çok açık bir yapı.
* **Çözüm Notu:** Kodlama sırasında Dapper ile birlikte `SqlBuilder` kullanılmalı veya tüm okuma/yazma işlemleri `BaseRepository` içindeki generic metodlar üzerinden geçmeli (örneğin `GetByIdAsync(id, coachId)`). Geliştiricinin raw SQL yazarken tenant_id unutma ihtimali sistemsel olarak engellenmeli.

### 🔄 Döngü 3: Veli Mahremiyeti (Boşanmış/Ayrı Veliler)
* **Sorun:** `StudentParents` tablosunda Veli 1 ve Veli 2 var. Ebeveynler ayrı olabilir ve birbirlerinin iletişim bilgilerini (telefon/e-posta) görmemeleri gerekebilir.
* **Kodlama Riski:** Veli sisteme girdiğinde `/api/me/children/1` endpoint'i öğrenci bilgisini dönerken yanlışlıkla diğer velinin iletişim bilgilerini de JSON içinde dönebilir.
* **Çözüm Notu:** Veli rolü için hazırlanan DTO (Data Transfer Object), diğer velilerin iletişim bilgilerini kesinlikle maskelemeli/çıkarmalıdır.

### 🔄 Döngü 4: Offline Kullanım ve Mobil Entegrasyon (Capacitor)
* **Sorun:** Öğrenci interneti kesikken ödevi "Tamamladım" olarak işaretlerse ne olacak? Zustand state güncellenir ama Axios isteği patlar.
* **Kodlama Riski:** Uygulama yeniden açıldığında sunucudaki `PENDING` durumu ile UI'daki `DONE` durumu çakışır (Stale Data).
* **Çözüm Notu:** Kodlama planında sadece `Zustand` ve `Axios` denmiş. API'den gelen veriyi yönetmek için `React Query` veya `SWR` gibi bir "Server State Management" aracı eklenmeli. Aksi takdirde cache senkronizasyonu geliştiriciyi çok yoracaktır.

### 🔄 Döngü 5: Performans — Takvim Endpoints
* **Sorun:** Koç takviminde tüm öğrencilerin ödevleri renk kodlu görünecek. Koçun 50 öğrencisi varsa ve aylık bakıyorsa, yüzlerce ödev ataması demek.
* **Kodlama Riski:** Takvim endpoint'i (`GET /calendar`) tüm ödevleri çekerse Payload boyutu MB'ları bulur, veritabanı yavaşlar.
* **Çözüm Notu:** Takvim endpoint'i KESİNLİKLE zorunlu `startDate` ve `endDate` parametreleri almalı. "Tüm zamanların" takvim verisini çeken bir endpoint asla yazılmamalı.

### 🔄 Döngü 6: İş Mantığı — Ödev Şablonunu Düzenlemek
* **Sorun:** Koç bir ödev şablonu (Örn: Sayfa 10-20) oluşturup 5 öğrenciye atadı. Ertesi gün hata yaptığını fark edip şablonu "Sayfa 10-30" olarak güncelledi.
* **Kodlama Riski:** Öğrencilerden 2'si ödevi zaten eski haline göre tamamlamışsa ne olacak? Referans ile `HomeworkTemplates`'e bağlı oldukları için bitirdikleri ödev aniden "Sayfa 10-30" olarak değişecek ve itiraz edecekler.
* **Çözüm Notu:** Ödev atandığı anda, atama (Assignment) tablosu şablonun sadece ID'sini değil, o anki Başlık, Açıklama ve Kaynak bilgisinin bir *snapshot'ını* (kopyasını) almalıdır.

### 🔄 Döngü 7: Bildirim Yükü (Spike) ve Cron Job
* **Sorun:** Saat gece 00:05'te Cron Job çalışıp "Gecikmiş Ödevleri" buluyor ve bildirim atıyor. 1000 öğrencinin ödevi gecikmişse, aynı saniye içinde 1000 Push Notification isteği gider.
* **Kodlama Riski:** Firebase (FCM) veya APNs rate limitlerine takılır. Veritabanı CPU'su anlık %100'e vurabilir.
* **Çözüm Notu:** Background Worker (örneğin Hangfire veya Quartz.NET) bildirimleri chunk'lar (100'erli paketler) halinde ve aralarına kısa gecikmeler koyarak işlemelidir.

### 🔄 Döngü 8: Kimlik Doğrulama — Soft Delete ve Token Geçerliliği
* **Sorun:** Koç bir öğrencinin ilişiğini kesti (Soft delete: `IsActive = 0`). Ancak öğrencinin o an elinde 15 dakikalık geçerli bir Access Token var.
* **Kodlama Riski:** Öğrenci 15 dakika boyunca API'ye erişip veri çekmeye devam edebilir.
* **Çözüm Notu:** JWT Validation Middleware'i, her istekte Cache (Redis veya In-Memory) üzerinden kullanıcının/öğrencinin anlık `IsActive` durumunu hızlıca kontrol etmelidir. JWT imzasının doğru olması yetmez.

### 🔄 Döngü 9: Sınav Sonuçları — JSONB Yapısı
* **Sorun:** `ExamResults.Scores` JSONB olarak planlandı (`{"mat": 20, "tur": 30}`). Ancak yeni bir sınav türü geldiğinde veya ders isimleri değiştiğinde raporlama çok zorlaşır.
* **Kodlama Riski:** Koç "Geçen aydan bu yana matematik netleri ne kadar arttı?" demek istediğinde, SQL'de JSONB içinden dinamik field ayıklamak (->> 'mat') karmaşık ve hataya açıktır.
* **Çözüm Notu:** JSONB esnektir ama analitik için kötüdür. Belki de `ExamScores` adında ilişkisel bir tablo (ExamId, SubjectCode, Score) daha doğru bir kodlama yaklaşımı olacaktır. Bunu kodlarken tekrar masaya yatırmalıyız.

### 🔄 Döngü 10: R2 Presigned URL Zaman Aşımı UX'i
* **Sorun:** Presigned URL ömrü 1 saat. Öğrenci sayfayı açık bıraktı, 2 saat sonra resmi büyütmek için tıkladı.
* **Kodlama Riski:** Resim yüklenemez, 403 hatası alır. Öğrenci uygulamanın bozulduğunu düşünür.
* **Çözüm Notu:** Frontend'de Axios interceptor veya Image bileşeni 403 Forbidden alırsa, sessizce arkadan yeni bir Presigned URL talep edip resmi yeniden render etmelidir.

### 🔄 Döngü 11: Idempotency (Mükerrer İstekler) - Kural İhlali Riski
* **Sorun:** Kural dosyasında (AGENTS.md) finansal veya kritik işlemlerde Idempotency zorunlu kılınmış. Öğrenci internet yavaşken "Ödevi Tamamla" butonuna 5 kez üst üste basarsa ne olur?
* **Kodlama Riski:** Ödev 5 kez tamamlanmış gibi loglanabilir, koça 5 ayrı bildirim gidebilir.
* **Çözüm Notu:** Ödev tamamlama (`PATCH /api/homework/:id/complete`) işlemi KESİNLİKLE Idempotent olmalıdır. İstek ID'si veya durum kontrolü yapılarak mükerrer bildirim engellenmeli.

### 🔄 Döngü 12: Veli Davet Linki Süresi
* **Sorun:** Davet linki 48 saat geçerli. Veli maili görmedi ve süre doldu.
* **Kodlama Riski:** Koç, veliyi tekrar ekleyemez çünkü veritabanında veli e-postası `StudentParents` tablosunda zaten mevcut (ama onaylanmamış).
* **Çözüm Notu:** API'de KESİNLİKLE bir `POST /api/invites/resend` endpoint'i olmalı ve bu endpoint süresi dolmuş token'ı ezip yeni bir token oluşturabilmelidir.

### 🔄 Döngü 13: Müfredat ve Sınıf Atlatma
* **Sorun:** Ağustos ayı geldi, 11. sınıf öğrencisi 12. sınıf oldu. Koç öğrencinin sınıfını güncelledi.
* **Kodlama Riski:** 11. sınıfa ait olan eski ödevlerin konuları (`CurriculumTopicId`) 12. sınıf ders sayfasında hata verebilir.
* **Çözüm Notu:** Ders sayfası tasarlanırken, ödevlerin gösterildiği sekme "Sadece o anki sınıfın konularını" değil, "Öğrencinin geçmişteki tüm ödevlerini" hatasız render edebilmelidir. Eski konu listesi de ulaşılabilir olmalıdır.

### 🔄 Döngü 14: Timezone Uyuşmazlığı
* **Sorun:** Sunucu (Neon/Fly.io) UTC çalışıyor. Koç "Cuma 23:59'a kadar" ödev verdi. Öğrencinin cihazı Azerbaycan'da (UTC+4).
* **Kodlama Riski:** Öğrenciye ödevin "Cumartesi 00:59"da biteceği gösterilir veya gece 00:05'te çalışacak Cron Job, öğrencinin saatine göre erken/geç çalışır.
* **Çözüm Notu:** Tarih/saat işlenirken KESİNLİKLE frontend'de `date-fns-tz` gibi bir kütüphane kullanılmalı, veritabanına giden her veri UTC olmalı ve Koç'un belirlediği "Gün sonu (23:59)" kavramı, koçun timezone'una göre `DateTimeOffset` olarak saklanmalıdır.

### 🔄 Döngü 15: "Yalnızca Koça Görünür" Alanların Sızması (Over-fetching)
* **Sorun:** Koç notları, öğrenci profiline ait. REST API'lerde genellikle `GET /student/1` tüm varlığı (Entity) döner.
* **Kodlama Riski:** AutoMapper veya Select sorgusu kullanılırken `CoachNotes` alanı yanlışlıkla DTO'ya maplenirse, frontend bunu göstermese bile Network tabında öğrenci bunu okuyabilir.
* **Çözüm Notu:** Kodlama aşamasında `StudentDto` ve `StudentDetailDto` (öğrenci için) ile `CoachStudentDto` (Koç için) KESİNLİKLE ayrı sınıflar olarak tanımlanmalıdır. Hatta koç notları tamamen ayrı bir API endpoint'ine (`/api/students/:id/notes`) ayrılmalıdır ki kazara data sızıntısı ihtimali %0 olsun. (Plan bunu ayrı endpoint yapmıştı, bunun ne kadar kritik olduğu bu öz-eleştiride tekrar doğrulandı).

---

# 🤖 Ajan Tartışması: Sonnet vs Gemini
> **Kural:** İki ajan mevcut planları ve öz-eleştiri bulgularını okuyarak birbiriyle tartışıyor.
> Her ajan kendi perspektifini savunuyor, karşı argümanı çürütmeye çalışıyor.
> Tartışmanın sonunda her konuda bir **KARAR** çıkıyor.
> Planlar değiştirilmiyor — bu tartışmanın çıktısı KOD_PLANI.md güncellemesinde referans alınacak.

---

## 🔴 Konu 1: State Management — Zustand+Axios mu, React Query mi?

**🟣 SONNET:**
Zustand planı yeterli. Sebeplerim:
- Mentörüm MVP aşamasında. React Query öğrenme eğrisi var, ekip sürüklenir.
- Zustand zaten Capacitor uyumlu olduğu için planlandı. React Query'nin mobile'da cache invalidation'ı öngörülemeyen şekillerde davranabiliyor.
- Offline durumu için Zustand + optimistic update yazılabilir: önce local state'i güncelle, API'ye at, hata gelirse geri al. Bu 50 satır kod — ek kütüphane gerektirmiyor.
- YAGNI ilkesi: "Şimdi karmaşık, belki lazım olur" düşüncesi over-engineering'dir.

**🟡 GEMİNİ:**
Hayır, tam burada yanılıyorsun. Öz-eleştiri Döngü 4'ü okudun mu?
- Öğrenci çevrimdışıyken "Tamamla" basıyor → Zustand `DONE` yazıyor → internet geldiğinde API hata veriyor → sen "geri al" diyorsun ama UI'da öğrenci zaten "Tamamlandı" yazısını gördü, bir daha basmayacak.
- Optimistic update'i Axios interceptor ile elle yazmak, tam olarak React Query'nin var olma sebebidir. `useMutation` + `onError` geri alımı, `useQuery` ile background refetch — bunlar 3 satır kod.
- Üstelik koç aynı anda 3 sekmede açık çalışabilir. Zustand sayfalar arası cache'i senkronize edemez — React Query'nin `queryClient.invalidateQueries()` bunu otomatik halleder.
- Capacitor uyumluluğu: React Query v5 native mobile'da sorunsuz çalışır, endişe edilecek bir şey yok.

**🟣 SONNET yanıt:**
"3 sekme" senaryosu gerçekçi değil — bu bir öğrenci takip uygulaması, kullanıcı aynı anda 3 sekme açmaz. Ama offline senaryona hak veriyorum. Zustand + manuel optimistic update yazmak, spagetti koda dönüşme riski taşıyor — haklısın.

**🟡 GEMİNİ yanıt:**
Koç aynı anda öğrenci listesini ve takvimi ayrı sekmelerde açar — bu çok gerçekçi. Ve evet, en azından offline state senkronizasyonu için React Query kazanıyor.

> **✅ KARAR: React Query eklenir.** Zustand yalnızca auth state ve UI state (modal açık/kapalı gibi) için kalır. Server state'i React Query yönetir. Plana eklenecek.

---

## 🔴 Konu 2: ExamScores — JSONB mi, İlişkisel Tablo mu?

**🟡 GEMİNİ:**
Öz-eleştiri Döngü 9'da kendim de yazdım: JSONB analitik için kötü. Pişmanlık yaratmadan önce `ExamScores` ilişkisel tablo olsun:
```
ExamScores (ExamId UUID, SubjectCode TEXT, Score NUMERIC, MaxScore NUMERIC)
```
Böylece "matematik netleri" sorgusu basit bir `WHERE SubjectCode = 'mat'` oluyor. JSONB ile `->> 'mat'` cast etmek, tip güvenliği yok, typo yaptın mı (`'Math'` vs `'mat'`) sorgu sessizce boş döner.

**🟣 SONNET:**
Dur — planda JSONB seçilmesinin sebebi vardı: sınav türleri farklı. TYT'de `mat, tur, fen, sosyal` var. AYT SAY'da `mat, fiz, kim, bio` var. LGS'de bambaşka dersler var. Toplam 6+ farklı sınav türü. İlişkisel tabloda her sınav türü için farklı kolonlar açacak mısın?

**🟡 GEMİNİ:**
Hayır, `SubjectCode` TEXT alanı tam bu yüzden var. TYT için `('mat', 'tur', 'fen', 'sosyal')`, AYT SAY için `('mat', 'fiz', 'kim', 'bio')` — hepsi aynı tabloya farklı satırlar olarak giriyor. Ekstra kolon yok. Bir sınav için ortalama 4-8 satır — tabloya yük değil.

**🟣 SONNET:**
Tamam, ama o zaman esneklik kaybolmuyor mu? `ExamType` tablosu da mı gerekiyor? `SubjectCode`'ların geçerli değerleri nerede tanımlanacak?

**🟡 GEMİNİ:**
`ExamTypes` tablosu + `SubjectCodes` tablosu. Müfredat zaten veritabanında tutuluyorsa bu tablolar zaten var. Referential integrity için `SubjectCode → CurriculumSubjects.Code` FK eklenebilir. Fazladan 2 tablo, ama tip güvenliği kazanıyoruz.

**🟣 SONNET:**
Katılıyorum. Tek itirazım şu: Bu 2 ekstra tablo, başlangıçta "basit tut" prensibine aykırı. Ama analitiği düşününce haklısın — MVP'de bile koçun grafik görmek isteyeceği açık.

> **✅ KARAR: ExamScores ilişkisel tablo olur.** `(ExamId, SubjectCode, Score, MaxScore)`. SubjectCode için ayrı enum/tablo tanımlanır. JSONB yaklaşımı tamamen terk edilir. KOD_PLANI veri modeli güncellenmeli.

---

## 🔴 Konu 3: Ödev Şablonu — Snapshot mı, Sadece FK mı?

**🟣 SONNET:**
Öz-eleştiri Döngü 6'da snapshot önerilmiş. Ben karşıyım. Şablonu değiştirince atamaları da güncellemek ister koç — bu normal bir davranış. "Tümünü güncelle" butonu yeterli.

**🟡 GEMİNİ:**
"Tümünü güncelle" seçeneği kullancıya sunulabilir, ama DEFAULT davranış snapshot olmalı. Sebep: Öğrenci A ödevi tamamlamış, koç şablonu güncelliyor. A'nın tamamladığı şey artık var olmayan bir içerik için. Bu log tutarsızlığı — "hangi versiyonu yaptı?" sorusu yanıtsız kalıyor. Eğitimde bu kritik.

**🟣 SONNET:**
O zaman şöyle bir uzlaşı: Atamada `SnapshotTitle`, `SnapshotDescription`, `SnapshotSource` alanları olsun. Şablon güncellenince eski atamalar bundan etkilenmesin. Koça "Bu şablonu güncellemek istersen, zaten atanmış ödevler değişmez, yeni atamalar yeni versiyonu kullanır" şeklinde bilgilendirme gösterilebilir.

**🟡 GEMİNİ:**
Tam olarak. Buna ek olarak `HomeworkTemplates`'e `Version` alanı eklenirse, hangi versiyonun atandığı izlenebilir. İleride "revizyon geçmişi" özelliği de mümkün olur.

> **✅ KARAR: HomeworkAssignments tablosuna `SnapshotTitle`, `SnapshotDescription`, `SnapshotSource` eklenir.** Şablon değişikliği eski atamaları etkilemez. Opsiyonel: `TemplateVersion INTEGER` ile versiyon takibi.

---

## 🔴 Konu 4: IDOR Koruması — Dapper ile BaseRepository Nasıl Zorunlu Yapılır?

**🟡 GEMİNİ:**
Döngü 2'de belirttiğim gibi: Dapper'da `WHERE CoachId = @id` yazmayı unutmak insan hatasıdır. `SqlBuilder` önerdim ama şöyle daha iyi bir yapı var: Her repository metodu `coachId` parametresi ALMAK ZORUNDA olsun — `GetStudentByIdAsync(studentId, coachId)`. Eğer imzada `coachId` yoksa code review'da reddedilir.

**🟣 SONNET:**
Zorunlu parametre iyi ama yeterli değil. İmzada `coachId` var ama geliştirici SQL'e eklemeyi unutabilir. Daha güçlü: `BaseRepository<T>` abstract class'ında `ExecuteWithTenantAsync(string sql, object param, Guid coachId)` şeklinde bir wrapper metodu olsun. Bu metot, gelen SQL'e otomatik `AND coach_id = @TenantId` ekler — SqlBuilder ile.

**🟡 GEMİNİ:**
Bu Interceptor pattern. İyi ama riskli: gelen SQL'in `WHERE` clause'u var mı yok mu? Otomatik ekleme JOIN içeren sorgularda yanlış tabloya ekleme yapabilir. Daha güvenli: Repository metodları içinde `Dapper.SqlBuilder` ile şablon oluşturulsun, tenant filtresi template içinde zorunlu yer alsın — boş bırakılamaz çünkü compile-time değil, test zamanı yakalanır.

**🟣 SONNET:**
O zaman şöyle: Her SELECT şablonu `/**where**/` placeholder'ı taşısın, `BaseRepository` bu placeholder'a en az `WHERE coach_id = @CoachId` eklemeden `ExecuteAsync` çağrısına izin vermesin. Unit test ile de desteklensin — `coachId` olmadan sorgu atan test fail etsin.

**🟡 GEMİNİ:**
Bu yaklaşım makul. Ek öneri: Integration test'te, Koç A'nın token'ıyla Koç B'ye ait öğrenciye erişim isteği `403` dönüyor mu — bunu test eden bir `CrossTenantSecurityTest` suit'i zorunlu olsun.

> **✅ KARAR: `BaseRepository<T>` içinde `SqlBuilder` ile zorunlu tenant filtresi. `ExecuteWithTenantAsync(sql, param, coachId)` wrapper'ı. Cross-tenant security integration testleri suite olarak kodlanacak.**

---

## 🔴 Konu 5: Bildirim Yükü — Hangfire mi, Basit Cron mu?

**🟣 SONNET:**
MVP için Hangfire aşırı mühendislik. ASP.NET Core'un `BackgroundService` sınıfı ve `IHostedService` ile basit bir cron loop yazılabilir. 100 öğrenci için yeterli.

**🟡 GEMİNİ:**
"100 öğrenci için yeterli" şu an. 6 ay sonra 1000 öğrenci. `IHostedService` bir kez patlamaya görsün — hata loglanmaz, job yeniden çalışmaz, sessizce kaybolur. Hangfire'ın tek avantajı job kalıcılığı: veritabanına yazıyor, yeniden başlatmada kaldığı yerden devam ediyor, retry mekanizması built-in.

**🟣 SONNET:**
Hangfire'ın Neon ile uyumunu test ettik mi? Hangfire PostgreSQL desteği var ama ekstra tablo gerektiriyor — şema kirliliği.

**🟡 GEMİNİ:**
Hangfire schema'sı ayrı bir PostgreSQL schema'sına (`hangfire.*`) izole edilebilir. Neon ile uyumlu. Ama sen haklısın — MVP'de gereksiz. Uzlaşı: MVP'de `IHostedService` + try-catch + Serilog ile hata logla. İlk büyüme sinyalinde (500+ kullanıcı) Hangfire'a taşı. Kod `IJobScheduler` arayüzü arkasına saklanırsa geçiş tek dosya değişimi.

**🟣 SONNET:**
`IJobScheduler` interface'i — bu YAGNI değil, bu gerçekten gelecekte faydalı soyutlama. Çünkü Provider değiştirmek istersen (Quartz, Hangfire, Coravel) implementasyonu değiştiriyorsun, çağıran kod değişmiyor.

> **✅ KARAR: MVP'de `IHostedService` + `IJobScheduler` interface soyutlaması. Implementasyon değiştirilebilir. İlk canlı kullanımda Hangfire'a geçiş planlanır. Chunk boyutu: her 100 öğrenci için 500ms ara.**

---

## 🔴 Konu 6: CompletionPercentage — MVP'ye mi Giriyor?

**🟡 GEMİNİ:**
Döngü 1'de önerildi. Kolon eklemek maliyetsiz: `completion_percentage SMALLINT DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100)`. İleride eklemek zorunda kalırsan migration yazıyorsun, var olan datayı güncellemen gerekiyor. Şimdi koy, UI'da kullanma.

**🟣 SONNET:**
UI'da kullanmayacaksan veritabanına koymak anlamsız. "Yarın lazım olabilir" mantığı over-engineering'in ta kendisi. Status = DONE zaten %100 anlamına geliyor.

**🟡 GEMİNİ:**
"Şimdi koy, UI'da kullanma" ile "over-engineering" arasındaki fark şu: Bir INT kolon, 0 byte maliyetle gelir, migration riski yoktur. Ama ileride eklenince `DEFAULT 0` ile doldurulan geçmiş veriler anlamsız — "Bu ödev yarı bitik miydi, yoksa hiç başlanmamış mıydı?" sorusu yanıtsız kalır.

**🟣 SONNET:**
Bu argüman tutarlı. Peki ya null? `NULL` = bilgi yok, `0` = başlanmadı, `100` = bitti. Nullable integer daha semantik.

**🟡 GEMİNİ:**
Nullable integer kabul. `completion_percentage SMALLINT NULL` — koç veya öğrenci girmezse NULL, girerse 0-100.

> **✅ KARAR: `HomeworkAssignments` tablosuna `completion_percentage SMALLINT NULL` eklenir. UI MVP'de göstermez ama veri toplanır. Güzel bir migration önlenir.**

---

### 🔄 Döngü 16: Güvenlik Açıkları (IDOR) ve Mimari Kırılganlıklar (Sonnet Review Sonrası Gemini Özeleştirisi)
* **Sorun (IDOR):** Ödev tamamlama (`/complete`), ödev atama (`AssignHomework`) ve sınav ekleme (`ExamRepository`) işlemlerinde koç/öğrenci sahiplik kontrolleri (ownership checks) atlanmıştı.
* **Sorun (Transaction):** Kullanıcı kaydı (`/register`) gibi kritik ve birden çok tabloya (users, coaches) veri yazan işlemler Transaction (BeginTransaction) içerisine alınmamıştı. İlk tabloya yazılıp ikinci tabloda hata çıksaydı veri tutarsızlığı oluşacaktı.
* **Sorun (Mimari):** `RefreshToken` JSON içinde güvensiz dönüyordu, `BaseRepository` ek koşullar için (`additionalWhere`) destek sunmuyordu ve mükerrer istek (`Idempotency`) filtresi başarısız istekleri de cache'leyip tekrarı engelliyordu.
* **Gözden Kaçma Nedeni (Özeleştiri):** MVP (Minimum Viable Product) telaşı ve "çalışan kod" üretme odağı, güvenlik ve sınır durumlarını (edge cases) arka plana itti. Kodun "happy path" (hatasız senaryo) üzerinde doğru çalışmasına odaklanılıp, kötü niyetli kullanıcıların veya asenkron veritabanı hatalarının (transaction eksikliği) oluşturabileceği riskler göz ardı edildi. Dapper ile manuel SQL yazmanın getirdiği esneklik, tenant izolasyonu (`coach_id` filtresi) prensibinin Repository içindeki bazı metotlarda unutulmasına (insan hatası) yol açtı.
* **Çözüm Notu:** Güvenlik ve veri bütünlüğü MVP'nin sonrasına bırakılamaz. Gelecek projelerde alınacak dersler:
  1. Her UPDATE/INSERT işleminde mutlaka sahiplik (ownership) kontrolü standart olarak metodun ilk satırlarına yazılacak.
  2. Birden fazla tabloyu etkileyen her veritabanı bloğu istisnasız `using var tx = conn.BeginTransaction()` ile sarılacak.
  3. Authentication yapıları (Token, Cookie), test aşamasında bile doğrudan üretim (production) standartlarında kodlanacak.

---

## 📋 Tartışma Özeti — Alınan Kararlar

| # | Konu | Sonnet'in Tutumu | Gemini'nin Tutumu | Karar |
|---|------|-----------------|-------------------|-------|
| 1 | State Management | Zustand yeterli | React Query şart | React Query (server state), Zustand (UI state) |
| 2 | ExamScores | JSONB esnek | İlişkisel tablo analitik için şart | İlişkisel tablo (ExamId, SubjectCode, Score) |
| 3 | Ödev Snapshot | Gereksiz, güncelle butonu yeterli | Snapshot şart | Snapshot alanlar + TemplateVersion |
| 4 | IDOR Koruması | Zorunlu parametre yeterli | SqlBuilder wrapper zorunlu | BaseRepository + SqlBuilder + CrossTenant test suite |
| 5 | Bildirim Cron | IHostedService yeterli | Hangfire şart | IHostedService + IJobScheduler interface (swap edilebilir) |
| 6 | CompletionPercentage | Over-engineering | Migration önlemek için koy | Nullable SMALLINT, UI'da kullanılmaz ama eklenir |

> **Sonraki adım:** Bu 6 karar, `KOD_PLANI.md` içindeki Veri Modeli, API Listesi ve Teknoloji Yığını bölümlerine yansıtılacak.

