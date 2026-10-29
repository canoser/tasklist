# 🧭 Mentörüm — V14 Görev Listesi (Canlı Hata Düzeltmeleri: Grup / Öğretmen / Depolama / Öğrenci Düzenleme)

> **Tarih:** 22 Ekim 2026 · **Uygulayıcı:** DeepSeek - Cline · **İnceleyen & Ek Çözümler:** Gemini (Antigravity)
> **Amaç:** Canlı ortamda (`mentorum.dersmatris.com`) konsol loglarından doğrulanan kritik hataları düzeltmek; koç panelindeki grup üye yönetimi, öğretmen kartı, dosya yükleme ve öğrenci düzenleme akışlarını onarmak.
> **Sıralama:** Backend (SQL + exception/CORS) → Frontend → Test.
> **Kaynak:** `docs/console/*.txt` konsol logları + satır satır kod incelemesi.
> **Görev Durum Kuralı:** Henüz bitmemiş maddeler `[ ]`, bitmiş maddeler `[x]`.

---

## 0. Kod İnceleme Bulguları (doğrulanmış hatalar)

- ❌ **D1 — Öğretmen kartı crash:** `CoachTeachersPage.jsx:64` içinde `navigate(...)` kullanılıyor ama dosyada `useNavigate` import'u ve `const navigate = useNavigate()` YOK → kart tıklamasında `Uncaught ReferenceError: navigate is not defined`. **(Kaynak: V13.4 T33)**
- ❌ **D2 — Grup üye listesi SQL hatası:** `GroupRepository.GetGroupMembersAsync` `SELECT s.full_name, s.email` yapıyor; ama `full_name`/`email` kolonları `students`'ta değil, `users`'ta. → 500 → tarayıcı bunu CORS hatası olarak gösteriyor. **(Kaynak: V13 B4)**
- ❌ **D3 — Grup üye sayısı yanlış:** `GetGroupsAsync`/`GetGroupAsync` içindeki `MemberCount`, `student_group_members.is_active` filtrelemiyor → soft-delete üyeler hâlâ sayılıyor ("Üye: 3" ama içi boş). **(Kaynak: V13 B4)**
- ❌ **D4 — Dosya yükleme 500:** `R2StorageService` kurucusu `R2_*` env yoksa `throw` ediyor; `/uploads/url` DI sırasında patlıyor → 500 + CORS yok → "network error". **(Kaynak: V11 R2)**
- ❌ **D5 — Öğretmen "Aktif Öğrenci" sayısı yanlış:** `TeacherRepository.GetTeachersAsync` studentCount sorgusunda `student_group_members` JOIN'inde `is_active = 1` filtresi YOK → inaktif grup üyeleri de sayılıyor. **(Kaynak: V13.4 T33)**
- ❌ **D6 — Gruba taşıyınca üye sayısı güncellenmiyor:** `studentFlexibilityApi.useMoveToGroup/useMoveToIndividual` onSuccess yalnızca `['coach','students']` invalidate ediyor; grup listesi/üye sayısı yenilenmiyor. **(Kaynak: V13 B3/B4)**
- ❌ **D7 — Öğrenci "Düzenle" çalışmıyor:** `CoachStudentDetail.jsx` içindeki "Düzenle" butonları `onClick`'siz; backend'de öğrenci güncelleme endpoint'i ve frontend'de `EditStudentModal`/`useUpdateStudent` YOK. **(Kaynak: V13.2)**
- ⚠️ **D8 — 403 gürültüsü:** Konsolda `/teacher/courses` ve `/student/courses` 403 tekrarları var (koç oturumundan teacher/student ucu çağrılıyor). Düşük öncelik.

---

## 1. Backend Düzeltmeleri

### [x] B1 — Grup üye listesi SQL düzelt (D2)
- **Dosya:** `Backend/MentorumApi/Data/GroupRepository.cs` → `GetGroupMembersAsync`
- **Yap:** `students` yerine `users` JOIN kullan:
  ```sql
  SELECT m.student_id AS Id, u.full_name AS FullName, u.email AS Email, s.grade AS Grade
  FROM student_group_members m
  JOIN users u ON u.id = m.student_id
  JOIN students s ON s.id = m.student_id
  WHERE m.group_id = @GroupId AND m.program_id = @ProgramId
  ORDER BY u.full_name
  ```
- **Kabul:** Grup detayı açılınca üyeler listelenir; 500/CORS hatası yok.
- 🔍 **Gemini Notu / Kritik Düzeltme:**
  1. Yukarıdaki SQL'e mutlaka **`AND m.is_active = 1`** filtresi eklenmelidir! V13'te bireysele çekilen/çıkarılan öğrenciler `is_active = 0` yapıldığı için, bu filtre olmazsa silinen/çıkarılan üyeler grupta görünmeye devam eder.
  2. Ayrıca `GroupRepository.AddMemberAsync` metodundaki `ON CONFLICT (group_id, student_id) DO NOTHING`, **`DO UPDATE SET is_active = 1`** olarak güncellenmelidir. Aksi takdirde önceden gruptan çıkarılmış (`is_active = 0`) bir öğrenci tekrar eklendiğinde `is_active` 0 kalır ve üye listeye/sayıma yansımaz.

### [x] B2 — Grup üye sayısını `is_active` ile filtrele (D3)
- **Dosya:** `GroupRepository.cs` `GetGroupsAsync` (satır 26) ve `GetGroupAsync` (satır 38).
- **Yap:** `(SELECT COUNT(1) FROM student_group_members m WHERE m.group_id = g.id AND m.is_active = 1) AS MemberCount`
- **Kabul:** "Üye" sayısı yalnızca aktif üyeleri gösterir.
- 🔍 **Gemini Notu:** B1'deki `AddMemberAsync` conflict güncellemesi (`DO UPDATE SET is_active = 1`) yapılmadan bu filtre tek başına yetersiz kalır; tekrar eklenen üyelerin sayısı artmaz.

### [x] B3 — Öğretmen aktif öğrenci sayısı filtresi (D5)
- **Dosya:** `TeacherRepository.cs` `GetTeachersAsync` (satır 44-48).
- **Yap:** `JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1`
- **Kabul:** Öğretmen kartındaki "Aktif Öğrenci" doğru sayıyı gösterir.

### [x] B4 — Dosya yükleme: R2 yapılandırma + graceful hata (D4)
- **Dosya:** `Services/Storage/R2StorageService.cs` + `Endpoints/StorageEndpoints.cs`.
- **Yap:** (a) Fly.io'ya `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT_URL`, `R2_BUCKET_NAME` secret'larını ekle (üretim). (b) R2 yapılandırılmamışsa ctor'da throw yerine kontrollü devreye alma; endpoint 500 yerine okunur `503/400` JSON dönsün.
- **Kabul:** Dosya yükleme üretimde çalışır; env eksikse açık hata mesajı görünür.
- 🔍 **Gemini Notu / Ek Çözüm:**
  1. `IStorageService` arayüzüne `bool IsConfigured { get; }` özelliği eklenmeli; `R2StorageService` env değişkenleri eksik olduğunda patlamak yerine `IsConfigured = false` dönmeli.
  2. `StorageEndpoints.cs` (`POST /api/v1/uploads/url`) içinde `storage.GenerateUploadUrl` çağrısı try-catch bloğuna alınmalı; Cloudflare/AWS SDK istisnaları yakalanarak 500 yerine anlamlı bir hata mesajı (503/400) ve standart CORS başlığı döndürülmelidir.

### [x] B5 — Global exception handler (CORS'lu 500) (D2/D4 kök neden)
- **Dosya:** `Program.cs`.
- **Yap:** `app.UseExceptionHandler` ekle; yakalanmayan exception'larda JSON (`{ error: "Sunucu hatası" }`) + CORS header dön. Böylece gelecekteki 500'ler tarayıcıda "CORS/network error" olarak maskelenmez.
- **Kabul:** Herhangi bir 500, CORS bloğu yerine okunur hata mesajı döner.

### [x] B6 — Öğrenci güncelleme endpoint'i (D7)
- **Dosya:** `StudentRepository.cs` (+ DTO) + `StudentFlexibilityEndpoints.cs`.
- **Yap:** `UpdateStudentAsync(programId, studentId, req)` (ad, sınıf, alan/track, hedef sınav) + `PUT /api/v1/students/{studentId}` (IDOR: `ProgramAccessGuard.EnsureCoachOwnsStudentAsync`).
- **Kabul:** Koç öğrencinin sınıf/alan/hedef bilgisini güncelleyebilir.
- 🔍 **Gemini Notu / Veri Bütünlüğü:** Öğrencinin Ad Soyad bilgisi `users.full_name`, sınıf ve alan bilgisi ise `students` tablosundadır (`grade`, `track` — ayrı bir `target_exam` kolonu YOK, sınav tipi `track`'te tutulur). Bu güncelleme işlemi **`using var tx = conn.BeginTransaction()`** içinde çift tablolu atomik işlem olarak çalışmalıdır.

---

## 2. Frontend Düzeltmeleri

### [x] F1 — Öğretmen kartına `useNavigate` ekle (D1)
- **Dosya:** `Frontend/src/features/coach/teachers/CoachTeachersPage.jsx`.
- **Yap:** `import { useNavigate } from 'react-router-dom';` + `const navigate = useNavigate();`
- **Kabul:** Öğretmen kartına tıklayınca detay sayfası açılır.

### [x] F2 — Gruba taşıyınca grup sorgularını invalidate et (D6)
- **Dosya:** `Frontend/src/features/coach/studentFlexibilityApi.js`.
- **Yap:** `useMoveToGroup`/`useMoveToIndividual` onSuccess'te grup listesi (`useGroups` query key) ve grup üye sorgusunu (`['coach','program',...,'group',...,'members']`) da invalidate et.
- **Kabul:** Öğrenci gruba alınıp çıkarılınca grup "Üye" sayısı anında güncellenir.
- 🔍 **Gemini Notu / Kritik Eksik:** Sadece grup listesi değil, **öğrencinin kendi detay sorgusu** olan `['coach', 'student', studentId]` da mutlaka invalidate edilmelidir! Aksi takdirde öğrenci detay sayfasındaki grup rozeti ve bilgileri eski kalır.

### [x] F3 — Öğrenci düzenleme modalı (D7)
- **Dosya:** `CoachStudentDetail.jsx` + yeni `EditStudentModal.jsx` + `studentFlexibilityApi` içinde `useUpdateStudent`.
- **Yap:** "Düzenle" butonlarına `onClick` bağla; modal sınıf/alan/hedef düzenler ve B6 endpoint'ine PUT atar.
- **Kabul:** Öğrenci bilgileri düzenlenebilir.
- 🔍 **Gemini Notu:** `CoachStudentDetail.jsx` satır 165'teki ana profil "Düzenle" butonuna tıklandığında `EditStudentModal` açılarak Ad, Soyad, Sınıf, Alan ve Hedef Sınav düzenlenmelidir. Başarılı güncelleme sonrası `['coach', 'student', studentId]` ve `['coach', 'students']` query'leri invalidate edilmelidir.

---

## 3. Test & Doğrulama
- [x] `dotnet build` (0 hata, 7 uyarı — mevcut nullable/CS0108, V14 ile ilgisiz).
- [x] `dotnet test` (Docker açıkken 67/67 başarılı).
- [x] `npm run build` (0 hata ile başarılı).

> 🔍 **Test doğrulaması sırasında eklenen 2 düzeltme (DeepSeek - Cline):**
> 1. `V11StorageTests.cs` → `FakeStorageService`'e B4'te eklenen `IsConfigured => true` eklendi (test derleme hatası CS0535 giderildi).
> 2. `024_cleanup_and_seed_test_ecosystem.sql` → `canoser@gmail.com` yoksa `RAISE EXCEPTION` yerine `RETURN` (idempotent atlama); temiz test DB'sinde fixture patlaması giderildi.
- [ ] Manuel: grup detayında üyeler görünür; öğrenciyi gruba alınca sayı artar; öğretmen kartına tıklayınca detay açılır; dosya yükleme çalışır; öğrenci düzenlenir.

---

## 4. V12 / V13 İlişkisi
| Hata | Kaynak Sürüm | Açıklama |
|---|---|---|
| D1, D5 | V13.4 (T33) | Öğretmen detayı/kartı eklendi; `useNavigate` ve `is_active` filtresi atlandı |
| D2, D3, D6 | V13 (B3/B4) | Bireysel↔grup geçişi; üye sorgusu yanlış tablo + soft-delete sayımı + invalidate eksik |
| D4 | V11 | R2 depolama; üretimde env yoksa kurucu throw |
| D7 | V13.2 | Öğrenci ekleme yeniden yazıldı; düzenleme hiç eklenmedi |
| — | V12 | İlgisiz (V12 öğrenci mobil UX) |

---

## 5. DeepSeek Cline İnceleme Notları (kodlama öncesi kritik detaylar)

> Gemini kodlarken aşağıdaki ek detaylara dikkat etmeli. (Satır numaraları ve mevcut kod davranışı doğrulanmıştır.)

### B1 ile ilgili ek notlar
1. `GroupMemberDto` alanları: `Id` (öğrenci id), `FullName`, `Email`, `Grade`. SQL'de `m.student_id AS Id` doğru; frontend üye silmede `m.id`'yi öğrenci id olarak kullanıyor (`CoachGroupsPage.jsx:104`).
2. **Soft-delete (`is_active=0`) satırlarını oluşturan yer `StudentRepository.MoveToIndividualAsync`'tir** (öğrenci detayındaki "Bireysele Çek"), `GroupRepository.RemoveMemberAsync` değil. `RemoveMemberAsync` şu an **HARD DELETE** yapıyor (`DELETE FROM student_group_members`). Yani `is_active=0` satırları yalnızca "bireysele çek" akışından gelir → B1/B2'deki `is_active=1` filtresi tam da bunu çözer.
3. Tutarlılık (opsiyonel, ayrı iş): `RemoveMemberAsync` ve `DeleteGroupAsync` de hard-delete; proje kuralı "hard-delete yok" olduğu için bunlar da soft-delete'e çevrilebilir. V14 kapsamına girmiyor.

### B4 ile ilgili ek notlar
1. `IStorageService`'in DI kaydı `Program.cs`'te yapılıyor. `IsConfigured=false` senaryosunda `_s3Client` **null** olacak; `GenerateUploadUrl`, `GenerateDownloadUrl`, `DeleteFileAsync`, `GetObjectInfoAsync` metodları null-guard içermeli (ya da `IsConfigured` false iken anlamlı exception fırlatmalı).
2. `GenerateUploadUrl` **senkron** metot; endpoint'te `storage.IsConfigured` kontrolü + try-catch ile SDK istisnalarını yakala.

### B5 ile ilgili ek notlar (sıra kritik)
1. `app.UseExceptionHandler(...)`'ı **`app.UseCors(...)`'tan SONRA** ekle. Aksi halde exception handler CORS middleware'inden önce çalışırsa, 500 yanıtlarına CORS header eklenmez ve "network error" devam eder.
2. Handler içinde JSON dön:
   ```csharp
   app.UseExceptionHandler(err => err.Run(async context => {
       context.Response.StatusCode = 500;
       context.Response.ContentType = "application/json";
       await context.Response.WriteAsync("{\"error\":\"Sunucu hatası\"}");
   }));
   ```

### B6 ile ilgili ek notlar
1. `students` tablosunda ayrı `target_exam` kolonu YOK; sınav tipi **`track`** kolonunda tutulur. Update şöyle olmalı:
   - `users.full_name = FirstName + " " + LastName`
   - `students.grade = ClassLevel`
   - `students.track = NormalizeTrack(TargetExam)` (mevcut `CreateStudentAsync` içindeki `NormalizeTrack` yardımcısını yeniden kullan).
2. DTO: `UpdateStudentRequest { FirstName, LastName, ClassLevel?, TargetExam? }` (null gelen alan güncellenmez).
3. İki tablo güncellendiği için `conn.Open()` + `using var tx = conn.BeginTransaction()` zorunlu (mevcut `CreateStudentAsync` kalıbı).

### F2 ile ilgili ek notlar (kesin query key'leri)
Kesin React Query key'leri:
- Öğrenci listesi: `['coach','students']`
- Grup listesi: `['coach','program', programId, 'groups']`
- Grup üyeleri: `['coach','program', programId, 'group', groupId, 'members']`
- Öğrenci detayı: `['coach','student', studentId]` (useStudent hook'unu kontrol et)

`useMoveToGroup` onSuccess ikinci parametresi (`variables`) = `{ studentId, groupId }`; `useMoveToIndividual`'da ise `variables` = `studentId` (string). Buna göre:
```js
onSuccess: (_, v) => {
  qc.invalidateQueries({ queryKey: ['coach','students'] });
  qc.invalidateQueries({ queryKey: ['coach','program', programId, 'groups'] });
  qc.invalidateQueries({ queryKey: ['coach','program', programId, 'group'] }); // üye sorguları (partial)
  qc.invalidateQueries({ queryKey: ['coach','student', v.studentId ?? v] });
}
```

### F3 ile ilgili ek notlar
1. İki "Düzenle" butonu var: header'da (satır ~165) ve bilgi sekmesinde (satır ~389). İkisini de aynı `setIsEditOpen(true)`'e bağla.
2. `fullName` → FirstName/LastName ayrımı: ilk boşluktan böl (`const [fn, ...rest] = fullName.split(' '); const ln = rest.join(' ')`).
3. Hedef sınav select'i için `AddStudentModal.jsx`'teki SAY/EA/SOZ/ORTAOKUL listesini kullan; `track` değerini bununla eşleştir.

### D8 (403 gürültüsü) notu
- 403'ler beklenen rol uyuşmazlığıdır (koç oturumundan `/teacher/courses` ve `/student/courses` çağrılıyor; muhtemelen paylaşılan bir bileşen veya View-As). Acil değil; kodlama sırasında kimin çağırdığına bakılabilir.

