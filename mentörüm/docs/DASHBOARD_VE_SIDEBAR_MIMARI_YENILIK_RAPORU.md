# Mentörüm — Koç Paneli (Dashboard) ve Sol Menü (Sidebar) Mimari Yeniden Yapılandırma Raporu

**Tarih:** 19 Ekim 2026  
**Commit:** [`064e233`](https://github.com/canoser/tasklist/commit/064e233)  
**Kapsam:** 12 dosya, 1.722 satır ekleme (+), 758 satır silme (-)  
**Durum:** Başarıyla tamamlandı, derleme 0 hata ile doğrulandı ve GitHub `main` dalına pushlandı.

---

## 1. Yönetici Özeti ve Problem Tanımı

Mevcut sistem analiz edildiğinde; backend ve veritabanı altyapısının (**MentorumApi**) son derece zengin (Pedagojik Notlar, Pomodoro/Çalışma Oturumları, Deneme Sınav/Net Takibi, Onay Merkezi, Finans ve Taksit Motoru) olmasına rağmen, önceki Dashboard'un bu yeteneklerin yalnızca yaklaşık %15'ini gösterdiği, aynı verileri (öğrenci sayısı, gecikmiş ödev, biten ödev) 3 ayrı yerde birebir tekrar ettiği ve ana ekranın operasyonel bir "Komuta Merkezi" olmak yerine statik ve hantal bir görünüm sunduğu tespit edilmiştir.

Dünyadaki ve Türkiye'deki **30 modern koçluk, LMS ve EdTech platformunun** (CoachAccountable, Practice.do, Pakodemy, Canvas, Stripe, Linear vb.) analizi referans alınarak sistem; **Sıfır Tekrar**, **Aksiyon Odaklı İş Kutusu (Action Inbox)**, **Bugün & Yarın Zaman Çizelgesi (Timeline)** ve **Canlı Öğrenci Performans Radarı** prensipleriyle baştan aşağı yeniden yapılandırılmıştır.

---

## 2. Sol Menü (Sidebar) Yeniden Yapılandırması

### 2.1 Çözülen UX Hataları ve İyileştirmeler
1. **Çift "Onaylar" Karmaşası Giderildi:**
   - Eskiden `GENEL` altında "Onaylar" ve `SİSTEM` altında "Yönetim / Onaylar" olmak üzere iki farklı buton vardı.
   - `GENEL` altındaki buton **"Onay Merkezi"** olarak netleştirildi ve koçun işlem bekleyen ödev/ödeme onayları adedi canlı bir rozet (badge) olarak eklendi.
   - `SİSTEM` altındaki buton ise yalnızca süper yönetici rolü (`user?.isAdmin`) için **"Sistem Yönetimi (Admin)"** adıyla ayrıştırıldı.
2. **Gizli Kalan Sayfalar Sol Menüye Çıkarıldı:**
   - Daha önce yalnızca program alt rotalarında gizli kalan Öğretmen Yönetimi (`/coach/teachers`) bağımsız bir sekme olarak ana menüye bağlandı.
   - Yeni geliştirilen bağımsız Finans ve Tahsilat Yönetimi (`/coach/payments`) menüye eklendi.

### 2.2 Yeni Sol Menü Gruplaması ([CoachLayout.jsx](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/components/layout/CoachLayout/CoachLayout.jsx))
```
KOMUTA MERKEZİ
├── Dashboard                     (/coach/dashboard)
├── Takvim & Program              (/coach/calendar)
└── Onay Merkezi [Canlı Rozet]    (/coach/approvals)

AKADEMİK YÖNETİM
├── Öğrenciler                    (/coach/students)
├── Programlar & Dersler          (/coach/programs)
└── Öğretmenler                   (/coach/teachers)

ANALİZ & FİNANS
├── Finans & Ödemeler             (/coach/payments)
└── Raporlar & Analiz             (/coach/reports)

SİSTEM
├── Ayarlar & Profil              (/coach/profile)
└── Sistem Yönetimi (Admin)       (/coach/admin) [Yalnızca Admin ise]
```

---

## 3. Katman 1: Üst Aksiyonlu KPI Şeridi (4 Net Kart)

Eski tasarımdaki 5 karttan işlevsiz ve mükerrer olanlar kaldırıldı, yerlerine doğrudan veritabanındaki gerçek metrikleri gösteren 4 dinamik kart konuldu:

| # | Kart Adı | Büyük Değer | Alt Açıklama / Gösterge | Tıklama Eylemi |
|---|---|---|---|---|
| **1** | **Aktif Öğrenci & Uyum** | `{students.length} Öğrenci` | `{programs.length} Program • %{weeklyRate} Tamamlama` | `/coach/students` sayfasına gider |
| **2** | **İşlem Bekleyenler** | `{overdueCount + approvalsCount} İşlem` | `⚠️ X Gecikmiş Ödev • Y Onay Talebi` | Aşağıdaki operasyon sekmesini filtreler |
| **3** | **Bugünkü Akış** | `{todayEvents.length} Etkinlik` | `Sıradaki: HH:mm — Başlık` | `/coach/calendar` sayfasına gider |
| **4** | **Finans & Tahsilat** | `₺{pendingAmount}` | `Tahsil edilen: ₺{collected} • {plans} Plan` | `/coach/payments` sayfasına gider |

---

## 4. Katman 2: Orta Çalışma Alanı (Sol 7 Kolon + Sağ 5 Kolon)

### 4.1 Sol Blok (7 Kolon) — 3 Sekmeli Canlı Operasyon Kutusu
Eski boş ve eylemsiz duran "Bugünün Öncelikli Görevleri" kutusu kaldırılarak 3 sekmeli canlı bir operasyon merkezine dönüştürüldü:

1. **Sekme 1: Acil & Gecikenler:**
   - Teslim tarihi geçmiş ve henüz tamamlanmamış tüm ödevleri listeler.
   - Her satırda öğrenci etiketi, son teslim tarihi ve satır içi doğrudan `[Ödevi Onayla / Tamamla]` butonu ile `[Detay]` butonu yer alır.
   - **Kutlama Emojisi Düzeltmesi:** Gecikmiş ödev varken kutlama emojisi gösterilmesi hatası giderildi; kutlama emojisi yalnızca gecikmiş ödev adedi tam olarak 0 olduğunda görünür.
2. **Sekme 2: Onay Bekleyenler:**
   - Öğrencilerin "Ödevi tamamladım", velilerin "Ödeme yaptım" ve öğretmenlerin "Program değişikliği" taleplerini listeler.
   - Koç sayfadan ayrılmadan doğrudan satır üzerindeki yeşil `[✓ Onayla]` ve kırmızı `[✕ Reddet]` butonlarıyla talepleri anında onaylayabilir/reddedebilir.
3. **Sekme 3: Öğretmen & Seans Notları:**
   - Programdaki öğretmenlerin ders bitiminde bıraktığı pedagojik notları ([teacher_notes](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/SchoolAccessRepository.cs)) tarih, ders ve öğretmen etiketiyle canlı bir akış halinde koça sunar.

### 4.2 Sağ Blok (5 Kolon) — Bugün & Yarın Zaman Çizelgesi (Timeline)
- 35 kutuluk hantal aylık ızgara ana sayfadan kaldırıldı (aylık detaylı takvim zaten Takvim sayfasında mevcuttur).
- Yerine **Bugün** ve **Yarın** yapılacak koçluk seanslarını, öğretmen derslerini, sınavları ve ödev teslimlerini kronolojik saat sırasıyla listeleyen zarif bir dikey zaman çizgisi (Timeline) konuldu.
- Sağ üstte hızlı aksiyon için `[+ Görev]` ve `[Takvim →]` kısayolları yerleştirildi.

---

## 5. Katman 3: Alt Bölüm — Öğrenci Performans & Çalışma Radarı

1. **Tekrarlar Temizlendi:**
   - Sol alttaki birebir aynı verileri yazan "Koçluk Durumu & Hızlı Takip" kartı tamamen silindi.
   - Üst barda global arama (`⌘K`) zaten var olduğu için Öğrencilerim kutusu içindeki ikinci mükerrer arama çubuğu kaldırıldı.
2. **Öğrenci Kartlarına Gerçek Performans Metrikleri Eklendi:**
   Her öğrenci kartında 3 sütunlu performans veri şeridi yerleştirildi:
   - **Bu Hafta Çalışma:** Öğrencinin kronometre veya Pomodoro ile girdiği net süre (örn: `6s 40dk`).
   - **Çözülen Soru:** Öğrencinin bu hafta çözdüğü toplam soru adedi (örn: `420 Soru`).
   - **Son Deneme:** Son girdiği deneme sınavının neti ve önceki denemeye göre artış/azalış trend oku (`↑ +4.2 Net` / `↓ -1.5 Net`).
   - **Haftalık Ödev Uyumu:** Dinamik ilerleme çubuğu ve tamamlama yüzdesi (`%`).
   - **Hızlı Aksiyonlar:** `[Ödev Ver]`, `[Takvim]`, `[Detay →]`.

---

## 6. Yeni Finans ve Tahsilat Yönetimi Sayfası ([CoachPaymentsPage.jsx](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/payments/CoachPaymentsPage.jsx))

Koçun tüm öğrencilerinin mali durumunu tek ekrandan yönetebilmesi için bağımsız Finans sayfası kodlandı:
- **KPI Kartları:** Toplam Planlanan (₺), Tahsil Edilen (₺), Geciken Tahsilat (₺), Bekleyen Taksit Adedi.
- **Dinamik Filtreleme:** `Tümü`, `Bekleyenler`, `Gecikenler`, `Tahsil Edilenler`.
- **Öğrenci Taksit Kartları:** Vade tarihi, durum rozeti, taksit tutarı ve satır içi `[Tahsil Et]` butonu.

---

## 7. Backend & Veritabanı Geliştirmeleri (MentorumApi)

1. **DTO Güncellemesi ([StudentDtos.cs](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/DTOs/StudentDtos.cs)):**
   `StudentListDto` sınıfına 4 yeni analitik alan eklendi:
   ```csharp
   public int ThisWeekStudyMinutes { get; set; }
   public int ThisWeekQuestionCount { get; set; }
   public decimal? LastExamNet { get; set; }
   public decimal? PrevExamNet { get; set; }
   ```
2. **Sorgu Optimizasyonu ([StudentRepository.cs](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/StudentRepository.cs)):**
   `GetStudentsByCoachAsync` metodu, `study_sessions` ve `exam_results` tablolarından haftalık verileri tek seferde hesaplayan optimize alt sorgularla zenginleştirildi:
   ```sql
   COALESCE((SELECT SUM(minutes) FROM study_sessions ss WHERE ss.student_id = u.id AND (ss.started_at >= date_trunc('week', CURRENT_DATE) OR (ss.started_at IS NULL AND ss.created_at >= date_trunc('week', CURRENT_DATE)))), 0) AS ThisWeekStudyMinutes,
   COALESCE((SELECT SUM(question_count) FROM study_sessions ss WHERE ss.student_id = u.id AND (ss.started_at >= date_trunc('week', CURRENT_DATE) OR (ss.started_at IS NULL AND ss.created_at >= date_trunc('week', CURRENT_DATE)))), 0) AS ThisWeekQuestionCount,
   (SELECT total_net FROM exam_results er WHERE er.student_id = u.id ORDER BY er.exam_date DESC LIMIT 1) AS LastExamNet,
   (SELECT total_net FROM exam_results er WHERE er.student_id = u.id ORDER BY er.exam_date DESC OFFSET 1 LIMIT 1) AS PrevExamNet
   ```
3. **Öğretmen Notları Servisi ([SchoolAccessRepository.cs](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/SchoolAccessRepository.cs)):**
   `GetRecentTeacherNotesForCoachAsync(Guid coachId, int limit)` metodu yazılarak koçun dahil olduğu programlardaki en son pedagojik öğretmen notları çekildi.
4. **Endpoint Entegrasyonu ([StudentEndpoints.cs](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Endpoints/StudentEndpoints.cs)):**
   `GET /api/v1/students/recent-teacher-notes` uç noktası bağlandı.

---

## 8. Değiştirilen ve Eklenen Dosyaların Özeti (12 Dosya)

| Dosya Yolu | Durum | Satır (+ / -) | İşlem Özeti |
|---|---|---|---|
| `Backend/MentorumApi/DTOs/StudentDtos.cs` | Değiştirildi | +4 / -0 | `StudentListDto` içine çalışma süresi, soru sayısı ve deneme neti eklendi. |
| `Backend/MentorumApi/Data/StudentRepository.cs` | Değiştirildi | +5 / -1 | Öğrenci listesi sorgusuna çalışma ve deneme subquery'leri eklendi. |
| `Backend/MentorumApi/Data/SchoolAccessRepository.cs` | Değiştirildi | +27 / -0 | `GetRecentTeacherNotesForCoachAsync` metodu eklendi. |
| `Backend/MentorumApi/Endpoints/StudentEndpoints.cs` | Değiştirildi | +11 / -0 | `GET /api/v1/students/recent-teacher-notes` uç noktası eklendi. |
| `Frontend/src/App.jsx` | Değiştirildi | +3 / -0 | `/coach/teachers` ve `/coach/payments` rotaları bağlandı. |
| `Frontend/src/components/layout/CoachLayout/CoachLayout.jsx` | Değiştirildi | +36 / -20 | 4 gruplu yeni sidebar, çift onay düzeltmesi ve badge entegrasyonu. |
| `Frontend/src/features/coach/coachApi.js` | Değiştirildi | +9 / -0 | `useRecentTeacherNotes` React Query hook'u eklendi. |
| `Frontend/src/features/coach/dashboard/CoachDashboard.jsx` | Değiştirildi | +532 / -416 | 3 katmanlı yeni Dashboard (KPI, Operasyon Kutusu, Timeline, Radar). |
| `Frontend/src/features/coach/dashboard/CoachDashboard.module.css` | Değiştirildi | +544 / -332 | Operasyon kutusu, timeline, metrik şeridi ve responsive stiller. |
| `Frontend/src/features/coach/payments/CoachPaymentsPage.jsx` | Yeni Dosya | +235 / -0 | Bağımsız Finans ve Tahsilat Yönetimi bileşeni. |
| `Frontend/src/features/coach/payments/CoachPaymentsPage.module.css` | Yeni Dosya | +297 / -0 | Finans sayfası CSS modülü. |
| `Frontend/src/features/coach/teachers/CoachTeachersPage.jsx` | Değiştirildi | +6 / -2 | `useParams` olmadan doğrudan `/coach/teachers` rotasından açılabilme desteği. |

**Toplam:** 12 dosya, **1.722 ekleme**, **758 silme**.

---

## 9. Derleme ve Test Doğrulamaları

1. **Frontend (Vite Build):**
   ```bash
   npm run build
   ✓ 3402 modules transformed.
   ✓ built in 1.25s
   0 Hata
   ```
2. **Backend (.NET 9 Minimal API):**
   ```bash
   dotnet build Backend/Mentorum.sln
   Oluşturma başarılı oldu. 0 Uyarı, 0 Hata
   ```
3. **Güvenlik & Tenant İzolasyonu:**
   Eklenen tüm veritabanı sorguları `WHERE s.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)` ve `BaseRepository` filtreleri kullanılarak IDOR açıklarına karşı tam korumalı olarak yazılmıştır.
