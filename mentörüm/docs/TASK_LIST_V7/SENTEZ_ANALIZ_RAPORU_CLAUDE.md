# 🏗️ Mentörüm Koç & Öğrenci Platformu — Sentez Analiz Raporu
## *Mevcut Özelliklerin Değerlendirilmesi, Boşluk Analizi ve Küçük Müdahale Haritası*

> **Hazırlayan:** Claude Sonnet (Anthropic) — Antigravity Agent  
> **Tarih:** 15 Ekim 2026  
> **Yöntem:** Bu rapor bağımsız olarak oluşturulmuştur; ardından aynı konu üzerinde hazırlanan iki önceki raporun (DeepSeek ve Gemini 3.8 Flash) bulguları ile karşılaştırılmış ve sentezlenmiştir.  
> **Referans Belgeler:**  
> - `mentörüm/docs/TASK_LIST_V7/EKRAN_TASVIRLERI.md` — 5 ekran görüntüsünün piksel bazlı tasviri  
> - `mentörüm/docs/TASK_LIST_V7/MEVCUT_OZELLIK_DEGERLENDIRME_DEEPSEEK.md` — DeepSeek raporu  
> - `mentörüm/docs/TASK_LIST_V7/ANALIZ_VE_IYILESDIRME_RAPORU.md` — Gemini 3.8 Flash raporu  
> **Temel İlke:** Yeni modül eklemek değil; **elindeki verinin, tablonun ve bileşenin tam kapasiteyle kullanılmadığı yerleri tespit etmek** ve bu boşlukları mümkün olan en küçük müdahaleyle kapatmak.

---

## 1. Yönetici Özeti

Ekran görüntüleri ve kod analizi birlikte incelendiğinde ortaya çıkan ana çelişki şudur: **Platform güçlü bir backend altyapısına sahip, ancak bu altyapının büyük kısmı ya arayüze hiç taşınmamış ya da yanlış yere, yanlış biçimde taşınmıştır.**

Özetlemek gerekirse:

| Sorun | Gerçek Durum |
|---|---|
| "İki takvim var ama ikisi de aynı şeyi yapıyor" | ✅ Doğrulandı. Dashboard takvimi ile sol menü Takvimi birebir aynı `useCalendarEvents` hookunu, aynı aylık görünümü kullanıyor. |
| "Dashboard bir kontrol paneli değil" | ✅ Doğrulandı. `useReportsOverview` KPI'ları hazır ama Dashboard'a bağlanmamış. |
| "Koç kendi takvimini yönetemiyor, öğrencinin de özerk ajandası yok" | ✅ Doğrulandı. Öğrenci takvimi `/student/calendar` sayfası "ComingSoon" gösteriyor; backend `GET /me/calendar` ise hazır. |
| "Bildirim çanı var ama bildirim listesi yok" | ✅ Doğrulandı. Hook'lar ve backend endpoint'leri hazır; sadece dropdown panel bileşeni eksik. |
| "Programlarım cılız" | ✅ Doğrulandı. `description` ve `color` alanları DTO'da dönüyor ama kart bileşeni bunları göstermiyor. |
| "Raporlar boş beyaz bir ekran" | ✅ Doğrulandı. `exam_results`, `homework_assignments` tablolarındaki veri var; ama sayfanın %80'i beyaz zemin. |

Bu tespitlerin her biri, aşağıda pedagojik gerekçesi ve pratik çözüm önerisiyle birlikte ele alınmıştır.

---

## 2. Pedagojik Çerçeve: Bir Koç ve Öğrenci Gerçekte Neye İhtiyaç Duyar?

Teknik boşlukları tartışmadan önce, bir eğitim koçluk platformunun hangi insan ihtiyaçlarına hizmet etmesi gerektiğini netleştirmek gerekir.

### 2.1. Koçun İhtiyaçları (Operasyonel Bakış)

Bir eğitim koçu sisteme her girdiğinde şu 4 soruya hızla yanıt almak ister:

```
"Bugün kim ödevini yapmadı?"           → Takip Radarı (At-Risk)
"Bu hafta kime ne kadar zaman harcadım?"→ Kapasite Görünümü
"Bir sonraki görüşmeye nasıl hazırlanayım?" → Öğrenci Özeti (Snapshot)
"Hangi öğrenci gerçekten ilerliyor?"    → Trend & Karne
```

Bu 4 soruya bugün Mentörüm'de **hiçbiri** tek bir yerde doğrudan yanıtlanamıyor.

### 2.2. Öğrencinin İhtiyaçları (Öz-Düzenlemeli Öğrenme — SRL Modeli)

Zimmerman'ın Öz-Düzenlemeli Öğrenme Modeli üç fazdan oluşur:

```
[1. PLANLAMA]          [2. İZLEME]           [3. ÖZ-YENİLEME]
Hedef koy,            Ne kadar ilerlediğimi  Stratejimi gözden
zaman blokla,         takip et, koçumla      geçir, yeni hedef
çalışma takvimi       paylaş, sorularımı     belirle.
oluştur.              hazırla.
```

Mentörüm'de öğrenci yalnızca **2. faza (İzleme)** kısmen dahil olmaktadır — ve o da yalnızca koçun atadığı ödevlere yanıt olarak. Öğrencinin sisteme kendi sınav tarihini, kendi çalışma bloklarını ya da "koçuma sormak istediğim sorular" notunu girmesi **mümkün değil**.

### 2.3. Modern Koçluk Görüşmesi: Hazırlık-Görüşme-Takip Döngüsü

Araştırmalar, etkili bir koçluk seansının üç ayaktan oluştuğunu göstermektedir:

- **Hazırlık (Pre-session):** Öğrenci görüşmeden önce kısa bir öz-değerlendirme doldurur. Koç bunu okuyarak görüşmeye konuyla girer.
- **Görüşme:** Sorunlar "raporlama" değil "stratejik tartışma" şeklinde yürür.
- **Takip (Post-session):** "Ne yapacağım / ne zaman?" aksiyonları takvime işlenir.

Bu döngü Mentörüm'de henüz hiç oluşturulmamış. Koç notları var ama görüşmeye hazırlık formu, önceki seanstan gelen aksiyon takibi ve görüşme sonrası takvim entegrasyonu yok.

---

## 3. Tespit Kataloğu: Boşluklar ve Müdahale Önerileri

### 3.1. İki Takvim Aynı Şeyi Yapıyor — En Görünür Çelişki

**Tespit:** Dashboard'daki "Genel Takvim" ile sol menüdeki "Takvim" sayfası birebir aynı bileşeni, aynı veriyi, aynı aylık ızgara görünümünde render ediyor. Koçun bu iki ekran arasında gezinmesinin mantıksal bir nedeni yok.

**Neden Önemli:** Dashboard koçun her gün ilk açtığı ekrandır. Bu ekranın en değerli alanının %65'i (sağ kolon) dev ve statik bir aylık takvimle işgal edilmesi; acil günlük kararlar için gereken bilgiye (bugün kim teslim etmedi, bugün hangi görüşmem var) erişimi zorlaştırıyor.

**Önerilen Rol Ayrışması:**

| Ekran | Mevcut Durum | Önerilen Fonksiyon |
|---|---|---|
| **Dashboard (sağ kolon)** | Aylık takvim (`react-big-calendar`) | **"Bugün & Bu Hafta Kokpiti":** Ajanda görünüm, bugün teslim edilecek ödevler listesi, yaklaşan kritik tarihler. |
| **Sol Menü → Takvim** | Aylık takvim (aynı) | **"Makro Planlama Merkezi":** Öğrenci/program filtresi, etkinlik türü filtresi, koçun kendi randevularını ekleyebilmesi, tam ekran yönetim aracı. |

**Gereken Müdahale:** Dashboard takvim bileşeninin `view` prop'u değiştirilerek agenda/haftalık moda alınması; ayrı bir filtre dropdown'ı eklenmesi. Backend değişikliği gerekmez.

---

### 3.2. Dashboard Bir Kontrol Paneli Değil, Bir Liste + Takvim

**Tespit:** Dashboard'da şu an yalnızca öğrenci listesi ve takvim var. Koçluk yönetiminin temel aracı olan "Kim risk altında? Bugün ne yapmalıyım?" soruları bu ekranda yanıtsız kalıyor.

**Kritik Veri Nerede?** `useReportsOverview` hook'u halihazırda şu verileri döndürüyor:
- `totalStudents`
- `assignedThisWeek`
- `completedToday`
- `totalOverdue`
- `successRate`

Bu veriler **zaten mevcut**, ancak Raporlar sayfasında kapalı duruyor. Dashboard'un öğrenciden sonraki ilk satırına konulabilecek 4'lü bir KPI kartı grubu, koçun sisteme her girişte iş yükünü saniyeler içinde kavramasını sağlar.

**Ek Eksiklik — Öğrenci Kartındaki Bilgi Yoksulluğu:**  
Ekran görüntüsünde kart şöyle görünüyor:
```
[c] can öğrenci
    . Sınıf • -           [İncele]
```
`Sınıf • -` ifadesi verinin girilmediğini gösteriyor; ama daha önemli olan, kart hiçbir durum bilgisi taşımıyor. Koç bu kartı gördüğünde öğrencinin aktif ödev yükü, programı veya son aktivitesi hakkında hiçbir fikir edinemiyor.

**Önerilen Öğrenci Kartı:**
```
[c] can öğrenci            [Program: çilek]
    canoser@hotmail.com
    📚 Aktif Ödev: 2  ✅ Tamamlanan: 1  🔴 Gecikmiş: 0
                                              [İncele]
```

**Gereken Müdahale:** `useStudents` hook'unu ödev sayılarını da dönecek şekilde genişletmek veya `students` listesine `activeHomework` / `overdueHomework` sayısını eklemek (mevcut `homework_assignments` tablosundan bir `COUNT JOIN` yeterli).

---

### 3.3. Bildirim Çanı Var Ama Bildirim Listesi Yok — En Yüksek Etki/Çaba Oranı

**Tespit:** Sol üst köşedeki sarı 🔔 çan simgesi tıklanamıyor. Arkasında bir panel veya dropdown yok. Ancak:
- `useNotifications` hook'u var
- `useMarkNotificationAsRead` hook'u var  
- `useMarkAllNotificationsAsRead` hook'u var
- Backend `GET /notifications`, `PATCH /{id}/read`, `PATCH /read-all` endpoint'leri hazır

Az önce eklenen "ödev atanınca öğrenciye bildirim gönder" özelliği de bu nedenle kullanıcıya hiçbir değer katmıyor — çünkü öğrenci gelen bildirimi göremiyor.

**Bu, raporun en düşük geliştirme maliyeti + en yüksek kullanıcı etkisi kalemleridir.**

**Önerilen Müdahale:** Çana tıklandığında açılan basit bir dropdown panel (salt frontend):
- Bildirim listesi (ikon + metin + zaman)
- Tek tıkla "okundu" işaretleme
- "Tümünü okundu yap" butonu
- Tıklandığında ilgili sayfaya yönlendirme (`/coach/students/{id}`, `/coach/calendar` vb.)

---

### 3.4. Koç Kendi Zamanını Yönetemiyor; Öğrencinin Özerk Ajandası Yok

**Bu alan, üç raporun da en güçlü biçimde hemfikir olduğu noktadır.**

#### 3.4.1. Koç Açısından
Koçluk salt ödev vermekten ibaret değil. Gerçek bir koçun takviminde şunlar da yer alır:
- `"Pzt 14:00-15:00 — Can ile 1-e-1 Görüşme"`
- `"Çrş 17:00 — Veli Bilgilendirme Toplantısı"`
- `"Sal 19:00-21:00 — Kişisel Hazırlık / Müsait Değil"`

Takvimde bu tür girişler yapılamadığı için sistem, koçun gerçek çalışma ritmine değil yalnızca öğrenci verisine bakıyor. Koç yönetim araçsallığını (agency) kaybediyor.

**Mevcut Altyapı ile Çözüm:** Takvim ekranındaki "boş gün tıklama" modalına şu an yalnızca "Ödev" atama mevcut. Buna ek olarak `"Koçluk Görüşmesi"`, `"Veli Görüşmesi"`, `"Kişisel Blok"` türleri eklenmesi, backend'de `event_type` kolonuna yeni enum değerleri açmayı gerektiriyor — bu küçük ama bilinçli bir backend dokunuşu.

#### 3.4.2. Öğrenci Açısından
Öğrencinin takvim sayfası hâlâ "Çok Yakında" (ComingSoon) gösteriyor. Oysa backend `GET /api/v1/me/calendar` endpoint'i öğrencinin tüm ödev, sınav ve program olaylarını hazır döndürüyor. Bu sayfanın ComingSoon yerine çalışır bir takvime bağlanması **sıfır backend değişikliği** gerektiriyor.

Daha ötesi: Öğrenci sisteme sadece koçun atadıklarını görebilmeli değil; kendi:
- Okul sınav tarihlerini
- Deneme sınavı günlerini
- Kendi "çalışma bloklarını"
- "Koçuma soracaklarım" notlarını

da girebilmelidir. Bu, SRL'nin (Self-Regulated Learning) dijital koşuldaki doğrudan karşılığıdır ve öğrenciyi pasif alıcıdan aktif planlayıcıya dönüştürür.

---

### 3.5. "Programlarım" Sekmesinin Cılızlığı

**Tespit:** Ekran görüntüsünde iki program kartı var: "çilek" ve "Koçluk Programım". Her kart şunları gösteriyor:
- İsim + Yönetici rozeti
- "Öğrenci: 1"
- Öğrenci ismi butonu
- [Öğretmenler] [Dersler] [Gruplar] [Program] [Ayarlar]

**Sorunlar:**

1. **Programın amacı belli değil.** YKS mi, LGS mi, 11. sınıf ara destek mi? `description` ve `color` alanları DTO'dan dönüyor ama kart göstermiyor.

2. **5 düğme yan yana ama içerik görünmüyor.** Koç bu karttan, programda kaç ders ve kaç öğretmen tanımlı olduğunu anlayamıyor; bunu görmek için her seferinde alt sayfaya gitmek zorunda.

3. **İlerleme yok.** Programın hangi haftasındayız, tamamlanma yüzdesi nedir, dönemin kalanı kaç hafta — hiçbiri görünmüyor.

4. **Kart hiyerarşisi görsel olarak zayıf.** Tüm programlar aynı beyaz kart görünümünde; renk, amblem veya kategori ayrımı yok.

**Önerilen Program Kartı Anatomisi (DTO zaten hazır):**

```
┌─────────────────────────────────────────────────┐
│ 🟣 çilek                        [Yönetici]       │
│ "YKS Sayısal Hazırlık — 2026-2027"               │
│ ─────────────────────────────────────────        │
│ 👤 Öğrenci: 1    📚 Ders: 4    👨‍🏫 Öğretmen: 2  │
│ ████████░░░░░░░  55% tamamlandı                  │
│ 🔴 Gecikmiş Ödev: 2 — Bu hafta: 3 teslim         │
│ ─────────────────────────────────────────        │
│ [Öğretmenler] [Dersler] [Gruplar] [Program]      │
└─────────────────────────────────────────────────┘
```

**Gereken Müdahale:** `GET /programs` sorgusuna `COUNT(DISTINCT teachers)`, `COUNT(DISTINCT courses)`, `SUM(overdue_assignments)` eklemek; kart bileşenini bu alanları render edecek şekilde güncellemek.

---

### 3.6. "Öğrenciler" Sayfası: Adres Defteri, Yönetim Paneli Değil

**Tespit:** Öğrenci kartı şu an şunları gösteriyor: Avatar, isim, e-posta, `Kayıtlı / Aktif` rozeti, `Profili Gör` ve `Ödev Ata`.

**Eksiklikler:**

1. **Hızlı durum yok.** Koç öğrencinin ödev yükünü ve gecikme durumunu görmek için mutlaka `Profili Gör`'e tıklamak zorunda. Öğrenci sayısı arttıkça bu bir saatlik rutin haline gelir.

2. **Filtreleme yok.** "Sadece YKS öğrencilerini göster", "sadece çilek programındakileri göster", "sadece gecikmiş ödevi olanları göster" gibi sorgular yapılamıyor.

3. **Koç öğrenciye tek tek ödev atabiliyor.** Aynı programdaki 10 öğrenciye aynı ödevi vermek için 10 kez ayrı ayrı modal açmak gerekiyor.

4. **Öğrenci detay sayfasında "Ödevler" sekmesi yok.** Koç bir öğrencinin geçmiş ödev tarihçesini, hangi ödevlerin yapılıp yapılmadığını tek yerde göremeyip takvimde aramak zorunda kalıyor.

**Gereken Müdahale (küçük ama yüksek etkili):**
- Arama kutusunun sağına `[Program ▼]` ve `[Sınıf ▼]` dropdown filtreleri
- Kart üzerine 3 mini rozet: `📚 Aktif: 2`, `✅ Biten: 1`, `🔴 Gecikmiş: 0`
- Öğrenci detay sekmelerine `[Ödevler]` sekmesi eklenmesi

---

### 3.7. "Raporlar ve Analizler" Sayfası: Sayfanın %80'i Boş

**Tespit:** Raporlar sayfasının üst kısmında 4 KPI sayısı ve bir donut grafik var; altında devasa beyaz zemin. `exam_results`, `homework_assignments`, `curriculum_topics` tabloları veriyle dolu ama sayfa bu veriyi kullanmıyor.

**Pedagojik Eksiklik:** Koç bir veliye veya öğrenciye "bak bu hafta performansın bu" diyebileceği, ders bazlı kırılımı olan, trendini gösteren somut bir veri sunumu yapamıyor. Bu, koçun otoritesini ve sistemin değerini düşürüyor.

**Önerilen Ek İçerikler (veri zaten mevcut):**

```
[Öğrenci Seçiniz: Tüm Öğrenciler ▼]
────────────────────────────────────

Toplam: 1 | Bu Hafta: 2 | Bugün Biten: 1 | Gecikmiş: 0
                              [%50 Başarı Donut]

Sol Alt: Ders Bazlı Başarı         Sağ Alt: Son Teslimler
────────────────────────          ─────────────────────────
Matematik   ████████ 80%          ✅ integrale giriş   20 Eki
Fizik       ████░░░░ 40%          🔴 karma test        16 Eki (gecikmiş)
Kimya       ██░░░░░░ 20%
```

---

### 3.8. Koçluk Görüşme Döngüsü Hiç Kurulmamış

Bu tespit, önceki iki raporun net olarak dile getirmediği özgün bir bulgudur.

**Sorun:** Mentörüm'de bir koçluk görüşmesini temsil eden resmi bir yapı yok:
- Görüşme öncesi öğrenci hazırlık formu yok
- Görüşme sırasında paylaşılan not defteri yok
- Görüşme sonrası "Aksiyon Öğeleri (Action Items)" takvime işlenmiyor

Bunlar olmadan, koç her haftaki görüşmeye hazırlıksız giriyor ve öğrenciyle sadece "ne ödev yaptın?" konuşuluyor. Gerçek mentörlük görüşmesi ise öğrencinin kendi refleksiyonunu getirip koçun stratejik yön verdiği bir seansa dönüşmeli.

**Küçük Ama Dönüştürücü Müdahale:** "Koç Notu" özelliği zaten var. Bunu:
1. **Görüşme Notu** (belirli bir tarihe bağlı, görüşme tipi seçilebilir)
2. **Aksiyon Öğesi** (öğrenciye görünür, takvime işlenen hatırlatıcı)

olarak kategorize etmek, derin bir mimari değişiklik gerektirmeden görüşme döngüsünü oluşturur.

---

## 4. Üç Raporun Karşılaştırmalı Sentezi

Üç ajanın bulguları arasındaki örtüşmeler ve farklılıklar aşağıdaki tabloda özetlenmiştir:

| Tespit | DeepSeek | Gemini 3.8 | Claude | Konsensüs? |
|---|---|---|---|---|
| İki takvim aynı işi yapıyor | ✅ | ✅ | ✅ | **Güçlü konsensüs** |
| Dashboard KPI kartı eksik | ✅ | ✅ | ✅ | **Güçlü konsensüs** |
| Bildirim paneli yok (backend hazır) | ✅ | ❌ | ✅ | DeepSeek + Claude |
| Öğrenci takvimi ComingSoon | ✅ | ✅ | ✅ | **Güçlü konsensüs** |
| Koçun kendi ajandası yok | ✅ | ✅ | ✅ | **Güçlü konsensüs** |
| Programlar cılız | ✅ | ✅ | ✅ | **Güçlü konsensüs** |
| Öğrenci detayında ödev sekmesi yok | ✅ | ❌ | ✅ | DeepSeek + Claude |
| Raporlar sayfası boş | ✅ | ✅ | ✅ | **Güçlü konsensüs** |
| Takvim etkinliğinde ders adı eksik | ✅ | ❌ | ✅ | DeepSeek + Claude |
| Görüşme döngüsü hiç kurulmamış | ❌ | ❌ | ✅ | **Sadece bu rapor** |
| Öğrenci hazırlık formu / aksiyon ögesi | ❌ | ❌ | ✅ | **Sadece bu rapor** |
| Öğrenciler sayfasına filtre | ❌ | ✅ | ✅ | Gemini + Claude |

**Sentez Yorumu:**

- **Tüm raporların hemfikir olduğu** (en yüksek güven) konular: İki takvim çelişkisi, Dashboard KPI eksikliği, öğrenci takviminin ComingSoon kalması, programlar cılızlığı, raporlar boşluğu, koç ajandası yokluğu.
- **Yalnızca DeepSeek'in** öne çıkardığı: Bildirim paneli eksikliği — en düşük efor, en yüksek algı etkisi olan kalemdir; bu raporun da desteklediği kritik bir bulgu.
- **Yalnızca bu raporun** işaret ettiği: Koçluk görüşme döngüsünün (hazırlık formu + aksiyon öğesi) kurulmamış olması — teknik altyapıdan çok pedagojik bir boşluk.

---

## 5. Birleşik Müdahale Haritası ve Önceliklendirme

Tüm raporların bulguları konsolide edilerek aşağıdaki öncelik sırası oluşturulmuştur:

### 🔴 P0 — Hemen Yapılmalı (Sıfır veya Minimal Backend)

| # | İyileştirme | Altyapı Durumu | Tahmini Efor |
|---|---|---|---|
| **A** | **Bildirim dropdown paneli** ekle (çana tıkla → liste → okundu → yönlendir) | Hook'lar + endpoint'ler hazır; salt frontend | ~0.5 gün |
| **B** | **Öğrenci takvimini** ComingSoon'dan gerçek takvime bağla | `GET /me/calendar` hazır; salt frontend | ~0.5 gün |
| **C** | **Dashboard KPI kartları** ekle (4'lü satır: Toplam Öğrenci / Bu Hafta Verilen / Gecikmiş / Başarı) | `useReportsOverview` hazır; salt frontend | ~0.5 gün |
| **D** | **Dashboard sağ kolonunu** aylık takvimden ajanda/haftalık görünüme çevir | `react-big-calendar` `view` prop değişimi | ~0.5 gün |

### 🟠 P1 — Bir Sonraki Sprint (Minimal Backend)

| # | İyileştirme | Altyapı Durumu | Tahmini Efor |
|---|---|---|---|
| **E** | **Takvim sayfasına filtre** ekle (Öğrenci dropdown + Etkinlik türü toggle) | `GET /calendar?studentId=` hazır; küçük frontend eki | ~1 gün |
| **F** | **Program kartlarına mini-özet** (açıklama, renk bandı, ders/öğretmen sayısı, gecikmiş ödev) | DTO'da `description/color` var; COUNT JOIN eklenmeli | ~1 gün |
| **G** | **Öğrenci detayına "Ödevler" sekmesi** ekle (geçmiş, durum, tarih) | `GET /calendar?studentId` + `HomeworkItemDto` | ~1 gün |
| **H** | **Takvime "Koçluk Görüşmesi" türü** ekle (event_type genişletme) | Küçük backend enum eki + frontend modal seçeneği | ~1 gün |

### 🟡 P2 — Orta Vadeli (Backend Eki Gerekli)

| # | İyileştirme | Altyapı Durumu | Tahmini Efor |
|---|---|---|---|
| **I** | **Raporlar sayfasını zenginleştir** (öğrenci filtresi + ders dağılımı + son teslimler) | `exam_results`, `homework_assignments` hazır; yeni sorgular | ~2 gün |
| **J** | **Öğrenciler sayfasına filtre + kart durum rozetleri** ekle | Ödev sayıları için JOIN sorgusu eklenmeli | ~1 gün |
| **K** | **Koç profiline biyografi + uzmanlık alanı** ekle | `coaches` tablosuna kolon eklenmesi gerekiyor | ~1 gün |
| **L** | **Öğrencinin özerk çalışma ajandası** (kendi sınav tarihleri, kendi çalışma blokları) | Yeni `student_personal_events` tablosu veya mevcut `calendar_events` genişletmesi | ~2 gün |

### 🟢 P3 — Uzun Vadeli (Mimari Düşünce Gerekli)

| # | İyileştirme | Altyapı Durumu | Tahmini Efor |
|---|---|---|---|
| **M** | **Koçluk görüşme döngüsü** (hazırlık formu + aksiyon öğeleri + takvim entegrasyonu) | Yeni `coaching_sessions` yapısı veya mevcut notlar genişletmesi | ~3-5 gün |
| **N** | **Veli takvimi** (ComingSoon → `GET /me/children/{id}/calendar`) | Backend hazır; salt frontend | ~0.5 gün |

---

## 6. Sonuç

Mentörüm, **sağlam bir backend altyapısına ve temiz bir tasarım diline** sahip bir platformdur. Ancak bu altyapının büyük kısmı arayüzde yüzeye çıkarılamamış ya da birden fazla yerde mükerrer biçimde sunulmuştur.

Üç ajanın birbirinden bağımsız analizinin ortak özetlenebileceği tek cümle şudur:

> **"Platform veriyi topluyor ama kullanıcıya karar olarak geri veremiyor."**

P0 kalemleri olan bildirim paneli, öğrenci takvimi, dashboard KPI satırı ve takvim ajanda modu — hepsi birden, backend değişikliği olmaksızın, toplamda 2-3 günlük frontend çalışmasıyla hayata geçirilebilir. Bu 4 kalem uygulandığında platform; görsel olarak aynı ama işlevsel olarak birkaç kat daha güçlü ve kullanılabilir bir konuma yükselecektir.

---

*Rapor sonu. Hazırlayan: Claude Sonnet (Anthropic) — Antigravity Agent, 15 Ekim 2026.*
