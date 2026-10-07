# V5 Manuel Test ve Canlıya Geçiş Kılavuzu

Bu kılavuz, V5 aşamasının son adımlarında yapmanız gereken **Google Auth (.env) Ayarları**, **Neon Veritabanı Migration İşlemleri** ve **PWA/Canlı Smoke Testleri** için adım adım talimatlar içerir.

---

## 1. Google Girişi (Google Client ID) Kurulumu

Google ile giriş (Google Identity Services) altyapısı koda eklendi ancak çalışması için Google Cloud Console'dan alınan **Client ID** değerlerinin projenin `.env` dosyalarına eklenmesi gerekir.

### Adım 1.1: Frontend (React) Ayarı
1. `Frontend` klasörü içindeki `.env` dosyasını (yoksa oluşturun) açın.
2. Aşağıdaki satırı ekleyin (Kendi Client ID'niz ile değiştirin):
   ```env
   VITE_GOOGLE_CLIENT_ID=sizin-google-client-id-degeriniz.apps.googleusercontent.com
   ```

### Adım 1.2: Backend (API) Ayarı
1. `Backend/MentorumApi` klasörü içindeki `.env` dosyasını açın.
2. Aşağıdaki satırı ekleyin (Frontend'e yazdığınız değerin **birebir aynısı** olmalıdır):
   ```env
   GOOGLE_CLIENT_ID=sizin-google-client-id-degeriniz.apps.googleusercontent.com
   ```

*(Not: Eğer uygulamanızı Fly.io, Render vb. bir yere deploy ediyorsanız, bu `GOOGLE_CLIENT_ID` değerini sunucunun çevre değişkenlerine (Environment Variables / Secrets) eklemeyi unutmayın.)*

---

## 2. PWA İkonları ve manifest.webmanifest

Uygulamanın telefon ve masaüstüne (PWA) tam olarak yüklenebilmesi için `192x192` ve `512x512` PNG ikonlarına ihtiyaç vardı. (Bu ikonlar ajan tarafından oluşturulup `Frontend/public/` altına eklenmiştir).

- Frontend `public/manifest.webmanifest` dosyası bu ikonları işaret edecek şekilde ayarlanmıştır.
- Canlı sunucuda (veya localhost'ta) siteye girdiğinizde tarayıcının adres çubuğunda "Uygulamayı Yükle" (Install App) butonunun çıktığını göreceksiniz.

---

## 3. Neon Veritabanı Canlı Geçiş (Migration) Adımları

V5 için hazırlanan yeni migration dosyalarının (`006`, `007`, `008`) canlı Neon veritabanında çalıştırılması gerekmektedir. Eğer Neon veritabanınız canlıda aktifse şu adımları izleyin:

1. **Yedek (Branch) Alın:** Neon konsoluna girip mevcut branch'inizin (ör. `main`) bir yedeğini oluşturun (örn. `v5-pre-migration-backup`).
2. **Migration'ları Çalıştırın:** Backend API'nizi canlıya (deploy) gönderdiğinizde, proje ayağa kalkarken EF/Dapper hangisi kullanılıyorsa, DbUp veya startup migration mekanizması otomatik çalışmalıdır. 
   - Eğer manuel çalıştırıyorsanız:
     ```bash
     cd Backend/MentorumApi
     dotnet run
     ```
     diyerek veya veritabanı konsolundan SQL scriptlerini (006, 007, 008) sırasıyla çalıştırarak işlemi tamamlayın.
3. **008_ContractCoachId Kontrolü:** Bu dosya `program_id`'yi `NOT NULL` yapar. Eğer eski verilerde programsız veri varsa patlar. (007'nin `backfill` işlemi bunu zaten çözmüş olmalıdır). Başarılı olduğunu teyit edin.

---

## 4. Canlı Smoke Test (End-to-End Test) Kılavuzu

Canlı veritabanınız ve uygulamanız hazır olduktan sonra tarayıcınızdan canlı linke (veya localhost'a) girip şu akışı **bizzat test edin**:

### Test 1: Süper Yönetici ve Koç Onayı
- Süper yönetici (canoser@gmail.com vb.) olarak giriş yapın.
- Yeni bir koç hesabı oluşturun (veya Google ile kayıt olun).
- Yeni koç giriş yapmaya çalıştığında `403 COACH_PENDING` uyarısı aldığını doğrulayın.
- Süper yönetici panelinden koçu `APPROVED` yapın ve tekrar giriş yapabildiğini teyit edin.

### Test 2: Yardımcı / Öğretmen Daveti ve IDOR
- Koç paneline girin, bir ders (Course) ve sınıf (Group) oluşturun.
- "Davetiyeler" bölümünden bir Öğretmen/Yardımcı e-posta daveti oluşturun.
- Gizli sekmede bu daveti kabul edip yeni öğretmen hesabı oluşturun.
- Öğretmen olarak girip, sadece davet edildiğiniz programın öğrencilerini/ödevlerini görebildiğinizi teyit edin (Başka program görünmemeli).

### Test 3: Program Limiti (TOCTOU)
- Maksimum program limiti örneğin 3 ise, hızlıca 4 tane program oluşturmaya çalışın.
- Sistem 4. programı reddedip `409 CONFLICT - PROGRAM_LIMIT_EXCEEDED` hatası vermelidir.

### Test 4: Öğrenci İlerleme
- Bir öğrenci hesabına girip öğretmenin atadığı bir ödevi "Tamamlandı" olarak işaretleyin.
- Koç ekranında bu ödevin ilerleme yüzdesiyle bittiğini teyit edin.

---

Tebrikler, uygulamanızın V5 sürümü artık canlı kullanıma tamamen hazır!
