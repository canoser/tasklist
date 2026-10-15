# Güvenlik Sertleştirme Kaydı (2026-10)

Bu doküman, `mentörüm/Backend` üzerinde yapılan güvenlik ve teknik borç iyileştirmelerini özetler.

## Yapılan Değişiklikler

### 1. Idempotency — DB destekli ve kullanıcı bazlı
- Eski `IdempotencyFilter` in-memory (`IMemoryCache`) idi: restart/multi-instance'ta kaybolur, `Idempotency_{key}` anahtarı kullanıcıya scope'lanmadığı için farklı kullanıcılar çakışırdı, tekrar istekte her zaman `409` dönerdi.
- Yeni filtre `idempotency_keys` tablosuna (migration `016_SecurityHardening.sql`) yazar:
  - Aynı kullanıcı + aynı anahtar tekrar ederse **önceki başarılı yanıt** döner (RFC idempotency).
  - İşlem sürerken (in-flight) gelen istek `409` ile reddedilir.
  - Hatalı (`>=400`) işlemde kayıt silinir; istemci tekrar deneyebilir.
- Anahtar kullanıcıya (`user_id`) scope'ludur.

### 2. Auth Rate Limiting (kalıcı)
- `login`, `register`, `google` uçlarına IP bazlı, veritabanında atomik upsert ile tutulan hız sınırlama eklendi (`AuthRateLimitMiddleware` + `auth_attempts` tablosu).
- Limit: 5 dakikada 40 deneme; aşımda `429` + `Retry-After`.

### 3. CORS Sıkılaştırma
- `AllowAnyMethod/AllowAnyHeader` kaldırıldı; açık method ve header listesi kullanıldı.
- Origin listesi artık `CORS_ORIGINS` env değişkeninden okunur.

### 4. Süper Yönetici E-postaları Kaynaktan Çıkarıldı
- `SUPER_ADMIN_EMAILS` artık yalnızca ortam değişkeninden okunur; kaynak kodda hardcoded varsayılan kaldırıldı.
- Yerel `.env` dosyalarına (gitignore'da) değer eklendi.

### 5. Kayıt (Register) Rol Kilidi
- Self-registration artık yalnızca `Coach` hesabı oluşturur.
- `Student/Parent/Teacher` rolleri yalnızca davet akışı üzerinden gelir (rol yükseltme/IDOR önlemi).

### 6. Merkezi Erişim Denetimi — `ProgramAccessGuard`
- Yeni `Services/ProgramAccessGuard.cs`: `EnsureCoachInProgramAsync`, `EnsureCoachOwnsStudentAsync`, `IsParentOfStudentAsync`, `IsTeacherOfCourseAsync`.
- `ExamEndpoints` örnek olarak bu servise bağlandı; kural dosyası (`security_guidelines.md`) bu servisi zorunlu pattern olarak işaret ediyor.

### 7. Baseline Korumalı Migration Runner
- `_schema_migrations` tablosu eklendi; runner uygulanan dosyaları atlar.
- Canlı DB zaten migration'lıysa (ilk kurulumda) mevcut dosyalar baseline olarak işaretlenir; yalnızca yenileri çalışır.

## Temizlik
- Boş scaffold test `UnitTest1.cs` silindi.
- `PORTABILITY.md` (kök) içeriği `docs/PORTABILITY.md` ile birleştirildi; kök dosya silindi.
- `Backend/.env.example` şablonu eklendi.

## Doğrulama
- `dotnet build` → 0 hata.
- `dotnet test` (Testcontainers PostgreSQL) → 43/43 başarılı.
- `npm run build` + `npm run lint` → başarılı (0 hata).
