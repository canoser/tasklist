# 🏫 Mentörüm — V5 Okul/Dershane Modeli Tasarımı (V5_OKUL_MODELI.md)
> **Tarih:** 4 Ekim 2026
> **Durum:** ⏳ PLAN AŞAMASI — kodlanmadı, Sonnet/Opus onayına sunulacak.
> **Kapsam:** Koçu "müdür" konumuna getiren; **öğretmen, ders, öğrenci grubu, haftalık program (sürükle-bırak), ders kaynağı takibi** ve **kurulabilir (PWA) uygulama** genişletmesi.

---

## 0. Özet (Ne değişiyor?)

Mevcut model: **Koç → Öğrenci (+ Veli)**, tek katman.
Yeni model: **Koç (müdür) → Öğretmenler + Dersler + Öğrenci Grupları → Öğrenciler**.

| Kavram | Açıklama |
|---|---|
| **Öğretmen** | Koçun bünyesindeki yeni rol. Derslere atanır; yalnızca kendi dersindeki öğrencileri, koçun izin verdiği ölçüde görür/yönetir. |
| **Ders (Course)** | Koçun açtığı, bir müfredat dersine bağlı, öğretmenli veya öğretmensiz çalışma birimi. Öğrenciler tek tek veya grup olarak eklenir. |
| **Öğrenci Grubu** | Koçun öğrencileri grupladığı yapı (örn. "11-A TYT grubu"). Derslere ve programa topluca bağlanabilir. |
| **Haftalık Program** | Sürükle-bırak ile oluşturulan, haftalık tekrar eden ders/etkinlik takvimi. |
| **Ders Kaynakları** | Bir ders altında tanımlanan kitap sayfası, video serisi, soru seti. Öğrenci ilerlemesini işaretler, koç/öğretmen takip eder. |
| **Kurulabilir Uygulama** | Web uygulaması tablet/telefon/masaüstüne PWA olarak kurulabilir; Capacitor ile mağazaya da girebilir. |

> ⚠️ **Kural:** Mevcut "bir öğrenci = bir koç" varsayımı **değişmiyor**. Öğretmenler koçun ALTINDA çalışır; ayrı/bağımsız hesap değildir. Çok-koçlu senaryo hâlâ Faz 2.

---

## 1. Kavramsal Model

### 1.1 İlişkiler
```
Koç (Coach)
 ├── Öğretmenler (Teacher) ── 1:1 ──► bir koça bağlı
 ├── Öğrenciler (Student)
 ├── Öğrenci Grupları (Group) ── N:M ──► Öğrenciler
 └── Dersler (Course)
       ├── subject (müfredat dersi)
       ├── teacher (opsiyonel — yoksa öğrenci kendi çalışır)
       ├── öğrenciler (doğrudan: course_students)
       ├── gruplar (course_groups → grup üyeleri)
       ├── kaynaklar (kitap/video/soru)
       └── program satırları (schedule_slots)
```

### 1.2 Kritik Senaryolar
1. **Öğretmensiz ders:** Ders açılır, öğretmen atanmaz. Öğrenci kitap/video kaynaklarını işaretler; koç ilerlemeyi takip eder.
2. **Öğretmenli ders:** Koç derse öğretmen atar. Öğretmen kendi dersinin öğrencilerini (izin verildiği ölçüde) görür, ödev/sınav girebilir.
3. **Grup kullanımı:** "11-A TYT" grubu oluşturulur; gruba 20 öğrenci eklenir; grup tek seferde "Matematik" dersine ve haftalık programa bağlanır.
4. **Program:** Koç haftalık ızgaraya dersleri/grupları/öğrencileri sürükleyip bırakır; tüm paydaşlar kendi programını görür.

## 2. Roller ve Yetki Matrisi (GÜNCELLENDİ)

### 2.1 Roller
- **KOÇ:** Değişmedi + artık öğretmen, ders, grup ve programı da yönetir (müdür yetkisi).
- **ÖĞRETMEN:** Koç tarafından davet edilir. Yalnızca atandığı dersin öğrencilerini, koçun izin verdiği ölçüde görür/yönetir. Başka dersin/diğer öğrencinin verisini göremez.
- **ÖĞRENCİ:** Değişmedi + haftalık programı ve ders kaynaklarını görür, kendi ilerlemesini işaretler.
- **VELİ:** Değişmedi + çocuğunun haftalık programını salt-okunur görür.

### 2.2 Yetki Matrisi
Tam tablo `URUN_PLANI.md` §2.2'de güncellendi. Özet kural: Öğretmen yalnızca **kendi dersinin** öğrencilerini, **izin verilen alanlarda** görür.

### 2.3 Öğretmen İzinleri (ders bazında — `courses` üzerinde)
| İzin anahtarı | Varsayılan | Açıklama |
|---|---|---|
| view_profile | ✅ AÇIK | Öğrenci adı, sınıf, hedef |
| view_contact | ❌ KAPALI | Telefon/e-posta |
| view_homework | ✅ AÇIK | Dersin ödevlerini gör |
| manage_homework | ✅ AÇIK | Ödev ata/düzenle |
| view_exams | ✅ AÇIK | Sınav sonuçlarını gör |
| manage_exams | ❌ KAPALI | Sınav sonucu ekle |
| view_notes | ❌ KAPALI | Koç notlarını gör |
| add_notes | ❌ KAPALI | Kendi notunu ekle |
| view_schedule | ✅ AÇIK | Programı gör |
| manage_schedule | ❌ KAPALI | Programı düzenle |

> 🔒 İzinler backend'de her sorguda kontrol edilir; kapalı izin alanı response'tan tamamen çıkarılır (veri maskeleme), yalnızca 403 değil.
> 📌 İleride öğrenci bazında istisna gerekirse ayrı `course_student_overrides` tablosu eklenir (şimdilik ders bazında kolonlar yeterli).

---

## 3. Veri Modeli

### 3.1 Mevcut Tablolarda Değişiklik
| Tablo | Değişiklik |
|---|---|
| users.role | CHECK'e `'Teacher'` ekle |
| invite_tokens.role | CHECK'e `'Teacher'` ekle |
| notifications.type | Yeni tipler: `SCHEDULE_UPDATED`, `TEACHER_ASSIGNED`, `RESOURCE_ASSIGNED` |
| homework_assignments | `course_id` (NULL) + `created_by` (UUID) ekle — ders bazlı toplu atama + kim ekledi |
| exam_results | `created_by` (UUID) ekle — kim ekledi (koç/öğretmen) |

### 3.2 Yeni Tablolar

**teachers**
```
id UUID PK REFERENCES users(id) ON DELETE CASCADE
coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE
is_active INTEGER DEFAULT 1
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
```

**courses** (Dersler)
```
id UUID PK
coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE
subject_id UUID NULL REFERENCES subjects(id)      -- NULL = müfredat dışı ders (soru çözümü/deneme)
type TEXT NOT NULL DEFAULT 'DERS' CHECK(type IN ('DERS','SORU_COZUMU','DENEME','KITAP','VIDEO','DIGER'))
teacher_id UUID NULL REFERENCES users(id)     -- NULL = öğretmensiz ders; öğretmen aynı coach_id'ye ait olmalı (tenant doğrulama)
-- Öğretmen pasife alınınca: teacher_id = NULL + koça bildirim (yaşam döngüsü)
name TEXT NOT NULL
color TEXT
is_active INTEGER DEFAULT 1
-- Öğretmen izinleri (varsayılanlar §2.3 ile aynı)
teacher_can_view_profile INTEGER DEFAULT 1
teacher_can_view_contact INTEGER DEFAULT 0
teacher_can_view_homework INTEGER DEFAULT 1
teacher_can_manage_homework INTEGER DEFAULT 1
teacher_can_view_exams INTEGER DEFAULT 1
teacher_can_manage_exams INTEGER DEFAULT 0
teacher_can_view_notes INTEGER DEFAULT 0
teacher_can_add_notes INTEGER DEFAULT 0
teacher_can_view_schedule INTEGER DEFAULT 1
teacher_can_manage_schedule INTEGER DEFAULT 0
created_at ... , updated_at ...
```

**course_students** (derse doğrudan öğrenci)
```
id UUID PK
course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE
student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE
coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE
enrolled_at ..., is_active INTEGER DEFAULT 1
UNIQUE(course_id, student_id)
```

**student_groups** (öğrenci grupları)
```
id UUID PK
coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE
name TEXT NOT NULL, color TEXT, description TEXT
created_at ..., updated_at ...
```

**student_group_members**
```
id UUID PK
group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE
student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE
coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE
joined_at ...
UNIQUE(group_id, student_id)
```

**course_groups** (derse grup)
```
id UUID PK
course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE
group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE
coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE
created_at ...
UNIQUE(course_id, group_id)
```

**schedule_slots** (haftalık program)
> ⚠️ GÜNCELLEME (Sonnet): `teacher_id` ve `subject_id` saklanmaz (dersten türetilir). Tek hedef CHECK + `start_time < end_time` CHECK + `valid_from`/`valid_to` aşağıdaki satırlara eklendi.
```
id UUID PK
coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE
course_id UUID NULL REFERENCES courses(id) ON DELETE CASCADE
group_id UUID NULL REFERENCES student_groups(id) ON DELETE CASCADE
student_id UUID NULL REFERENCES students(id) ON DELETE CASCADE
teacher_id UUID NULL REFERENCES users(id)
subject_id UUID NULL REFERENCES subjects(id)
day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),  -- 1=Pzt .. 7=Paz
CHECK ((course_id IS NOT NULL)::int + (group_id IS NOT NULL)::int + (student_id IS NOT NULL)::int = 1),  -- tek hedef
CHECK (start_time < end_time)
start_time TIME NOT NULL
end_time TIME NOT NULL
title TEXT NOT NULL
type TEXT CHECK(type IN ('DERS','OZEL_DERS','DENEME','TEKRAR','SORU_COZUMU','SERBEST'))
valid_from DATE,            -- program başlangıcı (NULL = süresiz)
valid_to DATE,              -- program bitişi (NULL = süresiz); tatil/iptal istisnaları V5.1
color TEXT, is_active INTEGER DEFAULT 1
created_at ..., updated_at ...
```

**course_resources** (ders kaynakları: kitap/video/soru)
```
id UUID PK
course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE
coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE
title TEXT NOT NULL
type TEXT CHECK(type IN ('BOOK','VIDEO','QUESTION_SET','OTHER'))
resource_ref TEXT
sort_order INTEGER DEFAULT 0
created_at ..., updated_at ...
```

**course_resource_progress** (öğrenci ilerlemesi)
```
id UUID PK
course_resource_id UUID NOT NULL REFERENCES course_resources(id) ON DELETE CASCADE
student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE
coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE
progress SMALLINT CHECK(progress BETWEEN 0 AND 100)
is_done INTEGER DEFAULT 0
updated_at ...
UNIQUE(course_resource_id, student_id)
```

## 3.3 Etkin Öğrenci Kümesi (TEK KAYNAK)
Bir dersin öğrenci kümesi = `course_students` ∪ (`course_groups` → `student_group_members`), **DISTINCT** olarak hesaplanır.
- Öğrenci gruptan çıkarılınca dersten düşer; doğrudan (`course_students`) eklenmişse kalır.
- Öğretmen yetki kontrolleri, ders bazlı ödev/sınav/program yayılımı bu TEK kaynaktan (bir `view` veya `GetCourseStudentIds(courseId)` repository metodu) okunur.

---

## 4. API Tasarımı (yeni endpoint'ler)

Tümü `/api/v1` altında. Her sorguda **ownership** (coach_id) filtresi zorunlu; öğretmen uçlarında **teacher_id + izin** kontrolü.

### 4.1 Teachers (Koç)
```
GET    /teachers                 → koçun öğretmen listesi
POST   /teachers/invite          → { email } öğretmen davet (role=Teacher)
GET    /teachers/:id             → öğretmen + atandığı dersler
PUT    /teachers/:id             → güncelle
DELETE /teachers/:id             → pasife al
```

### 4.2 Courses (Koç)
```
GET    /courses                  → ders listesi (öğretmen adı + öğrenci sayısı)
POST   /courses                  → { subjectId, teacherId?, name, color, permissions }
GET    /courses/:id              → detay (öğrenciler, gruplar, kaynaklar, program, izinler)
PUT    /courses/:id              → güncelle (öğretmen ata/değiştir, izinleri değiştir)
DELETE /courses/:id              → pasife al
POST   /courses/:id/students     → { studentIds[] }
DELETE /courses/:id/students/:studentId
POST   /courses/:id/groups       → { groupIds[] }
DELETE /courses/:id/groups/:groupId
```

### 4.3 Groups (Koç)
```
GET    /groups                   → grup listesi
POST   /groups                   → { name, color, description }
GET    /groups/:id               → üyeler
PUT    /groups/:id
DELETE /groups/:id
POST   /groups/:id/students      → { studentIds[] }
DELETE /groups/:id/students/:studentId
```

### 4.4 Schedule (haftalık program)
```
GET    /schedule                 → koçun programı
POST   /schedule                 → { dayOfWeek, startTime, endTime, title, type, courseId?, groupId?, studentId?, teacherId? }
PUT    /schedule/:id
DELETE /schedule/:id
GET    /me/schedule              → Öğretmen: kendi dersleri; Öğrenci: kendi programı
GET    /me/children/:id/schedule → Veli: çocuğunun programı
```

### 4.5 Ders Kaynakları ve İlerleme
```
GET    /courses/:id/resources           → ders kaynakları
POST   /courses/:id/resources           → { title, type, resourceRef, sortOrder }
PUT    /resources/:id
DELETE /resources/:id
GET    /courses/:id/resources/progress  → öğrenci bazlı ilerleme (koç/öğretmen)
PUT    /me/resources/:resourceId/progress → Öğrenci kendi ilerlemesi { progress, isDone }
```

### 4.6 Öğretmen Uçları (Teacher rolü)
```
GET    /me/courses                        → atandığı dersler
GET    /me/courses/:id/students           → izin verilen öğrenciler (view_profile gerekli)
GET    /me/courses/:id/students/:sid      → izin verilen alanlar (maskeleme)
GET    /me/courses/:id/homework           → view_homework izni
POST   /me/courses/:id/homework           → manage_homework izni
GET    /me/courses/:id/exams              → view_exams izni
POST   /me/courses/:id/exams              → manage_exams izni
```

### 4.7 Güvenlik Kuralları (ZORUNLU)
1. Her yeni tablo sorgusu `coach_id = @CoachId` (BaseRepository) içerir.
2. Öğretmen uçları: önce `course.teacher_id == @TeacherId` doğrulanır, sonra ilgili izin bayrağı kontrol edilir. İzin kapalıysa o alan DTO'dan çıkarılır (maskeleme).
3. Öğrenci yalnızca kendi `student_id`; veli yalnızca bağlı çocuğu.
4. `INSERT INTO ... SELECT ... WHERE ... coach_id=@CoachId` kalıbı yeni ekleme endpoint'lerinde de kullanılır.
5. **Tenant doğrulama:** Ders/grup/program oluştururken öğretmen, öğrenci ve grup aynı `coach_id`'ye ait olmalı. Ayrı test senaryosu yazılır.
6. **Öğretmen sızıntı koruması:** Öğretmen ödev/sınav/not uçları her zaman `course_id` ile filtrelenir — `manage_homework` açık olsa bile başka dersin ödevini göremez.
7. **Idempotency:** POST uçları (ders oluşturma, öğretmen daveti, grup oluşturma) `Idempotency-Key` + ActionFilter ile korunur (AGENTS.md kuralı).

---

## 5. UI / Navigasyon

### 5.1 Koç (sidebar'a eklenenler)
```
🧑‍🏫 ÖĞRETMENLER   → liste + davet + öğretmen profili (atanan dersler)
📚 DERSLER        → liste + yeni ders + ders detayı (öğrenciler/gruplar/öğretmen/kaynaklar/izinler)
👥 GRUPLAR        → liste + yeni grup + üye yönetimi
🗓️ HAFTALIK PROGRAM → sürükle-bırak ızgara (Pzt-Paz, saat satırları)
```

### 5.2 Öğretmen (YENİ TeacherLayout — mobil öncelik)
```
[🏠] DERSLERİM      → atandığı dersler (öğrenci sayısı, program)
[👥] ÖĞRENCİLERİM   → izin verilen öğrenciler (derse göre)
[📋] ÖDEVLER        → view/manage_homework iznine göre
[🗓️] PROGRAM        → kendi derslerinin programı
[👤] PROFİL
```

### 5.3 Öğrenci (eklenenler)
- [🗓️] **PROGRAMIM** → haftalık program görünümü (yeni sekme)
- [📚] **DERSLERİM** → her dersin kaynakları + ilerleme çubuğu (kitap/video/soru)
- Kaynak ilerlemesini "ilerlet / tamamla" ile günceller.

### 5.4 Veli (eklenenler)
- [🗓️] **TAKVİM/PROGRAM** → çocuğunun haftalık programı (salt-okunur)

## 6. Haftalık Program (sürükle-bırak) Detayı
- Izgara: satırlar = saat dilimleri (örn. 08:00–22:00), sütunlar = 7 gün.
- Koç, sol panelden **ders/öğretmen/grup/öğrenci** kartını ızgaraya sürükler.
- Her kart = bir `schedule_slot` (dayOfWeek + start/end + bağlı varlık + type + renk).
- Çakışma kontrolü: aynı öğrenci/öğretmen için aynı gün-saat çakışması → uyarı (MVP'de engelleme değil).
- Sürükle-bırak kütüphanesi: **dnd-kit** (hafif, mobil dostu; mevcut React yığına uyumlu).
- Kaydet → `POST/PUT /schedule`. Tüm paydaşlar kendi filtrelenmiş programını görür.

## 7. Kurulabilir Uygulama (PWA + Capacitor)
- **PWA (hemen):** `manifest.webmanifest` + service worker + `display: standalone` → tablet/telefon/masaüstüne "Ana ekrana ekle / Yükle". Web'den kontrol edilebilir kalır.
- **Capacitor (mağaza):** mevcut Faz 2 planı (Aşama 25-26) — Android/iOS paketleme.
- Google ile giriş **zaten mevcut** (`/auth/google` + `GoogleAuthService`) — öğretmen davet akışına da bağlanacak.

## 8. Kararlar (✅ Sonnet ile KARARA BAĞLANDI — 4 Ekim 2026)

| # | Karar | Sonuç |
|---|---|---|
| 1 | `courses.subject_id` zorunlu mu? | **NULLABLE** + `courses.type` alanı (DERS/SORU_COZUMU/DENEME/KITAP/VIDEO/DIGER) |
| 2 | `student_subjects` ↔ `courses` | Koru; öğrenci derse eklenince satır otomatik (idempotent) açılır; ödev `course_id` ile derse bağlanır |
| 3 | İzin modeli | Ayrı kolonlar; ileride öğrenci bazında istisna → `course_student_overrides` tablosu |
| 4 | Öğretmen çok dersli mi? | EVET |
| 5 | Öğretmen öğrenci ekleyebilir mi? | HAYIR |
| 6 | Çakışma kontrolü | Uyarı yeterli + hesaplama **sunucuda** |
| 7 | Grup | Ayrı varlık |

### Sonnet incelemesinin eklediği kritik düzeltmeler
- **Etkin öğrenci kümesi** tekilleştirilmiş union olarak tanımlandı (§3.3).
- **schedule_slots**: tek hedef CHECK + `start_time < end_time` CHECK + `valid_from`/`valid_to`; `teacher_id`/`subject_id` dersten türetilir (saklanmaz).
- **Öğretmen sızıntı koruması**: ödev/sınav/not uçları `course_id` ile filtrelenir; `created_by` eklendi.
- **Tenant doğrulama**: öğretmen/öğrenci/grup aynı `coach_id`'ye ait olmalı + ayrı test.
- **Öğretmen yaşam döngüsü**: pasife alınınca `teacher_id = NULL` + koça bildirim.
- **course_resources** V4'teki benzer özellikle çakışmasın diye kodlamadan önce kontrol edilecek.
- **Proje kuralları**: i18n altyapısı (dil ve ton sonradan eklenebilecek şekilde hazır; şimdilik içerik yalnızca resmi Türkçe `tr` — bkz. `.agents/rules/i18n_guidelines.md`), CSS Modules, PORTABILITY.md + `[MOBILE_PORT_TODO]`, POST idempotency, PWA riskleri (service worker kimlikli yanıtları cache'lemez; iOS'ta Google redirect; Capacitor'da native plugin), dnd-kit dokunmatik sensör + form alternatifi.

### Orijinal sorular (tarihsel kayıt — yukarıda karara bağlandı)
1. **Ders↔Konu ilişkisi:** `courses.subject_id` zorunlu mu, yoksa "Genel/Soru Çözümü" gibi ders dışı kursa izin mi? (Öneri: zorunlu; ders dışı için `type` alanı.)
2. **student_subjects ile courses ilişkisi:** `student_subjects` korunacak mı? Homework `student_subject_id` FK'sı ne olacak? (Öneri: koru + `course_id` bağla; derse öğrenci eklenince otomatik `student_subjects` satırı aç.)
3. **İzin modeli:** ayrı kolonlar mı, JSONB mi? (Öneri: ayrı kolonlar — Dapper/SQL ile en basit.)
4. **Öğretmen çok dersli mi?** Bir öğretmen birden çok derse atanabilir mi? (Öneri: EVET — `courses.teacher_id` çoka-bir, kısıt yok.)
5. **Öğretmen kendi öğrencisini ekleyebilir mi?** (Öneri: HAYIR — yalnızca koç ekler; öğretmen görür/yönetir.)
6. **Program çakışma kontrolü** MVP'de zorunlu mu? (Öneri: uyarı yeterli, engelleme yok.)
7. **Grup = ayrı varlık mı, yoksa dersin alt etiketi mi?** (Öneri: ayrı varlık — derslerden bağımsız, yeniden kullanılabilir.)



