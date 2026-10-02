# 🚀 Mentörüm — V3 (Üçüncü İterasyon) Görev Listesi
> **Tarih:** 24 Eylül 2026
> Bu liste, MVP'nin birinci ve ikinci fazlarındaki eksiklerin (Takvim, Raporlar, Bildirimler, Veli/Öğrenci arayüzleri) tamamlanması için hazırlanmıştır. Planlama aşamasında güvenlik (IDOR) ve performans özeleştirileri yapılarak riskler önceden bertaraf edilmiştir.

## Aşama 12.5: Kritik API ve Veri Senkronizasyonu Düzeltmeleri (Öncelikli)
**Risk Analizi:** Frontend API çağrıları ile Backend endpoint'leri arasında ciddi uyuşmazlıklar var. Bu düzeltilmezse tüm özellikler 404 veya 400 hatası verecektir.
- [x] **Frontend (Notlar):** `coachApi.js` içindeki `useUpdateCoachNotes` mutasyonu `PUT /students/:id/coach-notes` yerine backend'e uygun olarak `POST /students/:id/notes` şekline çevrilmelidir.
- [x] **Frontend (Ödev):** `coachApi.js` içindeki ödev atama mutasyonu `POST /homework/assign` yerine backend'e uygun olarak `POST /homework/assignments` şekline çevrilmelidir.
- [x] **Frontend (Sınav):** `coachApi.js` içindeki sınav ekleme mutasyonu `POST /students/:id/exam-results` yerine backend'e uygun olarak `POST /exams` şekline çevrilmeli ve `studentId` body içerisine taşınmalıdır.
- [x] **Frontend (Not Listesi):** `StudentDetailDto` modelini şişirmek yerine, mevcut olan `GET /students/:id/notes` endpoint'i için `useStudentNotes` kancası yazılarak `CoachStudentDetail.jsx` içerisindeki koç notları alanının gerçek verilerle dolması sağlanmalıdır.

## Aşama 13: Takvim (Calendar) API ve Gelişmiş İzolasyon
**Risk Analizi:** Takvim verisi tüm ödevleri ve sınavları içerir. Koçlar tüm öğrencilerini, öğrenciler sadece kendini, veliler sadece çocuklarını görmelidir. Parametre manipülasyonu ile başka öğrencinin verisi sızabilir.
- [x] **Backend (Coach):** `GET /api/v1/calendar` endpoint'inin yazılması. *GÜVENLİK KURALI:* `BaseRepository` kullanılarak `coach_id = @CoachId` filtresi doğrudan sorguya dahil edilmelidir. *PERFORMANS KURALI:* Frontend'den gelen `from` ve `to` query parametreleri mutlaka Dapper SQL sorgusuna eklenmeli (`due_date BETWEEN @From AND @To`), tüm veritabanı belleğe çekilmemelidir.
- [x] **Backend (Student):** `GET /api/v1/me/calendar` endpoint'inin yazılması. *GÜVENLİK KURALI:* İstek yapan kullanıcının kendi ID'si üzerinden sorgu yapılmalıdır.
- [x] **Backend (Parent):** `GET /api/v1/me/children/{id}/calendar` endpoint'inin yazılması. *GÜVENLİK KURALI:* Velinin bu çocukla bağlantılı olduğu `student_parents` tablosundan (is_accepted = 1) teyit edilmeden veri dönülmemelidir.
- [x] **Frontend:** `CoachApi.js` içerisindeki `useCalendarEvents` hook'unun 404 vermemesi için backend entegrasyonunun bitirilip test edilmesi.

## Aşama 14: Raporlar (Reports) API ve Performans Optimizasyonu
**Risk Analizi:** Dashboard için "Gecikmiş Ödevler", "Bugün Bitenler" gibi istatistikler hesaplanırken tüm tabloları C#'a (memory'ye) çekmek `Out of Memory` (bellek taşması) hatasına yol açar.
- [x] **Backend:** `GET /api/v1/reports/overview` (Koç) endpoint'inin yazılması. *KURAL:* İstatistikler C#'ta LINQ ile değil, veritabanında `COUNT()`, `SUM()` ve `GROUP BY` kullanılarak doğrudan SQL seviyesinde (Dapper ile) hesaplanmalıdır.
- [x] **Backend:** `GET /api/v1/reports/students/:id` endpoint'inin yazılması. *KURAL (IDOR):* İstenen `:id` parametresinin bu koça ait olduğu kontrolü sorgunun ilk satırında (`WHERE id = @Id AND coach_id = @CoachId`) yapılmalıdır.
- [x] **Frontend:** Koç Raporlar (`CoachReports.jsx`) ve Dashboard sayfalarının bu yeni API'lere React Query ile bağlanması.

## Aşama 15: Bildirim (Notification) Sistemi (In-App)
**Risk Analizi:** Bir kullanıcı API'ye doğrudan istek atarak başka bir kullanıcının bildirimini "Okundu" olarak işaretleyebilir (IDOR zafiyeti).
- [x] **Backend:** `GET /api/v1/notifications` ve `PATCH /api/v1/notifications/read-all` endpoint'lerinin yazılması (Giriş yapan kullanıcının kendi bildirimleri için).
- [x] **Backend (Kritik Güvenlik):** `PATCH /api/v1/notifications/:id/read` endpoint'inin yazılması. *KURAL:* Sorgu kesinlikle `UPDATE notifications SET is_read = 1 WHERE id = @Id AND user_id = @UserId` olmalıdır. `user_id` filtresini atlamak doğrudan IDOR açığıdır!
- [x] **Backend (Cron & Transaction):** Gecikmiş ödevleri bulan `IHostedService` (Cron) içerisindeki mevcut `UPDATE` ve `INSERT` işlemleri kesinlikle `BeginTransaction` içerisinde sarmalanmalıdır. Ayrıca SQL sorgusunda `RETURNING id, student_id` kısmına `coach_id` de eklenmeli ki hem öğrenciye hem koça bildirim atılabilsin. (Döngü statü değişimi nedeniyle doğal olarak kapanmaktadır, sonsuz döngü riski yoktur.)
- [x] **Frontend:** `useNotifications` React Query kancasının yazılması ve Header'daki bildirim çanına (badge) bağlanması (30 saniyede bir polling / `refetchInterval: 30000`).

## Aşama 16: Veli ve Öğrenci Paneli Frontend Entegrasyonu
**Risk Analizi:** Frontend'de URL değiştirilerek (örneğin `/coach/dashboard` yazılarak) velinin koç sayfalarına erişmesi ihtimali. UI'da gizlense bile doğrudan linkle sayfa yüklenebilir.
- [x] **Frontend (Güvenlik):** `RoleRoute` (veya `ProtectedRoute`) bileşeninin eksiksiz çalıştığından emin olunması. JWT'deki role göre sadece ilgili layout'lara erişim izni verilmesi; yetkisiz erişimlerde `403 Forbidden` sayfasına veya anasayfaya yönlendirilmesi.
- [x] **Frontend (Parent Routing & Login):** `App.jsx` içerisindeki login yönlendirme kontrolü (`user.role === 'Student' ? ...`) Veli (Parent) senaryosunu da kapsayacak şekilde düzeltilmeli ve henüz hiç var olmayan `/parent/*` rotaları (Route) ile `ParentLayout` bileşeninin oluşturularak veli paneli iskeletinin kurulması sağlanmalıdır.
- [x] **Frontend (Bugfix):** `studentApi.js` dosyasında `/me/homework` olarak atılan hatalı isteğin, backend ile uyumlu olarak `/homework/me` şeklinde düzeltilmesi.
- [x] **Frontend (Student):** `StudentHome` ve `StudentHomework` bileşenlerinin gerçek API (`apiClient.js`) verileriyle (React Query üzerinden) çalışır hale getirilmesi.
- [x] **Frontend (Parent):** Veli paneli özet sayfasının ve salt okunur ödev listesinin (sadece kendi çocuğunu görecek şekilde) API'ye bağlanması.

---
*Planlama Sonucu:* Bu liste, uygulamanın MVP aşamasını tamamlaması için gereken son "eksik yapı taşlarını" kapsarken, özellikle veri izolasyonu (IDOR), transaction güvenliği ve hafıza yönetimi (performans) konularında çok sıkı kurallar koymuştur. Hızdan ziyade "sıfır hata" ve "güvenlik" önceliklendirilmiştir.
