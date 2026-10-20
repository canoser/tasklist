# 🧭 Mentörüm — V11 Görev Listesi (Dosya Depolama, Kota & Cihaz Senkronizasyonu)

> **İlk Taslak (v1):** 20 Ekim 2026 · **Yazar:** DeepSeek v4 pro (Cline ajanı)  
> **Mimari İnceleme & Revizyon (v2):** 20 Ekim 2026 · **Mimar:** Gemini 3.8 Flash (Antigravity)  
> **Amaç:** Öğrenci ↔ koç/öğretmen arası dosya (fotoğraf, PDF, Office belgeleri vb.) alışverişi; Cloudflare R2 geçici tampon (Transit Queue), cihazda Local-First depolama (`gelenler/gidenler`), koç bazlı 50 MB tampon kota ve öğretmen dosya paylaşım yetki kontrolü.  
> **Sıralama:** Migration → backend (repo+endpoint) → frontend (hook+UI) → test. Görevler T01→T18 artan sırada.

---

# 📌 BÖLÜM 1: DeepSeek v4 Pro (Cline Ajanı) Orijinal Taslağı (v1)

## 🎯 Amaç (Neden yapıyoruz?)
- Öğrenci, ödevini / çözemediği soruyu **fotoğraf** olarak koçuna/öğretmenine gönderebilsin.
- Koç/öğretmen, bu dosyaları **kendi cihazında (tablet/telefon/PC)** düzenli klasörlerde tutsun; bulut depolamaya (R2) **minimum** bağımlı kalınsın.
- Uygulamanın verdiği sınırlı kota (varsayılan 50 MB) dolmadan kullanıcı uyarılsın ve **indirerek yer açsın**.
- Koç, öğretmenin indirme yetkisini **kendisi kontrol etsin**.
- Koç, "çözülemeyen soruları" bir **koleksiyon** altında biriktirebilsin.
- Aynı mekanizma öğrenci için de çalışsın: koçun gönderdikleri öğrencinin cihazına insin.

## ⚙️ Nasıl Çalışır (Akış & Mimari)
1. **Gönderme (öğrenci → koç/öğretmen):** Öğrenci fotoğraf/dosya yükler → dosya önce **Cloudflare R2**'ye (geçici depo) yazılır → `uploads` kaydı + alıcı bazında `upload_deliveries` kayıtları oluşur.
2. **Teslimat & indirme:** Dosya, alıcının **seçili indirme cihazına** otomatik iner (tablet/telefon). PC'de otomatik inme olmaz → "bekleyen indirmeler" listesi + uyarı gösterilir, kullanıcı elle indirir.
3. **Klasörler:** Her kullanıcının cihazında otomatik olarak `Mentorum/dosyalar/gelenler` (bana gelenler) ve `Mentorum/dosyalar/gidenler` (benim gönderdiklerim) klasörü oluşturulur.
4. **R2'nin silinmesi:** Dosya, **tüm alıcılar indirdikten + tutma penceresi (24–72 saat) dolduktan sonra** R2'den silinir. İndirme başarısız olursa dosya R2'de kalır ve tekrar denenir.
5. **Kota & uyarı:** Koçun R2'de bekleyen toplam verisi izlenir. Varsayılan kota **50 MB**; kullanım **30 MB** olunca "yer açın" uyarısı çıkar. Tablet/telefondan bağlanılıyorsa dosyalar otomatik indiği için uyarı gerekmez.
6. **Cihaz seçimi:** Varsayılan indirme cihazı = oturumun ilk açıldığı cihaz. Kullanıcı dilediği zaman başka cihaz seçebilir; **değişiklik yalnızca yeni dosyaları** etkiler, eski dosyalar yerinde kalır.
7. **Öğretmen izni:** Öğretmenin indirme hakkı **koç tarafından ders bazında** açılır/kapatılır (`teacher_can_download`).

## 📖 Kullanım Kılavuzu (Rol Bazlı)

### Öğrenci
- Ödev/çözemediği soru için fotoğraf seçer, uygulama fotoğrafı R2'ye yükler ve koçuna/öğretmenine iletir.
- Gönderdiği dosyalar kendi cihazında `Mentorum/dosyalar/gidenler` klasöründe görünür.
- Koçun gönderdiği dosyalar, öğrencinin seçili cihazına `gelenler` klasörüne otomatik iner (tablet/telefonda).

### Koç
- Öğrenciden gelen dosyalar `gelenler` klasörüne iner (tablet/telefonda otomatik; PC'de "bekleyen indirmeler"den elle indirir).
- Öğrenciye dosya (PDF vb.) gönderince kendi `gidenler` klasörüne kaydedilir.
- "Çözülemeyen soru" olarak işaretlediği soruları bir **koleksiyona** ekler, dilediği gibi listeler/indirir.
- **Cihaz seçimi:** İlk girişte "Dosyalar hangi cihaza insin?" mesajı çıkar; "Tekrar gösterme" işaretlenebilir. Sonradan her an cihaz değiştirilebilir (yalnızca yeni dosyaları etkiler).
- **Kota uyarısı:** Kullanım 30 MB olunca "depolama doluyor, indirerek yer açın" uyarısı görür.

### Öğretmen
- Koçun izin verdiği derslerde dosyaları görebilir/indirebilir; indirme yetkisi koça bağlıdır.
- Koç indirme iznini kapattıysa öğretmen yalnızca görüntüler, indiremez.

### Yönetici (Admin)
- Koçun kotasını ve uyarı eşiğini değiştirebilir (varsayılan 50 MB / 30 MB).

## 0. Zorunlu Kurallar
- Sahiplik: öğrenci `student_id` claim'i; koç `EnsureCoachOwnsStudentAsync` / `EnsureCoachInProgramAsync`; öğretmen `IsTeacherOfCourseAsync`; tüm SQL'de `AND student_id = @StudentId` / `program_id IN (program_coaches)` (defense-in-depth).
- Çok tablolu işlemler `using var tx`. **Hard-delete yok** (dosya kayıtları soft-delete; R2 objesi yalnızca tüm alıcılar `DOWNLOADED` olunca silinir).
- Presigned PUT'ta `ContentType` imzalanır (spoofing koruması). Uzantı whitelist + içerik tipi eşleşme kontrolü.
- i18n: içerik yalnızca resmi Türkçe `tr` (tema token). Lucide ikon (emoji değil). CSS Modules. `[MOBILE_PORT_TODO]` işaretli yerlerde Capacitor native.
- Kota/uyarı değerleri kodda sabit değil, DB kolonunda (admin/plan değiştirebilir).

## 1. Migration Planı (v1)
- [ ] **019_uploads.sql:** `uploads` (dosya metadata + R2 object_key), `upload_deliveries` (alıcı bazlı teslimat), `user_devices` (cihaz kimliği).
- [ ] **020_storage_columns.sql:** `coaches.storage_quota_mb`/`storage_warn_mb`, `users.download_device_id`/`hide_device_picker_tip`, `courses.teacher_can_download`, `student_questions.upload_id`, `course_resources.upload_id`.

## 2. Görevler (sıralı - v1)

### [ ] T01 — R2 Paketi + Konfigürasyon
- `MentorumApi.csproj`'a `AWSSDK.S3` (v4.x) paketi ekle.
- `Backend/.env` + `Backend/.env.example`'a: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT_URL`.
- `Program.cs`: `builder.Services.AddSingleton<IStorageService, R2StorageService>();`
- Kabul: eksik env var'da uygulama açılışta net hata mesajıyla fail eder.

### [ ] T02 — Storage Soyutlama + R2 Servisi
- `Services/Storage/IStorageService.cs`: `GenerateUploadUrl(key, contentType, expires)`, `GenerateDownloadUrl(key, expires)`, `DeleteFileAsync(key)`, `GetObjectInfoAsync(key)`.
- `Services/Storage/R2StorageService.cs`: WebApp'teki implementasyonu MentorumApi konfig anahtarlarına uyarla (`ForcePathStyle = true`).
- Kabul: presigned PUT/GET çalışır, GET 10 dk / PUT 15 dk geçerlilik.

### [ ] T03 — Migration `019_uploads.sql`
- `uploads`: `id UUID PK, program_id, coach_id (sender), student_id (nullable sender), course_id (nullable), homework_id (nullable), student_question_id (nullable), object_key TEXT UNIQUE, content_type, size_bytes BIGINT, original_name, status ('PENDING'|'UPLOADED'|'DELETED'), created_at, updated_at`.
- `upload_deliveries`: `id, upload_id FK, recipient_user_id, direction ('IN'|'OUT'), status ('PENDING'|'DOWNLOADED'), device_id (nullable), delivered_at`.
- `user_devices`: `id, user_id FK, device_uid, platform ('web'|'android'|'ios'), label, first_seen_at, last_seen_at, UNIQUE(user_id, device_uid)`.
- object_key şeması: `{program_id}/{entity}/{guid}{ext}`.

### [ ] T04 — Migration `020_storage_columns.sql`
- `ALTER coaches ADD storage_quota_mb INT DEFAULT 50, storage_warn_mb INT DEFAULT 30`.
- `ALTER users ADD download_device_id UUID NULL, hide_device_picker_tip INT DEFAULT 0`.
- `ALTER courses ADD teacher_can_download INT DEFAULT 0`.
- `ALTER student_questions ADD upload_id UUID NULL`.
- `ALTER course_resources ADD upload_id UUID NULL`.

### [ ] T05 — DTO'lar + `UploadRepository`
- `DTOs/StorageDtos.cs`: `CreateUploadUrlRequest`, `ConfirmUploadRequest`, `UploadDto`, `DeliveryDto`, `StorageUsageDto`.
- `Data/UploadRepository.cs`: `CreatePendingAsync`, `ConfirmAsync`, `GetByIdWithOwnershipAsync`, `ListPendingForUserAsync`, `GetUsedBytesAsync(programId/coachId)`, `MarkDeliveredAsync`.
- Kabul: tüm SQL'de tenant filtresi.

### [ ] T06 — Upload Endpoint'leri (`Endpoints/StorageEndpoints.cs`)
- `POST /api/v1/uploads/url` (uzantı whitelist `.png/.jpg/.jpeg/.pdf/.docx/.xlsx/.zip/.mp4/.txt`, içerik tipi eşleşme, **kota kontrolü**, `uploads` + `upload_deliveries` insert → presigned PUT).
- `POST /api/v1/uploads/{id}/confirm` (`GetObjectInfoAsync` ile gerçek boyut doğrula; uyuşmazsa sil + kota iade).
- `GET /api/v1/uploads/{id}/url` (IDOR korumalı presigned GET; **öğretmen için `teacher_can_download` kontrolü**).
- Kabul: 100 MB üstü tek dosya reddedilir; kota aşımı 403/400 döner.

### [ ] T07 — Kota + Uyarı
- Koç kullanımı `SUM(size_bytes)` (status='UPLOADED' ve silinmemiş). `storage_quota_mb` aşımı upload'da engellenir.
- `GET /api/v1/coach/storage-usage` → `{ usedMb, quotaMb, warnMb, shouldWarn }`.
- Frontend: kullanım ≥ `warn_mb` ise uyarı banner *"Depolama doluyor — dosyaları indirerek yer açın."* Native + seçili cihazdaysa uyarı gizli.

### [ ] T08 — Ödev Teslimine Resim
- `CompleteHomeworkRequest`'e `AttachmentIds[]`; öğrenci ödev fotoğrafını R2'ye yükler, koç IDOR-korumalı görür (transaction).

### [ ] T09 — Ders Kaynağına Dosya
- `course_resources.upload_id`; koç PDF/dosya yükler, öğrenci indirir/görür. (Mevcut "link only" davranışı korunur.)

### [ ] T10 — Öğrenci Soruya Fotoğraf
- `student_questions.upload_id`; `POST/PATCH /student/questions` ile fotoğraf; koç `GET /students/{id}/questions` ucu presigned GET döndürür.

### [ ] T11 — Koç "Çözülemeyen Soru Koleksiyonu"
- Migration: `coach_question_collections` + `coach_question_collection_items`.
- Koç soruyu koleksiyona ekler/çıkarır, koleksiyonları listeler. IDOR: `program_coaches`/`program_teachers`. Çok tablolu yazma transaction.

### [ ] T12 — Öğretmen İndirme Hakkı (Koç Kontrolü)
- `courses.teacher_can_download`; koç ders bazında açar/kapatır (mevcut izin UI + `UpdateCourseAsync`).
- `GET /uploads/{id}/url` öğretmen rolünde bayrak + `IsTeacherOfCourseAsync` kontrolü.

### [ ] T13 — Cihaz Kimliği + `download_device_id`
- `@capacitor/device` (native) + web'de `localStorage` UUID; `user_devices` upsert.
- `users.download_device_id` ilk girişte o cihazla doldurulur (varsayılan).
- İlk kullanım mesajı + **"Tekrar gösterme"** (`users.hide_device_picker_tip`).

### [ ] T14 — Yerel Klasörler + Otomatik İndirme
- `@capacitor/filesystem` ekle. Native'de otomatik `Mentorum/dosyalar/gelenler` + `gidenler` klasörü oluştur.
- Seçili indirme cihazında dosya `DOWNLOADED` olunca R2'den silinebilir hale gelir.

### [ ] T15 — Cihaz Seçici + PC Uyarısı
- Cihaz seçici buton (`user_devices` listesi); değişim **yalnızca yeni** otomatik indirmeleri etkiler, eski dosyalara dokunulmaz.
- PC/web'de "bekleyen indirmeler" listesi + *"Otomatik indirme yalnızca tablet/telefon uygulamasında çalışır."* uyarısı.

### [ ] T16 — Öğrenci Cihazına Otomatik İniş
- Öğrenci tarafında da `gelenler/gidenler` senkronizasyonu (koçun gönderdikleri öğrencinin seçili cihazına iner).

### [ ] T17 — Delivery Yaşam Döngüsü + R2 Silme
- `BackgroundService` (`StorageMaintenanceService` benzeri): tüm alıcılar `DOWNLOADED` + tutma penceresi (örn. 24–72 saat) dolunca R2 objesi silinir, `uploads.status='DELETED'`.
- Başarısız/eksik indirmede dosya R2'de kalır, `delivery.status='PENDING'` yeniden denenir.

### [ ] T18 — Test & Doğrulama
- Backend: kota/uyarı, cihaz seçimi, çok-alıcı delivery, öğretmen indirme bayrağı IDOR, koleksiyon sahipliği, otomatik indirme başarısız senaryosu.
- `dotnet build` (0 hata) + `dotnet test` + `vite build` + Android Capacitor build'de dosya yazma denemesi.

---

# 🧠 BÖLÜM 2: Gemini 3.8 Flash (Antigravity) Mimari İnceleme & Revizyon Listesi (v2)

> **Mimar:** Gemini 3.8 Flash (Antigravity)  
> **Tarih:** 20 Ekim 2026  
> **Kapsam:** DeepSeek v1 taslağının analizi, kullanıcı geri bildirimleri ve mutabakata varılan revizyonlar

---

### 1. Temel Mimari Mutabakat: "Local-First Transit Boru Hattı"

DeepSeek v1 taslağı bulut depolama bağımlılığını azaltmayı hedeflemiş ancak bazı çelişkiler barındırmaktaydı. Yapılan değerlendirme sonucu sistemin çalışma felsefesi **WhatsApp/Telegram mantığı** olarak netleştirilmiştir:

1. **R2 Kalıcı Bir Kütüphane Değildir:** Cloudflare R2 sadece cihazlar arası geçici bir "Aktarım Tamponu" (Buffer / Transit Queue) olarak çalışır.
2. **Kalıcı Depo Kullanıcının Kendi Cihazıdır:** Dosyalar öğrenci ve koçun kendi telefon, tablet veya bilgisayarında saklanır.
3. **Local-First Görüntüleme:** Uygulama görselleri ve belgeleri açarken her zaman önce yerel diske/önbelleğe bakar. Dosya yerelde varsa R2'ye hiçbir istek atılmaz; hem sıfır gecikmeyle açılır hem de kota harcanmaz.

---

### 2. DeepSeek v1'e Getirilen 4 Temel Düzeltme

| Konu | DeepSeek v1 Taslağı | Gemini 3.8 Flash (Antigravity) Revizyonu |
| :--- | :--- | :--- |
| **Görüntüleme & Soru Koleksiyonu** | R2'den 24–72 saat sonra silinir; yerel açılış mekanizması tanımlanmamıştı. | **Local-First:** Uygulama önce yerel diske bakar. Soru Koleksiyonu ve geçmiş ödevler yerel diskteki dosya yolu (`local_path`) ve hash ile eşleşir. Dosya R2'den silinse dahi koçun cihazında sonsuza dek açılır. |
| **Kota & Tıkanma (Deadlock)** | 50 MB sınır; tüm alıcılar indirmeden silinmez. Ham fotoğraflarla kota hemen dolup sistemi kilitleyebilirdi. | **İstemci Sıkıştırması:** Fotoğraflar galeriden seçilince Canvas/WebP ile ~400–600 KB'a indirgenir (50 MB tampon 80–120 fotoğraf taşır). Dolunca öğrenciye *"Koçunuzun dosyaları eşitlemesi bekleniyor"* uyarısı çıkar. Koç uygulamayı açtığı anda dosyalar iner, R2'den silinir ve kota anında boşalır. |
| **T12 (Öğretmen İzni)** | `teacher_can_download` olarak adlandırılmış ve "görüntüler ama indiremez" DRM yanılsaması kurulmuştu. | **Dosya Paylaşım Yetkisi (`teacher_can_share_files`):** Koç, ders bazında öğretmenin öğrenciyle karşılıklı dosya (resim/PDF/belge) gönderip alabilme yetkisini açıp kapatır. İzin kapalıysa öğretmen dosya yükleyemez ve öğrencinin ödev eklerine erişemez. |
| **Dosya Formatları & Güvenlik** | Yalnızca resim odaklıydı; güvenlik uyarısı yoktu. | **Genişletilmiş Format & Virüs Disclaimer:** Resimlerin yanı sıra `.pdf`, `.docx`, `.xlsx`, `.txt` (maks 10 MB) desteklenir. Otomatik antivirüs taraması bulunmadığı için kartlara açık **Virüs Sorumluluk Uyarısı (Disclaimer)** eklenir. |

---

### 3. Revize Edilmiş Görev Maddeleri (v2 Detayları)

Aşağıdaki görevler, DeepSeek'in v1 listesindeki ilgili numaraların revize edilmiş ve kodlamaya hazır kesin tanımlarıdır:

#### [ ] T04-REV — Migration `020_storage_columns.sql`
- `ALTER coaches ADD storage_quota_mb INT DEFAULT 50, storage_warn_mb INT DEFAULT 30;`
- `ALTER users ADD download_device_id UUID NULL, hide_device_picker_tip INT DEFAULT 0;`
- `ALTER courses ADD teacher_can_share_files INT DEFAULT 1;` *(DeepSeek'in teacher_can_download kolonu yerine)*.
- `ALTER student_questions ADD upload_id UUID NULL;`
- `ALTER course_resources ADD upload_id UUID NULL;`

#### [ ] T06-REV — Upload Endpoint'leri & İstemci Sıkıştırma
- **İstemci Taraflı Sıkıştırma (`utils/imageCompressor.js`):** Görseller yükleme öncesi Canvas/WebP ile ~400–600 KB seviyesine optimize edilir.
- **Format Whitelist:** `.png, .jpg, .jpeg, .webp, .pdf, .docx, .xlsx, .txt`. Belgeler için tekil dosya sınırı: 10 MB.
- `POST /api/v1/uploads/url`: 50 MB tampon kontrolü (aşımda 400). Öğretmen gönderiyorsa `teacher_can_share_files` kontrolü. Alıcılar backend tarafında otomatik türetilir.
- `POST /api/v1/uploads/{id}/confirm`: Boyut doğrulaması ve durum güncellemesi.
- `GET /api/v1/uploads/{id}/url`: IDOR korumalı presigned GET URL.

#### [ ] T07-REV — Kota Yönetimi & Öğrenci/Koç Uyarıları
- Koç kullanımı: R2'de `status='UPLOADED'` ve henüz `DOWNLOADED` olmamış nesnelerin toplam boyutu.
- `GET /api/v1/coach/storage-usage` → `{ usedMb, quotaMb, warnMb, shouldWarn }`.
- **Öğrenci Kota Uyarısı:** 50 MB dolduğunda modal/banner: *"Yükleme kotanız doldu. Daha fazla dosya yükleyebilmek için koçunuzun uygulamayı açarak bekleyen dosyaları eşitlemesini bekleyin veya koçunuzla iletişime geçin."*
- **Koç Bilgilendirmesi:** Kota 30 MB olduğunda hafif uyarı rozeti.

#### [ ] T11-REV — Koç "Çözülemeyen Soru Koleksiyonu" (Local-First)
- Migration: `coach_question_collections` + `coach_question_collection_items`.
- Koç soruları koleksiyonlara gruplar.
- **Local-First:** Görseller ve küçük resimler yerel diskten okunduğu için R2 tamponu temizlense dahi koleksiyon yerel cihazda kalıcı olarak çalışır.

#### [ ] T12-REV — Öğretmen Dosya Paylaşım Yetkisi (Koç Kontrolü)
- `courses.teacher_can_share_files` kolonu.
- Koç ders ayarlarında / öğretmen atama ekranında "Dosya Paylaşımı (Gönder / Al)" anahtarını açıp kapatabilir.
- Kapalıysa öğretmen o derste dosya gönderemez ve öğrencinin ödev eklerini göremez.

#### [ ] T14-REV — Yerel Klasörler & Local-First Görüntüleyici
- `@capacitor/filesystem` ile cihazda `Mentorum/dosyalar/gelenler` ve `gidenler` klasörleri.
- **Local-First Medya Bileşeni (`LocalImageViewer`):** Dosyayı açmadan önce yerel disk yolunu kontrol eder. Varsa doğrudan yerelden açar; yoksa R2 presigned URL'sine başvurur.

#### [ ] T15-REV — Cihaz Seçici, PC/Web Uyarlaması & Güvenlik Bildirimi
- Cihaz seçici modalı (`user_devices`).
- **PC/Web Bilgilendirmesi:** Web kullanıcılarına tarayıcı önbelleği (IndexedDB/CacheStorage) kullandıklarına dair bilgilendirme rozeti.
- **Virüs & Güvenlik Sorumluluk Uyarısı (Disclaimer):** Tüm dosya yükleme ve indirme arayüzlerine otomatik virüs taraması olmadığı ve sorumluluğun kullanıcıya ait olduğuna dair belirgin uyarı metni.

#### [ ] T17-REV — Teslimat Doğrulama & R2 Tampon Temizliği
- Koç veya öğrenci dosyayı yerel diske yazdığında istemci `POST /api/v1/uploads/{id}/deliver` ucuyla `DOWNLOADED` bildirir.
- Dosya teslim edildiği anda R2 objesi silinir (`status='DELETED'`) ve koçun 50 MB'lık tampon alanı anında serbest kalır.

---

# ✅ BÖLÜM 3: Nihai Mutabakat (v3) — Kodlamada Esas Alınacak Kararlar

> **Karar Tarihi:** 20 Ekim 2026 · **Onaylayan:** Ürün sahibi (kullanıcı)
> **Not:** Bu bölüm, v1/v2 ile çelişen tüm maddelerde **geçerli ve önceliklidir.**

## 1. Alıcı & R2 Silme (Tek Alıcı Modeli) — KESİN
- Bir dosya **tek alıcıya** gider: öğrenci öğretmene gönderiyorsa **koça gitmez**; öğrenci koça gönderiyorsa öğretmene gitmez.
- **Alıcı seçimi (dropdown):** Dosya gönderilirken öğrenciye **açılır liste** çıkar; kime gönderebileceğini seçer. Dersin öğretmeni varsa listede **önce öğretmen(ler)** gelir (varsayılan). Dersin öğretmeni yoksa **dropdown gösterilmez**, dosya doğrudan **koça** gider.
- Alıcı dosyayı cihazına aldığı anda (native otomatik / PC manuel) istemci `POST /api/v1/uploads/{id}/deliver` ile `DOWNLOADED` bildirir → **R2 objesi anında silinir** (`status='DELETED'`) → kota boşalır. (T17-REV onaylandı)
- Tutma penceresi (24–72 saat) uygulanmaz; silme kuralı yalnızca "teslimatta sil".

## 2. Öğretmen Dosya Paylaşım Yetkisi — KESİN
- `courses.teacher_can_share_files INT DEFAULT 1` (varsayılan **açık**).
- Öğretmen varsayılan olarak dosya gönderip alabilir; **koç isterse ders bazında kaldırır.** (T04-REV + T12-REV)

## 3. Dosya Formatları — KESİN
- **Resim:** `.png`, `.jpg`, `.jpeg`, `.webp`
- **Belge:** `.pdf`, `.docx` (doc)
- Çıkarılanlar: `.xlsx`, `.txt` (ayrıca `.zip`, `.rar`, `.mp4` zaten yok).
- Belge tekil dosya sınırı: 10 MB. (T06-REV güncellendi)

## 4. Sekmeli Dosya Görünümü — YENİ GEREKSİNİM
- Dosya listesi (gelenler/gidenler) **iki sekmeye** ayrılır:
  - **"Resimler"** → `.png/.jpg/.jpeg/.webp`
  - **"Belgeler"** → `.pdf/.docx`
- Sınıflandırma `content_type`/uzantıya göre yapılır. (Yeni UI görevi)

## 5. Resim Sıkıştırma — KESİN
- Resimler **her zaman** Canvas/WebP ile ~400–600 KB'a sıkıştırılır.
- Kalite yeterli görüldüğünden **"sıkıştırılmamış / orijinal kalite" seçeneği YOKTUR.** (Tek davranış: sıkıştır)

## 6. Depolama Modu: Yerel (LOCAL) vs Online Bulut (ONLINE) — KESİN (YENİ)
- **Standart Koçlar (`storage_mode = 'LOCAL'`):** Varsayılan moddur. 50 MB tampon kota uygulanır. Dosyalar alıcının cihazına indiği anda R2'den **silinir** (`status='DELETED'`) ve kota serbest kalır (sıfır ek bulut maliyeti).
- **Online Yetkili Koçlar (`storage_mode = 'ONLINE'`):** Admin yönetim sayfasından kota artırılır (örn: 1 GB, 5 GB) ve "Online Bulut Depolama" modu aktif edilir.
  - Dosyalar cihaza inse bile **R2'den SİLİNMEZ**, bulutta kalıcı olarak saklanır ve koçun kotasında tutulur.
  - Koç dosyaları web veya mobilde varsayılan olarak **online (streaming)** görüntüler.
  - **Dosya Üzerinde "Online / Yerel" Seçeneği:** Dosya kartında `[Online (Bulut)]` rozeti ve yanında `[Cihaza İndir (Yerel)]` seçeneği yer alır. Online yetkisi olan koç varsayılan olarak online kullanırken dilerse tek tıkla dosyayı cihazına (`Mentorum/dosyalar/gelenler`) indirip çevrimdışı da saklayabilir.
  - **ONLINE'da otomatik indirme KAPALI:** `ONLINE` programlarda dosyalar bulutta kalır; yalnızca `[Cihaza İndir]` derse yerel kopya iner (otomatik toplu indirme yapılmaz).
- **Kota kapsamı (program bazlı):** `storage_mode` ve kota **programın sahibi koça** aittir; öğrenci, öğretmen, veli dahil programdaki herkes bu kotayı kullanır. Alıcı öğretmense **davet eden koçun kotasından** gider.
- **Uyarı (% bazlı):** Kota kullanımı **% olarak** gösterilir; **≥%80** olunca kırmızıya döner ve uyarı çıkar (LOCAL ve ONLINE için geçerli; sabit 30 MB eşiği kaldırıldı).

---

# 🛠️ BÖLÜM 4: Nihai Görev Listesi + Detaylı Kodlama Şeması (v4)

> Bu bölüm kodlamada **tek ve öncelikli** kaynaktır. v1/v2/v3 ile çelişen her yerde burası geçerlidir. Her maddenin altında **eklenecek/değişecek dosyalar, fonksiyon imzaları ve davranışlar** yazılıdır.

## Ortak Konvansiyonlar (tüm görevlerde geçerli)
- **Backend namespace'leri:** `MentorumApi.Data` (repo), `MentorumApi.DTOs` (istek/yanıt), `MentorumApi.Endpoints` (minimal API), `MentorumApi.Services` (servis/guard).
- **Repository deseni:** `DbConnectionFactory` ctor ile alınır; `using var conn = _connectionFactory.CreateConnection();`. Çok tablolu yazma `using var tx = conn.BeginTransaction(); ... tx.Commit();` içinde, `catch { tx.Rollback(); throw; }`.
- **IDOR:** `ProgramAccessGuard` metodları + SQL'de `AND program_id = @ProgramId` / `AND student_id = @StudentId` / `program_id IN (SELECT program_id FROM program_coaches WHERE coach_id=@CoachId)`.
- **Endpoint deseni:** `MapGroup("/api/v1/...")` + `.RequireAuthorization("RequireCoachRole"/"RequireStudentRole"/"RequireTeacherRole"/"RequireParentRole")`. Kullanıcı id: `user.FindFirst(ClaimTypes.NameIdentifier)?.Value`; rol: `ClaimTypes.Role`.
- **DTO deseni:** tek dosyada birden çok `public class` (ör. `HomeworkDtos.cs`).
- **Frontend:** React Query hook'ları `src/features/<X>/<X>Api.js`; HTTP `src/api/apiClient.js` (axios, `withCredentials`); state `zustand` (`useAuthStore`); CSS `*.module.css`; i18n yalnızca `tr`; ikonlar `lucide-react`.

### [x] T01 — R2 Paketi + Konfigürasyon
- **Dosya (değişir):** `Backend/MentorumApi/MentorumApi.csproj` → `<PackageReference Include="AWSSDK.S3" Version="4.0.101.6" />`.
- **Dosya (değişir):** `Backend/.env` ve `Backend/.env.example` → `R2_ACCESS_KEY_ID=`, `R2_SECRET_ACCESS_KEY=`, `R2_BUCKET_NAME=mentorum-uploads`, `R2_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
- **Dosya (değişir):** `Backend/MentorumApi/Program.cs` → `builder.Services.AddSingleton<IStorageService, R2StorageService>();`.
- **Kabul:** env eksikse `R2StorageService` ctor'ı `InvalidOperationException` fırlatır → uygulama açılışta net hata verir.

### [x] T02 — Storage Soyutlama + R2 Servisi
- **Yeni dosya:** `Backend/MentorumApi/Services/Storage/IStorageService.cs`
  - `string GenerateUploadUrl(string objectKey, string contentType, TimeSpan expiresIn);`
  - `string GenerateDownloadUrl(string objectKey, TimeSpan expiresIn);`
  - `Task DeleteFileAsync(string objectKey);`
  - `Task<long?> GetObjectInfoAsync(string objectKey);`
- **Yeni dosya:** `Backend/MentorumApi/Services/Storage/R2StorageService.cs`
  - Ctor `(IConfiguration config)`: `config["R2_ACCESS_KEY_ID"]` vb. okur; `AmazonS3Config { ServiceURL = endpoint, ForcePathStyle = true }`; `new AmazonS3Client(accessKey, secretKey, s3Config)`.
  - `GenerateUploadUrl`: `GetPreSignedUrlRequest { BucketName, Key, Verb = HttpVerb.PUT, ContentType = contentType, Expires = DateTime.UtcNow.Add(expiresIn) }` → `_s3Client.GetPreSignedURL(req)`.
  - `GenerateDownloadUrl`: `Verb = HttpVerb.GET`, `Expires`.
  - `GetObjectInfoAsync`: `GetObjectMetadataRequest` → `response.ContentLength`; `AmazonS3Exception` `StatusCode == NotFound` → `return null`.
- **Kabul:** PUT 15 dk, GET 10 dk geçerli presigned URL üretir; `ContentType` imzaya dahil.

### [x] T03 — Migration `019_uploads.sql`
- **Yeni dosya:** `Backend/MentorumApi/Data/Migrations/019_uploads.sql` (idempotent)
  - `uploads`: `id UUID PK, program_id UUID NOT NULL REF coaching_programs, sender_user_id UUID NOT NULL REF users, recipient_user_id UUID NOT NULL REF users, course_id UUID NULL REF courses, homework_id UUID NULL REF homework_assignments, student_question_id UUID NULL REF student_questions, object_key TEXT NOT NULL UNIQUE, content_type TEXT NOT NULL, size_bytes BIGINT NOT NULL, original_name TEXT NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'PENDING' (PENDING|UPLOADED|DELETED), created_at, updated_at`.
  - `upload_deliveries`: `id UUID PK, upload_id UUID NOT NULL REF uploads, recipient_user_id UUID NOT NULL REF users, direction VARCHAR(8) NOT NULL (IN|OUT), status VARCHAR(16) DEFAULT 'PENDING' (PENDING|DOWNLOADED), device_id UUID NULL, delivered_at TIMESTAMPTZ NULL`.
  - `user_devices`: `id UUID PK, user_id UUID NOT NULL REF users, device_uid TEXT NOT NULL, platform VARCHAR(16) NOT NULL (web|android|ios), label TEXT NOT NULL, first_seen_at, last_seen_at, UNIQUE(user_id, device_uid)`.
  - Index'ler: `idx_uploads_program(program_id)`, `idx_uploads_recipient(recipient_user_id)`, `idx_deliveries_upload(upload_id)`.
- **Not:** `object_key` şeması `{program_id}/{entity}/{guid}{ext}` (örn. `PROG/homework/ABC.png`).

### [x] T04 — Migration `020_storage_columns.sql`
- **Yeni dosya:** `Backend/MentorumApi/Data/Migrations/020_storage_columns.sql`
  - `ALTER TABLE coaches ADD COLUMN IF NOT EXISTS storage_quota_mb INT NOT NULL DEFAULT 50;`
  - `ALTER TABLE coaches ADD COLUMN IF NOT EXISTS storage_warn_percent INT NOT NULL DEFAULT 80;`
  - `ALTER TABLE coaches ADD COLUMN IF NOT EXISTS storage_mode VARCHAR(16) NOT NULL DEFAULT 'LOCAL';` -- 'LOCAL' (varsayılan - tampon) | 'ONLINE' (bulut kalıcı)
  - `ALTER TABLE users ADD COLUMN IF NOT EXISTS download_device_id UUID NULL;`
  - `ALTER TABLE users ADD COLUMN IF NOT EXISTS hide_device_picker_tip INT NOT NULL DEFAULT 0;`
  - `ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_can_share_files INT NOT NULL DEFAULT 1;`
  - `ALTER TABLE student_questions ADD COLUMN IF NOT EXISTS upload_id UUID NULL;`
  - `ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS upload_id UUID NULL;`

### [x] T05 — Storage DTO'ları + UploadRepository
- **Yeni dosya:** `Backend/MentorumApi/DTOs/StorageDtos.cs`
  - `CreateUploadUrlRequest`: `FileName, FileSizeInBytes, ContentType, CourseId?, HomeworkId?, StudentQuestionId?, RecipientUserId?`.
  - `RecipientOptionDto`: `UserId, FullName, Role`.
  - `UploadDto`: `Id, ObjectKey, ContentType, SizeBytes, OriginalName, Status, RecipientUserId`.
  - `StorageUsageDto`: `UsedMb, QuotaMb, UsedPercent, WarnPercent, ShouldWarn, StorageMode`.
  - `AdminUpdateCoachStorageRequest`: `QuotaMb, WarnPercent, StorageMode` ('LOCAL'|'ONLINE').
- **Yeni dosya:** `Backend/MentorumApi/Data/UploadRepository.cs`
  - `Task<Guid> CreatePendingAsync(programId, senderUserId, recipientUserId, courseId?, homeworkId?, studentQuestionId?, objectKey, contentType, sizeBytes, originalName)` → transaction: `uploads` (PENDING) + `upload_deliveries` (alıcı için `IN`, gönderici için `OUT`).
  - `Task<bool> ConfirmAsync(uploadId, senderUserId)` → R2 `GetObjectInfoAsync` boyut doğrula → `status='UPLOADED'`.
  - `Task<UploadDto?> GetByIdAsync(uploadId)`.
  - `Task<IEnumerable<UploadDto>> ListForUserAsync(userId)` → `WHERE sender_user_id=@U OR recipient_user_id=@U`.
  - `Task<double> GetUsedBytesAsync(coachId)` → `SUM(size_bytes)` `status IN ('PENDING','UPLOADED')` (moda göre otomatik: LOCAL'da teslim edilip `DELETED` olanlar hariç; ONLINE'da tüm bulut dosyaları sayılır).
  - `Task MarkDeliveredAsync(uploadId, recipientUserId, deviceId)` → delivery `DOWNLOADED`. Koç `storage_mode=='LOCAL'` ise `uploads.status='DELETED'`; `ONLINE` ise `uploads.status='UPLOADED'` olarak kalır (R2'den silinmez).
  - `Task UpdateCoachStorageSettingsAsync(coachId, quotaMb, warnPercent, storageMode)`.

### [x] T06 — Storage Endpoint'leri
- **Yeni dosya:** `Backend/MentorumApi/Endpoints/StorageEndpoints.cs` (`MapStorageEndpoints(this IEndpointRouteBuilder app)`).
- **`POST /api/v1/uploads/url`** (tüm roller; `RequireAuthorization()`)
  - Uzantı whitelist: `.png/.jpg/.jpeg/.webp` (resim) + `.pdf/.docx` (belge). Diğerleri → `400`.
  - İçerik tipi↔uzantı eşleşmesi (resimlerde `image/*`, pdf `application/pdf`, docx `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
  - Belge için tekil dosya sınırı **10 MB** (`FileSizeInBytes > 10*1024*1024 → 400`).
  - Gönderen öğretmense `courses.teacher_can_share_files = 1` kontrolü (T13).
  - Alıcı `RecipientUserId` yoksa default çöz: ders öğretmeni varsa öğretmen, yoksa koç (T07 mantığı).
  - Kota kontrolü: `GetUsedBytesAsync` + `FileSizeInBytes > (quotaMb - used)` → `400`.
  - `object_key` üret (`{programId}/{entity}/{Guid.NewGuid():N}{ext}`), `GenerateUploadUrl(key, contentType, 15 dk)`, `CreatePendingAsync(...)`, `{ uploadId, uploadUrl }` döner.
- **`POST /api/v1/uploads/{id:guid}/confirm`** → `ConfirmAsync` (boyut uyuşmazsa R2'den `DeleteFileAsync` + `400`).
- **`GET /api/v1/uploads/{id:guid}/url`** → sahiplik: öğrenci `student_id` claim'i; koç `program_coaches`; öğretmen `IsTeacherOfCourseAsync` + `teacher_can_share_files`. → `GenerateDownloadUrl(key, 10 dk)`.
- **`POST /api/v1/uploads/{id:guid}/deliver`** → `MarkDeliveredAsync` + R2 `DeleteFileAsync` → `{ message }`.
- **Dosya (değişir):** `Program.cs` → `app.MapStorageEndpoints();`.

### [x] T07 — Alıcı Belirleme Endpoint'i (Dropdown Verisi)
- **Dosya (değişir):** `StorageEndpoints.cs` (veya `UploadRepository`'e metod ekle).
- **`GET /api/v1/uploads/recipients?courseId={guid}`** (`RequireStudentRole`)
  - `RecipientOptionDto[]` döner. Sıralama: **önce öğretmen(ler)** (`courses.teacher_id` → `users.full_name`, `Role='Teacher'`), **sonra koç** (`program_coaches` → `users.full_name`, `Role='Coach'`).
  - Öğretmen yoksa yalnızca koç döner (frontend dropdown göstermez, otomatik koç seçilir).
- **SQL örneği:** `SELECT u.id AS UserId, u.full_name AS FullName, 'Teacher' AS Role FROM courses c JOIN users u ON u.id = c.teacher_id WHERE c.id = @CourseId` UNION `SELECT u.id, u.full_name, 'Coach' FROM coaching_programs p JOIN program_coaches pc ON pc.program_id = p.id JOIN users u ON u.id = pc.coach_id WHERE p.id = (SELECT program_id FROM courses WHERE id=@CourseId)`.

### [x] T08 — Kota Yönetimi, Uyarılar & Admin Mod Ayarı
- **Dosya (değişir):** `UploadRepository.cs` + `Endpoints/StorageEndpoints.cs` + `Endpoints/AdminEndpoints.cs`.
- **`GET /api/v1/coach/storage-usage`** (`RequireCoachRole`) → `StorageUsageDto { UsedMb, QuotaMb, UsedPercent = usedMb/quotaMb*100, WarnPercent (80), ShouldWarn = usedPercent >= warnPercent, StorageMode }`.
- **`PUT /api/v1/admin/coaches/{id:guid}/storage`** (`RequireAdminRole`) → `AdminUpdateCoachStorageRequest { QuotaMb, WarnPercent, StorageMode }`. Admin, koçun kotasını artırabilir ve `storage_mode` ('LOCAL' | 'ONLINE') ayarını değiştirebilir.
- **Frontend (yeni):** `src/features/storage/storageApi.js` → `useStorageUsage()` (koç) + `useUpdateCoachStorage()` (admin).
  - Koç: kota **% olarak** gösterilir; `usedPercent >= warnPercent (80)` olunca **kırmızı** rozet + uyarı *"Depolama %X dolu."* (hem LOCAL hem ONLINE geçerli).
  - Öğrenci: kota dolunca modal *"Yükleme kotanız doldu. Koçunuzun dosyaları eşitlemesi bekleniyor."*.
  - Admin Paneli: Koç detayında Depolama Kotası (MB) alanı + "Online Bulut Depolama Modu" anahtarı.

### [x] T09 — Ödev Teslimine Resim Ekleme
- **Dosya (değişir):** `DTOs/HomeworkDtos.cs` → `CompleteHomeworkRequest`'e `public List<Guid>? AttachmentIds { get; set; }`.
- **Dosya (değişir):** `Endpoints/HomeworkEndpoints.cs` complete ucu: `AttachmentIds` her biri için `uploads.id` doğrula (öğrenci sahibi + `student_id` claim) → `UPDATE uploads SET homework_id = @HomeworkId WHERE id = @UploadId AND sender_user_id = @StudentId` (transaction).
- **Koç görüntüleme:** `GET /homework/student/{id}` yanıtına attachment listesi eklenir (her `upload_id` için presigned GET). IDOR: `EnsureCoachOwnsStudentAsync`.

### [x] T10 — Ders Kaynağına Dosya Yükleme
- **Dosya (değişir):** `DTOs/CourseResourceDtos.cs` → `CreateCourseResourceRequest`/`UpdateCourseResourceRequest`'e `Guid? UploadId`.
- **Dosya (değişir):** `Data/CourseResourceRepository.cs` → `CreateResourceAsync`/`UpdateResourceAsync` içinde `upload_id` kolonuna yaz.
- **Dosya (değişir):** `Endpoints/CourseResourceEndpoints.cs` → `POST /api/v1/programs/{programId}/courses/{courseId}/resources` gövdesi `UploadId` kabul eder.
- **Öğrenci görüntüleme:** `GetStudentCourseResourcesAsync` yanıtına `upload_id` → presigned GET eklenir. IDOR: ders üyeliği (`course_students`/`course_groups`).
- **Not:** Mevcut "harici link" (`ResourceRef`) davranışı korunur; `UploadId` link'e alternatiftir.

### [x] T11 — Öğrenci Soruya Fotoğraf Ekleme
- **Dosya (değişir):** `DTOs/StudentUxDtos.cs` → `CreateStudentQuestionRequest`'e `Guid? UploadId`; `StudentQuestionDto`'ya `Guid? UploadId`.
- **Dosya (değişir):** `Data/StudentQuestionsRepository.cs` → create/update'te `upload_id` yaz.
- **Dosya (değişir):** `Endpoints/StudentEndpoints.cs` → `POST /student/questions` + `PATCH /student/questions/{id}` `UploadId` kabul eder; koç `GET /students/{id}/questions` yanıtına presigned GET ekler.
- **IDOR:** `EnsureCoachOwnsStudentAsync` (koç tarafı); öğrenci `student_id` claim'i.

### [x] T12 — Koç "Çözülemeyen Soru Koleksiyonu"
- **Yeni migration:** `Backend/MentorumApi/Data/Migrations/021_question_collections.sql`
  - `coach_question_collections`: `id UUID PK, coach_id UUID NOT NULL REF coaches, program_id UUID NOT NULL REF coaching_programs, title TEXT NOT NULL, created_at`.
  - `coach_question_collection_items`: `id UUID PK, collection_id UUID NOT NULL REF coach_question_collections, student_question_id UUID NOT NULL REF student_questions, added_at, UNIQUE(collection_id, student_question_id)`.
- **Yeni dosya:** `Data/QuestionCollectionRepository.cs` → `CreateAsync`, `AddItemAsync`, `RemoveItemAsync`, `ListCollectionsAsync(coachId)`, `ListItemsAsync(collectionId)`.
- **Yeni endpoint:** `Endpoints/QuestionCollectionEndpoints.cs` (`RequireCoachRole`) → `POST/GET/DELETE /api/v1/coach/question-collections` + `POST/DELETE /{collectionId}/items/{questionId}`.
- **IDOR:** `program_id IN (program_coaches)`; item eklerken `student_questions.program_id` uyumu. Çok tablolu yazma transaction.
- **Local-First:** soru görselleri yerel diskten açılır (T15 `LocalImageViewer`).

### [x] T13 — Öğretmen Dosya Paylaşım Yetkisi (Koç Kontrolü)
- **Dosya (değişir):** `Services/ProgramAccessGuard.cs` → yeni metod: `Task<bool> CanTeacherShareFilesAsync(Guid teacherId, Guid courseId)` → `SELECT teacher_can_share_files FROM courses WHERE id=@CourseId AND teacher_id=@TeacherId`.
- **Dosya (değişir):** `Endpoints/StorageEndpoints.cs` → `POST /uploads/url` ve `GET /uploads/{id}/url` içinde gönderen/erişen öğretmense `CanTeacherShareFilesAsync` kontrolü; kapalıysa `403`.
- **Dosya (değişir):** `Endpoints/CourseEndpoints.cs` veya `TeacherEndpoints.cs` → koçun `teacher_can_share_files` değerini değiştireceği endpoint (mevcut `UpdateCourseAsync`/izin modeliyle).
- **Frontend:** koç ders ayarları/öğretmen atama ekranında **"Dosya Paylaşımı (Gönder / Al)"** anahtarı (varsayılan açık).

### [x] T14 — Cihaz Kimliği + `download_device_id`
- **Yeni frontend dosya:** `src/utils/device.js`
  - Native: `@capacitor/device` → `Device.getId()` (stable UUID). Web: `localStorage` içinde kalıcı rastgele `UUID` üret (`crypto.randomUUID()`).
  - `getDeviceId()`, `getPlatform()` (`'web'|'android'|'ios'`), `getDeviceLabel()` (tarayıcı/model adı).
- **Backend (yeni endpoint, `StorageEndpoints.cs` veya `DeviceEndpoints.cs`):**
  - `POST /api/v1/devices` → `user_devices` upsert (`ON CONFLICT (user_id, device_uid) DO UPDATE SET last_seen_at=NOW()`).
  - `GET /api/v1/devices` → kullanıcının cihaz listesi.
  - `PUT /api/v1/users/me/download-device` (`{ deviceId }`) → `users.download_device_id` güncelle. **İlk girişte** bu değer boşsa, `POST /devices` sonrası otomatik ilk cihaza set edilir.
  - `PUT /api/v1/users/me/hide-device-picker` → `users.hide_device_picker_tip = 1` ("Tekrar gösterme").
- **Frontend:** ilk kullanımda cihaz seçici modal + **"Tekrar gösterme"** kutusu; `hide_device_picker_tip` okunur.

### [x] T15 — Yerel Klasörler + Local-First / Online Görüntüleyici
- **Paket:** `Frontend` → `npm install @capacitor/filesystem @capacitor/device`.
- **Yeni frontend dosya:** `src/utils/localFiles.js`
  - `ensureFolders()` → native'de `Filesystem.mkdir({ path: 'Mentorum/dosyalar/gelenler', directory: Directory.Documents, recursive: true })` + `gidenler`.
  - `saveFile(relPath, base64)` → `Filesystem.writeFile({ path: 'Mentorum/dosyalar/' + relPath, data: base64, directory: Directory.Documents })`.
  - `readFileIfExists(relPath)` → `Filesystem.readFile` → base64; yoksa `null`.
- **Yeni frontend bileşen:** `src/components/common/LocalImageViewer/LocalImageViewer.jsx` (+ `.module.css`)
  - **Yerel Mod (`LOCAL`):** Dosya açılmadan önce yerel disk (`localFiles.readFileIfExists`) kontrol; varsa yerelden, yoksa R2 presigned GET ile.
  - **Online Mod (`ONLINE`):** Dosya varsayılan olarak online (presigned GET) açılır. Dosya kartında `[Online (Bulut)]` rozeti ve `[Cihaza İndir (Yerel)]` butonu gösterilir; koç tıklarsa yerel klasöre (`Mentorum/dosyalar/gelenler`) indirilir ve yerel yolla eşleştirilir.
- **Backend notu (T03'e ek):** Local-First eşleme için `upload_deliveries`'e `local_path TEXT NULL` ve `file_hash TEXT NULL` kolonları eklenir (yerel yol **cihaza özeldir**, bu yüzden paylaşılan `uploads` tablosunda değil, teslimat katmanında tutulur). İstemci dosyayı kaydedince `local_path` + `file_hash` (SHA-256) ile `deliver` ucu bildirilir.

### [x] T16 — Cihaz Seçici + PC/Web Uyarlaması + Güvenlik Bildirimi
- **Cihaz seçici modal (`DevicePickerModal.jsx`):** `GET /devices` listesini gösterir; seçim `PUT /users/me/download-device`. Değişiklik **yalnızca yeni** otomatik indirmeleri etkiler, eski dosyalara dokunulmaz (T17 akışı zaten yalnızca `PENDING` delivery'leri işler).
- **PC/Web bilgilendirme rozeti:** `Platform.isNative === false` iken *"Otomatik indirme yalnızca tablet/telefon uygulamasında çalışır; bu cihazda dosyalar tarayıcı önbelleğinde (IndexedDB) tutulur."* + "bekleyen indirmeler" listesi.
- **Virüs & güvenlik disclaimer:** yükleme/indirme kartlarına *"Dosyalar otomatik virüs taramasından geçmez; sorumluluk kullanıcıya aittir."* metni (i18n `tr`).

### [x] T17 — Sekmeli Dosya Görünümü + Frontend Upload Akışı
- **Sekmeli görünüm:** dosya listesi (gelenler/gidenler) iki sekme: **"Resimler"** (`.png/.jpg/.jpeg/.webp`) ve **"Belgeler"** (`.pdf/.docx`). Sınıflandırma `content_type`/uzantıya göre.
- **Yeni frontend dosya:** `src/utils/imageCompressor.js`
  - `compressImage(file)` → Canvas → WebP ~400–600 KB (maks boyut ~1200px, kalite 0.8). Her zaman sıkıştır; "orijinal" seçeneği yok.
- **Upload akışı (bileşen):** dosya seç → `compressImage` (resimse) → `POST /uploads/url` (alıcı `RecipientUserId` ile) → presigned PUT (`axios.put(uploadUrl, blob, { headers: { 'Content-Type': contentType } })`) → `POST /uploads/{id}/confirm`.
- **Alıcı dropdown:** `GET /uploads/recipients?courseId=...` → açılır liste; öğretmen varsa **ilk sırada**, yoksa dropdown gizli + otomatik koç.
- **Frontend api:** `src/features/storage/storageApi.js` → `useRecipients(courseId)`, `useUploads()`, `useCreateUploadUrl()`, `useConfirmUpload()`, `useDeliverUpload()`, `useDownloadUrl(id)`.

### [x] T18 — Öğrenci Cihazına Otomatik İniş
- Öğrenci tarafında da aynı senkronizasyon: koçun/öğretmenin gönderdiği dosyalar öğrencinin **seçili indirme cihazına** `gelenler` klasörüne iner.
- **Frontend (native):** uygulama açılınca `GET /uploads` içinde `PENDING` delivery'ler → presigned GET → `localFiles.saveFile` → `POST /uploads/{id}/deliver`. Web'de IndexedDB'ye yazar + `deliver`.
- **Sıralama:** otomatik indirme yalnızca `users.download_device_id` = mevcut cihazsa yapılır (önceki cihaz değişimi kararı).
- **Mod şartı:** otomatik indirme yalnızca program `storage_mode=='LOCAL'` ise yapılır; `ONLINE` programlarda dosyalar bulutta kalır (online görüntülenir), yalnızca `[Cihaza İndir]` ile manuel yerel kopya iner.

### [x] T19 — Delivery Yaşam Döngüsü + R2 Silme (Yerel vs Online Ayrımı)
- **Teslimat & Mod Bazlı Silme:** `POST /uploads/{id}/deliver` çağrıldığında:
  - `MarkDeliveredAsync` çalışır (`delivery.status = 'DOWNLOADED'`).
  - **Koç `storage_mode == 'LOCAL'` ise:** `uploads.status = 'DELETED'` yapılır ve R2'den `DeleteFileAsync` çağrılarak dosya anında silinir (tampon boşalır).
  - **Koç `storage_mode == 'ONLINE'` ise:** `uploads.status = 'UPLOADED'` kalır ve R2'den **SİLİNMEZ**. Dosya bulutta kalıcı saklanır ve koçun kotasında tutulmaya devam eder.
- **Yeni dosya:** `Services/Background/StorageMaintenanceService.cs` (`BackgroundService`, `Program.cs`'a `AddHostedService<StorageMaintenanceService>()`)
  - Orphan temizlik: `uploads.status='PENDING' AND created_at < NOW() - INTERVAL '15 minutes'` → R2 sil + `status='DELETED'` (istemci `confirm` etmemiş yüklemeler).
  - `UPLOADED` dosyalar (Online moddaki kalıcı dosyalar ve henüz teslim edilmemiş yerel dosyalar) **silinmez**; kotaya sayılır.
- **Çok tablolu yazma:** `MarkDeliveredAsync` transaction içinde; R2 silme transaction dışında (DB commit sonrası, hata olursa log + bir sonraki tur tekrar).

### [x] T20 — Test & Doğrulama
- **Yeni test dosyası:** `Backend/MentorumApi.Tests/V11StorageTests.cs` (Testcontainers + mevcut `CustomWebApplicationFactory` deseniyle)
  - Format whitelist + boyut sınırı + boyut uyuşmazlığı reddi.
  - Kota aşımı (50 MB) → 400; `storage-usage` `shouldWarn` (≥%80).
  - Tek-alıcı: `deliver` sonrası R2 silinir + kota boşalır.
  - IDOR: öğrenci başkasının upload'ına erişemez; öğretmen `teacher_can_share_files=0` iken 403; koç yalnızca kendi programındaki dosyayı görür.
  - Alıcı dropdown: öğretmen varsa önce öğretmen; yoksa yalnızca koç.
  - Koleksiyon sahipliği (başka koçun koleksiyonuna ekleyemez).
  - Cihaz seçimi: `download_device_id` güncelleme + ilk giriş default.
- **Komutlar:** `dotnet build` (0 hata) + `dotnet test` (tümü yeşil) + `cd Frontend && npm run build` + Android Capacitor build'de `Filesystem.writeFile` denemesi.

## Kodlama Sırası Özeti (T01→T20 sırayla)
1. T01–T05 (altyapı: paket, servis, migration, repo).
2. T06–T08 (endpoint'ler + alıcı + kota).
3. T09–T13 (iş uçları: ödev, kaynak, soru, koleksiyon, öğretmen izni).
4. T14–T18 (cihaz, klasör, senkronizasyon, UI).
5. T19 (temizlik) + T20 (test).
