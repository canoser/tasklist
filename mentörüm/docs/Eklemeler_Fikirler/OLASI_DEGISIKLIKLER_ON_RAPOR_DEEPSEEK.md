# 🧭 OLASI_DEGISIKLIKLER_ON_RAPOR — Z Koçluk (zkocluk.com) Uyarlama Analizi & Görev Listesi

> **Tarih:** 12 Ekim 2026
> **Amaç:** `docs/zkocluk.com/` (35 ekran tasviri + HTML kaynak) ve canlı site (`https://zkocluk.com/`) incelenerek, Z Koçluk'tan **Mentörüm'e uyarlanabilir** işlevlerin (ödeme dahil) adım adım analizi + zorluk sınıflandırması.
> **Kapsam dışı:** Marka/logo; sadece fonksiyonel/teknik uyarlamalar.

---

## 1. Yönetici Özeti

Z Koçluk; öğretmen/koç/etüt/özel okul hedefli, "plan üretimi + QR takip" odaklı bir platform. Mentörüm şu an **koçluk programı + okul modeli** kurulu; Z Koçluk'un **fark yaratan** modülleri yok.

**Uyarlanabilir yüksek değerli yetenekler (öncelik sırası):**

1. **Plan Hazırla** (12 tür) + **PDF + QR kodlu plan** paylaşımı.
2. **QR/token ile hafif öğrenci ekranı** (öğrenci tam uygulama indirmez).
3. **Öğrenci Takip Radarı** (bugün kim yaptı/yapmadı).
4. **E-Okul / Excel toplu öğrenci yükleme**.
5. **Web push + WhatsApp bildirim**.
6. **Sanal Optik** (karne/optik okuma).
7. **Tercih Koçluğu** (LGS/YKS, YÖK Atlas).
8. **Öğrenci Tanıma** anketleri.
9. **Raporlar** (Veli Toplantı, Tanıma, Optik) — PDF.
10. **Üyelik/Paket + Dinamik Fiyat + Ödeme (PayTR/kart/havale) + e-Fatura**.
11. **Kurumsal yasal sayfalar**.
12. **Yardım Masası**.
13. **Z Koçluk Asistan** (RAG chatbot).

**Mevcut stack:** C# .NET 9 minimal API + Dapper + PostgreSQL (Neon) + JWT (refresh cookie) + BCrypt + Google OAuth + Resend + Serilog + IdempotencyFilter. Frontend: React 19 + Vite + react-router-dom 7 + React Query + Zustand + CSS Modules + i18next + react-big-calendar + date-fns + Capacitor + PWA (sw.js).

---

## 2. Karşılaştırma Tablosu

| # | Z Koçluk özelliği | Mentörüm'de durumu | Zorluk |
|---|---|---|---|
| 1 | Öğrenci Takip Radarı | Zayıf dashboard | 🟡 Orta |
| 2 | Öğrenci Listesi | Var (kart) | 🟢 Kolay |
| 3 | E-Okul yükle | Yok | 🔴 Zor |
| 4 | Excel yükle | Yok | 🟡 Orta |
| 5 | Plan Hazırla (12 tür) | Yok | 🔴 Zor |
| 6 | Plan Düzenle | Yok | 🟡 Orta |
| 7 | PDF + QR kod | Yok | 🟡 Orta |
| 8 | QR/token öğrenci ekranı | Yok | 🟡 Orta |
| 9 | Dijital İçerik Gönder | course_resources var | 🟢 Kolay |
| 10 | Sanal Optik | Yok | 🔴 Zor |
| 11 | Tercih Koçluğu | Yok | 🔴 Zor |
| 12 | Öğrenci Tanıma anketleri | Yok | 🟢 Kolay |
| 13 | Web push bildirim | In-app + e-posta | 🟡 Orta |
| 14 | WhatsApp bildirim | Yok | 🔴 Zor |
| 15 | Raporlar (Veli/Tanıma/Optik) | Sadece overview | 🟡 Orta |
| 16 | Fatura ekranı | Yok | 🟡 Orta |
| 17 | Ödeme (PayTR) | Yok | 🔴 Zor |
| 18 | Üyelik/Paket (dinamik fiyat) | Yok | 🟡 Orta |
| 19 | Kurumsal yasal sayfalar | Yok | 🟢 Kolay |
| 20 | Yardım Masası | Yok | 🟢 Kolay |
| 21 | Asistan (RAG chatbot) | Yok | 🔴 Zor |

---

## 3. Detaylı Analiz (her özellik: ne → durum → zorluk → adım adım → teknoloji)

### 3.1 Öğrenci Takip Radarı — 🟡 Orta
**Ne:** "Bugün/Dün/1 Hafta/1 Ay" filtresiyle hangi öğrencinin görevlerini yapıp yapmadığını gösteren radar. `[Yapanlar]/[Yapmayanlar]` toggle.
**Mentörüm:** dashboard öğrenci+takvim gösteriyor; "yapan/yapmayan" agregasyonu yok.
**Adım adım:**
1. `ReportsRepository.GetStudentActivityAsync(coachId, from, to)` → `homework_assignments` üzerinden öğrenci başına done/total.
2. DTO `StudentActivityDto { StudentId, FullName, DoneCount, TotalCount, Rate }`.
3. `GET /api/v1/reports/student-activity?from=&to=` (RequireCoachRole).
4. Frontend: `CoachDashboard`'a radar ızgarası + filtreler (React Query + date-fns).
**Teknoloji:** Mevcut stack; ek yok.

### 3.2 Excel'den Öğrenci Yükleme — 🟡 Orta
**Ne:** Koç Excel şablonu doldurup toplu öğrenci oluşturur.
**Adım adım:** 1) Şablon üret (`ClosedXML`). 2) `POST /api/v1/students/import` (multipart xlsx) → parse → transaction ile `users`+`students` INSERT; e-posta çakışması satır bazında rapor. 3) Frontend: dosya seç → önizleme → içe aktar → sonuç. 4) Güvenlik: boyut/uzantı limiti + `program_coaches` sahiplik.
**Teknoloji:** `ClosedXML` (NuGet).

### 3.3 E-Okul'dan Yükle (PDF) — 🔴 Zor
**Ne:** E-Okul sınıf listesi PDF'ini parse edip öğrenci eklemek.
**Adım adım:** 1) PDF metin çıkarımı (`UglyToad.PdfPig`). 2) E-Okul tablo yapısına göre satır/kolon ayrıştırma. 3) Format değişkenliği için OCR fallback. 4) 3.2 ile aynı içe aktarma.
**Teknoloji:** `UglyToad.PdfPig` + OCR. **Not:** E-Okul formatı kararsız; ilk etapta Excel tercih edilmeli.

### 3.4 Plan Hazırla (çok türlü) — 🔴 Zor
**Ne:** 12 kaynaktan (kazanım/ders/konu/müfredat/LGS/YKS/karne/yanlış analizi) haftalık plan üretme.
**Mentörüm:** `curriculum_topics`, `homework_assignments`, `exam_results` mevcut → temel veri var.
**Adım adım (fazlı):**
- Faz A (MVP): Serbest+Konu+Ders Temelli → koç elle öğrenci×gün×konu seçerek plan oluşturur.
- Faz B: Kazanım/Müfredat Temelli → müfredat + eksiklerden otomatik sıralama.
- Faz C: Karne/Yanlış analizi temelli → `exam_scores` ile zayıf konular.
- Yeni tablolar: `study_plans` + `study_plan_items`; endpoint `POST /api/v1/programs/{pid}/students/{sid}/plans`; PDF+QR çıktısı; "Plan Hazırla" sihirbazı.
**Teknoloji:** `QuestPDF` + `QRCoder`.

### 3.5 PDF + QR Kodlu Plan — 🟡 Orta
**Ne:** Koç planı/karnesi PDF indirir; PDF'te öğrenci erişim QR'ı ve koç adı/kurum başlığı bulunur.
**Adım adım:** 1) `PdfService` (QuestPDF) + başlıkta `coaching_programs.name`. 2) `QRCoder` ile token URL. 3) `GET /api/v1/plans/{id}/pdf`. 4) Frontend: PDF indir + marka adı ayarı.
**Teknoloji:** `QuestPDF` + `QRCoder`.

### 3.6 QR/Token Hafif Öğrenci Ekranı — 🟡 Orta
**Ne:** Öğrenci QR/token ile "bugünkü görevlerim" hafif ekranını açar (tam giriş yok).
**Adım adım:** 1) `student_access_tokens` (token, student_id, expires_at, is_revoked). 2) `POST /api/v1/auth/student-token` → kısa ömürlü Student JWT. 3) `/student/token/:token` sayfası → doğrula → görev ekranı. 4) QR bu URL'yi taşır.
**Teknoloji:** Mevcut JWT + yeni token tablosu.

### 3.7 Dijital İçerik Gönder — 🟢 Kolay
**Ne:** Koç öğrencilere PDF/dosya/link gönderir.
**Adım adım:** 1) `course_resources`'a dosya URL/tipli kaynak ekleme (Cloudflare R2 presigned). 2) Öğrenciye atama + bildirim. 3) Öğrenci "içerikler" listesi.
**Teknoloji:** Mevcut stack + R2 (mevcut konfigde var).

### 3.8 Sanal Optik — 🔴 Zor
**Ne:** Karne/optik fotoğrafından sınav sonuçlarını otomatik işleme.
**Adım adım:** 1) Görüntü + optik işaret tanıma (OpenCV/OCR). 2) Sonuçları `exam_results`/`exam_scores`'a yaz. 3) MVP alternatif: manuel ızgara girişi (🟡 Orta'ya düşer).
**Teknoloji:** OCR/vision. Yüksek belirsizlik → önce manuel giriş.

### 3.9 Tercih Koçluğu (LGS/YKS) — 🔴 Zor
**Ne:** Puan/başarı sırasına göre tercih listesi + PDF.
**Adım adım:** 1) YÖK Atlas / LGS taban puanları veri kaynağı (periyodik çekme/manuel içe aktarma). 2) `preferences` modeli + puan↔okul eşleştirme motoru. 3) PDF liste çıktısı. 4) Veri güncelliği bakımı.
**Teknoloji:** Veri toplama + sıralama motoru + QuestPDF.

### 3.10 Öğrenci Tanıma Anketleri — 🟢 Kolay
**Ne:** 4 sabit anket (Sınav Kaygısı, Çalışma Alışkanlığı, Zaman Yönetimi, Motivasyon-Hedef) → skor + rapor.
**Adım adım:** 1) `survey_templates` + `survey_answers` tabloları. 2) `GET/POST /api/v1/students/{id}/surveys`. 3) Frontend formu + skor. 4) Rapor (3.11).
**Teknoloji:** Mevcut stack.

### 3.11 Raporlar (Veli Toplantı / Tanıma / Optik) — 🟡 Orta
**Ne:** Ek rapor türleri + PDF.
**Adım adım:** 1) `ReportsRepository` genişlet (veli toplantı: ödev+sınav+anket). 2) QuestPDF. 3) Frontend: rapor türü → önizleme → PDF.
**Teknoloji:** QuestPDF + mevcut sorgular.

### 3.12 Web Push Bildirim — 🟡 Orta
**Ne:** Eksik görev hatırlatması; şablon değişkenleri `{ogrenciAdi}`, `{eksikGorev}`, `{toplamGorev}`.
**Mentörüm:** `sw.js` zaten var.
**Adım adım:** 1) VAPID + `push_subscriptions`. 2) Frontend: `requestPermission()` + `pushManager.subscribe()`. 3) Zamanlanmış job (OverdueHomeworkJob benzeri) → WebPush gönder. 4) Koç ayarı (saat + şablon).
**Teknoloji:** `WebPush` NuGet + VAPID.

### 3.13 WhatsApp Bildirim — 🔴 Zor
**Ne:** WhatsApp Business API ile hatırlatma.
**Adım adım:** 1) Meta WhatsApp Business hesabı + şablon onayı. 2) Gönderim servisi. 3) Koç ayarı. 4) Maliyet/onay.
**Teknoloji:** Meta WhatsApp Cloud API. İlk etapta web push ile başlanmalı.

### 3.14 Kurumsal Yasal Sayfalar — 🟢 Kolay
**Ne:** Kullanım Koşulları, Aydınlatma (KVKK), Mesafeli Satış, İptal/İade, Teslimat, İletişim/Firma.
**Adım adım:** 1) `static_pages` (slug, title, content) + admin düzenleme. 2) `/legal/:slug` + footer. 3) Yönetim panelinden içerik güncelleme.
**Teknoloji:** Mevcut stack.

### 3.15 Yardım Masası — 🟢 Kolay
**Ne:** Destek bileti (konu, kategori, mesaj, yanıt).
**Adım adım:** 1) `support_tickets` + `support_messages`. 2) `POST /api/v1/support/tickets`. 3) Resend e-posta. 4) Frontend form + liste.
**Teknoloji:** Mevcut stack + Resend.

### 3.16 Z Koçluk Asistan (RAG Chatbot) — 🔴 Zor
**Ne:** "6A sınıfında kimler görev aksattı?" gibi kendi verisine sorgu atan asistan.
**Adım adım:** 1) LLM API (OpenAI/Claude/Gemini). 2) Tool-calling → backend uçlarına bağlama. 3) Prompt + tenant izolasyonu. 4) Floating chat widget. 5) Maliyet/rate-limit.
**Teknoloji:** LLM API + tool-calling + mevcut IDOR-izolasyonlu sorgular.

---

## 4. Ödeme Yöntemleri — Detaylı Analiz

Z Koçluk, **süreli lisans paketi** satıyor (öğrenci kapasitesi + süre bazlı; dinamik fiyat: öğrenci sayısı × süre çarpanı azaldıkça birim maliyet düşer). Ödeme sonrası **lisans aktivasyonu** (hesaba tanımlanır). Fatura bilgileri + T.C. kimlik/e-arşiv gerekir. Satıcı bilgileri "yönetici panelindeki ödeme ayarlarından" güncellenir.

### 4.1 Veri Modeli (Mentörüm'e uyarlama)
- `coaches` tablosuna ekle: `plan_type` (zaten var) → `subscription_status`, `subscription_expires_at`, `max_students`, `billing_*` alanları.
- Yeni tablolar: `packages` (id, name, duration_months, student_capacity, price), `invoices` (id, coach_id, package_id, amount, status, issued_at, pdf_url), `payments` (id, invoice_id, provider, provider_ref, status, paid_at).
- `subscriptions` (coach_id, package_id, started_at, ends_at, status).

### 4.2 Ödeme Kanalları (Türkiye)
| Kanal | Zorluk | Açıklama |
|---|---|---|
| **PayTR / iyzico** (kart + taksit) | 🔴 Zor | Sanal POS entegrasyonu; callback (3D Secure) doğrulama; `payments.status` güncelleme. iyzico daha kolay dokümanlı, taksit desteği var. |
| **Havale/EFT (IBAN)** | 🟢 Kolay | Manuel onay akışı: koç IBAN'a öder → dekont yükler → admin onaylar → lisans aktifleşir. MVP için en pratik başlangıç. |
| **Banka kartı (otomatik)** | 🔴 Zor | PayTR/iyzico üzerinden. |
| **e-Fatura / e-Arşiv** | 🟡 Orta | Entegratör (Paraşüt/Logo/e-Fatura API) veya manuel fatura PDF üretimi (QuestPDF). |

### 4.3 Adım Adım MVP (Ödeme — fazlı)
1. **Faz 1 (Havale + manuel onay):** `packages` + `invoices` + `payments` tabloları; koç paket seçer → IBAN + dekont yükleme → admin onayı → `coaches.subscription_*` güncelle. (🟢)
2. **Faz 2 (Fatura PDF):** QuestPDF ile fatura şablonu; T.C./vergi bilgileri. (🟡)
3. **Faz 3 (Kart: iyzico/PayTR):** API key + 3D Secure callback + webhook; `payments` idempotent güncelleme (IdempotencyFilter zaten var). (🔴)
4. **Faz 4 (e-Arşiv):** Entegratör. (🟡)
5. **Faz 5 (Dinamik fiyatlandırma):** öğrenci sayısı × süre → birim fiyat formülü frontend/backende. (🟡)

### 4.4 Yasal Gereklilikler
- Mesafeli Satış Sözleşmesi + Ön Bilgilendirme + İptal/İade (dijital hizmet ifası başladıysa iade sınırlı) + Aydınlatma/KVKK + Gizlilik. Bunlar **3.14 Kurumsal sayfalar** ile birlikte yapılmalı. Satıcı firma bilgileri (unvan, adres, vergi no) panelden yönetilebilir olmalı.

---

## 5. Zorluk Sınıflandırması (Özet)

### 🟢 KOLAY (1–2 gün; mevcut stack, yeni dış servis yok)
| Özellik | Neden kolay |
|---|---|
| Kurumsal yasal sayfalar | statik sayfa + admin düzenleme (CRUD) |
| Öğrenci Tanıma anketleri | sabit şablon + skor (CRUD) |
| Dijital İçerik Gönder | course_resources'a dosya/link |
| Yardım Masası | CRUD + Resend e-posta |
| Havale/EFT ödeme (manuel onay) | tablo + dekont yükleme + admin onayı |

### 🟡 ORTA (3–7 gün; yeni modül + PDF/QR/3. parti olmayan)
| Özellik | Neden orta |
|---|---|
| Öğrenci Takip Radarı | agregasyon sorgusu + UI |
| Excel içe aktarma | ClosedXML parse + transaction |
| PDF + QR üretimi | QuestPDF + QRCoder |
| QR/token hafif öğrenci ekranı | yeni token tablosu + kısa JWT |
| Plan Düzenle | mevcut plan üzerinde CRUD |
| Web push bildirim | VAPID + sw.js (mevcut) |
| Raporlar (Veli/Tanıma) | QuestPDF + sorgular |
| Üyelik/Paket + dinamik fiyat | model + formül (ödeme olmadan) |
| Fatura PDF | QuestPDF |

### 🔴 ZOR (1–2+ hafta; harici servis / OCR / LLM / yasal)
| Özellik | Neden zor |
|---|---|
| Plan Hazırla (12 tür) | büyük motor + veri kaynakları |
| Sanal Optik (OCR) | görüntü/OCR belirsizliği |
| E-Okul PDF import | format kararsız + OCR |
| Tercih Koçluğu (YÖK Atlas) | veri toplama + motor |
| WhatsApp bildirim | Meta API + onay |
| Kartlı ödeme (iyzico/PayTR) | 3D Secure + webhook + yasal |
| e-Fatura/e-Arşiv | entegratör |
| Asistan (RAG chatbot) | LLM + tool-calling + maliyet |

---

## 6. Önerilen Yol Haritası (Roadmap)

**Faz 1 — Hızlı Kazanım (Kolay, önce yap):**
1. Kurumsal yasal sayfalar (3.14) — ödeme için ön koşul.
2. Öğrenci Tanıma anketleri (3.10).
3. Dijital İçerik Gönder (3.7).
4. Yardım Masası (3.15).
5. Havale + manuel onay ile Üyelik/Paket MVP (4.3 Faz 1).

**Faz 2 — Çekirdek Değer (Orta):**
6. Öğrenci Takip Radarı (3.1).
7. Excel içe aktarma (3.2).
8. PDF + QR üretimi (3.5) + QR/token öğrenci ekranı (3.6).
9. Plan Hazırla — Faz A: Serbest/Konu/Ders Temelli (3.4 MVP).
10. Web push bildirim (3.12).
11. Raporlar (3.11).

**Faz 3 — İleri (Zor, geciktirilebilir):**
12. Kartlı ödeme (iyzico/PayTR) + e-Fatura (4.3 Faz 3–4).
13. Plan Hazırla — Faz B/C (otomatik müfredat/karne temelli).
14. Tercih Koçluğu (3.9) — tercih dönemine yetişirse yüksek değer.
15. Sanal Optik — önce manuel ızgara, sonra OCR (3.8).
16. WhatsApp bildirim (3.13).
17. Asistan RAG chatbot (3.16).

> **Not:** Z Koçluk'un asıl farkı **"Plan Hazırla + QR takip"**. Mentörüm'de bu eksik olduğu için en yüksek rekabet avantajı Faz 2'nin 8+9 maddeleridir. Ödeme (Faz 1/3) ise ancak yasal sayfalar + paket modeli hazır olduktan sonra anlam kazanır.



