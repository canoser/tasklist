# 🧭 Mentörüm — V13 Görev Listesi (Öğrenci Ekleme Esnekliği & Bireysel/Grup Geçişi)

> **Tarih:** 20 Ekim 2026 · **Uygulayıcı:** DeepSeek v4 pro (Cline ajanı)
> **Amaç:** Koçun öğrenciyi e-posta zorunluluğu olmadan (Gölge Profil) ekleyebilmesi; öğrencinin tek çatı program altında hem bireysel (1:1) hem grup derslerinde olabilmesi ve aralarında esnek geçiş.
> **Sıralama:** Migration → backend → frontend → test. Görevler M1→M4, B1→B4, F1→F5.

## 0. Kod İnceleme Bulguları (şartnamedeki hataların düzeltmeleri)
- ❌ **D1:** `courses.type` içinde **'OZEL_DERS' YOK** (mevcut CHECK: `'DERS','SORU_COZUMU','DENEME','KITAP','VIDEO','DIGER'`). 'OZEL_DERS' aslında `schedule_slots.type` içinde. → M3'e ek migration gerekiyor.
- ❌ **D2:** `student_group_members` tablosunda **`is_active` YOK** (yalnızca `UNIQUE(group_id, student_id)`). → B4 için `is_active` kolonu ekle (proje kuralı: hard-delete yok).
- ❌ **D3:** `useActiveProgram()` store **YOK**. Frontend `usePrograms()` + `programs[0].id` veya `useParams().programId` kullanıyor. → F1 bu desene göre yazılmalı.
- ✅ **D4:** `users.email TEXT UNIQUE NOT NULL` — M1 doğru (nullable yapılacak; PostgreSQL çoklu NULL'a zaten izin verir).
- ✅ **D5:** `students.invite_status` yok — M2 doğru (eklenecek).
- ✅ **D6:** `course_students.is_active` var — B3 soft-delete doğru.
- ⚠️ **D7:** Şartnamede `{ FirstName, LastName }` ayrı, ama `users.full_name` tek kolon. B1'de `full_name = FirstName + " " + LastName` birleştirilir.

## 1. Migration Planı
- [x] **M1 — users.email nullable:** `ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`
- [x] **M2 — students.invite_status:** `ALTER TABLE students ADD COLUMN IF NOT EXISTS invite_status VARCHAR(16) NOT NULL DEFAULT 'NOT_INVITED';` (`NOT_INVITED` | `INVITED` | `ACTIVE`)
- [x] **M3 — courses.type'a 'OZEL_DERS' ekle (D1 düzeltmesi):** idempotent `DO $$` bloğu ile `courses_type_check` constraint'ini drop + `CHECK(type IN ('DERS','OZEL_DERS','SORU_COZUMU','DENEME','KITAP','VIDEO','DIGER'))` olarak yeniden ekle.
- [x] **M4 — student_group_members.is_active (D2 düzeltmesi):** `ALTER TABLE student_group_members ADD COLUMN IF NOT EXISTS is_active INTEGER NOT NULL DEFAULT 1;`

## 2. Backend Görevleri

### [x] B1 — Öğrenci Ekleme (Gölge Profil)
- **Endpoint:** `POST /api/v1/programs/{programId}/students` (`RequireCoachRole`)
- **DTO (yeni, `DTOs/StudentDtos.cs`):** `CreateStudentRequest { string FirstName; string LastName; string? Email; int? ClassLevel; string? TargetExam; Guid? GroupId; }`
- **Dosya:** `Data/StudentRepository.cs` → `CreateStudentAsync(coachId, programId, req)`:
  - `EnsureCoachInProgramAsync(coachId, programId)` ile sahiplik.
  - **E-posta çakışma kontrolü (yeni):** `Email` doluysa önce `SELECT 1 FROM users WHERE email = @Email` → varsa `400 "Bu e-posta zaten kullanımda"` dön (DB unique ihlaline/try-catch'e düşmeden).
  - `full_name = $"{FirstName} {LastName}".Trim()`.
  - `Email` boşsa: `INSERT users (email=NULL, role='Student', full_name)`, `INSERT students (invite_status='NOT_INVITED')` (transaction).
  - `Email` doluysa: `invite_status='INVITED'` + mevcut davet akışı (`invite_tokens` + mail).
  - **Grup bağlamı (yeni):** `req.GroupId` doluysa ve grup `programId`'ye aitse, `student_group_members`'a da ekle (aynı transaction).
  - Dönüş: `{ studentId }`.
- **Program zorunluluğu:** `programId` route'tan alınır, asla istemci dropdown'una güvenilmez (backend bağlar).

### [x] B2 — Sonradan Davet Gönderme
- **Endpoint:** `POST /api/v1/programs/{programId}/students/{studentId}/invite` (`RequireCoachRole`)
- **DTO:** `{ string Email; }`
- **İş:** `EnsureCoachOwnsStudentAsync`; `UPDATE users SET email=@Email WHERE id=@StudentId`; `invite_tokens` oluştur; mail at; `students.invite_status='INVITED'` (transaction).

### [x] B3 — Bireyselden Gruba Taşı
- **Endpoint:** `POST /api/v1/programs/{programId}/students/{studentId}/move-to-group` (`RequireCoachRole`)
- **DTO:** `{ Guid GroupId; }`
- **İş (transaction):** grubun program uyumunu doğrula; `student_group_members` ekle (ON CONFLICT DO NOTHING); öğrencinin `OZEL_DERS` kayıtlarını `course_students.is_active=0` yap; `program_id` DEĞİŞMEZ. Geçmiş ödev/sınav silinmez.

### [x] B4 — Gruptan Bireysele Çek
- **Endpoint:** `POST /api/v1/programs/{programId}/students/{studentId}/move-to-individual` (`RequireCoachRole`)
- **İş (transaction):** `student_group_members.is_active=0` (tüm üyelikler); öğrenciye özel yeni `OZEL_DERS` `courses` kaydı aç; `course_students`'a ekle (is_active=1). Geçmiş veri korunur.

## 3. Frontend Görevleri

### [x] F1 — Akıllı Öğrenci Ekleme Formu
- **Dosya:** `features/coach/students/CoachStudents.jsx` + yeni `AddStudentModal.jsx` (+`.module.css`)
- **Not (D3):** `useActiveProgram()` yerine **`usePrograms()` + `programs[0].id`** (veya açık program seçici varsa onu) kullan.
- Alanlar: Ad Soyad (zorunlu), Sınıf/Hedef (zorunlu), E-posta (opsiyonel, placeholder: "Davet göndermek isterseniz giriniz…").
- Program dropdown **gösterilmez**; aktif program store/route'tan alınır.
- **Grup bağlamı (yeni):** Modal `groupId` prop'u alır. Grup detay sayfasından açıldıysa formda bilgi notu gösterilir: *"Bu öğrenci {GrupAdı} grubuna dahil edilecektir."* ve B1'e `GroupId` gönderilir.

### [x] F2 — Öğrenci Kartı Rozetleri
- **Dosya:** `CoachStudents.jsx` + `.module.css`
- Rozetler (Lucide ikon, emoji değil): `invite_status=NOT_INVITED` → "E-posta Yok / Kayıt Bekliyor"; `ACTIVE` → "Aktif"; aktif `OZEL_DERS` → "Bireysel"; grup adı → "Grup: X".

### [x] F3 — "Davet Gönder" Butonu
- **Dosya:** `CoachStudents.jsx` / `CoachStudentDetail.jsx`
- `NOT_INVITED` öğrencilerde "E-posta ile Davet Et" butonu → yalnızca e-posta isteyen modal → B2 endpoint'i.

### [x] F4 — Bireysel/Grup Geçiş Butonu
- **Dosya:** `CoachStudentDetail.jsx`
- "Program / Grup Değiştir" aksiyonu → seçenekler: "Mevcut Gruplar" ve "Bireysel Koçluk" → B3 veya B4 endpoint'i.

### [x] F5 — Geçmiş vs Güncel Ödev Görünümü
- **Dosya:** `CoachStudentDetail.jsx`
- Öğrenci detayında ödevler iki gruba ayrılır: **"Güncel Bireysel Ödevler"** (aktif `OZEL_DERS` course'u) ve **"Geçmiş Grup Ödevleri"** (eski grup course'ları).
- Backend: `homework_assignments.course_id` üzerinden `courses.type='OZEL_DERS'` mi yoksa grup course'u mu olduğu ayrıştırılır (JOIN `courses`). Geçmiş ödevler silinmediği için `student_id` ile durmaya devam eder; yalnızca `course_students.is_active`/`student_group_members.is_active` güncellenir.

## 4. Test & Doğrulama
- [x] Backend testleri (`MentorumApi.Tests/V13StudentFlexibilityTests.cs`): gölge profil oluşturma, davet, B3/B4 geçiş (IDOR: başka programın grubuna taşıyamaz), email=NULL çoklu kayıt.
- [x] `dotnet build` (0 hata) + `dotnet test` + `npm run build`.

## Kodlama Sırası
1. M1–M4 (migration) → 2. B1–B2 (öğrenci + davet) → 3. B3–B4 (geçiş) → 4. F1–F5 (UI) → 5. test.

## 5. Kodlama Sonrası Görev
- [x] `KULLANIM_KILAVUZU.md`'e bu V13 özelliklerinin kullanımı eklenir: gölge profil (e-postasız) öğrenci ekleme, sonradan davet gönderme, bireysel↔grup geçişi ve geçmiş/güncel ödev görünümü.

## 6. Düzeltmeler (Hatalar ve Çözümler)

### 🔴 HATA-1 (Kritik — Beyaz Ekran): `AddStudentModal`'da tanımsız state
- **Hata:** Gemini'nin tasarım refactor'ünde `classLevel` ve `targetExam` state tanımları silinmiş, ancak dosyada referansları kalmış (satır 25, 26, 32, 33, 75, 76, 85, 86). `/coach/students` render edilirken `Uncaught ReferenceError: classLevel is not defined` fırlatıyor → beyaz ekran.
- **Çözüm:** `AddStudentModal.jsx` içinde `email` state'inden sonra şu iki satır geri eklendi:
  `const [classLevel, setClassLevel] = useState('');`
  `const [targetExam, setTargetExam] = useState('');`

### 🟡 HATA-2 (Tasarım — kısmi): `CoachStudentDetail` sessions sekmesinde hardcoded stiller
- **Hata:** "Koçluk Görüşmeleri" sekmesinde `#f1f5f9`, `#94a3b8`, `#475569`, `#e2e8f0`, `#b45309` hardcoded renkler + inline stiller (V13 öncesi mevcut kod; tasarım düzeltmesi henüz uygulanmadı).
- **Çözüm:** Inline stilleri `CoachStudentDetail.module.css`'e taşı; `var(--border-color)` / `var(--text-color-muted)` değişkenlerine bağla.

### 🟡 HATA-3 (İkincil — ayrı): 401/403 auth hataları
- **Hata:** Konsolda `/api/v1/students`, `/api/v1/programs` → 401; `/api/v1/me/theme`, `/api/v1/devices` → 403. Muhtemelen "Rol Gözüyle Gör" (View-As) modu veya süresi dolmuş token.
- **Çözüm:** `classLevel` düzeltildikten sonra ayrıca incelenecek (View-As state sıfırlama veya token yenileme).

---

## 6. V13.1 Tasarım Kuralları & UI/UX İyileştirmeleri (Design System Uyumu)

> **Sebep:** V13 geliştirmeleri (F1–F4) işlevsel olarak tamamlanırken, hızlı prototipleme sebebiyle projenin V12 tasarım sistemi (`var(--bg-card)`, `var(--color-primary)`), ortak bileşenleri (`<Modal>`, `<Input>`, `<Button>`), mobil ergonomi kuralları ve sekme hiyerarşisi atlanmış, hardcoded CSS renkleri ve tarayıcı `window.prompt` diyalogları arayüze girmiştir.

### [x] D1 — AddStudentModal Bileşen ve Tema Standardizasyonu
- **Dosyalar:**
  - `Frontend/src/features/coach/students/AddStudentModal.jsx`
  - `Frontend/src/features/coach/students/AddStudentModal.module.css`
- **Mevcut Sorun:** `AddStudentModal.jsx` ve `.module.css` içinde ham HTML etiketleri (`<div className={styles.overlay}>`, `<input>`, `<button>`) ve `#fff`, `#111827`, `#2563eb`, `#f3f4f6`, `#d1d5db`, `#4f46e5` gibi sabit renkler kullanılmış. Koyu modda (Dark Mode) modal bembeyaz parlamakta, tema rengi yerine sabit mavi buton çıkmaktadır.
- **Uygulanacak:**
  - Projenin standart `<Modal>`, `<Input>` ve `<Button>` ortak bileşenlerine geçilecek.
  - Sabit renkler kaldırılacak; zemin `var(--bg-color-surface, var(--bg-card))`, metinler `var(--text-color-main)`, buton `var(--color-primary)` tema değişkenlerine bağlanacak.
  - Hedef Sınav açılır kutusu ve diğer alanlar temalı input stiline kavuşturulacak.

### [x] D2 — CoachStudents Davet Akışı ve Rozet Renk Uyumu
- **Dosyalar:**
  - `Frontend/src/features/coach/students/CoachStudents.jsx`
  - `Frontend/src/features/coach/students/CoachStudents.module.css`
- **Mevcut Sorun:**
  - Öğrenci kartındaki "Davet Et" butonuna basıldığında tarayıcının ham `window.prompt(...)` ve `alert(...)` pencereleri çıkmaktadır. Modern SaaS arayüzünde tarayıcı alert/prompt'u yasaktır.
  - `E-posta Yok`, `Grup` ve `Bireysel` rozetlerinde `#fef2f2`, `#f0f9ff`, `#f5f3ff` gibi açık pastel renkler koyu temada beyaz parlama yapmaktadır.
  - Mobilde başlık altında `+ Hızlı Ekle` ve `+ Davet Gönder` butonları dar alanda sıkışmaktadır.
- **Uygulanacak:**
  - `window.prompt` yerine projenin standart `<Modal>` bileşeniyle çalışan şık ve temalı bir "Öğrenciye Davet Gönder" mini modalı eklenecek. Hatalar için modal içi geri bildirim sağlanacak.
  - Mobil ekranda butonlar ergonomik ve taşmayan esnek düzene kavuşturulacak.

### [x] D3 — CoachStudentDetail "Grup / Bireysel Yönetimi" Hiyerarşi & Tema Uyumu
- **Dosyalar:**
  - `Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx`
  - `Frontend/src/features/coach/student-detail/CoachStudentDetail.module.css`
- **Mevcut Sorun:**
  - V12.3'te kurulan **4 Akıllı Grup Sekmesi**'nin tamamen dışında, sayfanın en altına inline stillerle (`#e2e8f0`, `#475569`) bağımsız bir kart eklenmiştir. Koyu temada metin rengi ve kenarlık silik kalmaktadır.
- **Uygulanacak:**
  - Inline stiller temizlenip CSS modülüne taşınacak; renkler `var(--text-color-muted)` ve `var(--border-color)` değişkenlerine bağlanacak.
  - "Grup / Bireysel Yönetimi" kartı, öğrencinin aidiyet bilgileriyle doğrudan ilişkili olduğu için **Genel & Zaman** (`info` - Kişisel & Akademik Bilgiler) sekmesinin içine mantıksal bir kart olarak entegre edilecek. Böylece 4 ana akıllı sekme disiplini korunacak.
  - Seçim kutusu ve butonlar mobilde (`<640px`) sarmalanabilir ve dokunmatik uyumlu hale getirilecek.

---

## 7. V13.2 "Öğrenciler & Programlar" — Karar, Plan ve Uygulama
> **Tarih:** 22 Ekim 2026 · **Kaynak:** Ürün sahibi (karar) + Cline (plan & uygulama)  
> **Durum:** ✅ Uygulandı — adım durumları aşağıda (§7.4) işaretli.
> **Kapsam:** "Program" kavram karmaşasının çözümü, "Öğrenciler & Programlar" birleşik sekmesi, sıfır sürtünmeli bireysel öğrenci ekleme ve grup programı yönetimi.
> **Not:** İlk taslak Gemini (Antigravity) önerisiydi; ürün sahibinin "koçluk programı = öğrenci grubu" netleştirmesiyle §7.2-§7.4 yeniden yazıldı ve uygulandı.

### 7.1. Sorun Tespiti ve Kök Neden (Kavram Karmaşası — karardan ÖNCEKİ durum)
Sistemde yaşanan temel sürtünme, **"Program"** kelimesinin iki farklı seviyede iki zıt anlamda kullanılmasından kaynaklanmaktadır:
1. **Veritabanı ve SaaS Seviyesinde (`coaching_programs`):** V5 mimarisinde program, öğrencinin ders planı değil; koçun **"Kurumu / Çatısı / Çalışma Alanı (Tenant)"**dır. Tüm öğretmenler (`teachers`), gruplar (`student_groups`), dersler (`courses`), takvim slotları ve finansal planlar bu çatıya bağlıdır.
2. **Koçun ve Kullanıcının Dilinde ("Program"):** Öğrenciye atanan bireysel veya grup koçluk sürecidir ("Ali'nin YKS Çalışma Programı" veya "11-A TYT Grup Programı").

**Neden her öğrenci eklendiğinde doğrudan DB'de yeni bir `coaching_programs` açılmadı?**
- **Öğretmen Yönetimi:** Eğer her öğrenci için ayrı bir `coaching_programs` açılırsa, bir Matematik öğretmeni 20 öğrenciye ders vermek istediğinde 20 farklı programa tek tek davet edilip atanmak zorunda kalır.
- **Grup ve Veri İzolasyonu (IDOR):** Öğrenci bireysel programdan grup programına geçmek istediğinde veya gruba üye olduğunda `program_id` değişmek zorunda kalır; `program_id` değiştiğinde ise eski programdaki tüm ödev, sınav ve takip verileri yeni programda görünmez hale gelir (Cross-Tenant kısıtlaması).
- **Paket ve Kota Sınırları:** Sistemde koçların `max_programs` (örn. ücretsiz planda 1 veya 3 program) sınırı vardır. 10 öğrenci ekleyen bir koç anında `409 PROGRAM_LIMIT_EXCEEDED` hatasıyla kilitlenir.

### 7.2. Karar: "Koçluk Programı" = Öğrenci Grubu (Ayrı Tenant Yok)
Ürün sahibinin netleştirmesiyle kavram şöyle sabitlendi:
- **Her öğrenci doğuştan bireyseldir.** Ayrı bir "bireysel program oluştur" adımı yoktur; öğrenci eklendiği an kendi bireysel koçluğu başlar.
- **"Koçluk programı" = öğrenci grubu.** Koç, aynı ders/saatleri paylaşacak öğrencileri istediği zaman gruplar, çıkarır veya taşır.
- **Ayrı `coaching_programs` (tenant) katmanı pasife alındı:** tek şahsi koç modelinde işlevi yoktur; koç başına TEK görünmez çalışma alanı kalır (`max_programs = 1`). İleride çoklu-koç / çoklu-işletme / fatura-birimi ihtiyacı olursa geri yükseltilir.

### 7.3. Menü ve Ekran Birleştirmesi: `Öğrenciler & Programlar`
Sol menüde `Öğrenciler` ve `Programlar & Dersler` → tek **`Öğrenciler & Programlar`** (`/coach/students`).

Sayfa içi 2 sekme — bunlar iki AYRI "program tipi" değildir; öğrenci her zaman bireyseldir, grup onun ÜSTÜNE eklenen üyeliktir:
1. **👤 Bireysel Programlar** = öğrenci listesi. Her kart = bir öğrencinin bireysel koçluğu. Öğrenci burada HER ZAMAN görünür (grupta olsa bile).
2. **👥 Grup Programları** = `student_groups`. "+ Yeni Grup Oluştur"; ortak ders/saat ve öğrenci kadrosu. Gruptaki öğrenci aynı anda bireysel sekmede de kalır.

**Hibrit kural:** Gruptaki öğrenciye gruptan bağımsız bireysel ders/ödev de atanabilir. Bu yüzden `MoveToGroupAsync` öğrencinin `OZEL_DERS` kursunu pasife almayacak şekilde düzeltilecek.

### 7.4. Uygulama Adımları (V13.2)
1. [x] **[Backend] Limitler:** `coaches.max_students` + `max_teachers` (yeni kolon) ve `storage_quota_mb` (mevcut) admin onayında belirlenir; `max_programs` = 1'e sabitlenir (silinmez).
2. [x] **[Backend] Auto-Provision & Bireysel Kurs:** Koçun tek çalışma alanı yoksa otomatik açılır (max 1); `CreateStudentAsync` öğrenci limitini kontrol eder ve gruba eklenmiyorsa otomatik `OZEL_DERS` kursu oluşturur. Yeni `POST /api/v1/students` (path'siz).
3. [x] **[Backend] Öğretmen limiti:** öğretmen daveti `max_teachers`'ı kontrol eder.
4. [x] **[Frontend] Dropdown kaldır:** `CoachStudents.jsx` "Program Seçin *" kalkar.
5. [x] **[Frontend] Menü/sayfa:** `CoachLayout.jsx` birleştirme + Bireysel/Grup sekmeleri; "Öğretmenler" üst menüde, "Dersler / Haftalık Program / Ayarlar" birleşik sayfa başlığına eklendi (adım tamam).
6. [x] **[Backend] Hibrit düzeltme:** `MoveToGroupAsync` OZEL_DERS'i pasif etmesin.
