# Mevcut Özellik Değerlendirmesi, Eksiklik Analizi ve İyileştirme Fikirleri

> **Hazırlayan model:** DeepSeek — Cline kod ajanı aracılığıyla üretilmiştir.
> **Tarih:** 15 Ekim 2026
> **Odak:** Kullanıcı (koç, öğrenci, veli, öğretmen) açısından uygulamanın eksikleri — özellikle **var olan altyapının iyi kullanılmaması** ve **küçük müdahalelerle** kapatılabilecek boşluklar. Yeni modül önerisi değil, mevcut değerin yüzeye çıkarılması.

---

## 1. Yönetici Özeti

İncelemenin ana sonucu şudur: **Uygulamanın backend'i birçok işlevi zaten barındırıyor, ancak bu işlevlerin önemli bir kısmı ön yüzde ya hiç görünmüyor ya da yanlış yerde görünüyor.** En çarpıcı örnekler:

- Öğrencinin takvimini besleyecek `GET /api/v1/me/calendar` endpoint'i **mevcut**, ama öğrenci ekranında "Takvim" hâlâ *"Çok Yakında"* (ComingSoon) yer tutucusu.
- Bildirimlerin tamamı için backend hazır (`GET /notifications`, `PATCH /{id}/read`, `PATCH /read-all`), ama arayüzde çan yalnızca okunmamış sayısını gösteren bir buton — bildirimleri görmek, okumak, tıklayıp ilgili sayfaya gitmek **mümkün değil**.
- Koç panelinde **iki ayrı takvim** var (Dashboard'daki "Genel Takvim" ve "Takvim" sekmesi) ve ikisi de aynı veriyi gösteriyor — biri fiilen fazlalık.
- `Programlarım` ekranı yalnızca program kartları ve butonlardan ibaret; oysa her programın öğrenci, ödev, sınav ve takvim verisi zaten ayrı ayrı sorgulanabiliyor.
- Koç, kendisi hakkında (biyografi, çalışma saatleri, uzmanlık, müsaitlik) neredeyse hiçbir şey yazamıyor; öğrencinin de kendi kendine oluşturabileceği bir çalışma takvimi yok.

Bu raporda her bulgu **"mevcut kodda ne var → ne eksik → hangi küçük müdahaleyle çözülür"** biçiminde ele alınmış ve sonunda etki/çaba matrisiyle önceliklendirilmiştir.

## 2. Yöntem ve Kaynaklar

1. **Kod tabanı incelemesi:** Backend endpoint'leri (`HomeworkEndpoints`, `CalendarEndpoints`, `NotificationEndpoints`, `ReportsEndpoints`, `StudentEndpoints`, `ProgramEndpoints`), repository'ler, frontend ekranları (`coach/*`, `student/*`, `parent/*`, `teacher/*`), layout'lar ve React Query hook'ları.
2. **Ekran tasvirleri:** `docs/TASK_LIST_V7/EKRAN_TASVIRLERI.md` (Dashboard, Programlarım, Öğrenciler, Takvim, Raporlar).
3. **Önceki AI raporları:** `docs/Eklemeler_Fikirler/` içindeki DeepSeek / Gemini / Opus ön-raporları incelendi; bu rapor aynı konuyu **"var olanın iyi kullanılmaması"** ekseninde, onlardan farklı bir bakışla ele almaktadır.
4. **Modern mentörlük kuramları:** GROW koçluk modeli, öz-düzenlemeli öğrenme (Self-Regulated Learning — SRL), biçimlendirici değerlendirme (formative assessment) ve mentörlük (mentorship) literatürü.

## 3. Modern Mentörlük Çerçevesi (Rapora Yön Veren Kuramlar)

Bir öğrenci ve mentörün gerçekte neye ihtiyaç duyduğunu dört yerleşik yaklaşımla özetleyebiliriz:

- **GROW modeli (Hedef → Gerçeklik → Engeller/Seçenekler → Yol):** Etkili koçluk; net bir hedef koymayı, mevcut durumu dürüstçe ölçmeyi, engelleri/alternatifleri keşfetmeyi ve somut bir eylem planına bağlamayı gerektirir. Uygulamada bu, "hedef takibi + düzenli gözden geçirme + sonraki adım" döngüsü demektir. (Mevcut sistemde hedef alanları var ama bir **gözden geçirme / eylem döngüsü** yok.)
- **Öz-düzenlemeli öğrenme (SRL):** Başarılı öğrenci; öğrenmeyi *planlar* (ön düşünce), *izler* (performans) ve *değerlendirir* (öz-yansıtma). Öğrencinin **kendi çalışma takvimini/planını oluşturabilmesi** (şu an yok) ve kendi ilerlemesini görebilmesi bu kuramın doğrudan karşılığıdır.
- **Biçimlendirici değerlendirme:** Not vermekten çok, **sık ve nitelikli geri bildirim** öğrenmeyi artırır. Ödev tamamlama yüzdesi ve deneme sonuçları bir "geri bildirim döngüsüne" bağlanmalı; şu an bu veri toplanıyor ama anlamlı bir geri bildirime dönüşmüyor.
- **Mentörlük ilişkisi:** Mentör; danışman, yönlendirici ve geri bildirim kaynağıdır. Koçun öğrencisi hakkında tuttuğu **özel notlar** bunun çekirdeğidir; ancak şu an yalnızca bir liste, bir "iletişim / aksiyon" akışına bağlı değil.

> Bu dört kuramın ortak paydası: **veri tek başına değil, veriyi "sonraki adıma" çeviren döngüler değer üretir.** Aşağıdaki tüm öneriler bu paydaya hizmet eder.

## 4. Mevcut Durum Envanteri (Özet)

| Rol | Var olan ekranlar | Arka planda var ama yüzeyde yok / eksik |
|---|---|---|
| **Koç** | Dashboard, Programlarım, Öğrenciler, Takvim, Raporlar, Profil, Öğretmenler/Dersler/Gruplar/Program/Ayarlar | Bildirim paneli, öğrenci başına ödev geçmişi, zengin dashboard, koç öz-bilgisi, koçun kendi takvimi/müsaitliği |
| **Öğrenci** | Ana Sayfa, Programım, Derslerim, Ödevler, Profil | Takvim (ComingSoon), kendi çalışma planı/takvimi, ana sayfada sınav özeti ve konu takibi |
| **Veli** | Özet, Ödevler, Program | Takvim (ComingSoon), bildirim paneli |
| **Öğretmen** | Dersler, Program, Profil | Profil içeriği (fiilen boş), bildirim paneli |

Bu envanter, 5. bölümdeki bulguların zeminini oluşturur.

---

## 5. Tespitler: Var Olan Özelliklerin Yetersiz Kullanımı

### 5.1 İki takvim aynı işi yapıyor (en görünür fazlalık)

- **Mevcut kod:** `CoachDashboard` sağ kolonunda "Genel Takvim" var (`useCalendarEvents` ile gerçek veri çekiyor). Ayrıca ayrı bir **"Takvim"** sekmesi (`CalendarPage`) var — o da aynı `useCalendarEvents` verisini, aynı renk lejantıyla gösteriyor.
- **Sorun:** İkisi de "tüm öğrencilerin ödev/sınav/program olaylarını ay bazlı göster". Kullanıcıya ikisi aynı şeyi iki kez sunuluyor; hangisinin ne işe yaradığı belli değil. Boşuna yer kaplıyor.
- **Fırsat (küçük müdahale):** İkisini **işlevsel olarak ayırmak** mümkün, yeni endpoint gerekmez:
  - **Dashboard takvimi** → *"Bugün / bu hafta özeti"* moduna çek: mini ajanda + "bugün teslimi olan ödevler" listesi + "gecikmişler" rozeti. (Veri: `useCalendarEvents` + `useReportsOverview` zaten mevcut.)
  - **Takvim sekmesi** → tam yönetim aracı: öğrenci/program filtresi, etkinlik tıklayınca detay, belki doğrudan ödev atama kısayolu. (`GET /calendar?studentId=...` filtresi backend'de zaten var.)

### 5.2 Dashboard cılız — bir "kontrol paneli" değil, bir liste + takvim

- **Mevcut kod:** `CoachDashboard` yalnızca sol kolonda öğrenci listesi + sağda takvim. KPI yok, "ne yapmalıyım" aksiyonu yok.
- **Sorun:** Koçun ilk açtığı ekran, iş yükünü ve öncelikleri göstermiyor. Oysa tüm veri mevcut: toplam öğrenci, gecikmiş ödev sayısı, bu hafta verilen ödev, tamamlama oranı, yaklaşan teslimler.
- **Fırsat (küçük müdahale):** `useReportsOverview`'in döndürdüğü KPI'lar (`totalStudents`, `assignedThisWeek`, `completedToday`, `totalOverdue`, `successRate`) zaten hazır. Bunları Dashboard'un üstüne **4'lü KPI kartı** olarak koymak, sıfır backend işiyle en yüksek değer dönüşünü sağlar. Ek olarak: "Bugün teslimi olan ödevler" ve "son 3 bildirim" widget'ları.

### 5.3 Koç kendini yazamıyor; koçun ve öğrencinin "kendi takvimi" yok

- **Mevcut kod:** `CoachProfilePage` yalnızca ad/e-posta/rol + program listesi gösteriyor. `coaches` tablosunda biyografi, çalışma saatleri, uzmanlık alanı gibi alanlar **yok**. Öğrenci tarafında ise `/student/calendar` rotası **ComingSoon** — ama backend `GET /api/v1/me/calendar` **hazır**.
- **Sorun (kuramsal):** GROW'un "Reality" adımı ve SRL'nin "planlama" fazı için **kişinin kendi ajandasını kurması** şart. Koç müsaitlik saatlerini, öğrenci de kendi çalışma saatlerini/deneme günlerini yazamıyor.
- **Fırsat (küçük müdahale):**
  - **Öğrenci takvimi:** `StudentCalendarPage` için ComingSoon'u kaldırıp mevcut `useStudent` tarzı bir hook ile `GET /me/calendar`'ı bağlamak. Backend tarafı zaten öğrencinin ödev/sınav/program olaylarını döndürüyor. (En düşük çaba / en yüksek algı farkı.)
  - **Koç müsaitliği/öz-bilgi:** `coaches` tablosuna küçük alanlar eklenmesi gerekir (bu tek "küçük backend eklemesi" olan maddedir); ancak ilk aşamada koç "müsaitlik bloklarını" mevcut takvimine not olarak işleyebilir — bunun için ayrı bir modül gerekmez.

### 5.4 "Programlarım" sekmesi görünüm ve işlev olarak cılız

- **Mevcut kod:** `CoachProgramsPage` → "Yeni Program Oluştur" formu + her program için kart (isim, rol rozeti, öğrenci sayısı, butonlar: Öğretmenler/Dersler/Gruplar/Program/Ayarlar). Öğrenci butonları yeni eklendi ama genel resim hâlâ ince.
- **Sorun:** Bir program kartı, o programın **durumunu** anlatmıyor: kaç aktif öğrenci, kaç gecikmiş ödev, bu hafta ne var, programın açıklaması/rengi. Program açıklaması ve rengi (`description`, `color`) backend'de var ama hiç gösterilmiyor.
- **Fırsat (küçük müdahale):** Her program kartına mini-özet: öğrenci sayısı (var), **program açıklaması + renk bandı** (DTO'da zaten dönüyor), ve "bu programda gecikmiş ödev sayısı" gibi tek bir toplam. Karttan ilgili programa özel bir mini-dashboard'a (öğrenciler + yaklaşan olaylar) geçiş eklenebilir.

### 5.5 Bildirim çanı var ama bildirim ekranı yok (backend tamamen hazır)

- **Mevcut kod:** `useNotifications` hook'u var, layout'larda çan butonu var ve okunmamış sayısını gösteriyor. Backend'de `GET /notifications`, `PATCH /{id}/read`, `PATCH /read-all` uçları ve `useMarkNotificationAsRead` / `useMarkAllNotificationsAsRead` hook'ları **hazır**.
- **Sorun:** Çan butonunun **tıklama aksiyonu yok** — bildirimleri gösteren bir dropdown/panel yok. Kullanıcı "yeni ödev" bildirimi alsa bile onu okuyamıyor, hangi ödev olduğunu göremiyor, ilgili sayfaya gidemiyor. (Bu, az önce eklenen "ödev atanınca öğrenciye bildirim" özelliğinin değerini büyük ölçüde boşa çıkarıyor.)
- **Fırsat (küçük müdahale):** Salt-frontend bir **bildirim dropdown'ı**: çana tıklayınca liste, "okundu işaretle", "tümünü okundu yap", bildirimin `payload`/tipine göre ilgili rotaya yönlendirme. Backend'e dokunmadan, yalnızca mevcut hook'ları kullanarak yapılabilir. **Bu raporun en yüksek etki/çaba oranına sahip kalemlerinden biridir.**

Bu bölümdeki her tespit, 6. bölümde küçük bir müdahale önerisiyle eşleştirilmiştir.

### 5.6 Raporlar yalnızca 4 KPI + tek bir başarı oranı

- **Mevcut kod:** `CoachReports` → `useReportsOverview` (`GET /reports/overview`): toplam öğrenci, bu hafta verilen, bugün biten, toplam gecikmiş + başarı oranı donut'ı.
- **Sorun:** "Analiz" vaadi karşılanmıyor. Öğrenci başına rapor, deneme/net trend grafiği, konu bazlı tamamlanma, ödev tamamlama eğilimi yok. Oysa `exam_results` (net, tarih), `homework_assignments` (durum, tamamlanma %'si), `curriculum_topics` (tamamlanma) tabloları **dolu** ve `/student/exams`, `/student/curriculum` uçlarından kısmen okunuyor.
- **Fırsat (küçük müdahale):** Raporlar sekmesine: (1) **öğrenci listesi + her birinin başarı/tamamlama oranı**, (2) bir öğrenci seçilince **deneme net trend çizgisi** (veri mevcut), (3) **gecikmiş ödev listesi**. Bu, yeni veri toplamak değil, mevcut veriyi birleştirip göstermektir.

### 5.7 Öğrenci ana sayfası ve takvimi eksik (veri var, yüzey yok)

- **Mevcut kod:** `StudentHome` → karşılama + 2 stat kartı (bekleyen ödev, tamamlama oranı) + yaklaşan ödevler + sabit motivasyon sözü. `/student/calendar` ise **ComingSoon**.
- **Sorun:** Öğrenci; son deneme netini, konu takibini, kendi takvimini ana sayfada/ayrı ekranda göremiyor. `StudentProfilePage` bu verileri zaten gösteriyor (`useStudentExams`, `useStudentCurriculum`), ama ana sayfa bunları yansıtmıyor. Ayrıca sabit "motivasyon sözü" kişiye özel değil.
- **Fırsat (küçük müdahale):** (1) Ana sayfaya **"son deneme neti"** kartı eklemek (`useStudentExams` hazır). (2) ComingSoon yerine gerçek **öğrenci takvimi** (`GET /me/calendar`). (3) Motivasyon sözünü veriye bağlamak (örn. "bu hafta %X tamamladın").

### 5.8 Veli ve Öğretmen rolleri büyük ölçüde boş

- **Mevcut kod:** Veli "Takvim" (`/parent/calendar`) ComingSoon; backend `GET /api/v1/me/children/{id}/calendar` hazır. Öğretmen profili fiilen boş.
- **Sorun:** Veli, çocuğunun takvimini/ödev akışını tek bakışta göremiyor; öğretmenin kendi rolüne dair (atandığı dersler, program) görünürlüğü yok.
- **Fırsat (küçük müdahale):** Veli takvimini mevcut `me/children/{id}/calendar`'a bağlamak. Öğretmen profiline "atandığı dersler + program" listesi eklemek (veri zaten mevcut).

### 5.9 Koç, bir öğrencinin ödev geçmişini tek yerde göremiyor

- **Mevcut kod:** `CoachStudentDetail` sekmeleri: Kişisel Bilgiler, Veli, Koç Notları, Sınav Geçmişi. **Ödev geçmişi yok.** Ödev atama modalı var; atanan ödevler yalnızca Takvim'de dağınık görünüyor.
- **Sorun:** Koç, bir öğrencinin "ne verilmiş, ne bitmiş, ne gecikmiş" durumunu öğrenci detayında göremiyor. Oysa `GET /calendar?studentId=...` o öğrencinin ödev+sınav+program olaylarını döndürüyor.
- **Fırsat (küçük müdahale):** Öğrenci detayına **"Ödevler" sekmesi** eklemek; mevcut takvim verisini `studentId` filtresiyle çekip ödevleri kronolojik listelemek.

### 5.10 Toplanan veri yüzeyde görünmüyor (ders adı, konu, tamamlanma yüzdesi)

- **Mevcut kod:** `HomeworkItemDto` artık `SubjectName`, `TopicName`, `CompletionPercentage`, `Status` taşıyor; öğrenci tarafında rozetler gösteriliyor. Ama koçun takvimindeki `CalendarEventDto` yalnızca başlık + öğrenci adı taşıyor.
- **Sorun:** Koç, takvimde "hangi dersin ödevi" ve "ödev ne kadar ilerlemiş" bilgisini göremiyor. Tamamlanma yüzdesi (kısmi ilerleme) sistemde tutuluyor ama koça yansımıyor.
- **Fırsat (küçük müdahale):** Koç takvim etkinliğine `SubjectName` eklemek ve tamamlanma yüzdesini etkinlik detayında göstermek (calendar DTO'suna tek kolon yeterli).

Bu beş tespit, aşağıda bir müdahale haritasına bağlanmıştır.

---

## 6. Öneriler (Küçük Müdahale Haritası)

Her madde: **Sorun → Mevcut altyapı → Öneri → Çaba.**

| # | Öneri | Mevcut altyapı (kod) | Çaba |
|---|---|---|---|
| 1 | **Bildirim dropdown/panel** (çana tıkla → liste → okundu → yönlendir) | `useNotifications`, `useMarkNotificationAsRead`, `useMarkAllNotificationsAsRead`, `GET/PATCH /notifications` | 🟢 Salt frontend |
| 2 | **Dashboard'a KPI kartları + "bugün teslim" + "son bildirimler"** | `useReportsOverview`, `useCalendarEvents`, `useNotifications` | 🟢 Salt frontend |
| 3 | **Öğrenci gerçek takvimi** (ComingSoon'u kaldır) | `GET /api/v1/me/calendar` (backend hazır) | 🟢 Salt frontend |
| 4 | **İki takvimi ayır** (Dashboard=özet ajanda, Takvim=tam yönetim+filtre) | `useCalendarEvents`, `GET /calendar?studentId=` | 🟢/🟡 Frontend ağırlıklı |
| 5 | **Program kartlarına mini-özet** (açıklama, renk, gecikmiş sayısı) | `ProgramDto.description/color/studentCount`, `useReportsOverview` | 🟢 Salt frontend |
| 6 | **Öğrenci detayına "Ödevler" sekmesi** | `GET /calendar?studentId=`, `HomeworkItemDto` | 🟡 Frontend (+ istenirse küçük uç) |
| 7 | **Raporları zenginleştir** (öğrenci başına oran, deneme trendi, gecikmiş listesi) | `exam_results`, `homework_assignments`, `/student/exams`, `/student/curriculum` | 🟡 Frontend + rapor sorgusu |
| 8 | **Ana sayfaya "son deneme neti" + kişiselleştirilmiş motivasyon** | `useStudentExams`, `useStudentHomework` | 🟢 Salt frontend |
| 9 | **Veli takvimi** (ComingSoon'u kaldır) | `GET /api/v1/me/children/{id}/calendar` | 🟢 Salt frontend |
| 10 | **Koç öz-bilgisi + müsaitlik** (biyografi, saatler) | `coaches` tablosuna birkaç kolon + `CoachProfilePage` | 🟡 Küçük backend eki |

> Çaba sınıfları: 🟢 = yalnızca mevcut hook/endpoint bağlama (backend değişmez); 🟡 = küçük backend/şema eklemesi veya yeni sorgu.

---

## 7. Önceliklendirme Matrisi (Etki × Çaba)

Yüksek etki / düşük çaba → **hemen** yapılmalı; gerisi sırayla.

| Öncelik | Kalem | Neden |
|---|---|---|
| 🔴 P0 | #1 Bildirim paneli | Az önce eklenen "ödev bildirimi"nin değerini ancak bu ortaya çıkarır; kullanıcı şu an bildirimi okuyamıyor |
| 🔴 P0 | #3 + #4 Öğrenci takvimi + iki takvimi ayırma | En büyük algı farkı, backend zaten hazır, sıfır ek şema |
| 🟠 P1 | #2 Dashboard KPI + bugün teslim | Koçun ilk ekranı "karar destek" haline gelir |
| 🟠 P1 | #6 Öğrenci detayında ödev geçmişi | Koçun en sık yaptığı işi (öğrenciyi izleme) kolaylaştırır |
| 🟡 P2 | #5 Program kartı özeti, #8 öğrenci ana sayfa özeti | Hızlı, orta etki |
| 🟡 P2 | #7 Rapor zenginleştirme | Daha büyük, ama veri hazır |
| 🟢 P3 | #9 Veli takvimi, #10 koç öz-bilgisi | İyi, ama önce üsttekiler |

---

## 8. Sonuç

`Mentörüm` şu anda **"veriyi toplayan ama veriyi kullanıcıya karar olarak geri vermeyen"** bir noktada. Backend; takvim, bildirim, rapor, sınav ve müfredat verisini büyük ölçüde üretiyor; eksik olan bunları **doğru ekrana, doğru biçimde** taşımak. Bu rapor, yeni modül yazmadan, çoğu yalnızca frontend bağlantısıyla kapatılabilecek **on somut boşluk** ve bunların önceliğini sunmaktadır.

Modern mentörlük kuramları (GROW, öz-düzenlemeli öğrenme, biçimlendirici değerlendirme, mentörlük ilişkisi) açısından en kritik iki eksen şunlardır:

1. **Geri bildirim döngüsü:** Koç → ödev/sınav → öğrenci tamamlama → koça görünür ilerleme → yeni aksiyon. (Bugün bu zincir, "koç öğrencinin ilerlemesini göremiyor" noktasında kopuyor.)
2. **Öğrenci ajandası/özerkliği:** Öğrencinin kendi planını kurabilmesi (SRL) ve koçun kendi müsaitliğini yönetebilmesi. (Bugün ikisi de yok.)

Bu iki ekseni yukarıdaki P0/P1 kalemleriyle kapatmak, uygulamanın hem **kullanıcı deneyimini** hem de **mentörlük değerini** en düşük maliyetle yükseltir.

---

*Rapor sonu. Hazırlayan: DeepSeek — Cline ajanı.*



