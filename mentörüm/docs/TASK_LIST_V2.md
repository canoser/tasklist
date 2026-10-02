# 🚀 Mentörüm — V2 (İkinci İterasyon) Görev Listesi
> Bu liste, MVP'nin birinci fazı (Aşama 1-8) tamamlandıktan sonra, Ürün Planı'nda belirtilen ancak henüz geliştirilmeyen özelliklerin yanı sıra **Güvenlik ve Öz-eleştiri** dokümanlarından çıkarılan derslerle hazırlanmış, mükemmeliyetçi bir yol haritasıdır.

## Aşama 9: Öğrenci Yönetimi ve Veli İzolasyonu
- [x] **Koç Arayüzü:** "Öğrenciler" sayfası (Liste görünümü, filtreleme: sınıf/alan/aktif).
- [x] **Koç Arayüzü:** Öğrenci Profili (Sekmeler: Kişisel Bilgiler, Veli Bilgileri, Hedef, Sınav Geçmişi, Koç Özel Notları).
- [x] **Backend (Veli Modülü):** Veli davet (token) sistemi ve sisteme giriş API'leri (OAuth dahil).
- [x] **KRİTİK GÜVENLİK (Özeleştiri 3):** Veli DTO'larının yazılması. Veli 1 ve Veli 2 boşandığı/ayrı olduğu senaryolara karşı, bir veli sisteme girdiğinde JSON yanıtından diğer velinin iletişim bilgilerinin (telefon/e-posta) KESİNLİKLE çıkarılması/maskelenmesi.

## Aşama 10: Gelişmiş Ödev Mantığı ve Kısmi Tamamlama
- [x] **Backend & Database:** Homework ve AssignHomework tablolarına `CompletionPercentage` (0-100) sütununun eklenmesi.
- [x] **Frontend:** Öğrencinin "Tamamla" butonu yerine "Kısmi Tamamlama" (Yarısını yaptım) girebilmesi için UI refactor işlemi.
- [x] **Frontend:** Öğrencinin "Ödevlerim" sekmesinin tam tasarımı (Filtreler: Tümü/Yapılacak/Gecikmiş/Bitti).
- [x] **Backend Cron (Özeleştiri 5):** Gecikmiş ödevleri sadece okumak yerine, her gece 00:01'de çalışan bir background job (cron/Quartz.NET) ile süresi dolan ödevlerin statüsünün `OVERDUE` olarak işaretlenmesi.

## Aşama 11: Müfredat ve Takvim Genişletmesi
- [x] **Database Seed:** 2026-2027 MEB müfredat verisinin (Ders, Yıl, Ünite, Konu hiyerarşisinde) veritabanına aktarılması.
- [x] **Backend & UI:** Koçun ödev atarken konuyu salt metin girmesi yerine müfredattan ağaç yapısıyla (tree-select) seçebilmesi.
- [x] **Takvim UI:** Öğretmen ve Öğrenci için aylık şerit detaylı takvim görünümünün (react-big-calendar optimizasyonu) tamamlanması.
- [x] **Raporlar UI:** Haftalık özet, pasta grafik ve gecikme eğilimi (trend) analizlerinin çizdirilmesi.

## Aşama 12: Güvenlik, Transaction ve Sahiplik Revizyonu (Technical Debt Cleanup)
- [x] **KRİTİK GÜVENLİK (Özeleştiri 7 & Güvenlik Öz.):** Veritabanına yazan *TÜM* `INSERT`, `UPDATE`, `DELETE` Dapper sorgularının birinci satırında sahiplik kontrolü (`WHERE id = @Id AND coach_id = @CoachId`) olduğunun tek tek (manuel code-review ile) incelenip test edilmesi. Dapper SqlBuilder'ın istisnasız tüm repository'lerde standartlaştırılması. *(Tamamlandı: StudentRepository ve HomeworkRepository açıkları kapatıldı).*
- [x] **KRİTİK GÜVENLİK (Güvenlik Öz.):** Birden fazla tabloyu etkileyen (örn. Öğrenci kayıt, Veli bağlama) tüm iş akışlarının `using var tx = conn.BeginTransaction()` bloğu ile sarmalandığının kontrolü. *(Tamamlandı: ExamRepository ve HomeworkRepository transaction'ları düzeltildi).*
- [x] **Frontend Mimari (Özeleştiri 4):** Çevrimdışı (offline) durumda yapılan ödev güncellemelerinin `React Query` ile Optimistic Update yapıldığından emin olunması. *(Durum: Tamamlandı. Öğrencinin ödev tamamlama işlemi, koçun not eklemesi, ödev ataması ve sınav kaydı eklemesi işlemleri React Query 'onMutate' ile Optimistic Update yapısına kavuşturuldu).*

---
*Not: Bu listeye başlamadan önce, Aşama 8'in tamamen prodüksiyonda sorunsuz çalıştığından emin olunmalıdır.*
