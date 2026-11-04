# 🧭 Mentörüm — V20 Görev Listesi (Bağımsız Öğrenci Modu, Yönetici Onaylı Rol/Koç Atama, Çift Yönlü Eşleşme ve 6'lı Öğrenci Özerklik İzin Sistemi)

> **Tarih:** 4 Kasım 2026 · **Mimari Prensip:** Ajan-Optimum Hibrit (`AGENTS.md` §A5–A8, §C3)
> **Amaç:** Öğrencinin sistemi koçsuz (bağımsız) olarak tüm yetenekleriyle kullanabilmesi, yönetici onayında Koç/Öğrenci seçimi ve isteğe bağlı koç ataması, bağımsız öğrenci ile koç arasında çift yönlü arama/istek/eşleşme akışı ve koç–öğrenci ilişkisi başladığında devreye giren **6'lı granüler öğrenci izin (özerklik) sisteminin** uçtan uca kurulması.

---

## 1. Mimari Kurallar ve Kullanıcı Kararları (Kesinleşmiş Tasarım)

1. **Bağımsız Öğrenci Modu (Solo Student):**
   - Koçu olmayan bağımsız bir öğrenci aşağıdaki **6 işlemin tamamını** kendi başına yapabilir:
     1. **Konu Tamamlama:** Müfredat konularını "Tamamlandı / Çalışılıyor" olarak işaretleme.
     2. **Hedef Belirleme:** Hedef üniversite, bölüm, puan ve haftalık çalışma hedeflerini girme/güncelleme.
     3. **Ödev Tamamlama:** Ödevleri doğrudan "Bitti / % İlerleme" olarak işaretleme.
     4. **Deneme / Sınav Neti Girme:** Kendi TYT/AYT/LGS/Okul/Deneme sınav sonuçlarını ve ders bazlı doğru/yanlış/netlerini girme.
     5. **Kaynak & Video Ders Ekleme:** Kendisine kitap, doküman veya video ders kaynağı tanımlama ve ilerlemesini güncelleme.
     6. **Kendi Kendine Çalışma & Ödev Koyma:** Kendi takvimine çalışma bloğu veya kendi kendine ödev atama.

2. **Yönetici Onaylı Kayıt ve Geleceğe Hazır Otomatik Mod:**
   - Kullanıcı sisteme üye olduğunda yönetici onayına (`PENDING`) düşer.
   - Yönetici onaylarken yalnızca **Koç (`Coach`)** veya **Öğrenci (`Student`)** rollerinden birini seçer *(Öğretmen ve Veli uygulama içinden koç tarafından eklenir)*.
   - Yönetici **Öğrenci** seçtiğinde:
     - İster **"Bağımsız Öğrenci (Koçsuz)"** olarak onaylar,
     - İster onay ekranından doğrudan mevcut bir **Koç** seçerek o koça atar.
   - İleride sistem yaygınlaştığında tek tıkla açılabilmesi için `system_settings` tablosunda `registration_mode` (`ADMIN_APPROVAL` | `SELF_SERVICE`) anahtarı bulunur; şimdilik `ADMIN_APPROVAL` (Yönetici Onaylı) modda çalışır.

3. **Çift Yönlü Koç ↔ Öğrenci Arama, Gizlilik ve Eşleşme İsteği:**
   - **Bağımsız Öğrenci → Koç Arama:** İsim, e-posta veya telefon ile onaylı koçları aratıp eşleşme isteği gönderebilir.
   - **Koç → Öğrenci Arama (Gizlilik Kuralı):** Koç isim, e-posta veya telefon ile arama yaptığında **yalnızca bağımsız (koçu olmayan) öğrencileri** görebilir ve istek gönderebilir; **başka koçtaki öğrencileri kesinlikle göremez**.
   - **Yönetici (`IsAdmin`) Arama:** Yöneticiler aramada sistemdeki tüm üyeleri görebilir.
   - **Kayıtsız Öğrenci Daveti:** Koçun sistemde henüz kaydı olmayan bir öğrenciyi ekleyip davet gönderme özelliği aynen korunur.
   - **Kabul:** İstek gönderilen taraf kabul ettiğinde öğrencinin geçmiş verileri korunarak koç–öğrenci ilişkisi başlar.

4. **Koç–Öğrenci İlişkisinde 6'lı İzin Matrisi ve Başlangıç Varsayılanları:**
   - Koç–öğrenci ilişkisi kurulduğu anda öğrencinin kendi başına yapabildiği 6 işlem koçun iznine tabi olur ve aşağıdaki **başlangıç varsayılanlarıyla** başlar:
     - `[✓] Açık (true)` başlayanlar:
       1. **Konu Tamamlama İzni** (`canCompleteTopics = true`)
       2. **Ödev Tamamlama İzni** (`canCompleteHomework = true`)
       3. **Hedef Düzenleme İzni** (`canEditGoals = true`)
     - `[ ] Kapalı (false)` başlayanlar:
       4. **Deneme / Sınav Neti Girme İzni** (`canAddExamResults = false`)
       5. **Kaynak & Video Ders Ekleme İzni** (`canManageResources = false`)
       6. **Kendi Kendine Çalışma / Ödev Koyma İzni** (`canSelfAssignWork = false`)
   - **"Ödev Tamamlama İzni" Kapalıyken Davranış (Seçenek 1):**
     - `canCompleteHomework = false` iken öğrenci ödevi tamamladığında ödev doğrudan `DONE` olmaz; koçun **Onay Merkezine (`ApprovalsPage` — `HOMEWORK_DONE`)** düşer ve koç onayladığında tamamlanır.
   - **İzin Tiklerinin Yeri ve Bağlamsal Kısayol (Bonus):**
     - Koçta öğrenci detay profilinde (`CoachStudentDetail.jsx`) hem `Genel & Zaman > Öğrenci Bilgileri & Hedefler` (`InfoTab.jsx`) içindeki merkezi **"🛡️ Öğrenci Yetkileri (Özerklik Ayarları)"** kartında 6 tik bir arada görünür, hem de `Konu Takibi`, `Ödevler`, `Sınavlar & Netler` sekmelerinin sağ üstünde **Bağlamsal Kısayol** olarak ilgili sekmenin izin tiki yer alır.
   - **Koçun Tam Görünürlük ve Müdahale Yetkisi:**
     - Öğrenci kendi başına giriş yaptığında koç öğrencinin profilinde bu kayıtları (`👤 Öğrenci Ekledi` rozetiyle) görür, düzenleyebilir, durumunu değiştirebilir veya silebilir.

---

## 2. Faz Bazlı Uygulama Görevleri

### Faz 1 — Veritabanı Şeması ve Temel Veri Modeli (`002_v20_independent_student.sql` & `001_schema.sql`)

#### [x] V20-T1 — Yeni Migration (`002_v20_independent_student.sql`), Öğrenci İzinleri, `student_topic_progress`, Eşleşme İstekleri ve Kaynak Kütüphanesi
- **Dosyalar:**
  - `mentörüm/Backend/MentorumApi/Data/Migrations/002_v20_independent_student.sql` *(Yeni migration dosyası — `MigrationRunner` mevcut DB'lerde `001_schema.sql`'i atladığı için zorunlu)*
  - `mentörüm/Backend/MentorumApi/Data/Migrations/001_schema.sql` *(`AGENTS.md` §A7 tekil şema doğrulaması için senkron tutulur)*
- **Yap:**
  1. `students` tablosuna 6 izin kolonu ekle (`ADD COLUMN IF NOT EXISTS`, varsayılanlar: Konu=1, Ödev=1, Hedef=1, Net=0, Kaynak/Video=0, Kendi Ödevi=0):
     - `can_complete_topics INTEGER NOT NULL DEFAULT 1`
     - `can_complete_homework INTEGER NOT NULL DEFAULT 1`
     - `can_edit_goals INTEGER NOT NULL DEFAULT 1`
     - `can_add_exam_results INTEGER NOT NULL DEFAULT 0`
     - `can_manage_resources INTEGER NOT NULL DEFAULT 0`
     - `can_self_assign_work INTEGER NOT NULL DEFAULT 0`
  2. `coaches` tablosuna arama için `phone TEXT NULL` kolonu ekle (`ADD COLUMN IF NOT EXISTS`).
  3. **Doğrudan Konu Tamamlama Modeli (`student_topic_progress` tablosu — Sıfırdan Oluşturma):**
     - Mevcut sistemde konu tamamlanması yalnızca `homework_assignments` üzerinden türetildiği için, öğrencinin (ve koçun) ödevden bağımsız olarak müfredat konularını "Tamamlandı" işaretleyebilmesi adına yeni tablo oluştur (`CREATE TABLE IF NOT EXISTS student_topic_progress`):
       - `student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE`
       - `curriculum_topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE`
       - `is_completed INTEGER NOT NULL DEFAULT 1`
       - `updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
       - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
       - `PRIMARY KEY (student_id, curriculum_topic_id)`
  4. Çift yönlü eşleşme istekleri için `coach_student_requests` tablosunu oluştur (`CREATE TABLE IF NOT EXISTS`):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
     - `student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
     - `initiated_by VARCHAR(16) NOT NULL CHECK (initiated_by IN ('COACH', 'STUDENT'))`
     - `status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'))`
     - `note TEXT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `resolved_at TIMESTAMPTZ NULL`
  5. Öğrencinin (ve koçun) kitap, doküman ve video ders kaynaklarını tutacak `student_resources` tablosunu oluştur (`CREATE TABLE IF NOT EXISTS`):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE`
     - `program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE`
     - `subject_id UUID NULL REFERENCES subjects(id) ON DELETE SET NULL`
     - `resource_type VARCHAR(16) NOT NULL DEFAULT 'BOOK' CHECK (resource_type IN ('BOOK', 'VIDEO', 'DOCUMENT', 'LINK'))`
     - `title TEXT NOT NULL`, `url_or_author TEXT NULL`, `total_units INTEGER NULL`, `completed_units INTEGER NOT NULL DEFAULT 0`
     - `created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  6. `system_settings` tablosuna `('registration_mode', 'ADMIN_APPROVAL')` varsayılan kaydını ekle (`ON CONFLICT (key) DO NOTHING`).
- **Kabul:** `002_v20_independent_student.sql` `MigrationRunner` tarafından mevcut veritabanlarına otomatik uygulanır; tüm ifadeler idempotent (`IF NOT EXISTS`) olarak çalışır.

---

### Faz 2 — Yönetici Onay Akışı (Koç / Öğrenci Seçimi + Koç Atama + Kayıt Modu)

#### [x] V20-T2 — Yönetici Onayında Koç/Öğrenci Seçimi, Bağımsız veya Koçlu Atama ve Kayıt Modu Ayarı
- **Dosyalar:** `ProgramEndpoints.cs`, `ProgramRepository.cs`, `AuthEndpoints.cs`, `AuthRepository.cs`, `CourseAdminDtos.cs`, `AdminPanelPage.jsx`, `LoginPage.jsx`
- **Yap:**
  1. `ApproveUserRequest` DTO'suna `AssignCoachId (Guid?)` alanı ekle.
  2. `ProgramRepository.ApproveUserAsync` metodunu güncelle (mevcut `AddUserByAdminAsync` doğrudan `'APPROVED'` ekleme yolunu bozmadan):
     - Rol yalnızca `'Coach'` veya `'Student'` olarak onaylanabilir.
     - `'Student'` onaylanırken `AssignCoachId` boşsa (`null`), öğrenci için `EnsureStudentPersonalProgramAsync` ile koçsuz bireysel çalışma alanı oluşturulur (`hasCoach = false`).
     - `AssignCoachId` doluysa, seçilen koçun varsayılan çalışma programı `EnsureDefaultWorkspaceAsync(assignCoachId)` ile bulunur/oluşturulur (böylece `coaching_programs` + `program_coaches` `role = 'YONETICI'` satırı garanti altına alınır) ve öğrenci doğrudan o koçun programına (`program_id`) bağlanır; 6 izin kolonu başlangıç varsayılanlarıyla (`1, 1, 1, 0, 0, 0`) başlatılır.
  3. Yönetici panelinde `registration_mode` (`'ADMIN_APPROVAL'`) bilgisini göster; `SELF_SERVICE` seçeneğini gelecekte açılmak üzere *"Yakında / Devre Dışı"* olarak güvenli tut (yarı açık mod oluşmasın).
  4. `AdminPanelPage.jsx` içinde:
     - Onay bekleyen kullanıcı kartlarında rol seçimini **`Koç`** ve **`Öğrenci`** olarak sadeleştir (`Manuel Kullanıcı Ekle` formunda da aynı şekilde).
     - **`Öğrenci`** seçildiğinde hemen altında **"Koç Ataması: [Bağımsız Öğrenci (Koçsuz) | Koç Seçin...]"** açılır kutusunu göster.
     - `Güvenlik & Kota` sekmesine **"Üyelik & Kayıt Modu (Yönetici Onaylı / Otomatik Kayıt)"** anahtarını ekle.
- **Kabul:** Yönetici yeni üye olan kullanıcıyı Koç, Bağımsız Öğrenci veya belirli bir Koça bağlı Öğrenci olarak tek tıkla onaylayabilir.

---

### Faz 3 — Çift Yönlü Koç ↔ Öğrenci Arama, Gizlilik ve Eşleşme İstekleri

#### [x] V20-T3 — Koç ve Bağımsız Öğrenci Arama, Eşleşme İsteği Gönderme/Kabul ve İlişki Yönetimi
- **Dosyalar:** `StudentRepository.cs`, `StudentEndpoints.cs`, `StudentPortalEndpoints.cs`, `StudentDtos.cs`, `AddOrInviteStudentPanel.jsx`, `StudentProfilePage.jsx`
- **Yap:**
  1. **Gizlilik Korumalı Arama (`GET /api/v1/students/search-directory?q=...` & `GET /api/v1/student/search-coaches?q=...`):**
     - **Koç aradığında:** İsim (`full_name`), e-posta (`email`) veya telefon (`students.phone`) ile arama yapar; sorgu **yalnızca bağımsız öğrencileri** (`NOT EXISTS (SELECT 1 FROM program_coaches pc WHERE pc.program_id = s.program_id)`) döndürür. Başka bir koçla çalışan öğrenciler sonuçlarda **kesinlikle yer almaz**.
     - **Yönetici (`user.IsAdmin`) aradığında:** Tüm öğrencileri ve koçları görebilir.
     - **Bağımsız Öğrenci aradığında:** İsim, e-posta veya telefon (`coaches.phone`) ile onaylı tüm koçları aratabilir.
  2. **Eşleşme İsteği Uçları:**
     - Koç → Bağımsız Öğrenciye istek gönderir (`POST /api/v1/students/connection-requests`).
     - Bağımsız Öğrenci → Koça istek gönderir (`POST /api/v1/student/connection-requests`).
     - Gelen/Giden istekleri listeleme ve Kabul/Red/İptal (`POST .../connection-requests/{requestId}/respond`):
       - Kabul edildiğinde (Transaction içinde): Koçun aktif çalışma alanı `EnsureDefaultWorkspaceAsync(coachId)` (`program_coaches` `role IN ('YONETICI','YARDIMCI')` dahil) ile alınır; öğrencinin `students.program_id` değeri ve bağımsızken oluşturduğu tüm `homework_assignments`, `exam_results`, `study_sessions`, `student_resources`, `student_notes`, `school_schedules`, `student_checkins`, `student_questions` kayıtlarının `program_id` değeri koçun programına aktarılır (sıfır veri kaybı!) ve 6 izin bayrağı varsayılan (`1, 1, 1, 0, 0, 0`) değerlerine ayarlanır.
  3. **Koçluk İlişkisini Sonlandırma — Simetrik Veri Taşıma (`POST /api/v1/students/{studentId}/unlink` & `POST /api/v1/student/unlink-coach`):**
     - Öğrenci silinmeden kendisi için yeni/mevcut bireysel çalışma alanı (`EnsureStudentPersonalProgramAsync`) oluşturulur ve öğrencinin tüm tablolardaki (`homework_assignments`, `exam_results`, `study_sessions`, `student_resources`, `student_notes`, `school_schedules`, `student_checkins`, `student_questions`) `program_id` değeri simetrik olarak kişisel programına geri taşınır; böylece öğrenci veri kaybı olmadan bağımsız öğrenci moduna döner.
  4. **Arayüz Entegrasyonu:**
     - **Koçta (`AddOrInviteStudentPanel.jsx`):** Mevcut `Doğrudan Ekle` ve `E-posta ile Davet` sekmelerinin yanına **`🔍 Bağımsız Öğrenci Ara & İstek Gönder`** sekmesi ve bekleyen eşleşme istekleri listesi eklenir.
     - **Öğrencide (`StudentProfilePage.jsx` & `StudentHome.jsx`):** Öğrenci bağımsızsa **"🔍 Koç Bul & Eşleşme İsteği Gönder"** ve **"Gelen Koçluk İstekleri"** kartı gösterilir; koçu varsa koçunun adı ve izin durumları görünür.
- **Kabul:** Bağımsız öğrenci koç arayıp istek atabilir, koç da yalnızca bağımsız öğrencileri arayıp istek atabilir; kabul edildiğinde geçmiş veriler korunarak koç–öğrenci ilişkisi başlar.

---

### Faz 4 — Bağımsız Öğrenci Yetenekleri ve 6'lı İzin Denetimi (Backend + Öğrenci Portalı)

#### [x] V20-T4 — Öğrencinin 6 Özelliği (Konu, Hedef, Ödev, Net, Kaynak/Video, Kendi Ödevi) ve İzin / Onay Akışı
- **Dosyalar:** `StudentPortalEndpoints.cs`, `HomeworkEndpoints.cs`, `HomeworkRepository.cs`, `ApprovalRepository.cs`, `CurriculumRepository.cs`, `ExamRepository.cs`, `StudentRepository.cs`, `StudentHomework.jsx`, `StudentExamsPage.jsx`, `StudentTopicsPage.jsx`, `StudentCoursesPage.jsx`, `StudentProfilePage.jsx`
- **Yap:**
  1. **Merkezi İzin Kontrol Yardımcısı (`StudentRepository.GetEffectivePermissionsAsync(studentId)`):**
     - Öğrencinin aktif programında bir koç var mı (`EXISTS (SELECT 1 FROM program_coaches WHERE program_id = s.program_id)`) kontrol eder (`HasCoach`).
     - Eğer `HasCoach == false` (Bağımsız Öğrenci) ise 6 iznin tamamı otomatik `true` döner!
     - Eğer `HasCoach == true` ise `students` tablosundaki 6 izin kolonunun değerleri döner.
  2. **6 Özelliğin Backend ve Öğrenci Portalı Karşılıkları:**
     - **(1) Konu Tamamlama (`CanCompleteTopics` — `student_topic_progress` Modeli):**
       - `CurriculumRepository.GetStudentCurriculumAsync`: `LEFT JOIN student_topic_progress stp` ekleyerek `IsCompleted` değerini `COALESCE(stp.is_completed = 1, hw.is_completed, false)` olarak hesaplar (böylece hem ödevden bağımsız doğrudan konu tamamlama hem de tamamlanan ödev bilgisi birlikte çalışır ve `UpdatedBy` bilgisi döner).
       - `PUT /api/v1/student/curriculum/{topicId}/status` ucu: `CanCompleteTopics` izni açıksa `student_topic_progress` tablosuna upsert yapar (`updated_by = studentId`).
       - `StudentTopicsPage.jsx`: Konu satırlarında durum değiştirme (`Tamamlandı / Bekliyor`) onay kutusu aktif olur (izin kapalıysa salt okunur görünür).
     - **(2) Hedef Belirleme (`CanEditGoals`):**
       - `PUT /api/v1/student/goal`: İzin kapalıysa `403 Forbidden` döner; `StudentProfilePage.jsx` ve `GoalStreakCard.jsx` içinde izin kapalıysa form kilitlenir (*"Hedefleriniz koçunuz tarafından yönetilmektedir"*).
     - **(3) Ödev Tamamlama (`CanCompleteHomework` — Seçenek 1 Onay Akışı):**
       - `POST /api/v1/homework/assignments/{assignmentId}/complete`:
         - Öğrenci bağımsızsa veya `CanCompleteHomework == true` ise ödev doğrudan tamamlanır (`DONE`).
         - Öğrencinin koçu varsa ve `CanCompleteHomework == false` ise ödev doğrudan `DONE` olmaz; `approval_items` tablosuna **`HOMEWORK_DONE`** (`status = 'PENDING'`) kaydı düşer ve öğrenciye *"Ödev tamamlama bildiriminiz koçunuzun onayına gönderildi"* mesajı döner.
         - `ApprovalRepository.ApproveAsync`: `EntityType == "HOMEWORK_DONE"` onaylandığında ilgili ödevi `DONE` (`completion_percentage = 100`, `completed_by = 'Student'`) yapar!
     - **(4) Kendi Deneme / Sınav Netlerini Girme (`CanAddExamResults`):**
       - `POST /api/v1/student/exams` ve `DELETE /api/v1/student/exams/{examId}` uçları eklenir.
       - `StudentExamsPage.jsx`: İzin açıksa (veya öğrenci bağımsızsa) **`+ Deneme / Sınav Neti Ekle`** modalı açılır; öğrenci sınav türü (`TYT/AYT/LGS/Deneme`), adı, tarihi ve ders bazlı Doğru/Yanlış/Boş veya toplam netini girebilir.
     - **(5) Kaynak & Video Ders Kaynağı Ekleme (`CanManageResources`):**
       - `GET /api/v1/student/resources`, `POST /api/v1/student/resources`, `PATCH /api/v1/student/resources/{id}`, `DELETE /api/v1/student/resources/{id}` uçları eklenir.
       - Öğrenci portalında (`StudentHomework.jsx` / `StudentCoursesPage.jsx` içinde **`📚 Kaynaklarım & Video Dersler`** sekmesi) öğrenci kendine kitap, video ders serisi (YouTube/link) veya doküman ekleyip ünite/bölüm ilerlemesini takip edebilir.
     - **(6) Kendisine Çalışma veya Ödev Koyma (`CanSelfAssignWork`):**
       - `POST /api/v1/student/homework` ucu eklenir (`created_by = studentId`).
       - `StudentHomework.jsx`: İzin açıksa (veya öğrenci bağımsızsa) **`+ Kendime Ödev / Çalışma Ekle`** butonu görünür; öğrenci ders, konu, başlık ve bitiş tarihi seçerek kendine ödev atayabilir.
- **Kabul:** Bağımsız öğrenci 6 işlemin tamamını engelsiz yapar; koçlu öğrencide ise her işlem koçun verdiği izne göre anında açılır/kapanır ve `CanCompleteHomework` kapalıyken ödev tamamlama koç onayına düşer.

---

### Faz 5 — Koç Öğrenci Detay Profilinde (`CoachStudentDetail`) İzin Tikleri, Bağlamsal Kısayollar ve Koç Müdahalesi

#### [x] V20-T5 — Koç Öğrenci Profilinde 6 İzin Tiki, Sekme İçi Bağlamsal Kısayollar ve Öğrenci Kayıtlarını Düzenleme
- **Dosyalar:** `StudentEndpoints.cs`, `StudentRepository.cs`, `CoachStudentDetail.jsx`, `InfoTab.jsx`, `HomeworkTab.jsx`, `ExamsTab.jsx`, `TopicsTab.jsx`, `ApprovalsPage.jsx`
- **Yap:**
  1. **Backend Koç İzin ve Kaynak Uçları (`StudentEndpoints.cs`):**
     - `PUT /api/v1/students/{id}/permissions`: Koç öğrencinin 6 iznini tekil veya toplu günceller.
     - `PUT /api/v1/students/{id}/curriculum/{topicId}`: Koç öğrencinin konu tamamlama durumunu değiştirebilir.
     - `GET/POST/PATCH/DELETE /api/v1/students/{id}/resources`: Koç öğrencinin eklediği kitap/video kaynakları görür, yenisini ekler, düzenler veya siler.
     - `DELETE /api/v1/exams/{examId}` & `DELETE /api/v1/homework/assignments/{assignmentId}`: Koç öğrencinin (veya kendisinin) eklediği sınav sonucunu ve ödevi düzenleyebilir/silebilir.
  2. **Merkezi İzin Kartı (`InfoTab.jsx`):**
     - `Genel & Zaman > Öğrenci Bilgileri & Hedefler` sekmesine **"🛡️ Öğrenci Özerklik & Giriş İzinleri"** kartı ekle:
       - 6 izin tiki (Konu Tamamlama, Hedef Belirleme, Ödev Tamamlama, Deneme Neti Girme, Kaynak/Video Ekleme, Kendi Kendine Ödev/Çalışma Koyma) ayrı ayrı açıklayıcı etiketlerle yer alır.
  3. **Bağlamsal Kısayol Tikleri (Bonus):**
     - `Konu Takibi` (`TopicsTab.jsx`) başlığında: **`[✓] Öğrenci Konu Tamamlayabilsin`** hızlı tiki + koçun konuları doğrudan tıklayarak tamamlandı/bekliyor yapabilmesi.
     - `Ödevler` (`HomeworkTab.jsx`) başlığında: **`[✓] Öğrenci Ödev Tamamlayabilsin`** ve **`[✓] Kendine Ödev Ekleyebilsin`** hızlı tikleri + öğrencinin eklediği kaynak/video listesi.
     - `Sınavlar & Netler` (`ExamsTab.jsx`) başlığında: **`[✓] Öğrenci Net Girebilsin`** hızlı tiki.
  4. **Koç Görünürlüğü ve `👤 Öğrenci Ekledi` Rozeti:**
     - Öğrencinin kendi eklediği ödev, sınav neti, kaynak/video ve konu tamamlamalarının yanında **`👤 Öğrenci`** rozeti gösterilir; koç tüm bu kayıtları düzenleyebilir veya silebilir.
     - `ApprovalsPage.jsx` içinde `HOMEWORK_DONE` ("Ödev Tamamlama Onayı") talepleri için başlık ve detay kartı gösterilir.
- **Kabul:** Koç hem `InfoTab` üzerinden hem de her sekmenin sağ üstündeki bağlamsal kısayoldan 6 izni anlık yönetebilir ve öğrencinin yaptığı tüm girişleri görüp değiştirebilir.

---

## 3. Doğrulama ve Kalite Kapısı (`AGENTS.md` §C3)
- [x] `dotnet build` — 0 Uyarı, 0 Hata
- [x] `dotnet test` — Tüm entegrasyon testleri başarılı (82/82)
- [x] `npm run build` — Başarılı üretim paketi
- [x] `npx oxlint src` — 0 Uyarı, 0 Hata

