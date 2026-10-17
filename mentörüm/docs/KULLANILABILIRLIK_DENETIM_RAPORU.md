# Kullanılabilirlik Denetim Raporu

> **Tarih:** 17 Ekim 2026
> **Kapsam:** Mentörüm — dört rol (Koç, Öğretmen, Öğrenci, Veli) uçtan uca erişim denetimi.
> **Yöntem:** Her özellik için `route → menü/link → API ucu → backend endpoint` matrisi çıkarıldı. İki bağımsız analiz (Cline + Gemini) çapraz doğrulandı; her bulgu koda karşı teyit edildi.
> **Sonuç:** Kodlanmış veya backend ucu hazır olduğu hâlde kullanıcının fiilen erişemediği **7 özellik**, **1 responsive UX riski** ve **2 ölü kod** tespit edildi.

---

## 1. Bulgular (öncelik sıralı)

| # | Öncelik | Rol | Özellik | Kod Durumu | Kullanılabilirlik |
|---|---|---|---|---|---|
| 1 | 🔴 P0 | Tümü | Şifre Sıfırlama Sayfası | Backend ✅ / UI ❌ | **Kullanılamıyor** |
| 2 | 🔴 P1 | Öğretmen | Pedagojik Öğrenci Notu | Backend ✅ / UI ❌ | **Kullanılamıyor** |
| 3 | 🟡 P1 | Öğrenci | Takvim & Kişisel Etkinlik | Sayfa ✅ / Navigasyon ❌ | **Menüde unutulmuş** |
| 4 | 🟡 P2 | Veli | Sınav Sonuçları Sekmesi | Sayfa ✅ / Navigasyon 🟡 | **Menüde eksik** |
| 5 | 🟡 P2 | Koç–Öğretmen | Ödevin Derse Bağlanması | Şema ✅ / DTO+UI ❌ | **Kopuk iş akışı** |
| 6 | 🟡 P2 | Öğretmen | Ders Kaynakları / Materyal Erişimi | Backend Kısmi / UI ❌ | **Kopuk iş akışı** *(gemini 3.8 flash)* |
| 7 | 🟡 P2 | Koç | Öğretmen Notlarını İnceleme | Backend ❌ / UI ❌ | **İletişim kopukluğu** *(gemini 3.8 flash)* |
| 8 | ⚪ P3 | Öğrenci/Veli | Mobil Alt Bar (BottomNav) Taşma Riski | UI ⚠️ | **Responsive risk** *(gemini 3.8 flash)* |
| 9 | ⚪ P3 | — | Ölü kod (2 kalem) | — | Temizlik |

---

## 2. Detaylar

### 2.1 🔴 P0 — Şifre Sıfırlama Sayfası Eksik (Tüm Roller)

- **Backend (çalışıyor):** `POST /api/v1/auth/forgot-password` (AuthEndpoints.cs:393) ve `POST /api/v1/auth/reset-password` (AuthEndpoints.cs:423). `password_reset_tokens` tablosu, 1 saatlik token, 5 dk e-posta rate-limit, BCrypt hash — hepsi mevcut.
- **E-posta linki:** `${APP_BASE_URL}/reset-password?token={token}` (AuthEndpoints.cs:417).
- **Sorun:** `App.jsx` içinde `/reset-password` route'u **yok**. Catch-all `<Route path="*" → Navigate to /login>` kuralı, e-postadaki linki doğrudan `/login`'e yönlendiriyor.
- **Etki:** Kullanıcı "şifremi unuttum" akışını tamamlayamıyor; yeni şifre belirleyemiyor.
- **Çözüm:**
  - `src/features/auth/ResetPasswordPage.jsx` (token'ı query'den okuyup `POST /auth/reset-password` çağırır).
  - `App.jsx`'e `/reset-password` route'u (korumasız).
  - `LoginPage.jsx`'e "Şifremi unuttum" bağlantısı + e-posta giriş alanı (`POST /auth/forgot-password`).

### 2.2 🔴 P1 — Öğretmen Pedagojik Not UI'sı Eksik (Öğretmen)

- **Backend (çalışıyor):** `003_teacher_notes.sql` migration'ı uygulanmış (`teacher_notes` tablosu: `course_id`, `student_id`). `TeacherEndpoints.cs`: `POST`/`GET /api/v1/teacher/courses/{courseId}/students/{studentId}/notes`.
- **Sorun:**
  - `teacherApi.js` içinde bu uçları çağıran hook (`useTeacherNotes`, `useCreateTeacherNote`) **yok**.
  - `TeacherCoursesPage.jsx` sekmeleri (Öğrenciler / Ödevler / Sınavlar) içinde not yazma/listeleme alanı **yok**.
  - `CoachStudentDetail.jsx` yalnızca koçun kendi `coach_notes`'unu gösteriyor; öğretmenin yazdığı notu göstermiyor.
- **Etki:** Öğretmen öğrenciye ders notu yazamıyor/okuyamıyor; koç da öğretmen notunu göremiyor.
- **Çözüm:**
  - `teacherApi.js`'e `useTeacherNotes(courseId, studentId)` + `useCreateTeacherNote()` hook'ları.
  - `TeacherCoursesPage`'e öğrenci başına not modalı (liste + yeni not).
  - (Opsiyonel) `CoachStudentDetail`'e öğretmen notları görünümü.

### 2.3 🟡 P1 — Öğrenci Takvimi Menüde Unutulmuş (Öğrenci)

- **Sayfa (tam kodlu):** `StudentCalendarPage.jsx` (react-big-calendar; ödev/sınav/kişisel etkinlik + `PersonalEventModal`). Route: `App.jsx:140` (`/student/calendar`).
- **Sorun:** `StudentLayout.jsx` `tabs` listesi = Ana Sayfa, Programım, Derslerim, Ödevler, Profil — **Takvim yok**. `StudentHome`'da da link yok. `src` içinde `student/calendar` string'i yalnızca `App.jsx` import satırında geçiyor.
- **Etki:** Öğrenci takvime adres çubuğuna elle yazmadan ulaşamıyor.
- **Çözüm:** `StudentLayout.jsx` `tabs`'a `{ path: '/student/calendar', label: 'Takvim', icon: '🗓️' }` ekle (mobil alt barda 6. sekme; sığma kontrolü gerekebilir).

### 2.4 🟡 P2 — Veli "Sınavlar" Sekmesi Eksik (Veli)

- **Sayfa (tam kodlu):** `ParentExamsPage.jsx` + route `/parent/exams`.
- **Sorun:** `ParentLayout.jsx` `tabs` = Özet, Ödev Takibi, Takvim, Program — **Sınavlar yok**. Yalnızca `ParentSummary.jsx:53` içindeki "Sınav Sonuçları" kartından erişilebiliyor.
- **Etki:** Veli sınav sonuçlarına alt menüden doğrudan ulaşamıyor.
- **Çözüm:** `ParentLayout.jsx` `tabs`'a `{ path: '/parent/exams', label: 'Sınavlar', icon: '📝' }` ekle.

### 2.5 🟡 P2 — Koç Ödevi Derse Bağlayamıyor (Koç–Öğretmen Entegrasyonu)

- **Şema (hazır):** `homework_assignments.course_id` kolonu var (001_schema.sql:460; `ON DELETE SET NULL`, nullable).
- **Backend DTO (eksik):** `AssignHomeworkRequest` (HomeworkDtos.cs:19-35) → `StudentId`, `SubjectId`, `CurriculumTopicId`, `FreeTopic`, `Title`, `Description`, `DueDate`. **`CourseId` yok.**
- **Frontend (eksik):** `AssignHomeworkModal.jsx` formunda ders seçimi yok; `useAssignHomework` `courseId` göndermiyor.
- **Öğretmen tarafı:** `useTeacherCourseHomework` → `GET /teacher/courses/{id}/homework`, `course_id` filtresiyle çalışıyor. Koçun attığı ödev (`course_id = NULL`) öğretmenin "Ödevler" sekmesine düşmüyor.
- **Etki:** Koç–öğretmen ödev iş akışı kopuk; koç ödevi ilgili dersin öğretmenine ulaşmıyor.
- **Çözüm:**
  - `AssignHomeworkRequest`'e `Guid? CourseId` ekle.
  - `HomeworkRepository` create metodunda `course_id` yaz.
  - `AssignHomeworkModal`'a opsiyonel ders (`course_id`) seçimi ekle.

### 2.6 🟡 P2 — Öğretmen Tarafında "Ders Kaynakları / Materyalleri" Eksikliği *(gemini 3.8 flash)*

- **Durum:** Backend'de `CourseResourceEndpoints.cs` üzerinden koç kaynak ekleyip yönetebiliyor (`CoachCourseDetailPage.jsx`), öğrenci de `StudentCoursesPage.jsx` üzerinden kaynakları görüp `useUpdateResourceProgress` ile tamamlayabiliyor.
- **Sorun:** Öğretmen tarafında `TeacherCoursesPage.jsx` içinde yalnızca "Öğrenciler", "Ödevler" ve "Sınavlar" sekmeleri vardır; "Kaynaklar" sekmesi **yoktur**. Ayrıca `TeacherEndpoints.cs` içinde öğretmenin sorumlu olduğu dersin kaynaklarını listeleyen bir endpoint açılmamıştır.
- **Etki:** Öğretmen, derse atanmış kaynakları (videolar, kitaplar, dokümanlar) görememekte ve öğrencinin kaynak tamamlama durumundan haberdar olamamaktadır.
- **Çözüm:**
  - `TeacherEndpoints.cs`'e `GET /api/v1/teacher/courses/{courseId}/resources` endpoint'i ekle.
  - `teacherApi.js` içine `useTeacherCourseResources(courseId)` hook'u ekle.
  - `TeacherCoursesPage.jsx`'e "Kaynaklar" sekmesi ekle.

### 2.7 🟡 P2 — Öğretmen Notlarının Koç Tarafından Görüntülenememesi *(gemini 3.8 flash)*

- **Durum:** 2.2 maddesinde öğretmenin not ekleyememesi belirtilmiştir; ancak koç tarafı da eksiktir.
- **Sorun:** `003_teacher_notes.sql` ile eklenen öğretmen notlarının birincil hedef kitlesi koçtur. Ancak `CoachStudentDetail.jsx` içinde yalnızca `coach_notes` listelenmektedir; öğretmenin öğrenci için düştüğü pedagojik notları koçun görebileceği hiçbir endpoint ve arayüz sekmesi **yoktur**.
- **Etki:** Koç, öğretmenin öğrenci hakkındaki gözlemlerini ve ders sonu değerlendirmelerini sistem üzerinden takip edememektedir.
- **Çözüm:**
  - `StudentEndpoints.cs`'e koç için öğrencinin öğretmen notlarını listeleyen uç ekle (`GET /api/v1/students/{id}/teacher-notes`).
  - `CoachStudentDetail.jsx` içine "Öğretmen Notları" sekmesi/kartı ekle.

### 2.8 ⚪ P3 — Mobil Alt Bar (BottomNav) Taşma Riski *(gemini 3.8 flash)*

- **Sorun:** `StudentLayout.jsx` içine 6. sekme (Takvim) ve `ParentLayout.jsx` içine 5. sekme (Sınavlar) eklendiğinde, 360px–390px genişlikteki küçük mobil ekranlarda alt menü (`bottomNav`) butonları taşabilir veya metinler sıkışabilir.
- **Çözüm:**
  - `StudentLayout.module.css` ve `ParentLayout.module.css` içinde `bottomNav` için `overflow-x: auto`, `min-width: 56px` esnekliği ve `env(safe-area-inset-bottom)` desteği sağlanmalı; dar ekranlarda metinlerin kırpılmasını önleyen responsive kurallar uygulanmalıdır.

### 2.9 ⚪ P3 — Ölü Kod

- `useParentChildDetails` (`parentApi.js`) — hiçbir sayfa import etmiyor (backend ucu `/parents/children/{id}` var ama kullanılmıyor).
- `ComingSoon.jsx` — artık hiçbir yerde import edilmiyor (V6/V7'de gerçek sayfalarla değiştirildi).

---

## 3. Doğrulanan Sağlam Alanlar (sorun yok)

- **Koç:** 15 alt sayfanın tamamı ulaşılabilir (sidebar: Dashboard, Takvim, Öğrenciler, Programlar, Raporlar, Profil, Yönetim; `CoachProgramsPage` içindeki Öğretmenler/Dersler/Gruplar/Program/Ayarlar butonları; `CoachStudents` kartları).
- **Öğretmen:** 3 sekme (Derslerim/Program/Profil) route'lara bağlı; tüm öğretmen endpoint'leri mevcut (`/teacher/schedule` ucu `ScheduleEndpoints.cs` içinde).
- **Öğrenci:** Profil sayfasında sınav sonuçları + konu takibi + hedef düzenleme çalışıyor; tüm student endpoint'leri mevcut (`/student/profile`, `/student/exams`, `/student/curriculum`, `/student/goal`, `/student/sessions`, `/me/calendar`, `/student/courses`, `/student/courses/{id}/resources`, `/student/resources/{id}/progress`).
- **Veli:** Tüm uçlar mevcut (`/parents/my-children`, `/parents/children/{id}`, `/homework/children/{id}`, `/parents/children/{id}/exams`, `/me/children/{id}/calendar`, `/parent/schedule`).
- **Endpoint eşleşmesi:** Frontend'in çağırdığı hiçbir uç boşta değil; backend'de karşılığı olmayan hiçbir frontend çağrısı yok.

---

## 4. Çözüm Planı (öncelik sırası)

| Sıra | Görev | Hedef Dosyalar |
|---|---|---|
| 1 | Şifre sıfırlama sayfası + route + login linki | `ResetPasswordPage.jsx` (yeni), `App.jsx`, `LoginPage.jsx` |
| 2 | Öğrenci takvimi menü sekmesi (+ mobil bar taşma kontrolü) | `StudentLayout.jsx`, `StudentLayout.module.css` |
| 3 | Öğretmen not hook'ları + UI (öğretmen girişi + koç görünümü) | `teacherApi.js`, `TeacherCoursesPage.jsx`, `StudentEndpoints.cs`, `CoachStudentDetail.jsx` |
| 4 | Veli sınavlar sekmesi (+ mobil bar taşma kontrolü) | `ParentLayout.jsx`, `ParentLayout.module.css` |
| 5 | Ödev-ders bağlantısı (`course_id`) | `HomeworkDtos.cs`, `HomeworkRepository.cs`, `AssignHomeworkModal.jsx`, (ops.) `coachApi.js` |
| 6 | Öğretmen ders kaynakları listesi | `TeacherEndpoints.cs`, `teacherApi.js`, `TeacherCoursesPage.jsx` |
| 7 | Ölü kod temizliği | `parentApi.js`, `ComingSoon.jsx` |

> Not: 1. madde (şifre sıfırlama) güvenlik/kullanılabilirlik açısından en kritiktir ve önceliklidir.

---

## 5. TASK_LIST_V9'a Eklenecek Görevler Yönergesi (DeepSeek İçin Taslak)

> **DeepSeek için Not:** Bu bölümdeki hazır görev maddelerini `TASK_LIST_V9.md` dosyasına entegre etmek üzere kullanabilirsiniz. İki entegrasyon seçeneği hazırlanmıştır:
> - **Seçenek A (Önerilen — Mevcut Aşamaların İçine Dağıtma):** İlgili aşamaların altına yeni kontrol maddeleri olarak ekleme.
> - **Seçenek B (Ayrık Aşama 0 / Acil Düzeltme Paketi):** Sprint 1 öncesine bağımsız bir "Kullanılabilirlik & Erişim Paketi" olarak ekleme.

---

### Seçenek A: Mevcut Aşamaların İçine Eklenecek Maddeler (TASK_LIST_V9.md)

#### 1. Aşama 8'e veya Öncelikli Güvenlik Bölümüne (P0)
```markdown
- [ ] **8.0 Şifre Sıfırlama Sayfası (P0 — Auth):**
  - Backend'deki `POST /api/v1/auth/reset-password` (AuthEndpoints.cs:423) ucunu tüketen `Frontend/src/features/auth/ResetPasswordPage.jsx` bileşenini oluştur (URL query'den `?token=...` parametresini alıp yeni şifre ve şifre tekrarı formu sunar).
  - `App.jsx` içine korumasız rota olarak `<Route path="/reset-password" element={<ResetPasswordPage />} />` ekle.
  - `LoginPage.jsx` içindeki "Şifremi Unuttum" formunun başarılı gönderim sonrasında kullanıcıyı bilgilendiren akışını doğrula.
```

#### 2. Aşama 3: Öğretmen Bölümüne Eklenecek Maddeler (§2.B)
```markdown
- [ ] **3.5 Öğretmen Pedagojik Not UI'sı (P1 — Öğretmen):**
  - `teacherApi.js` içine `useTeacherStudentNotes(courseId, studentId)` (GET) ve `useCreateTeacherNote()` (POST) React Query hook'larını tanımla (`POST/GET /api/v1/teacher/courses/{courseId}/students/{studentId}/notes`).
  - `TeacherCoursesPage.jsx` Öğrencilerim sekmesindeki her öğrenci kartına "Ders Notu Ekle / Notlar" butonu ve açılır modal ekle; öğretmenin geçmiş notları tarih sırasıyla görmesini ve yeni not eklemesini sağla.
- [ ] **3.6 Öğretmen Ders Kaynakları Görünümü (P2 — Öğretmen):**
  - `TeacherEndpoints.cs` içine öğretmenin sorumlu olduğu dersin kaynaklarını listeleyen `GET /api/v1/teacher/courses/{courseId}/resources` endpoint'ini ekle.
  - `teacherApi.js` içine `useTeacherCourseResources(courseId)` hook'unu ekle.
  - `TeacherCoursesPage.jsx` sekmelerine "Kaynaklar" sekmesini ekle; derse tanımlı kitap/video/dokümanların listesini ve detaylarını öğretmene göster.
```

#### 3. Aşama 4: Öğrenci Bölümüne Eklenecek Madde (§2.C)
```markdown
- [ ] **4.9 Öğrenci Takvim Menü Erişimi (P1 — Öğrenci):**
  - `StudentLayout.jsx` içindeki `tabs` dizisine `{ path: '/student/calendar', label: 'Takvim', icon: '🗓️' }` öğesini ekle.
  - Hem masaüstü sidebar'da hem de mobil bottomNav üzerinde `/student/calendar` rotasının sorunsuz çalıştığını doğrula.
  - `StudentLayout.module.css` içinde 6 sekmenin dar ekranlarda (360px–390px) taşmaması için `overflow-x: auto`, `min-width: 56px` ve safe-area uyumunu sağla.
```

#### 4. Aşama 5: Veli Bölümüne Eklenecek Madde (§2.D)
```markdown
- [ ] **5.4 Veli Sınavlar Sekmesi Erişimi (P2 — Veli):**
  - `ParentLayout.jsx` içindeki `tabs` dizisine `{ path: '/parent/exams', label: 'Sınavlar', icon: '📝' }` öğesini ekle.
  - Velinin yalnızca `ParentSummary` üzerinden değil, alt navigasyon çubuğundan doğrudan çocuğunun sınav geçmişine erişebilmesini sağla.
  - `ParentLayout.module.css` içinde 5 sekmenin mobil uyumunu (taşma ve safe-area) doğrula.
```

#### 5. Aşama 8: Polish & Refactor Bölümüne Eklenecek / Güncellenecek Maddeler
```markdown
- [ ] **Ödev-Ders Bağlantısı (P2 — Koç-Öğretmen Entegrasyonu):**
  - `HomeworkDtos.cs` içindeki `AssignHomeworkRequest` DTO'suna `public Guid? CourseId { get; set; }` alanını ekle.
  - `HomeworkRepository.cs` içindeki ödev oluşturma SQL sorgusuna `course_id` kolonunu dahil et.
  - `AssignHomeworkModal.jsx` formuna opsiyonel "Ders Seçimi (CourseId)" açılır kutusu (`<select>`) ekle; koç ödevi derse bağladığında ödevin ilgili ders öğretmeninin `TeacherCoursesPage` ödev listesinde görünmesini sağla.
- [ ] **Koç Öğrenci Detayında Öğretmen Notları Görünümü (P2 — Koç):**
  - `StudentEndpoints.cs` içine koç rolü için `GET /api/v1/students/{id}/teacher-notes` endpoint'ini ekle (IDOR guard ile koçun kendi öğrencisine ait öğretmen notlarını çekmesini sağla).
  - `CoachStudentDetail.jsx` içine "Öğretmen Notları" sekmesi veya bilgi kartı ekleyerek öğretmenlerin öğrenci hakkında yazdığı pedagojik notları koçun incelemesine aç.
- [ ] **Ölü Kod Temizliği (P3):**
  - `parentApi.js` içinde kullanılmayan `useParentChildDetails` hook'unu kaldır.
  - Projede artık import edilmeyen `ComingSoon.jsx` dosyasını sil veya arşivle.
```

---

### Seçenek B: Ayrık "Aşama 0: Kullanılabilirlik & Erişim Düzeltmeleri" (TASK_LIST_V9.md Başına)

Eğer mevcut aşamaları değiştirmek yerine Sprint 1 önüne bağımsız bir paket olarak eklenmek istenirse:

```markdown
## Aşama 0: Kritik Kullanılabilirlik & Eksik Erişim Düzeltmeleri (P0/P1)

- [ ] **0.1 Şifre Sıfırlama Sayfası:** `ResetPasswordPage.jsx` oluştur, `App.jsx` rotasını aç (`/reset-password`), `LoginPage.jsx` ile bağla.
- [ ] **0.2 Öğrenci Takvim Sekmesi:** `StudentLayout.jsx` `tabs` listesine Takvim'i ekle; `StudentLayout.module.css` mobil taşma kontrolü yap.
- [ ] **0.3 Öğretmen Not UI'sı:** `teacherApi.js` hook'larını yaz, `TeacherCoursesPage.jsx`'e not modalı ekle.
- [ ] **0.4 Veli Sınavlar Sekmesi:** `ParentLayout.jsx` `tabs` listesine Sınavlar'ı ekle.
- [ ] **0.5 Ödev-Ders Bağlantısı:** `AssignHomeworkRequest` DTO'suna `CourseId` ekle, `HomeworkRepository`'de kaydet, `AssignHomeworkModal`'a ders seçici koy.
- [ ] **0.6 Öğretmen Ders Kaynakları:** `TeacherEndpoints`'e kaynak okuma ucu ekle, `TeacherCoursesPage`'e Kaynaklar sekmesi aç.
- [ ] **0.7 Koç Ekranında Öğretmen Notları:** `CoachStudentDetail`'e öğretmen notları listesini bağla.
- [ ] **0.8 Ölü Kod Temizliği:** Kullanılmayan `useParentChildDetails` ve `ComingSoon.jsx`'i temizle.
```

### Sprint Planı Güncellemesi (DeepSeek İçin):
`TASK_LIST_V9.md` en altındaki Sprint planına:
> **Sprint 0 (P0/P1 — Kullanılabilirlik & Hızlı Kazanımlar):** Aşama 0 (Şifre sıfırlama, menü erişimleri, öğretmen not UI'sı, ödev-ders bağlantısı).
satırı eklenmelidir.


