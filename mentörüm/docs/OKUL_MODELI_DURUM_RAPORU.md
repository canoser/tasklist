# 🏫 Mentörüm — Okul Modeli (OKUL_MODELI.md) vs. Canlı Sistem Yetenekleri Karşılaştırma Raporları

Bu belge; `OKUL_MODELI.md` mimari tasarımı ile canlı sistem (`MentorumApi` & `Frontend`) arasındaki uyumluluğu, güvenlik açıklarını ve kullanıcı deneyimini değerlendiren iki bağımsız yapay zekâ modelinin (**Antigravity** ve **Cline**) analiz raporlarını ve sentezini bir arada sunmaktadır.

---

# BÖLÜM 1: ANTIGRAVITY ANALİZ RAPORU
> **Analist:** Antigravity (Google DeepMind)  
> **Tarih:** 16 Ekim 2026  
> **Kapsam:** `mentörüm/docs/OKUL_MODELI.md` mimari tasarımı ile canlı kod tabanı (`MentorumApi` & `Frontend`) arasındaki yetenek, güvenlik ve kullanıcı deneyimi (UX) karşılaştırması.

---

## 1. Yönetici Özeti (Genel Uyumluluk Matrisi)

| Alan / Modül | Tasarım Hedefi (Spec) | Mevcut Durum | Risk & Uyum Seviyesi |
| :--- | :--- | :--- | :--- |
| **Program Tabanlı İzolasyon** | Veri birimi `coaching_programs`. 1 Öğrenci = 1 Program. | `coaching_programs` ve `program_coaches` DB seviyesinde kurulu. | 🟢 **Uyumlu** |
| **Koç - Öğretmen Atama / Değiştirme** | Koç derse öğretmen atar, değiştirir, boşaltır. | Backend API destekliyor; **Frontend UI'da öğretmen seçici/değiştirici yok**. | 🟡 **UI Eksik / Güvenlik Boşluğu** |
| **Öğretmen İzin & Maskeleme** | 10 adet ders bazlı izin bayrağı (`view_contact`, `view_homework` vb.). | Backend'de maskeleme var; **Frontend'de izinler salt-okunur (değiştirilemiyor)**. | 🟡 **Kısmi Uyumlu** |
| **Öğretmen Ödevlendirme** | Öğretmen kendi dersindeki öğrencilere/gruplara ödev atar. | Öğretmen yalnızca **tek tek öğrenci seçerek** ödev atayabiliyor. Toplu/grup atama yok. | 🟢 **Çalışıyor (Fonksiyonel Kısıt)** |
| **Koç Ödevlendirme** | Koç öğrenciye veya derse bağlı ödev atar. | Koç ödev atayabiliyor; ancak ödevi bir **Derse (Course)** bağlama seçeneği yok. | 🟡 **Eksik İlişki** |
| **Öğretmen Veri İzolasyonu** | Öğretmen yalnızca kendi dersinin ödevini/sınavını görür. | **KRİTİK GÜVENLİK SIZINTISI:** Öğretmen, öğrencisinin diğer tüm branşlardaki ödev ve sınavlarını görebiliyor. | 🔴 **Kritik Güvenlik Açığı** |
| **Öğretmen Ayrılma / Pasife Alma** | Pasife alınan öğretmen sadece o programdan düşer. | **MİMARİ HATA:** Bir programda pasife alınan öğretmen, **sistem genelindeki tüm programlarda** pasifleşiyor. | 🔴 **Mimari Hata** |
| **Veli Erişim Yetkileri** | Çocuk profili, takvim, ödev, sınav ve haftalık program. | Ödev, takvim ve profil var; **Sınav sonuçları ve analizler veliye tamamen kapalı**. | 🟡 **Eksik Yetenek** |
| **Çok Çocuklu Veli Takvimi** | Her çocuk için ayrı program (`/me/children/:id/schedule`). | Çocuk ayrımı yok; velinin tüm çocuklarının programı tek listede birleşiyor. | 🔴 **UX / Veri Karışması** |
| **Öğrenci / Grup Ders Ekleme UX** | Listeden/modalden seçim. | Koçun forma **elle 36 karakterlik ham GUID/UUID** yazması bekleniyor. | 🔴 **Kritik UX Kusuru** |

---

## 2. Koç – Öğretmen İlişkisi ve Öğretmen Yönetimi

### 2.1 Koç Öğretmen Atayabiliyor mu?
- **Davet Süreci:** Koç, `CoachTeachersPage.jsx` üzerinden öğretmenin e-postasını girerek davet kodu oluşturur (`POST /api/v1/invites`). Öğretmen bu davetle sisteme kaydolduğunda `program_teachers` tablosuna ilgili program ID'siyle bağlanır. Bu akış çalışmaktadır.
- **Derse Öğretmen Atama:**
  - **Backend Düzeyi:** `CourseEndpoints.cs` (`POST /courses` ve `PUT /courses/{id}`) `TeacherId` parametresini kabul eder ve veritabanına yazar.
  - **Frontend Düzeyi (Eksik):** `CoachCoursesPage.jsx` (Ders Oluşturma) ve `CoachCourseDetailPage.jsx` (Ders Detay) bileşenlerinde **öğretmen seçimi yapmaya yarayan hiçbir `<select>` veya dropdown bulunmamaktadır**. Koç ekran üzerinden derse öğretmen atayamamaktadır.

### 2.2 Koç Öğretmeni Değiştirebiliyor mu?
- **Backend:** `PUT /api/v1/programs/{programId}/courses/{courseId}` gövdesinde yeni bir `teacherId` gönderildiğinde `CourseRepository.cs` içindeki `UpdateCourseAsync` metodu `teacher_id = @TeacherId` olarak günceller.
- **Frontend:** Arayüzde ders güncelleme formu veya öğretmen değiştirme butonu bulunmadığı için kullanıcı arayüzünden bu işlem yapılamaz.

### 2.3 Koç – Öğretmen Güvenlik Açığı (Tenant İhlali)
- `CourseRepository.cs` (`UpdateCourseAsync` ve `CreateCourseAsync`): Derse atanan `teacher_id`'nin gerçekten o programa ait bir öğretmen (`program_teachers.program_id = @ProgramId`) olup olmadığı **doğrulanmamaktadır**.
- Kötü niyetli bir koç, başka bir kurumun/programın öğretmenine ait GUID'i API üzerinden gönderirse, sistem o öğretmeni bu derse atayacak ve yabancı öğretmen yetkisiz şekilde bu dersin öğrencilerini görmeye başlayacaktır.

### 2.4 Öğretmenin Programdan Çıkarılması (Yaşam Döngüsü Hatası)
- `TeacherRepository.cs` içindeki `DeactivateTeacherAsync` metodu incelendiğinde:
  ```sql
  UPDATE teachers SET is_active = 0 WHERE id = @TeacherId;
  UPDATE program_teachers SET is_active = 0 WHERE teacher_id = @TeacherId AND program_id = @ProgramId;
  UPDATE courses SET teacher_id = NULL WHERE teacher_id = @TeacherId AND program_id = @ProgramId;
  ```
- `OKUL_MODELI.md` Madde 1.5.2 ve 4.1: *"Öğretmen birden çok programda çalışabilir. DELETE /teachers/:id yalnızca o programda pasife alır, diğer programları etkilenmez."*
- **Hata:** `UPDATE teachers SET is_active = 0` çalıştırıldığı an öğretmen **global** olarak devre dışı kalmakta, öğretmenin dahil olduğu diğer koçluk programlarındaki tüm oturumu ve yetkileri haksız yere iptal edilmektedir.

---

## 3. Öğretmenin Yetenekleri ve Öğrenciyle İlişkisi

### 3.1 Öğretmen Yetenekleri
Öğretmen giriş yaptığında `TeacherLayout.jsx` ile karşılanır:
1. **Derslerim (`/teacher/courses`):** Kendisine atanan dersleri, dersin öğrencilerini, ödevleri ve sınavları görür.
2. **Haftalık Program (`/teacher/schedule`):** Atandığı derslerin haftalık saat dilimlerini görür.
3. **Profil (`/teacher/profile`):** Bağlı olduğu programları ve dersleri listeler.

### 3.2 İzin Modeli (Permissions) ve Veri Maskeleme
Ders tablosundaki (`courses`) 10 izin bayrağına göre `SchoolAccessRepository.cs` içinde veri maskeleme yapılmaktadır:
- `teacher_can_view_contact = 0`: Öğrencinin e-postası ve avatarı `null` döner.
- `teacher_can_view_profile = 0`: Öğrencinin sınıfı, alanı, hedef üniversitesi ve koçluk başlangıç tarihi `null` döner.
- **Eksiklik:** Koç arayüzünde (`CoachCourseDetailPage.jsx`) bu izinler yalnızca metin olarak "Açık/Kapalı" gösterilmekte; koçun bu izinleri değiştirebileceği interaktif bir anahtar (switch/checkbox) bulunmamaktadır.

### 3.3 Öğrenciyle İşi Kalmayan Öğretmenin Verilere Erişimi

#### Senaryo A: Öğrenci Dersten / Gruptan Çıkarıldığında
- `SchoolAccessRepository.cs`: Öğretmenin öğrenci listesi `course_students` ve `course_groups` tablolarının anlık birleşimi (`UNION`) ile dinamik hesaplanır.
- Öğrenci dersten çıkarıldığı anda öğretmenin öğrenci listesinden **anında düşer**.

#### Senaryo B: Öğretmenin Dersteki Görevi Sonlandırıldığında
- Koç dersteki öğretmeni kaldırdığında veya değiştirdiğinde, `GetCourseAccessAsync` sorgusu `teacher_id = @TeacherId` eşleşmesi bulamaz ve `null` döner.
- Öğretmen o dersin hiçbir öğrencisine, ödevine ve sınavına erişemez (`404 / 403` alır).

#### Senaryo C: KRİTİK GÜVENLİK AÇIĞI (Diğer Derslerin Verilerine Erişim / Cross-Course Data Leak)
- `OKUL_MODELI.md` §4.7 Kural 6 açıkça şunu emreder:
  > *"Öğretmen sızıntı koruması: Öğretmen ödev/sınav/not uçları her zaman `course_id` ile filtrelenir — manage_homework açık olsa bile başka dersin ödevini göremez."*
- `SchoolAccessRepository.cs` incelendiğinde:
  ```sql
  -- Öğretmenin ders ödevlerini çeken sorgu:
  SELECT h.id, ... FROM homework_assignments h
  WHERE h.program_id = (SELECT program_id FROM courses WHERE id = @CourseId)
    AND h.student_id IN (SELECT student_id FROM course_students ... UNION ...)
  ```
- **Açık:** Sorguda `AND h.course_id = @CourseId` filtresi **YOKTUR**.
- **Sonuç:** Eğer Öğrenci A, Biyoloji öğretmeninin dersindeyse; Biyoloji öğretmeni, Öğrenci A'nın **Matematik, Fizik, Kimya veya Koçun doğrudan atadığı TÜM ödevlerini** listeleyebilmektedir. Aynı sızıntı `GetTeacherCourseExamsAsync` için de geçerlidir; branş öğretmeni öğrencinin tüm diğer derslerdeki sınav netlerini görebilmektedir.

---

## 4. Ödevlendirme Yetenekleri (Koç vs. Öğretmen)

| Özellik | Koç Yeteneği | Öğretmen Yeteneği | Mimari / UX Durumu |
| :--- | :--- | :--- | :--- |
| **Bireysel Öğrenciye Ödev** | ✅ Var (`AssignHomeworkModal`) | ✅ Var (`TeacherCoursesPage` modalı) | İki rol de tek öğrenciye ödev verebilir. |
| **Ders Bazlı Ödev** | ❌ Yok (`course_id` bağlanmıyor) | ✅ Var (`course_id` otomatik kaydedilir) | Koç ödevi bir derse bağlayamıyor. |
| **Sınıfa / Gruba Toplu Ödev** | ❌ Arayüzde yok | ❌ Arayüzde yok | Öğretmen 20 kişilik sınıfta 20 kez tek tek ödev girmek zorundadır. |
| **Müfredat / Konu Bağlantısı** | ✅ Var (Ders / Konu seçimi) | ❌ Kısıtlı (Öğretmen formunda serbest başlık var) | Öğretmen formunda müfredat ağacı seçici yok. |
| **Ödev Durum Güncellemesi** | ✅ Koç onaylayabilir/silebilir | ❌ Öğretmen sadece görüntüler, durum güncelleyemez | Öğretmenin ödevi "Teslim Edildi / Eksik" işaretleme ucu yok. |

---

## 5. Veli Yetenekleri ve Erişim Kısıtları

### 5.1 Velinin Görebildikleri
- `ParentEndpoints.cs` üzerinden veli:
  1. Kendisine bağlı çocukların adını, sınıfını ve alanını görür (`/api/v1/parents/my-children`).
  2. Çocuk detayında diğer kayıtlı velinin varlığını görür; ancak diğer velinin e-posta ve telefon bilgileri `'GİZLİ'` olarak maskelenir (başarılı gizlilik koruması).
  3. Çocuğuna atanan ödevleri ve teslim durumlarını görür (`/api/v1/homework/children/{studentId}`).
  4. Çocuğun takvim etkinliklerini görür (`/api/v1/me/children/{id}/calendar`).

### 5.2 Velinin Göremedikleri (Eksik Kapsam)
1. **Sınav Sonuçları Tamamen Yok:** Velinin çocuğunun deneme sınavlarını, netlerini, TYT/AYT gelişimini görebileceği hiçbir API ucu (`/parents/children/{id}/exams`) veya arayüz sekmesi bulunmamaktadır.
2. **Ders Kaynakları ve Konu İlerlemesi Yok:** Veli çocuğunun hangi derste hangi kitabı/videoyu bitirdiğini takip edememektedir.
3. **Performans Raporları Yok:** Koçun ve öğrencinin gördüğü grafikler, haftalık net trendleri veliye sunulmamaktadır.

### 5.3 Çok Çocuklu Veli Hatası (Veri Bütünlüğü Riski)
- `ScheduleRepository.cs`:
  ```sql
  WHERE s.student_id IN (SELECT student_id FROM student_parents WHERE parent_id = @ParentId ...)
  ```
- `ParentSchedulePage.jsx`: Sayfada çocuk seçme filtresi yoktur.
- **Hata:** Bir velinin sistemde kayıtlı 2 çocuğu varsa (biri 8. sınıf LGS, diğeri 12. sınıf YKS), iki çocuğun haftalık ders programı, etütleri ve ders saatleri tek bir ekranda, kimin hangi derse gireceği belirtilmeden birbirine karışmaktadır.

---

## 6. Kullanıcı Deneyimi (UX) ve Ergonomi Açıkları

1. **Manuel GUID / UUID Girişi Zorunluluğu:**
   - `CoachCourseDetailPage.jsx`: Bir derse öğrenci eklemek için `<Input label="Öğrenci ID" placeholder="UUID" />` alanı vardır. Koçtan öğrencinin sistemdeki 36 karakterlik `c7b3d820-...` kodunu elle yazması beklenmektedir. Bu durum son kullanıcı için sistemi kullanılamaz kılmaktadır. Aynı durum grup ekleme için de geçerlidir.
2. **Haftalık Program Sürükle-Bırak Takvimi:**
   - `OKUL_MODELI.md` Bölüm 6'da `dnd-kit` ile saatlik sürükle-bırak matrisi tasarlanmıştır. Mevcut uygulamada sürükle-bırak henüz kodlanmamış, yalnızca basit form bazlı ekleme yapılmıştır.
3. **Davet Kodu Paylaşım Zorluğu:**
   - Öğretmen davet edildiğinde ekranda sadece metin olarak kod gösterilmektedir; WhatsApp ile paylaş veya tek tıkla kopyala bağlantısı öğretmen davet sayfasında eksiktir.

---

## 7. Kritik Bulgular ve İyileştirme Yol Haritası

| Öncelik | Kategori | Bulgu | Çözüm Önerisi |
| :---: | :--- | :--- | :--- |
| 🔴 **P1** | **Güvenlik** | Öğretmen, öğrencisinin başka derslerdeki tüm ödev ve sınavlarını görebiliyor. | `SchoolAccessRepository` sorgularına `AND h.course_id = @CourseId` ve `AND e.course_id = @CourseId` filtresi zorunlu kılınmalı. |
| 🔴 **P1** | **Güvenlik** | Derse öğretmen atanırken program sahipliği kontrol edilmiyor. | `CourseRepository` içinde öğretmenin o programda aktif olup olmadığı (`IsTeacherInProgramAsync`) doğrulanmalı. |
| 🔴 **P1** | **Mimari** | Öğretmeni bir programda pasife almak, öğretmeni tüm programlarda genel olarak siliyor. | `TeacherRepository.DeactivateTeacherAsync` içindeki `UPDATE teachers SET is_active = 0` kaldırılmalı; yalnızca `program_teachers` ve `courses` güncellenmeli. |
| 🔴 **P1** | **UX** | Derse öğrenci/grup eklerken elle UUID yazılıyor. | Öğrenci ve grup seçimi için arama destekli bir dropdown veya modal seçici eklenmeli. |
| 🟡 **P2** | **UX / UI** | Koç arayüzünde derse öğretmen atama ve izin değiştirme alanı yok. | `CoachCourseDetailPage` içine öğretmen seçici dropdown ve 10 izin için interaktif switch/kaydet arayüzü eklenmeli. |
| 🟡 **P2** | **Fonksiyonel** | Veliler çocuklarının sınav sonuçlarını göremiyor. | `/api/v1/parents/children/{studentId}/exams` ucu açılmalı ve `ParentLayout`'a "Sınavlar" sekmesi eklenmeli. |
| 🟡 **P2** | **UX / Veri** | Çok çocuklu velilerde haftalık programlar birbirine karışıyor. | Veli program ucu çocuk bazlı hale getirilmeli (`/parent/children/{id}/schedule`) ve arayüze çocuk seçici tab eklenmeli. |
| 🟢 **P3** | **Özellik** | Öğretmenler sınıfa/gruba toplu ödev atayamıyor. | `TeacherCreateHomeworkRequest` içine `CourseId` bazlı toplu atama desteği eklenmeli. |

---

# BÖLÜM 2: CLINE ANALİZ RAPORU
> **Analist:** Cline  
> **Tarih:** 16 Ekim 2026  
> **Kapsam:** Koç–Öğretmen–Öğrenci–Veli ilişkileri, yetki matrisi, veri erişimi, güvenlik ve kullanıcı deneyimi.  
> **Yöntem:** `docs/OKUL_MODELI.md` (hedef tasarım) ↔ `Backend/MentorumApi` (gerçek yetenek) ↔ `Frontend/src/features` (gerçek arayüz).

---

## 1. Genel Model

| Kavram | Modeldeki hedef | Kodda durum |
|---|---|---|
| Tenant birimi | Koçluk Programı (`coaching_programs`, `program_id`) | ✅ Uygulanmış |
| Roller | Admin, Koç (YÖNETİCİ/YARDIMCI), Öğretmen, Öğrenci, Veli | ✅ Uygulanmış |
| Öğrenci = 1 program | `students.program_id` | ✅ |
| Öğretmen = çok programlı | `program_teachers` | ✅ (çok programlı; ders sorgusu program filtrelemez) |
| Öğretmen çok dersli | `courses.teacher_id` | ✅ |
| Öğretmen öğrenci ekleyemez | yalnız koç ekler | ✅ |
| Veri izolasyonu | her istekte program üyeliği kontrolü | ⚠️ Kısmen (bkz. §7) |

---

## 2. Koç Yetenekleri

| Yetenek | Backend | Frontend | Değerlendirme |
|---|---|---|---|
| Öğrenci listele/detay | ✅ `/students` | ✅ | Tam |
| **Ödevlendirme** | ✅ `/homework/assignments` (koç, `AssignHomeworkAsync` IDOR korumalı) | ✅ `AssignHomeworkModal` | Tam |
| **Öğretmen davet et** | ✅ `/invites/send` (role=Teacher) | ✅ `CoachTeachersPage` | Tam |
| **Öğretmeni derse ata** | ✅ `CreateCourseRequest.TeacherId` + `PUT /courses/{id}` `teacher_id` | ❌ **YOK** — `CoachCoursesPage` ders oluştururken yalnız "Ad + Tür" istiyor; `CoachCourseDetailPage` içinde öğretmen seçme alanı yok | **Kritik UX eksik** |
| **Öğretmeni değiştir** | ✅ `UpdateCourseAsync` `teacher_id` | ❌ **YOK** | **Kritik UX eksik** |
| **Öğretmen izinlerini düzenle** | ✅ 10 izin bayrağı (create+update) | ⚠️ `CoachCourseDetailPage` "İzinler" sekmesi **salt okunur** (yalnız Açık/Kapalı gösterir) | **UX eksik** |
| **Öğretmeni pasife al** | ✅ `DELETE /teachers/{id}` (is_active=0 + dersleri öğretmensiz bırakır + bildirim) | ✅ "Pasife Al" | Tam |
| Ders/öğrenci/grup yönetimi | ✅ | ⚠️ Öğrenci/grup ekleme **elle UUID girilerek** | **Kötü UX** |
| Program CRUD + arşiv | ✅ | ✅ | Tam |
| Yardımcı koç yönetimi | ✅ `/programs/{id}/coaches` | ⚠️ kısmen | Kısmi |
| Rapor/PDF | ✅ QuestPDF | ✅ `CoachReports` | Tam |

**Sonuç:** Koçun ödevlendirme ve öğretmen davet etme yeteneği tam; ama **öğretmeni derse atama, değiştirme ve izinleri düzenleme arayüzü yok** — API destekliyor, UI desteklemiyor.

---

## 3. Öğretmen Yetenekleri

Öğretmen tarafı `RequireTeacherRole` ile korunuyor; `SchoolAccessRepository` erişimi `courses.teacher_id = @TeacherId` ile sınırlıyor.

| Yetenek | Endpoint | Koşul | Durum |
|---|---|---|---|
| Kendi derslerini gör | `GET /teacher/courses` | `teacher_id` eşleşmesi | ✅ |
| Ders öğrencilerini gör | `GET /teacher/courses/{id}/students` | `MaskStudent` ile | ✅ (maskeleme) |
| Ödevleri gör | `GET /teacher/courses/{id}/homework` | `CanViewHomework` | ✅ |
| Sınavları gör | `GET /teacher/courses/{id}/exams` | `CanViewExams` | ✅ |
| **Ödev ata** | `POST /teacher/courses/{id}/homework` | `CanManageHomework` + öğrenci derste olmalı | ✅ |
| **Sınav/not gir** | `POST /teacher/courses/{id}/exams` | `CanManageExams` + öğrenci derste | ✅ |
| Kendi profili | `GET /teacher/me` | — | ✅ |
| **Programı gör/yönet** | — | `CanViewSchedule`/`CanManageSchedule` bayrağı var | ❌ **Uç yok** |
| **Notları gör/ekle** | — | `CanViewNotes`/`CanAddNotes` bayrağı var | ❌ **Uç yok** |
| Öğrenci ekle/çıkar | — | (model: HAYIR) | ✅ doğru şekilde yasak |

**Varsayılan izinler** (`CreateCourseAsync`): Profili gör ✅, Ödevi gör/yönet ✅, Sınavı gör ✅, Programı gör ✅. **Kapalı varsayılanlar:** İletişim, Sınav yönet, Not gör/ekle, Program yönet.

**Önemli boşluklar:**
1. **`teacher_can_manage_schedule`, `teacher_can_view_schedule`, `teacher_can_view_notes`, `teacher_can_add_notes` bayrakları veritabanında var ama bunları kullanan öğretmen endpoint'i YOK.** (Modelde öğretmenin program/not yönetimi öngörülmüş; kodda ölü bayraklar.)
2. Öğretmen sınav yönetimi varsayılan **kapalı** — koçun bunu UI'dan açabilmesi gerekir ama izin düzenleme UI'ı yok (§2).

---

## 4. Veli Yetenekleri

| Yetenek | Endpoint | Güvenlik kontrolü | Durum |
|---|---|---|---|
| Çocukları listele | `GET /parents/my-children` | `is_accepted = 1` | ✅ |
| Çocuk profili | `GET /parents/children/{id}` | `parent_id AND student_id` | ⚠️ **`is_accepted=1` kontrolü EKSİK** |
| Çocuğun ödevleri | `GET /homework/children/{id}` | `is_accepted = 1` | ✅ |
| Çocuğun takvimi | `CalendarRepository` (Parent rolü) | `EXISTS student_parents is_accepted=1` | ✅ |
| Çocuğun programı | `GetParentSlotsAsync` | `is_accepted = 1` | ✅ |
| Diğer velilerin bilgisi | `children/{id}` içinde | Email/Phone `"GİZLİ"` olarak maskelenir | ✅ (maskeleme) |

**Güvenlik bulgusu (önemli):** `ParentEndpoints.cs` içinde `GET /parents/children/{studentId}` sorgusu `student_parents` eşleşmesinde `is_accepted = 1` koşulunu **içermiyor** (satır 42-44). Buna karşın `my-children` ve ödev ucu `is_accepted = 1` kullanıyor. Yani **daveti henüz kabul etmemiş (ya da ilişkisi kaldırılmış) bir veli**, çocuğun ID'sini biliyorsa profil uçlarından veri okuyabilir. Tutarlılık düzeltmesi gerekiyor.

---

## 5. Öğrenci Yetenekleri

| Yetenek | Durum |
|---|---|
| Profil, sınavlar, müfredat, hedef (GET/PUT), görüşmeler + hazırlık notu | ✅ |
| Ödevini tamamla (`/homework/.../complete`) | ✅ (yalnız kendi ödevi, `student_id = @UserId`) |
| Başkasının verisi | ❌ yasak (IDOR testleri ile doğrulanmış) |
| Ödev/sınav/not oluşturma | ❌ yasak (doğru) |

---

## 6. İlişki Yaşam Döngüsü (güvenlik açısından kritik senaryolar)

1. **Öğretmen pasife alınınca** → `DeactivateTeacherAsync`: `teachers.is_active=0`, `program_teachers.is_active=0`, **`courses.teacher_id = NULL`** (dersler öğretmensiz kalır) + koça bildirim. ✅ Öğretmen bu andan itibaren `GetCourseAccessAsync`'te `teacher_id` eşleşmediği için **hiçbir ders verisine erişemez**. ✅
2. **Öğrenci dersten çıkarılınca** → `RemoveStudentFromCourseAsync` (DELETE). Öğretmenin ödev/sınav/öğrenci sorguları "dersteki aktif öğrenciler" ile filtrelendiğinden, çıkarılan öğrenci öğretmenin listesinden düşer. ✅
3. **Öğrenci başka programa taşınırsa** → model "1 öğrenci = 1 program" der; kod `students.program_id` tek değer. ✅
4. **Öğretmen birden çok programda** → `program_teachers` destekler, ders sorgusu program ayırmaz. ✅ (ama `GetTeacherProgramIdAsync` `LIMIT 1` ile tek program döner — yardımcı bir metod, sınırlı)

---

## 7. Güvenlik Değerlendirmesi

**Güçlü yönler:**
- Öğretmen erişimi `courses.teacher_id` eşleşmesiyle **derse/öğretmene kilitlenmiş** (IDOR'a karşı sağlam).
- `MaskStudent` öğretmene yalnızca izin verilen alanları gösterir (iletişim → gizli; profil → gizli).
- Veliye diğer velilerin e-posta/telefonu `"GİZLİ"` olarak maskelenir.
- Öğretmen ödev/sınav oluştururken `öğrenci derste mi` + `izin var mı` çift kontrol.
- Koç ödevlendirmede `students.program_id IN (program_coaches)` sahiplik kontrolü.
- Cross-tenant / IDOR entegrasyon testleri mevcut (43/43 yeşil).

**Açıklar / tutarsızlıklar:**
1. **Veli `children/{id}` ucu `is_accepted` kontrolsüz** (§4) — tutarlılık düzeltmesi gerekli.
2. **Öğretmen izin bayraklarının yarısı (schedule, notes) ölü** — ne backend ucu ne UI var; güvenlik açığı değil ama model ile kod arası boşluk.
3. **Koçun izin/öğretmen düzenleme UI'ı yok** → pratikte koç, API'ye rağmen öğretmen atayamıyor/değiştiremiyor/izin veremiyor.
4. Merkezi erişim denetimi hâlâ dağınık (`IsMemberAsync` her repo'da ayrı; `ProgramAccessGuard` henüz yalnız ExamEndpoints'te) — kısmi teknik borç.

---

## 8. Kullanıcı Deneyimi (UX) Değerlendirmesi

**Sorunlu noktalar:**
1. **Ders oluşturma formu çok kısıtlı** (`CoachCoursesPage`): yalnız "Ders Adı + Tür". Öğretmen, müfredat dersi, renk, izinler hiç sorulmuyor.
2. **"İzinler" sekmesi salt okunur** — koç değiştiremiyor.
3. **Öğrenci/grup ekleme elle UUID girişi** (`CoachCourseDetailPage` "Öğrenci ID" placeholder "UUID") — dropdown/arama yok; kullanıcının UUID bilmesi gerçekçi değil.
4. Öğretmen "Derslerim" ekranı işlevsel ama basit; `canViewSchedule` gibi yetkiler görselleştirilmemiş.
5. Veli ekranları (Summary/Homework/Calendar/Schedule) mevcut; bazı alanlarda "ComingSoon" kalıntısı dokümanlarda geçiyor (doğrulamak gerekir).

**İyi noktalar:**
- Rol bazlı yönlendirme (`PrivateRoute allowedRoles`) ve layout'lar temiz ayrılmış.
- Öğretmen ödev/sınav formları yalnızca yetkisi varsa görünüyor (izin bayraklarına bağlı).

---

## 9. Model ↔ Kod Fark Tablosu (Özet)

| Model maddesi | Kod durumu |
|---|---|
| Öğretmen derse atanır, izin verilir | Backend ✅ / **UI ❌** |
| Öğretmen programı görür/yönetir | **Uç yok** (bayrak ölü) |
| Öğretmen not görür/ekler | **Uç yok** (bayrak ölü) |
| Öğretmen ödev + sınav girer | ✅ (sınav varsayılan kapalı) |
| Veli çocuğun kayıtlarını görür | ✅ (küçük is_accepted tutarsızlığı hariç) |
| Koç ödevlendirme | ✅ |
| Öğretmen öğrenci ekleyemez | ✅ |
| Öğretmen pasife alınınca erişim kesilir | ✅ |
| Öğretmen çok programlı | ✅ |
| Çakışma kontrolü sunucuda | ⚠️ doğrulanmadı |

---

## 10. Öncelikli Öneriler

1. **Koça öğretmen atama/izin arayüzü ekle** (ders oluşturma + detayda öğretmen dropdown + izin toggle'ları) — en büyük işlevsel boşluk.
2. **Veli `children/{id}` ucuna `is_accepted = 1` ekle** — küçük ama güvenlik tutarlılığı.
3. **Öğrenci/grup seçimini UUID yerine arama/dropdown yap** — büyük UX kazanımı.
4. **Ölü öğretmen izin bayraklarını ya uç+UI ile hayata geçir ya da modelden çıkar** (schedule/notes).
5. **Merkezi `ProgramAccessGuard`'ı diğer endpoint'lere yay** (şu an yalnız Exam).

---

# BÖLÜM 3: İKİ RAPORUN KARŞILAŞTIRMALI SENTEZİ VE ORTAK EYLEM LİSTESİ

Her iki yapay zekâ modelinin bağımsız analizleri karşılaştırıldığında, sistemin mevcut durumu hakkında tam bir fikir birliği bulunmakla birlikte modeller birbirini tamamlayan özgün kritik açıklar yakalamıştır:

### 1. Her İki Modelin Tam Fikir Birliğinde Olduğu Noktalar (Kesin Bulgular):
1. **Koç UI Eksikliği (Kritik):** Backend `CourseEndpoints` üzerinde öğretmen atama (`teacherId`) ve 10 adet izin bayrağı hazır olmasına rağmen, Frontend'de koçun öğretmen atayabileceği veya izinleri değiştirebileceği arayüz **tamamen eksiktir**.
2. **Korkunç UX (UUID Girişi):** `CoachCourseDetailPage` ekranında derse öğrenci ve grup eklemek için kullanıcıdan form alanına **elle 36 karakterlik GUID/UUID** yazması istenmektedir.
3. **Veli İzolasyon Eksiklikleri:** Velinin öğrenciye dair görmesi gereken temel verilerde (özellikle sınav sonuçları ve performans analizlerinde) eksikler vardır.
4. **Öğretmen Ödev Kısıtı:** Öğretmen sınıfa toplu ödev verememekte, sadece tek tek öğrenci seçerek ödev atayabilmektedir.

### 2. Antigravity Raporunun Yakaladığı Özgün Kritik Açıklar:
1. **Öğretmenler Arası Ödev/Sınav Veri Sızıntısı (P1 Güvenlik):**  
   `SchoolAccessRepository.GetTeacherCourseHomeworkAsync` ve `GetTeacherCourseExamsAsync` sorgularında `AND h.course_id = @CourseId` filtresi **unutulmuştur**. Bu nedenle örneğin Biyoloji öğretmeni, öğrencisinin Matematik, Fizik, Kimya vb. **diğer tüm derslerdeki ödev ve sınav netlerini de görebilmektedir**.
2. **Pasife Alma Mimari Hatası (P1 Mimari):**  
   `TeacherRepository.DeactivateTeacherAsync` metodu `UPDATE teachers SET is_active = 0` çalıştırarak öğretmeni **global** olarak devre dışı bırakmaktadır. Oysa model gereği öğretmen birden çok programda bağımsız çalışabilir; bu işlem öğretmeni diğer tüm koçluk programlarından da haksız yere koparmaktadır.
3. **Çok Çocuklu Veli Takvim Karışması (P1 UX / Veri):**  
   `ScheduleRepository.GetParentSlotsAsync` ve `ParentSchedulePage` sorgularında çocuk ayrımı yapılmadığı için, iki çocuğu olan velinin çocuklarının haftalık programı tek ekranda çorba gibi birleşmektedir.

### 3. Cline Raporunun Yakaladığı Özgün Kritik Açıklar:
1. **Veli Yetkisiz Profil Okuma Açığı (P1 Güvenlik):**  
   `ParentEndpoints.cs` içindeki `GET /parents/children/{studentId}` sorgusunda `student_parents` ilişkisi aranırken `AND is_accepted = 1` koşulu **unutulmuştur**. Daveti henüz kabul etmemiş veya ilişkisi silinmiş bir veli çocuğun profilini okuyabilmektedir.
2. **Ölü İzin Bayrakları (Dead Flags):**  
   `teacher_can_manage_schedule`, `teacher_can_view_schedule`, `teacher_can_view_notes`, `teacher_can_add_notes` bayrakları veri tabanında yer almasına rağmen bunları kullanan hiçbir backend endpoint'i yazılmamıştır.
3. **Tek Program Kısıtı (`LIMIT 1`):**  
   `SchoolAccessRepository.GetTeacherProgramIdAsync` metodunda `LIMIT 1` kullanılarak öğretmenin tek bir programı varmış gibi varsayılmıştır.

---

### 4. Ortak Eylem Listesi (Öncelik Sırasıyla)

| Öncelik | Kategori | Eylem | Kaynak |
|---|---|---|---|
| 🔴 P0 | Güvenlik | `GetTeacherCourseHomeworkAsync` + `GetTeacherCourseExamsAsync` sorgularına `AND h.course_id = @CourseId` / `AND e.course_id = @CourseId` ekle — öğretmen yalnızca kendi dersinin ödev/sınavını görsün. | Antigravity |
| 🔴 P0 | Güvenlik | `ParentEndpoints` `GET /parents/children/{studentId}` → `AND is_accepted = 1` ekle. | Cline |
| 🔴 P1 | Mimari | `DeactivateTeacherAsync` içindeki global `UPDATE teachers SET is_active = 0` kaldır; yalnızca `program_teachers` (ilgili program) kapatılsın. Öğretmen tüm programlardan düştüğünde `teachers.is_active` kapatılabilir. | Antigravity |
| 🟠 P1 | UX/Veri | `GetParentSlotsAsync`'e `studentId` parametresi ekle + veli arayüzüne çocuk seçici koy (çok çocuklu velinin programı karışmasın). | Antigravity |
| 🟠 P1 | UX | Derse öğrenci/grup eklerken elle UUID girişini arama destekli dropdown/modal'a çevir. | Ortak |
| 🟡 P2 | UI | Koça öğretmen atama + 10 izin düzenleme arayüzü (ders oluşturma + ders detayı). | Ortak |
| 🟡 P2 | Fonksiyon | Veliye sınav sonuçları ucu + sekmesi (`GET /parents/children/{id}/exams`). | Antigravity |
| 🟡 P2 | Fonksiyon | Öğretmenin derse/gruba toplu ödev ataması (yalnız tek tek öğrenci değil). | Ortak |
| 🟡 P2 | Temizlik | Ölü izin bayraklarını (schedule/notes) uç + UI ile hayata geçir ya da modelden çıkar. | Cline |
| 🟡 P2 | Temizlik | `GetTeacherProgramIdAsync`'de `LIMIT 1` yerine program listesi döndür. | Cline |
| 🟢 P3 | Altyapı | Merkezi `ProgramAccessGuard`'ı diğer endpoint'lere yay (şu an yalnız ExamEndpoints). | Cline |
