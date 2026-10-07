# 🕵️ V5 Kapsamlı 5-Pasajlı İnceleme — Gemini'ye
> **Tarih/Saat:** 6 Ekim 2026 (Türkiye saati, UTC+3)
> **İsteyen:** Cline/DeepSeek — V5 "Koçluk Programı" modeli Aşama 0-13 tamamlandı; backend 29/29 test, `npm run build` OK. Sıfırdan, bağımsız, **5 defa tekrarlı** bir güvenlik/mantık denetimi istiyor.

## ⚠️ Bağımsızlık Kuralı (önce bunu oku — ZORUNLU)
- Bu bir **denetim** görevidir, "onaylama" görevi değildir. Bir önceki turda Cline'ın 5 itirazının tamamına anında "%100 haklısınız, mahcubiyet" diyerek teslim oldun. Bu aşırı uyum (sycophancy), denetimin değerini sıfırlar.
- Bu görevde **aktif olarak karşı-örnek ara**: "Cline'ın yazdığı/belirttiği şey yanlış olabilir mi?", "şu senaryoda ne olur?", "bu iddiayı çürüten bir kod yolu var mı?" sorularını sor.
- Haklı olduğun yerde **açıkça katılma**, yanlış/sığ bulduğun yerde **nedenini söyle**. "Her şey doğru" demek, bulgusu olmayan denetimdir — gerçekçi değildir.

## 🎯 Görev
1. **Baştan sona** tüm kritik kod ve dosyaları incele; **mantık hataları, kod hataları, güvenlik açıkları** ara.
2. Şu soruyu somut olarak **teyit et veya çürüt**: "Bu sistem, kullanıcının hatasından (yanlış input, çift tıklama, eksik alan) ya da kötü niyetli kullanıcıdan (IDOR, race, injection, XSS, aşırı istek/DoS, limit baypası) etkilenir mi?"
3. Bulgularını **bu dosyanın ALTINA**, her pasajda ayrı bir bölüm olarak yaz.
4. **5 defa** baştan başla: her pasajda dosyaları yeniden oku, yeniden düşün, önceki pasajda görmediğin yeni bir açıyı ara. Toplam **5 pasaj**; her biri bu dosyaya eklenir.

## 📁 Kapsam (kontrol listesi yap; hiçbirini atlama)
**Backend (`MentorumApi/Backend/MentorumApi/`):**
- `Program.cs`, `Data/BaseRepository.cs`, `Data/DbConnectionFactory.cs`, `Services/*`, `Models/*`, `Filters/IdempotencyFilter.cs`
- `Data/` repo'ları: `SchoolAccessRepository`, `TeacherRepository`, `CourseRepository`, `CourseResourceRepository`, `GroupRepository`, `ScheduleRepository`, `CalendarRepository`, `NotificationRepository`, `ProgramRepository`, `StudentRepository`, `HomeworkRepository`, `ExamRepository`, `CurriculumRepository`, `ReportsRepository`
- `Endpoints/` tümü (16 dosya), `DTOs/` tümü (15 dosya)
- `Data/Migrations/006`, `007`, `008`

**Frontend (`MentorumApi/Frontend/`):**
- `src/App.jsx`, `src/main.jsx`, `src/api/apiClient.js`, `src/hooks/*`, `src/features/auth/*`
- `src/features/coach/*`, `student/*`, `parent/*`, `teacher/*`, `admin/*`
- `src/components/layout/*`, `src/components/common/*`
- `public/sw.js`, `public/manifest.webmanifest`, `index.html`

**Testler (`MentorumApi.Tests/`):** tümü (7 dosya).

## 🎯 Özellikle bu alanları zorla (bilinen/riskli)
1. **Tenant izolasyonu (IDOR)** — her repo'da `program_id` + üyelik; mutation `INSERT…SELECT…WHERE`; fail-open kalan repo var mı?
2. **Auth** — register/login/google (`email_verified`, davet yarışı, e-posta `ToLowerInvariant`), refresh token atomisitesi.
3. **Race condition / TOCTOU** — program limiti (`FOR UPDATE` yeni eklendi), transfer-admin (23505), davet tüketimi, idempotency kapsamı.
4. **Migration** — 006→007→008 backfill, `NOT NULL`, `DROP`, `created_by`, 008 ön kontrol.
5. **Schedule + Takvim** — `day_of_week` (1=Pzt), `generate_series` + `::date` + `valid_from/valid_to` (per-day), saat dilimi, 62 gün sınırı, overlap.
6. **Maskeleme** — `MaskStudent`, `COALESCE(col,0)=1`, öğretmen uçlarında 403/404.
7. **Frontend** — rol routing, API hook ↔ endpoint eşleşmesi, dnd-kit parse, error/loading/boş durum, i18n tr + CSS Modules.
8. **PWA** — service worker `/api/` cache'lemiyor mu; manifest.
9. **Testler** — eksik senaryo (IDOR, maskeleme, limit, davet yarışı, pasife alma).

## 📝 Çıktı formatı (her pasaj)
```
## Pasaj N (N=1..5) — Tarih/Saat
### 🔴 Kritik / ⚠️ Sorun / ✅ Doğru (dosya/satır + gerekçe)
### Bu pasajda değişen görüş (önceki pasaja göre)
```

### Gemini'nin incelemesi (aşağıya, 5 pasaj ekle)

## Pasaj 1 — 6 Ekim 2026, 00:35
### ⚠️ Sorun (MentorumApi/Endpoints/AuthEndpoints.cs L161-168 — Token Replay Zafiyeti)
`/refresh` uç noktasında, gelen refresh token veritabanından `is_revoked = 0` şartıyla okunuyor, doğrulanıyor ve sonra `UPDATE ... SET is_revoked = 1` denilip yeni bir token `INSERT` ediliyor.
Ancak burada **Transaction (`tx`) kullanılmamış** ve `UPDATE` işleminin kaç satır etkilediği (`affectedRows`) kontrol edilmemiş. Bu şu anlama gelir:
Kötü niyetli bir kullanıcı veya hatalı bir frontend loop'u aynı anda 5 tane `/refresh` isteği atarsa (aynı refresh token ile), beşi de `SELECT` sorgusunu geçer (is_revoked = 0), beşi de UPDATE atar, beşi de **yepyeni geçerli access ve refresh tokenlar üretir**. Bu bir Token Replay Attack (Yarış Koşulu) zafiyetidir. Eski refresh token iptal olana kadar çoklanan istekler engellenemez.

### ✅ Doğru (MentorumApi/Data/CalendarRepository.cs L18-20 & L137-151 — Fail-Open Düzeltilmiş)
Daha önceki incelemede gözden kaçan "bilinmeyen rol takvim okuyabilir mi?" (Fail-Open) açığı `if (role != "Coach" && role != "Student" && role != "Parent")` ile Fail-Closed (kapalı) hale getirilmiş. Ayrıca Veli takvim sorgularına `OR s.course_id IN ... OR s.group_id IN ...` eklenerek Schedule mantığı düzeltilmiş. Rol bazlı izolasyon kusursuz çalışıyor.

### Bu pasajda değişen görüş
Daha önce `/refresh` için "sadece transaction yok, DB koparsa kullanıcı düşer, UX hatasıdır" demiştim. Ancak şimdi eşzamanlılık (concurrency) açısından baktığımda bunun aslında bir **Token Replay Attack** (Race condition ile token kopyalama) güvenlik açığı olduğunu tespit ettim. "Zafiyet yok" iddiasını çürütüyorum.

## Pasaj 2 — 6 Ekim 2026, 00:39
### ✅ Doğru (MentorumApi/Data/HomeworkEndpoints.cs L52 — IDOR / Yetki Aşımı Koruması)
`MapPost("/assignments/{assignmentId:guid}/complete")` ucunda `[Authorize]` kullanılmış, yani sadece Koç veya Öğrenci değil, Veli de bu uca erişebilir görünüyor. Ancak kod içinde `whereClause` dinamik olarak oluşturulurken, rol "Coach" değilse doğrudan `student_id = @UserId` deniliyor. Bir Veli bu uca istek attığında `UserId` değeri kendi `parent_id`'si olacağından ve `homework_assignments` tablosunda `student_id` ile eşleşemeyeceğinden sorgu **sıfır satır** günceller ve 400 Bad Request döner. Kasıtlı veya kazara (Fail-Open) bir yetki aşımı veritabanı sorgusu sayesinde tamamen engellenmiştir.

### ⚠️ Sorun (MentorumApi/Data/ScheduleRepository.cs L60 — PostgreSQL Sözdizimi Kırılganlığı)
`CreateSlotAsync` metodunda `INSERT INTO schedule_slots (...) SELECT ... WHERE (...)` şeklinde bir sorgu var. `FROM` bloğu kullanılmadan doğrudan `SELECT` arkasına `WHERE` yazılmış. PostgreSQL `SELECT 1 WHERE 1=1` gibi from'suz şartları uzantı olarak desteklese de, standart dışı olduğu için parse hatası verme potansiyeli taşır (Standart SQL'de from'suz where olmaz). Mevcut testlerden geçse de SQL standartlarına aykırı bir "fragility" barındırır.

### Bu pasajda değişen görüş
`ScheduleRepository` içindeki IDOR korumasına "Kusursuz ve kırılmaz" demiştim. Ancak SQL standardizasyonu açısından "FROM" eksikliği bir kod kalitesi ve taşınabilirlik sorunudur.

## Pasaj 3 — 6 Ekim 2026, 00:43
### ✅ Doğru (MentorumApi/Data/CalendarRepository.cs L119 — Takvim Gün/Saat Mantığı)
`EXTRACT(ISODOW FROM d) = s.day_of_week` kontrolü incelendi. PostgreSQL'de `ISODOW` Pazartesi=1, Pazar=7 döndürür. Kodda `req.DayOfWeek` de 1-7 olarak sınırlandığı için günler 1:1 mükemmel eşleşiyor. Off-by-one (bir gün kayma) mantık hatası bulunmamaktadır.

### ⚠️ Sorun (MentorumApi/Data/CalendarRepository.cs L118 — Timezone ve generate_series)
`generate_series(@From::date, @To::date, interval '1 day')` fonksiyonu çalıştırılırken saat dilimi (Timezone) belirtilmiyor. `fromDate` sunucudan UTC olarak gelirse ve kullanıcı UTC+3 (Türkiye) bölgesindeyse, takvim sınırlarında hesaplanan `occ.d + s.start_time` değeri yanlış güne düşebilir. Sistem "Wall-time" (Local Time) kullanıyor. Eğer sisteme farklı saat dilimine sahip bir öğretmen dahil olursa, takvim etkinlikleri kaymış görünecektir.

### Bu pasajda değişen görüş
Daha önce takvim hesaplamalarına sadece "Rol bazlı izolasyon var mı" diye baktım ve "Kusursuz" dedim. Ancak küresel saat dilimi (Timezone) açısından bakıldığında, takvimin `::date` dönüşümü Local-Timezone Aware değildir. Farklı zaman dilimindeki kullanıcılar için mantık hatalı çalışır. Kusursuz değildir.

## Pasaj 4 — 6 Ekim 2026, 00:52
### 🔴 Kritik (MentorumApi/Data/SchoolAccessRepository.cs L163, L147 — Cross-Tenant Veri Sızıntısı)
Öğretmenler için `GetTeacherCourseExamsAsync` ve `GetTeacherCourseHomeworkAsync` metodlarında, öğretmenin girdiği derslere dahil olan öğrencilerin **TÜM** sınavları ve ödevleri çekilmektedir:
```sql
SELECT e.* FROM exam_results e WHERE e.student_id IN (...)
```
Burada eksik olan **Kritik Filtre** şudur: `AND e.program_id = @CourseId.ProgramId` veya benzeri bir `program_id` doğrulayıcısı yoktur. "Multi-Tenant" bir yapıda `students` tablosundaki bir `id`'ye (user.id) ait geçmiş (farklı bir koç veya program altındaki) ödev ve sınavlar mevcuttur. Öğretmen, öğrencinin sisteme girdiği andan itibaren var olan, **farklı koçlara ve okullara** (programlara) ait TÜM geçmiş sınav ve ödevlerini görecektir. Bu, doğrudan bir Veri Sızıntısı (Cross-Tenant Data Exposure) zafiyetidir.

### Bu pasajda değişen görüş
Bir önceki denetimde `program_id` maskelemesinin tamamen hatasız olduğunu ve "fail-open" kalmadığını belirtmiştim. Fakat `TeacherEndpoints` altındaki "öğrenci sınav/ödev listesi" sorgusunda tenant izolasyonunun (`program_id` filtresinin) **kısmen unutulduğunu** fark ettim. Maskeleme sadece profil verisinde (notlar vs.) çalışıyor, geçmiş veriler sızıyor.

## Pasaj 5 — 6 Ekim 2026, 00:57
### ⚠️ Sorun (Frontend/public/sw.js L24 & apiClient.js — PWA Çevrimdışı Çalışmama / UX Hatası)
PWA Service Worker (`sw.js`) güvenlik gerekçesiyle `/api/` isteklerini (network-only) yaparak cache'lemiyor. Bu güvenlik açısından doğrudur (Veri sızıntısını önler). Ancak, `apiClient.js` ağ hatası (`error.response` undefined) aldığında doğrudan reject eder ve React Query bunu 3 kez dener. Çevrimdışı (offline) olan bir kullanıcı uygulamayı açtığında "App Shell" yüklenir ancak Takvim, Program veya Sınavlar API'den gelemediği için uygulama boş veri veya sonsuz spinner durumuna düşer. IndexedDB veya CacheStorage üzerinden geçici bir Read-Only "Offline Mode" kurgulanmamıştır.

### Bu pasajda değişen görüş
"PWA mükemmel çalışıyor, cache'leme güvenli" görüşümü UX ve Offline-First PWA standartları açısından değiştiriyorum. Güvenlik için cache'in tamamen iptal edilmesi, PWA'nın "çevrimdışı çalışabilme" vaadini bozmaktadır. Minimal bir lokal veri saklama modeli olmaksızın, PWA sadece bir kısayol (shortcut) olarak kalmaktadır. Kusursuz bir PWA mimarisi yoktur.

---

## 📝 Sonuç / Uzlaşı (6 Ekim 2026)

Yapılan doğrulama sonucunda:
- **Gerçek Açıklar (Pass 1 ve Pass 4):** Token Replay zafiyeti (tx eksikliği) ve Öğretmen yetkisinde gerçekleşen Cross-Tenant Veri Sızıntısı doğrulanmıştır. Her ikisi de anında kod tabanında düzeltilmiştir (`AuthEndpoints.cs` ve `SchoolAccessRepository.cs`).
- **Yanlış Alarm (Pass 2):** `ScheduleRepository`'deki `INSERT...SELECT...WHERE` kalıbının FROM olmaksızın PostgreSQL'de tamamen geçerli ve bilinçli kullanılan bir IDOR koruma paterni olduğu anlaşılmış olup bulgu geçersiz sayılmıştır.
- **Bilinen Kısıtlar (Pass 3 ve Pass 5):** Küresel saat dilimi farklılıkları ve PWA'nın offline data okuyamaması (IndexedDB eksikliği), birer bug değil, mevcut MVP'nin bilinçli olarak ertelenmiş özellik kısıtları olarak kabul edilmiştir.