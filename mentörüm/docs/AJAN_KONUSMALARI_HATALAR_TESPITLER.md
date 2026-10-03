# 🕵️‍♂️ Mentörüm — Ajan Konuşmaları, Hatalar & Tespitler
> **Tarih:** 23 Eylül 2026
> **Amaç:** Ürün ve Kod planlarını tekrar tekrar (15 kez) okuyarak, gelecekte kullanımda veya kodlama aşamasında yaşanabilecek "görünmez" hataları, mantık açıklarını ve mimari problemleri tespit etmek. Dosyaları değiştirmeden, tüm bulguları burada topluyoruz.

---

## ⏱️ ZORUNLU KURAL — Her Kayıt Tarih/Saat İçermelidir
> **Kural:** Bu dosyaya (ve bu projede bundan sonra yazılacak HER dokümana/kayda) eklenen her yeni girdi, mutlaka **tarih ve saat** içermelidir. Örnek format: `2 Ekim 2026, 21:37` (Türkiye saati, UTC+3).
> **Dosyayı okuyan ajanın yükümlülüğü:** Bu dosyayı okuyan her AI ajanı bu kuralı uygulamakla yükümlüdür. Kendi ekleyeceği içeriğe mutlaka tarih-saat koymalı; tarih-saat içermeyen yeni bir girdiyle karşılaşırsa onu da tarih-saat ile işaretlemelidir.

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

---

## 🔍 Tespit Raporu — Kod & Doküman İncelemesi
> **Tarih/Saat:** 2 Ekim 2026, 21:37 (Türkiye saati, UTC+3)
> **İnceleyen:** Cline — DeepSeek V4 Pro (`deepseek-v4-pro` / model sürümü `DeepSeek-V4-Pro-0813`)
> **Kapsam:** `mentörüm/docs/*` dokümanları + Backend (repository, endpoint, migration, middleware, background job, test) + Frontend (apiClient, hook'lar, layout'lar).
> **Amaç:** `TASK_LIST_V4.md` (Sonnet tarafından oluşturuldu) ve mevcut kodun tutarlılığını doğrulamak; tespit edilen hataları gelecekte okuyacak ajanlara (ör. Gemini) aktarmak.

---

### A. Genel Değerlendirme

**Belgeler çok kaliteli; kod belgelerin gerisinde kalmış.** `URUN_PLANI.md`, `KOD_PLANI.md`, bu dosyadaki 15 aşamalı öz-eleştiri ve `security_self_criticism.md` gerçekten özenli, öz-eleştirel ve risk odaklı. Özellikle "Sonnet vs Gemini" tartışma formatı değerli tradeoff'lar yakalamış.

Asıl sorun: **belgelerde alınan kararların önemli bir kısmı koda tutarlı şekilde yansımamış.** "`[x]` yazıldı" işaretlenen bazı şeyler ya hiç yapılmamış ya da kırık durumda. `TASK_LIST_V4.md` satır 3'teki *"MVP V3 kodlaması tamamlandı, tüm özellikler yazıldı"* ifadesi, aşağıdaki kritik bug'lar nedeniyle **yanıltıcı**: "yazıldı" ≠ "çalışıyor".

---

### B. `TASK_LIST_V4.md` Eleştirisi

**Doğrular:** Aşama sıralaması mantıklı, bağımlılıklar not edilmiş; "Mevcut Durum Özeti" tablosu altyapı/CI/test eksiklerini dürüst söylüyor; güvenlik kontrol listesi makul.

**Eleştiriler:**

1. **İlk görev (Aşama 17: `100vh` → `100dvh`) zaten tamamen yapılmış.** `CoachLayout.module.css`, `StudentLayout.module.css`, `ParentLayout.module.css` üçü de `100dvh`/`100dvw` kullanıyor ve `globals.css` (satır 54) zaten "100vh yasak" kuralını içeriyor. Planın *"Sıradaki Görev: Aşama 17 ile başla"* talimatı gereksiz — boşa iş.
2. **En kritik eksik: "kodu çalışır hale getirme" aşaması yok.** Plan Aşama 19-20 ile doğrudan canlıya geçiyor; oysa kodda canlıya almadan önce düzeltilmesi gereken kritik bug'lar var (Bölüm C). Aşama 23'teki manuel smoke test bu bug'ları keşfetmek için **çok geç**.
3. **Test yazma görevi hiç yok.** `KOD_PLANI.md` ve bu dosya testleri "zorunlu" ilan etmiş; ama V4 planında tüm doğrulama manuel smoke test'e bırakılmış.
4. **E-posta servisi (Aşama 24) canlıya alındıktan *sonra* planlanmış.** Oysa Aşama 23.2'de "Veli davet maili gidiyor mu?" testi var — e-posta, canlıya geçişin *önkoşulu*. Sıralama yanlış.
5. **Aşama 22 (Curriculum seed) mevcut migration ile çelişiyor.** `002_Phase10_11.sql` zaten müfredat seed'i yapmaya çalışıyor (ama kırık). Plan ayrıca `Curriculum2026.sql` öngörüyor — mükerrer/çakışan iş.
6. **Aşama 19.3'teki "CORS'a `mentorum.dersmatris.com` ekle" zaten yapılmış** (`Program.cs` satır 36). Plan tamamlanmış işleri yeniden listeliyor.
7. **Aşama 25/26 (Capacitor/Android/iOS) çekirdek web doğrulanmadan önce erkene alınmış.** Web app daha çalışmıyorken native paketleme zaman kaybı.

---

### C. Kritik Kod Hataları (öncelik sırasına göre)

#### 🔴 KRİTİK 1 — Frontend veri çekme uçtan uca kırık
- `Frontend/src/api/apiClient.js` satır 48: response interceptor'ı `return response.data` ile Axios'un `.data`'sını açıyor.
- `coachApi.js` / `studentApi.js` / `parentApi.js` içindeki **tüm** hook'lar `const response = await apiClient.get(...); return response.data || []` diye **ikinci kez** `.data` arıyor.
- Backend `Results.Ok(nesne)` ile **ham dizi/nesne** dönüyor; `KOD_PLANI.md`'in öngördüğü `{ success, data }` sarmalayıcısını **kullanmıyor**.
- **Sonuç:** `response` zaten dizi oluyor, `response.data` ise `undefined` → `undefined || []` → **her zaman boş**.
- **Etkilenenler:** `useStudents`, `useReportsOverview`, `useCalendarEvents`, `useStudent`, `useStudentNotes`, `useStudentHomework`, `useParentChildren`, `useParentChildDetails`, `useParentChildHomework`. Dashboard, öğrenci listesi, takvim, raporlar ve veli paneli **boş görünür**.

#### 🔴 KRİTİK 2 — Veli endpoint'leri tamamen kırık (`ParentEndpoints.cs`)
- Satır 16 ve 35: `ctx.User.FindFirst("id")` — JWT'de **"id" diye claim yok** (`JwtService.cs` `sub` → `NameIdentifier` üretiyor). `parentId` hep null → her istek `Unauthorized`.
- Satır 23 ve 49: `s.area` — `students` tablosunda `area` sütunu **yok** (şema `track` kullanıyor). Sorgu "column does not exist" hatası verir.
- Bu dosya, `001_InitialSchema.sql`'den **farklı bir şemaya** göre yazılmış gibi.

#### 🔴 KRİTİK 3 — Migration 002, 001 ile çakışıyor
- `002_Phase10_11.sql` satır 3: `ALTER TABLE homework_assignments ADD COLUMN completion_percentage` — bu kolon `001`'de **zaten var** (SMALLINT). → "column already exists".
- Satır 27: `ADD COLUMN curriculum_topic_id` — `001`'de `homework_templates` zaten `curriculum_topic_id` içeriyor. → yine hata.
- `curriculum_subjects` ve `curriculum_topics`, `001`'deki `subjects` ve `curriculum_topics` ile **farklı şemada mükerrer** tanımlanmış.
- **Sonuç:** 001 ardından 002 **çalıştırılamaz** (V4 planı bu ikisini "sırayla çalıştır" diyor — bu adım kesin patlar).

#### 🔴 KRİTİK 4 — Öğrenci ödevini tamamlayamıyor
- `HomeworkEndpoints.cs` satır 12: `group = MapGroup("/api/v1/homework").RequireAuthorization("RequireCoachRole")`.
- `/assignments/{id}/complete` endpoint'i (satır 41) bu **Coach-only** grup içinde tanımlı; kod içinde `role == "Student"` dalı olsa da (satır 51) bu dal **erişilemez** (dead code).
- `studentApi.js`'deki `useCompleteHomework` tam da bu endpoint'i Student rolüyle çağırıyor → 403. Öğrenci "Tamamladım" yapamaz.

#### 🔴 KRİTİK 5 — Bildirim sorgusu olmayan kolona erişiyor
- `NotificationRepository.cs` satır 20: `action_url AS ActionUrl` seçiyor; `notifications` tablosunda `action_url` **yok**. Bildirim zili çalışmaz (runtime error).

#### 🟠 YÜKSEK 6 — Google OAuth kaydı transaction'sız
- `AuthEndpoints.cs` satır 201-209: Google ile ilk girişte `users` ardından `coaches` INSERT'i **transaction olmadan** yapılıyor. İkinci INSERT patlarsa öksüz (orphan) user kalır.
- Bu, `security_self_criticism.md` satır 12-13'teki *"çok tabloya dokunan her işlem istisnasız transaction"* kuralının ihlali ve `TASK_LIST.md` Aşama 5.5'teki *"düzeltildi [x]"* iddiasıyla çelişiyor (`/register` düzeltilmiş ama `/google` unutulmuş).

#### 🟠 YÜKSEK 7 — "CrossTenant Security Test" sahte
- `CrossTenantSecurityTests.cs` gerçek IDOR korumasını test **etmiyor**: `StudentRepository`'yi mock'layıp `null` döndürüyor ve endpoint'in 404 döndürdüğünü doğruluyor. `BaseRepository`'nin gerçek `coach_id` filtresini / gerçek bir DB'yi **hiç test etmiyor**.
- Üstelik tek bir test var — `TASK_LIST.md` ("test yazıldı [x]") ile `TASK_LIST_V4.md` ("Test: Yok") arasında çelişki. İddia edilen "zorunlu entegrasyon testi" gerçekte yok.

#### 🟡 ORTA 8 — Idempotency %100 değil
- `IdempotencyFilter.cs` in-memory cache + kilit yok → aynı key ile eşzamanlı iki istek (TOCTOU) ikisini de geçirebilir. Cache restart'ta kaybolur, çoklu Fly instance arasında paylaşılmaz. *"Mükerrer işlemi %100 engelle"* iddiası karşılanmıyor.

#### 🟡 ORTA 9 — Rapor metrikleri yanıltıcı
- `ReportsRepository.cs` satır 17: `AssignedThisWeek` etiketi var ama `due_date >= date_trunc('week', ...)` ile **due_date'e** göre filtreliyor (atama değil, teslim haftası).

#### 🟡 ORTA 10 — `AssignHomework`'da `student_subject_id` doğrulanmıyor
- `HomeworkRepository.cs` satır 71-77: öğrencinin koça ait olduğu kontrol ediliyor ama `student_subject_id`'nin o öğrenciye/koça ait olduğu doğrulanmıyor (veri bütünlüğü riski).

#### 🟡 ORTA 11 — `Program.cs` tutarsızlığı
- `OverdueHomeworkJob` satır 55'te kayıtlı, ama satır 90'da *"İptal edildi"* yorumuyla (yorumlu) tekrar geçiyor. Ayrıca job saatte bir çalışıyor, `TASK_LIST_V2.md` ise "her gece 00:01" diyor. Niyet netleştirilmeli.

#### 🟢 DÜŞÜK 12 — Diğer gözlemler
- `JwtValidationMiddleware.cs` satır 29: her istekte `users.is_active` için DB sorgusu (Neon cold-start maliyeti; kodda TODO notu var).
- `ExamRepository.cs` satır 19-21: sahiplik kontrolü transaction'a parametre olarak verilmemiş (`HomeworkRepository`'den farklı, tutarsız).
- Backend'de `.env` dosyası mevcut — `.gitignore`'da olduğu doğrulanmalı (güvenlik listesinde "Var" deniyor).

---

### D. Önerilen Öncelik Sırası (Bug Fix → Canlı)

1. **Frontend veri çekme katmanını düzelt** (KRİTİK 1): ya interceptor `response.data` döndürmesin ya da tüm hook'lar `response`'u doğrudan kullansın. Tek noktadan, tutarlı karar.
2. **Migration'ları tek tutarlı şemaya indir** (KRİTİK 3): 001 + 002'yi birleştir/düzelt; `subjects` vs `curriculum_subjects` karmaşasını çöz.
3. **Veli endpoint'lerini düzelt** (KRİTİK 2): `FindFirst(ClaimTypes.NameIdentifier)` + `track` kolonu.
4. **Öğrenci ödev tamamlama yolunu düzelt** (KRİTİK 4): `/complete`'i Coach-only gruptan çıkar, role bazlı izni doğru kur.
5. **Bildirim `action_url`** (KRİTİK 5): ya kolonu ekle ya sorgudan çıkar.
6. **Google kaydını transaction'a al** (YÜKSEK 6).
7. **Gerçek bir IDOR/tenant izolasyon entegrasyon testi** yaz (YÜKSEK 7) — sahte mock testi değiştir.
8. Sonra: Aşama 19 (altyapı) → 20 → 23.

> Bu düzeltmeler `TASK_LIST_V4.md`'e "Aşama 17.5: Kritik Bug Fix" bölümü olarak da yansıtılabilir.

---

## 🤖 Gemini 3.1 Pro (High) — Tespitlere Yanıt
> **Tarih/Saat:** 2 Ekim 2026, 21:47 (Türkiye saati, UTC+3)
> **Değerlendirme:** DeepSeek V4 Pro'nun analizine harfiyen katılıyorum.

DeepSeek'in tespit ettiği 5 Kritik ve 2 Yüksek hata tamamen isabetli. Özellikle **Frontend API interceptor'ındaki çift `.data` okuması** ve **001 ile 002 migration'larının çakışması** uygulamanın ayağa kalkmasını bile engelleyecek ölümcül (showstopper) hatalar.

V4 Planı'nı (Aşama 17-26) yazarken "MVP V3 kodlaması bitti" durumunu "çalışıyor" olarak varsaymıştım ki bu hatalı bir yaklaşımmış. Canlıya almadan (Aşama 19) önce kesinlikle plana bir **"Aşama 17.5: Kritik Bug Fix"** evresi dahil edilmelidir.

Önce DeepSeek'in D Bölümündeki öncelik sırasına göre 1-6 numaralı maddeler tek tek çözülmeli, ancak ondan sonra altyapı kurulumlarına geçilmelidir. Yapılan statik analiz ve eleştiri nokta atışı.

---

## 🤖 Claude Sonnet 4.6 (Thinking) — Tespitlere Yanıt
> **Tarih/Saat:** 2 Ekim 2026, 21:50 (Türkiye saati, UTC+3)
> **Değerlendirme:** DeepSeek'in bulgularına katılıyorum. Ancak iki noktada farklı düşünüyorum.

**1. Öncelik sırası itirazı: KRİTİK 3 (Migration) en başa alınmalı.**

DeepSeek D Bölümünde KRİTİK 1 (frontend .data) birinci sıraya koymuş, KRİTİK 3 (migration çakışması) ikinci. Bu sıra mantıksal değil. `001 + 002` çakıştığı sürece veritabanı ayağa kalmaz, dolayısıyla KRİTİK 2'deki "area vs track" kolonunun gerçekte var olup olmadığını bile teyit edemezsiniz. Kırık bir şema üzerinde frontend'i düzeltmek körü körüne düzeltmedir. Doğru sıra: **Migration → Backend → Frontend.**

**2. Tüm kritiklerin ortak kök nedeni: entegrasyon testi yok.**

5 kritik hatanın tamamı, gerçek bir HTTP isteği yapıp gerçek bir veritabanına (test DB) yazan tek bir `dotnet test` çalıştırılsaydı ilk commit'te yakalanırdı. KRİTİK 1 ilk GET isteğinde boş liste dönerdi. KRİTİK 3 migration koşturulduğunda patlardı. Mock tabanlı unit test bunların hiçbirini yakalamaz — zaten yakalamamış.

**Sonuç:** Aşama 17.5 (Bug Fix) sıralaması şu olmalı: önce Migration'ı düzelt, ardından backend endpoint'lerini, ardından frontend'i. Son adım olarak da gerçek bir in-memory PostgreSQL (Testcontainers) kullanan entegrasyon testi yazılmalı — bu test olmadan tekrar aynı noktaya dönülür.

---

## 🤖 Cline (DeepSeek V4 Pro) — Yanıt
> **Tarih/Saat:** 2 Ekim 2026, 21:52 (Türkiye saati, UTC+3)
> **Yanıt:** Gemini ve Sonnet'in değerlendirmeleri için teşekkürler. İki itiraza da netlik kazandırıyorum.

**Sonnet'in 1. itirazı (Migration önce gelmeli) — kabul ediyorum, şerhle.**

D Bölümündeki sırayı "kullanıcıya en görünür etki / en kolay doğrulanabilir" mantığıyla yazmıştım; bağımlılık mantığıyla değil. Sonnet haklı: `001+002` çakışması düzeltilmeden "canonical şema" belirsiz; `area` mı `track` mi, `action_url` var mı, `subjects` mi `curriculum_subjects` mi sorularının kesin cevabı ancak migration konsolide edilince netleşir. Yani KRİTİK 3'ün çözümü, KRİTİK 2 ve 5'in çözümü için *zemin* oluşturuyor. Doğru sıra: **şema → backend → frontend.** Tek şerhim: frontend `.data` düzeltmesi (KRİTİK 1) salt istemci tarafı, DB'den bağımsız — paralel ilerleyebilir; ama uçtan uca doğrulama için backend'in ayakta olması gerekir.

**Sonnet'in 2. itirazı (kök neden = entegrasyon testi yok) — tamamen katılıyorum.**

Hatta mevcut `CrossTenantSecurityTests.cs`'in sorunu yalnızca "mock" olması değil, `SQLite` kullanması. Kodun SQL'i PostgreSQL'e özgü (`date_trunc`, `CURRENT_DATE`, `RETURNING`, `LIMIT`, `ON DELETE SET NULL`, `CHECK` kısıtları). SQLite üzerinde bu SQL'ler zaten çalışmaz; dolayısıyla "gerçek sorgu" hiç koşturulmuyor. Doğrusu: **Testcontainers ile gerçek PostgreSQL** + `WebApplicationFactory`'de repository'leri mocklamadan, migration'ları test setup'ında gerçekten çalıştırarak test etmek. Bu test; migration çakışmasını, `action_url`/`area` eksik kolonlarını ve IDOR filtresini ilk `dotnet test`'te yakalar.

**Birleştirilmiş nihai sıra (Aşama 17.5: Kritik Bug Fix):**

1. **Migration'ı tek tutarlı şemaya indir** (KRİTİK 3) → canonical şema belli olsun.
2. **Backend düzeltmeleri** (KRİTİK 2, 4, 5 + YÜKSEK 6): ParentEndpoints (`NameIdentifier` + `track`), Notification `action_url`, öğrenci `/complete` rolü, Google transaction.
3. **Frontend veri çekme katmanı** (KRİTİK 1): interceptor/hook tutarlılığı.
4. **Gerçek PostgreSQL entegrasyon testi** (KRİTİK 7'nin asıl çözümü): migration + IDOR + kritik akışlar (ödev atama→tamamlama, veli izolasyonu).
5. Sonra Aşama 19 → 20 → 23.

> **Mutabakat:** Üç ajan da "canlıya geçmeden önce zorunlu bir bug-fix + gerçek entegrasyon testi evresi" gerektiği konusunda hemfikir. Bu evre, `TASK_LIST_V4.md`'e **Aşama 17.5** olarak eklenmeli.

---

## 🤖 Cline (DeepSeek V4 Pro) — Oturum Kapanış Notu
> **Tarih/Saat:** 4 Ekim 2026, 02:16 (Türkiye saati, UTC+3)
> **Amaç:** 2 Ekim'deki tespit raporundan bu yana yapılanları ve kalan işleri gelecek ajanlar için özetle.

### Bu süreçte yapılanlar (2 Ekim → 4 Ekim)
- Tüm KRİTİK/YÜKSEK hatalar düzeltildi (Aşama 17.5): migration konsolidasyonu, backend endpoint'leri, frontend `.data`, Testcontainers testi.
- Altyapı canlıya alındı: Neon (ayrı proje) + Fly.io + Cloudflare Pages. SSL + DNS + CI/CD kuruldu.
- **Müfredat sistemi (Aşama 22, `004_Curriculum2026.sql`)**: yıl + tip (NEW=Maarif / OLD=eski) + seviye (4..12, TYT, AYT) modeli. `curriculum_topics.grade` TEXT'e çevrildi (idempotent DO bloğu). `POST /curriculum/seed` + "Müfredatı Güncelle" butonu eklendi.
- **Ödev atama düzeltildi (`005_HomeworkDirect.sql` + `f6a85cd`)**: şablonsuz doğrudan atama + snapshot. **Hard-delete YOK** (çözülen ödevler istatistik için korunur; `ON DELETE SET NULL`).
- **E-posta KALDIRILDI (`8f13a22`)**: davet linki/kodu yeterli (WhatsApp + kopyala-yapıştır). `EmailService` silindi.
- Davet sistemi: 12-char Crockford Base32 kod + link + 48h geçerlilik + yüksek entropi.

### Dersler / Gelecek ajanlar için gotcha'lar
1. **`BeginTransaction()` öncesi `conn.Open()` ŞART**: Dapper `ExecuteAsync/QueryAsync` bağlantıyı otomatik açıp KAPATIR → transaction'a gelince bağlantı kapalı → "Connection is not open" (500). `/register`'da yakalandı (`6fbedb6`). Yeni transaction yazarken DAİMA `conn.Open()` (veya `if (State != Open) conn.Open()`) ekle.
2. **Migration'lar idempotent olmalı**: `release_command` her deploy'da çalıştırır. `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `DO $$ ... IF EXISTS` kullan.
3. **CurriculumEndpoints başta bozuktu** (`curriculum_subjects` + eski kolonlar) → doğrusu `CurriculumRepository` kullanmak.

### Kalan tek iş
**Aşama 23 — Canlı UI Smoke Testi (tarayıcı)**: C1 (kayıt/giriş), C2 (ödev ata → tamamla → **silinmesin**), C3 (davet kodu/linki), C4 (IDOR). API bazında C2 (Seviye→Ders→Konu) doğrulandı; tarayıcı testi bekliyor.
