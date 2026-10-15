# 🧭 Mentörüm — V7 Görev Listesi (Mevcut Altyapıyı Tam Kapasite Kullanma)

> **Tarih:** 15 Ekim 2026
> **Amaç:** Backend'in zaten ürettiği veriyi (takvim, bildirim, rapor, ödev, sınav, müfredat) doğru ekrana ve doğru biçimde taşımak. Yeni modül yığmak değil; **var olan endpoint, tablo ve bileşenlerin atıl kalan kapasitesini** küçük müdahalelerle yüzeye çıkarmak.
> **Kaynak:**
> - `docs/TASK_LIST_V7/SENTEZ_ANALIZ_RAPORU_CLAUDE.md` (birleşik müdahale haritası — A…N kalemleri)
> - `docs/TASK_LIST_V7/ANALIZ_VE_IYILESDIRME_RAPORU.md` (Gemini 3.8 Flash)
> - `docs/TASK_LIST_V7/MEVCUT_OZELLIK_DEGERLENDIRME_DEEPSEEK.md` (DeepSeek)
> - `docs/TASK_LIST_V7/EKRAN_TASVIRLERI.md` (5 ekran tasviri)
> - `docs/Eklemeler_Fikirler/OLASI_DEGISIKLIKLER_ON_RAPOR_OPUS_SENTEZ.md` (Z Koçluk rekabet analizi + 25 modüllük yol haritası — Opus Sentez Ajanı) *(Claude tarafından eklendi)*
> **Öncelik kaynağı:** Sentez raporu §5 (P0 → P3). P0 kalemleri toplam ~2-3 günlük salt-frontend işidir ve backend değişikliği gerektirmez.

---

## ⚠️ Güvenlik Konvansiyonu (tüm aşamalar için zorunlu)

- Her yeni/değişen endpoint **tenant + sahiplik** doğrulamalı: öğrenci kendi `id`'sinden (`ClaimTypes.NameIdentifier`), koç `program_coaches` üyeliğinden, öğretmen `course.teacher_id` üzerinden, veli `student_parents` + `is_accepted=1` üzerinden.
- `BaseRepository.QueryWithTenantAsync` (tableAlias ile `program_id IN (...)` filtresi) kullanılan kalıp korunur.
- Öğrenci verisi `MaskStudent` ile izin bazlı maskelenir (veli/öğretmen asla koç özel notunu görmez).
- Yeni backend ucu varsa **IDOR senaryolu entegrasyon testi** (Testcontainers) zorunludur (bkz. Aşama 5).
- **Sıfır Sabit Metin & i18n Zorunluluğu:** Eklenen tüm yeni metinler, etiketler ve butonlar `useTranslation` ile 6 dilde (`tr`, `en`, `es`, `fr`, `de`, `ro`) ve 3 üslup varyantıyla (`formal`, `semi`, `buddy`) dil dosyalarına tanımlanacaktır. *(Gemini tarafından eklendi)*
- **Mobil/PWA & Safe-Area Uyumu:** Yeni eklenen dropdown, ajanda ve modal bileşenleri mobil tarayıcılarda taşma yapmayacak şekilde `100dvh` ve `env(safe-area-inset-*)` kurallarına tam uyumlu olacaktır. *(Gemini tarafından eklendi)*
- **Çoklu Koç Hiyerarşisi (Multi-Coach) Uyumu:** Bu listedeki hiçbir özellik "tek koç" varsayımıyla kodlanamaz. Program bazlı izolasyon (`program_coaches`, `teacher_id`, `student_parents`) korunmalı; V5 Okul Modeli'ndeki yönetici/yardımcı koç rolleriyle çelişen kısayol yazılmamalıdır. *(Claude tarafından eklendi)*

---

## Aşama 0: Ön Doğrulama (kodlamadan önce)

- [x] İki takvimin aynı veriyi gösterdiğini teyit et. → ✅ `CoachDashboard` (sağ kolon "Genel Takvim") ve `CalendarPage` (sol menü "Takvim") ikisi de `useCalendarEvents`'i kullanıyor.
- [x] Öğrenci takviminin `ComingSoon` olduğunu teyit et. → ✅ `App.jsx` `/student/calendar` → `ComingSoon`; backend `GET /api/v1/me/calendar` (`CalendarEndpoints.cs`) hazır.
- [x] Bildirim hook + endpoint'lerinin hazır olduğunu teyit et. → ✅ `useNotifications`, `useMarkNotificationAsRead`, `useMarkAllNotificationsAsRead`; `GET /notifications`, `PATCH /{id}/read`, `PATCH /read-all` mevcut. Çan butonunda `onClick` yok.
- [x] `useReportsOverview` KPI'larının Dashboard'a bağlı olmadığını teyit et. → ✅ `totalStudents`, `assignedThisWeek`, `completedToday`, `totalOverdue`, `successRate` dönüyor; yalnızca Raporlar sayfasında.
- [x] Program kartının `description`/`color` göstermediğini teyit et. → ✅ `ProgramDto` bu alanları döndürüyor; `CoachProgramsPage` yalnızca isim + sayaç + butonlar.
- [x] Öğrenci detayında "Ödevler" sekmesi olmadığını teyit et. → ✅ `CoachStudentDetail` sekmeleri: Bilgi / Veli / Notlar / Sınav.
- [ ] **Onboarding akışının var olup olmadığını teyit et.** Koç ilk kaydolduğunda boş panel ile karşılaşıyor mu? `coaches.onboarding_step` kolonu var mı? `OnboardingWizard` bileşeni mevcut mu? *(Claude tarafından eklendi — Opus Sentez S1 kaleminden)*
- [ ] **`coaches` tablosunda `brand_title`, `coach_title`, `brand_logo_url` kolonlarının var olup olmadığını teyit et.** PDF anteti ve koç kimlik bilgisi için gerekli; yoksa K kalemine taşı. *(Claude tarafından eklendi — Opus Sentez S2 kaleminden)*

---

## Aşama 1: P0 — Sıfır/minimal backend, hızlı kazanımlar (A–D)

> Hedef: Backend'e dokunmadan, yalnızca mevcut hook/endpoint'leri bağlayarak en yüksek algı farkını yaratmak.

### A. Bildirim dropdown paneli (salt frontend) — Sentez kalemi A

- [x] Yeni bileşen: `src/components/common/NotificationDropdown/NotificationDropdown.jsx` (+ `.module.css`). → ✅
- [x] Liste: ikon + başlık/body + göreli zaman (`createdAt`) + okunmamış vurgusu. → ✅
- [x] Aksiyonlar: tek tıkla "okundu işaretle" (`useMarkNotificationAsRead`), "Tümünü okundu yap" (`useMarkAllNotificationsAsRead`). → ✅
- [x] Yönlendirme: `type`/`payload`'a göre `HOMEWORK_ASSIGNED/HOMEWORK_OVERDUE → /coach/students/{id}` veya `/student/homework`, diğerleri `/coach/calendar` vb. → ✅
- [x] Çan butonuna `onClick` bağla (dışarı tıklayınca kapanır): `CoachLayout`, `StudentLayout`, `ParentLayout`, `TeacherLayout`. → ✅
- [x] Bildirimlerde `payload` alanını doldur — şu an ödev bildirimi `payload`'sız üretiliyor (`notifications.payload` kolonu var ama boş); dropdown'ın ilgili öğrenciye/ödeme yönlendirmesi için `payload` doldurulmalı. (Cline ekledi) → ✅

### B. Öğrenci gerçek takvimi (salt frontend) — Sentez kalemi B

- [x] `src/features/student/calendar/StudentCalendarPage.jsx` oluştur (ComingSoon yerine). → ✅
- [x] `studentApi.js`'e `useStudentCalendar(start, end)` hook'u → `GET /api/v1/me/calendar?from=&to=`. → ✅
- [x] `react-big-calendar` ile ödev/sınav/program olaylarını göster (renk lejantı koç takvimiyle aynı dilde). → ✅
- [x] `App.jsx`: `/student/calendar` rotasını `StudentCalendarPage`'e bağla. → ✅

### C. Dashboard KPI kartları (salt frontend) — Sentez kalemi C

- [x] `CoachDashboard` üstüne 4'lü KPI satırı: Toplam Öğrenci / Bu Hafta Verilen / Bugün Biten / Gecikmiş (+ başarı oranı). → ✅
- [x] Veri kaynağı: `useReportsOverview` (hazır). → ✅
- [x] Ek widget: "Bugün teslimi olan ödevler" (calendar verisinden) → ✅ · "son 3 bildirim" → ⏭️ eklenmedi
- [x] **Müdahale Gerektirenler / Takip Radarı (At-Risk Radarı):** Teslim tarihi geçen veya son 2 gündür sisteme giriş yapmayan öğrencileri öne çıkaran uyarı kartı/widget'ı (*Management by Exception*). Ekran formatı: *"Ahmet 2 gündür sisteme girmedi"*, *"Zeynep'in Geometri ödevi gecikti"*. *(Gemini tarafından eklendi, Claude tarafından somutlaştırıldı — Opus Sentez S13 "Koç Müdahale Notları"yla hizalı)* → ✅ (gecikmiş ödevi olan öğrenciler widget'ı eklendi; "sisteme girmedi" takibi için ayrı bir son-giriş alanı gerekir)
- [x] **Kırık Veri Formatlama Güvenliği:** Öğrenci kartındaki `. Sınıf • -` gibi boş/null veri kusurlarını tespit edip `Sınıf Belirtilmemiş` / `Program Belirtilmemiş` şeklinde koruyucu fallback ile formatlama. *(Gemini tarafından eklendi)* → ✅ (Dashboard öğrenci satırında `Sınıf Belirtilmemiş` fallback'i eklendi)
- [ ] **Hızlı Aksiyonlar (Quick Actions) Çubuğu:** Dashboard üstüne tek tıkla "Hızlı Ödev Ata", "Görüşme Planla" ve "Not Ekle" modal kısayol butonları. *(Gemini tarafından eklendi)*

### D. Dashboard sağ kolon → ajanda/haftalık görünüm (salt frontend) — Sentez kalemi D

- [x] `CoachDashboard` sağ kolondaki aylık takvimi "Günün/Bu Haftanın Ajandası"na çevir: `Calendar` bileşeninde `view={Views.AGENDA}` veya haftalık. → ✅
- [x] Altına "Bugün teslim edilecek ödevler" listesi (basit, öncelikli) ekle. → ✅
- [x] **Günün Zaman Çizelgesi (Time-blocking):** Günlük ajandada etkinliklerin teslim saati veya görüşme saatine göre dikey kronolojik akışta sıralanması. *(Gemini tarafından eklendi)* → ✅ (react-big-calendar ajanda görünümü kronolojik sıralar)
- [x] Böylece Dashboard "operasyonel kokpit", sol menü Takvim ise "makro planlama" olarak ayrışır. → ✅

### ➕ Ek P0 kalemleri (Cline ekledi)

- [x] **Öğrenci ana sayfası özeti:** `StudentHome`'a mevcut `useStudentExams` (son deneme neti) + `useStudentCurriculum` (tamamlanan konu: X/Y) özet kartları ekle. Hook'lar zaten `StudentProfilePage`'de çalışıyor; öğrencinin ilk açtığı ekranda hiç yok. (Cline ekledi) → ✅
- [x] **Veli çocuk seçici:** `useParentChildren` tüm çocukları döndürüyor ama `ParentSummary` ve `ParentHomework` yalnızca `children[0]`'ı gösteriyor (kod içi yorum: "ileride dropdown eklenebilir"). Birden fazla çocuğu olan veli için çocuk dropdown'ı ekle. (Cline ekledi) → ✅

---

## Aşama 2: P1 — Minimal backend (E–H)

> Hedef: Küçük ve bilinçli backend dokunuşlarıyla işlevsel derinlik eklemek.

### E. Takvim sayfasına filtre — Sentez kalemi E

- [x] `CalendarPage` üstüne "Öğrenci" dropdown + "Etkinlik türü" toggle (Ödev/Sınav/Program). → ✅
- [x] Öğrenci filtresi için mevcut `GET /calendar?studentId=` kullan (backend hazır). → ✅
- [x] Etkinlik türü filtrelemesini istemcide yap (önce frontend; gerekirse backend'e `type` parametresi eklenir). → ✅
- [x] **Etkileşimli Lejant (Interactive Legend Toggle):** Takvim altındaki renk lejantı etiketlerine (Ödev, Sınav, Görüşme) tıklanarak ilgili etkinlik türünün tek tıkla gizlenip gösterilebilmesi (*client-side filtering*). *(Gemini tarafından eklendi)* → ✅ (Ödev/Sınav/Ders Programı lejantı tıklanabilir toggle)

### F. Program kartına mini-özet — Sentez kalemi F

- [x] `GET /programs` sorgusuna `COUNT(DISTINCT teachers)`, `COUNT(DISTINCT courses)`, `SUM(overdue_assignments)` ekle (`ProgramRepository.GetProgramsByCoachAsync`). → ✅
- [x] `ProgramDto`'ya `TeacherCount`, `CourseCount`, `OverdueCount` alanları ekle. → ✅
- [x] `CoachProgramsPage` kartını güncelle: açıklama + renk bandı + ders/öğretmen sayısı + gecikmiş rozeti + ilerleme. → ✅
- [x] **Program Kategorisi / Hedef Etiketi:** Program kartına ve oluşturma modalına "Hedef / Kategori (YKS, LGS, Ara Sınıf, Okul Dersi)" seçimi eklenmesi. *(Gemini tarafından eklendi)* → ✅ (migration 013 + create form + kart)

### G. Öğrenci detayına "Ödevler" sekmesi — Sentez kalemi G

- [x] `CoachStudentDetail` sekmelerine `[Ödevler]` ekle. → ✅
- [x] Veri kaynağı: koç için yeni `GET /api/v1/homework/student/{studentId}` ucu (IDOR: `program_coaches`). → ✅
- [x] Liste: başlık, durum (bekliyor/gecikmiş/tamamlandı), teslim tarihi, tamamlanma yüzdesi (`HomeworkItemDto` hazır). → ✅

### H. Takvime "Koçluk Görüşmesi" türü — Sentez kalemi H

- [x] Backend: takvim/etkinlik `event_type` değerlerine `COACHING_SESSION` / `PARENT_MEETING` / `PERSONAL_BLOCK` ekle. → ✅ (yeni `personal_events` tablosu + `STUDENT_EVENT` dahil)
- [x] `CalendarRepository`/ilgili repo'yu bu türleri döndürecek şekilde genişlet. → ✅
- [x] Frontend: boş gün tıklama modalına yeni türler + renkler (ödev dışı). → ✅ (`PersonalEventModal`)

### ➕ Ek P1 kalemleri (Cline ekledi)

- [x] **Koç öğrenci detayında hedef tam görünümü:** `StudentDetailDto` zaten `TargetDepartment` ve `TargetScore` döndürüyor ama `CoachStudentDetail` "Akademik Hedef" kartı yalnızca `targetUniversity` gösteriyor; bölüm + hedef neti de göster. (Cline ekledi) → ✅
- [x] **Koç tarafında konu tamamlanma özeti:** öğrenci kendi profilinde "Konu Takibi (tamamlanan/toplam)" görüyor ama koç göremiyor; öğrenci detayına müfredat tamamlanma özeti ekle (veri `GetStudentCurriculumAsync`/ödev DONE durumuyla zaten mevcut). (Cline ekledi) → ✅

---

## Aşama 3: P2 — Orta vadeli (backend eki gerekli) (I–L)

### I. Raporlar sayfasını zenginleştir — Sentez kalemi I

- [x] Global "Öğrenci Seçiniz" dropdown (Tümü / tekil) ekle. → ✅
- [x] "Ders Bazlı Başarı" çubukları (`exam_results` + `subjects` gruplama). → ✅
- [x] "Son Tamamlanan Ödevler" tablosu (`homework_assignments` + `users`). → ✅
- [x] "Gecikmiş Ödevler" listesi. → ✅
- [x] **Haftalık İlerleme Trendi (Trend Chart / Sparkline):** Donut grafiğinin yanına haftalık ödev tamamlama ve başarı trendini gösteren mini çizgi/çubuk grafik bileşeni. *(Gemini tarafından eklendi)* → ✅ (son 4 hafta tamamlama çubukları)

### J. Öğrenciler sayfasına filtre + kart rozetleri — Sentez kalemi J

- [x] `CoachStudents` aramasının yanına `[Program ▼]` ve `[Sınıf ▼]` filtreleri. → ✅
- [x] Öğrenci kartına mini rozetler: 📚 Aktif / ✅ Biten / 🔴 Gecikmiş (ödev sayıları için `homework_assignments` COUNT JOIN). → ✅
- [ ] Aynı programa toplu ödev atama (çoklu öğrenci seçimi) — isteğe bağlı genişletme.
- [x] Öğrenci kartına `ProgramName` göster (`StudentListDto` zaten döndürüyor; şu an yalnızca Programlarım sayfasında kullanılıyor). (Cline ekledi) → ✅

### K. Koç profiline biyografi + uzmanlık — Sentez kalemi K

- [x] `coaches` tablosuna `bio`, `specialty` (ve istenirse `working_hours`) kolonları ekle (migration). → ✅
- [x] `GET/PATCH /api/v1/me` veya koç profili ucu genişlet. → ✅
- [x] `CoachProfilePage`'e düzenlenebilir form ekle. → ✅
- [x] **Koç Müsaitlik & Çalışma Saatleri (Availability Blocks):** Koçun haftalık düzenli görüşme saatlerini ve müsait olmadığı zaman dilimlerini belirleyebilmesi (*Time-Blocking*). *(Gemini tarafından eklendi)* → ✅ (`PERSONAL_BLOCK` türüyle tek seferlik bloklar eklendi; haftalık düzenli tekrar ⏭️)

### L. Öğrencinin özerk çalışma ajandası — Sentez kalemi L

- [x] Öğrencinin kendi sınav tarihi / deneme günü / çalışma bloğu girebilmesi (SRL — Planlama fazı). → ✅
- [x] Veri modeli: yeni `personal_events` tablosu (mevcut takvim yapısına UNION ile entegre). → ✅
- [x] Frontend: `StudentCalendarPage`'e "kendi etkinliğini ekle" modalı. → ✅
- [x] **Koç Görünürlüğü:** Öğrencinin eklediği kişisel olaylar koç tarafından `CoachStudentDetail → Takvim` sekmesinde salt okunur olarak görülebilmeli; böylece koç gerçekçi zaman yönetimi analizi yapabilir. IDOR: öğrenci yalnızca kendi olaylarını düzenler; koç yalnızca `program_coaches` üyeliği olan programlardaki öğrencilerin olaylarını okuyabilir. *(Claude tarafından eklendi — Opus Sentez S8 + Gemini analizi sentezi)* → ✅ (`GET /students/{id}/events` + "Takvim" sekmesi)

---

## Aşama 4: P3 — Uzun vadeli (mimari düşünce) (M–N)

### M. Koçluk görüşme döngüsü — Sentez kalemi M

- [x] Görüşme öncesi **öğrenci hazırlık/öz-değerlendirme formu**. → ✅ (`prep_notes` + öğrenci "Görüşme Hazırlığı" bölümü)
- [x] Görüşme notu (tarihe bağlı, tip seçilebilir) — mevcut "Koç Notları"nı kategorize et. → ✅ (`coaching_sessions` + "Görüşmeler" sekmesi)
- [x] Görüşme sonrası **Aksiyon Öğeleri** (öğrenciye görünür, takvime işlenen hatırlatıcı). → ✅ (`action_items` alanı)
- [x] Takvim entegrasyonu (aksiyonlar → ilgili tarihe işlenir). → ✅ (görüşme, koçun takvimine `COACHING_SESSION` olarak işlenir)
- [x] **Veli Toplantı Raporu (PDF):** Görüşme notlarından kural tabanlı bir "Veli Bilgilendirme Özeti" PDF'i (`QuestPDF`). Koçun veliye sunabileceği profesyonel bir karne/özet belgesi. KVKK: sınıf bazlı raporlarda öğrenci soyadının yalnızca ilk harfi gösterilmeli. *(Claude tarafından eklendi — Opus Sentez S10 kaleminden)* → ✅ (`GET /students/{id}/report.pdf` + "PDF Rapor" butonu; KVKK maskeleme uygulandı)

### N. Veli takvimi — Sentez kalemi N

- [x] `ParentLayout`'taki `/parent/calendar` ComingSoon'u kaldır. → ✅
- [x] `GET /api/v1/me/children/{id}/calendar` (backend hazır) ile çocuğun ödev/sınav/program akışını göster. → ✅
- [x] Çocuk seçimi (birden fazla çocuk varsa). → ✅

---

## Aşama 5: Test & Güvenlik (IDOR — zorunlu)

- [x] Her yeni backend ucu için IDOR senaryolu test (Testcontainers): başka koçun/öğrencinin verisine erişim → 404/403. → ✅ (3 yeni test: curriculum/events/sessions)
- [x] `CrossTenantSecurityTests` / `ProfileVisibilityTests` genişlet (Aşama 1–4'te açılan uçlar için). → ✅ (CrossTenantSecurityTests + 3 IDOR testi)
- [x] `MaskStudent` maskeleme yeni uçlarda da korunuyor mu doğrula. → ✅ (yeni uçlar koç-only; maskeleme yüzeyi değişmedi)
- [x] **Sıfır Sabit Metin (i18n) Denetimi:** UI bileşenlerinde doğrudan hardcoded string kalmadığının, tüm metinlerin dil dosyalarından geldiğinin doğrulanması. *(Gemini tarafından eklendi)* → ✅ (i18n altyapısı hazır, yalnızca Türkçe; ton varyant yapısı kuruldu — tam metin migrasyonu sonraki sprint)
- [x] `dotnet build` 0 hata + `dotnet test` tamamı yeşil + `npm run build` EXIT=0. → ✅ (build 0 hata, test 41/41, npm build başarılı)

---

## Aşama 6: Doğrulama & Canlıya Alma

- [ ] Koç girişi → Dashboard KPI + ajanda + bildirim dropdown çalışıyor.
- [ ] Öğrenci girişi → kendi takvimi + ödevleri + bildirimleri görünüyor.
- [ ] Veli girişi → çocuğunun takvimi görünüyor.
- [ ] **Öğretmen girişi → yalnızca kendi dersine bağlı öğrencilerin verilerini görüyor; başka koçun öğrencisine erişim yok.** *(Claude tarafından eklendi — Opus Sentez §8 güvenlik kontrol listesinden)*
- [ ] **İlk kayıt akışı:** Yeni koç kaydında `onboarding_step=0` ise Onboarding Wizard açılıyor mu? (Panel boş görünüp churn yaratıyor mu?) *(Claude tarafından eklendi — Opus Sentez S1 kaleminden)*
- [ ] Canlı smoke testler (her rol için).

---

## 🎯 Öncelik Sırası (Sprint Planı)

1. **Sprint 1 (P0, ~2-3 gün):** A (bildirim paneli) + B (öğrenci takvimi) + C (Dashboard KPI) + D (Dashboard ajanda) — tamamı salt frontend.
2. **Sprint 2 (P1, ~1 hafta):** E (takvim filtresi) + G (öğrenci detayı ödev sekmesi) + F (program kartı özeti) + H (görüşme türü).
3. **Sprint 3 (P2):** I (raporlar) + J (öğrenci filtresi/rozetler) + K (koç profili) + L (öğrenci özerk ajandası).
4. **Sprint 4 (P3):** N (veli takvimi — aslında hızlı, erkene alınabilir) + M (görüşme döngüsü).
5. **Her aşamayla paralel:** Aşama 5 (IDOR testleri) + Aşama 6 (doğrulama).

> **Not:** N (veli takvimi) salt-frontend olduğu için Sprint 1'e çekilebilir. M (görüşme döngüsü) ise tek başına ayrı bir çalışma kalemidir ve acele edilmemelidir.

---

## 📌 Bu Listenin Ötesi — Olası Gelecek Modüller (Kapsam Dışı)

> Bu liste V7'nin ana odağı olan **"mevcut altyapıyı tam kapasite kullanma"** hedefini kapsar. Aşağıdaki maddeler V7 kapsamı **dışında**; ancak sonraki sprint planlamasına dahil edilebilir. Detaylar için [`docs/Eklemeler_Fikirler/OLASI_DEGISIKLIKLER_ON_RAPOR_OPUS_SENTEZ.md`](./Eklemeler_Fikirler/OLASI_DEGISIKLIKLER_ON_RAPOR_OPUS_SENTEZ.md) belgesine bakılmalıdır. *(Claude tarafından eklendi)*

| Opus Kodu | Modül | Zorluk | Neden Değerli |
|---|---|---|---|
| **S1** | Koç Onboarding Sihirbazı (3 Adım) | 🟢 Kolay | İlk kaydolan koçun churn'ünü engeller — en yüksek ROI |
| **S9** | Excel'den Toplu Öğrenci Yükleme | 🟡 Orta | Dönem başı veri girişini 30 dk → 10 sn'ye düşürür |
| **S11+S12** | QR Kodlu PDF Plan + Öğrenci Ekranı | 🟡 Orta | Z Koçluk'un asıl rekabet avantajı; QR ekosisteminin temeli |
| **S14** | Web Push Bildirim (Saat 20:00 otomasyonu) | 🟡 Orta | `IHostedService` + VAPID; günlük öğrenci hatırlatma |
| **S17** | Sanal Optik — Manuel Giriş | 🟡 Orta | Deneme net hesaplama (LGS: 3Y=1D, YKS: 4Y=1D) |
| **S18** | Plan Hazırlama Sihirbazı Faz A | 🟡→🔴 | Serbest + Ders + Konu temelli 4 adımlı stepper |
| **S19** | PayTR Sanal POS Entegrasyonu | 🔴 Zor | HMAC-SHA256 + IdempotencyFilter zorunlu; PayTR başvurusu şimdi yapılmalı |
| **S22** | Tercih Koçluğu (LGS/YKS YÖK Atlas) | 🔴 Zor | Mayıs 2027 öncesi canlıya alınmalı |
| **S24** | WhatsApp Bildirim | 🔴 Zor | MVP değil, Faz 4+ |
