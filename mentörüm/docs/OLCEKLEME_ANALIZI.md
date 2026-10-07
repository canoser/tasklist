# 📈 Mentörüm — Ölçekleme Analizi (10.000+ Öğretmen & Koç)

> Versiyon: 1.0 — 6 Ekim 2026
> Amaç: Sistem "10.000'lerce öğretmen ve koç" tarafından kullanıldığında nelerin değişmesi
> gerektiğini, mevcut kodun GERÇEK durumuna dayanarak (tahmin değil, kod incelemesi) çıkarmak.

---

## 1. Hedef ve Varsayımlar

| Metrik | Değer (gerçekçi senaryo) |
|---|---|
| Öğretmen + Koç | 10.000 – 50.000 |
| Koç başına öğrenci + veli | 20 – 100 (ort. 40) |
| Toplam kullanıcı (öğrenci+veli dahil) | ~300.000 – 1.000.000 |
| Günlük aktif kullanıcı (DAU) | 20.000 – 80.000 |
| Eşzamanlı istek (peak) | 3.000 – 10.000 bağlantı |
| İstek/saniye (peak) | 100 – 400 |
| Günlük istek | 2 – 8 milyon |

En hızlı büyüyen tablolar: `homework_assignments`, `notifications`, `events` (takvim), `refresh_tokens`.

---

## 2. Mevcut Mimari (özet)

- **Backend:** .NET 9 Minimal API + Dapper + Npgsql (EF yok, saf SQL).
- **DB:** Neon PostgreSQL (serverless), bağlantı Neon **pooler** (pgBouncer) üzerinden.
- **Host:** Fly.io tek makine `shared-cpu-1x` / 256 MB RAM, `min_machines_running=1`.
- **Auth:** JWT (stateless) + refresh token (HTTP-only cookie, DB'de rotation + revoke).
- **Frontend:** React SPA + PWA (Capacitor), Cloudflare Pages.
- **Arka plan:** `BackgroundService` (`OverdueHomeworkJob`) — saatte 1, 100'lük chunk.
- **E-posta:** Resend (endpoint içinde senkron çağrılıyor).
- **Cache:** `AddMemoryCache` (instance-başına).
- **Test:** 31 entegrasyon testi (Testcontainers).

> ✅ Olumlu: Backend **stateless** (JWT + DB'den tenant kontrol), yani yatay ölçeklemeye uygun temel var.

---

## 3. Darboğazlar ve Riskler (önem sırasına göre)

### 3.1 🔴 KRİTİK — Veritabanı (en büyük darboğaz)

**Index eksikliği ciddi boyutta.** Migration'larda **sadece 1** index var (`ux_program_one_admin`, 007). Bunların hiçbiri yok:

- `users(email)` → login/register/google **her istekte full table scan**.
- `homework_assignments(student_id, status, due_date)` → ödev listeleme + cron'da `WHERE status='PENDING' AND due_date < ...` tam tarama.
- `notifications(user_id, is_read)` → bildirimler her 30 sn'de poll ediliyor.
- `program_coaches(coach_id)` → tenant kontrolü `EXISTS(...)` her istekte.
- `courses(program_id, teacher_id)`, `events(start_time)`, `program_teachers(teacher_id)`, `refresh_tokens(token)`.

**Sonuç:** Kullanıcı sayısı arttıkça sorgular **O(n)** büyür; 100 bin ödev satırında saniyelik sorgulara dönüşür. → **İlk yapılacak iş index migration'ı.**

**Diğer DB riskleri:**
- **Pagination yok:** `GetTeachersAsync`, `GetPendingApprovalsAsync`, program/ders listeleri **tam liste** dönüyor. Binlerce kayıtta hem DB hem ağ şişer. → `LIMIT/OFFSET` veya keyset pagination.
- **N+1 pattern:** `OverdueHomeworkJob` her gecikmiş ödev için `foreach` içinde ayrı `INSERT` atıyor (transaction içinde ama yine de tek tek). → `unnest`/batch insert.
- **Tek yazma düğümü + okuma replikası yok:** okuma ağırlıklı trafik yazıyı kilitler.
- **Neon CU/autoscaling limiti:** Free tier 100 CU-saat; 10k kullanıcıda aşılır → ücretli CU + autoscaling ayarı.
- **Partitioning yok:** `notifications`/`events`/`homework_assignments` zaman bazlı büyür → ileride `PARTITION BY RANGE(created_at)`.
- **pgBouncer (transaction pooler) uyumu:** `SET`/`LISTEN`/`PREPARE` gibi oturum-bağımlı ifadeler transaction pooling'de bozulur — şu an yok ama eklenirse dikkat.

### 3.2 🔴 KRİTİK — Arka plan işleri (ölçeklenince çakışır)

- `OverdueHomeworkJob` bir `BackgroundService`; **her Fly makinesinde ayrı çalışır.** 3 makineye çıkınca aynı ödevler **3 kez işlenir**, kullanıcıya **3 duplicate bildirim** gider. → **Distributed lock şart** (en basiti: `pg_try_advisory_lock` veya tek bir scheduler instance'ı).
- **E-posta senkron:** `forgot-password` ve kullanıcı ekleme, Resend çağrısını endpoint içinde bekliyor. Resend yavaşlarsa/rate-limit olursa API gecikir. → **Kuyruk + worker** (e-posta, bildirim push, rapor, not hesaplama).

### 3.3 🟠 ORTA — Cache (MemoryCache yetersiz)

- `AddMemoryCache` **instance-başına**; 2. makinede cache boş. → **Redis** (veya Neon'a yakın Upstash/Redis) geçmeli.
- Cache adayları: kullanıcının program listesi, rol/üyelik, `system_settings`, statik config.

### 3.4 🟠 ORTA — Rate limiting ve kötüye kullanım

- **Rate limiter yok** (mentörüm kodunda). `login`/`forgot-password`/`register` brute-force'a ve API abuse'a açık. → ASP.NET `AddRateLimiter` (fixed/sliding window, partition by IP+email) veya Cloudflare WAF rate limiting.

### 3.5 🟠 ORTA — Auth / oturum

- JWT stateless → yatay ölçekleme için **iyi**.
- Ancak `refresh_tokens` her refresh'te `UPDATE ... SET is_revoked=1` + yeni `INSERT` yapıyor → **sıcak tablo**. Token replay koruması doğru, ama `refresh_tokens(token)` index'i ve periyodik temizlik (expired token silme) gerekir.

### 3.6 🟠 ORTA — Gözlemlenebilirlik

- Serilog **yalnızca console**. 10k kullanıcıda loglar kaybolur/karışır. → Yapılandırılmış sink (Seq/OpenTelemetry), metrik (Prometheus + `/metrics`), tracing (OpenTelemetry), hata takibi (Sentry).

### 3.7 🟡 ORTA-DÜŞÜK — Yatay ölçekleme (Fly.io)

- Stateless olması iyi; ama **tek makine** (`min_machines_running=1`). → `fly scale count N` + `[http_service.concurrency]` autoscale + health check zaten var.
- 3.2 ve 3.3 çözülmeden yatay ölçekleme **duplicate bildirim + cache çakışması** getirir.

### 3.8 🟡 DÜŞÜK-ORTA — Çoklu kiracı (tenant) izolasyonu

- Her istekte `program_coaches` `EXISTS` kontrolü (doğru ama ekstra sorgu). On binlerce programda bu sorgu yükü artar.
- İleri aşamada **PostgreSQL RLS (Row Level Security)** veya tenant bazlı DB bölümleme düşünülebilir; **şimdilik index yeterli**, RLS geçişi maliyetli.

### 3.9 🟡 DÜŞÜK — Frontend / PWA

- Bildirim **30 sn polling** (`refetchInterval: 30000`) → ölçekte gereksiz istek seli. → **SSE/WebSocket/push**.
- Cloudflare CDN zaten; bundle boyutu + code-splitting iyileştirmesi.

---

## 4. Fazlı Yol Haritası

| Faz | Kullanıcı | Yapılacaklar (öncelik sırası) |
|---|---|---|
| **0 (şimdi)** | < 1.000 | ✅ Çalışıyor. **Acil:** (a) index migration'ı (`010_Indexes.sql`), (b) rate limiter, (c) e-posta async/queue, (d) background job'a advisory lock. |
| **1** | 1.000 – 10.000 | Redis cache, e-posta kuyruğu + worker, observability (OpenTelemetry/Sentry), refresh_tokens temizliği, listelerde pagination. |
| **2** | 10.000 – 50.000 | Neon **okuma replikası**, `notifications/events` partitioning, autoscaling (Fly scale count), push/SSE bildirim, N+1 batch insert düzeltmesi. |
| **3** | 50.000+ | Tenant bazlı DB bölümleme / sharding, RLS, arama için ayrı index (Elasticsearch), edge cache. |

---

## 5. Maliyet Tahmini (kabaca, aylık)

| Bileşen | Faz 0 (<1k) | Faz 2 (10k–50k) |
|---|---|---|
| Neon (Postgres) | Free (100 CU-s) | Ücretli: ~$50–150 (CU + storage + replica) |
| Fly.io | Free (1 VM) | $20–80 (3–5 VM + RAM) |
| Redis (Upstash/Redis) | — | $10–30 |
| Kuyruk (SQS/Redis/QStash) | — | $5–30 |
| Observability (Sentry/Seq) | Free tier | $20–50 |
| Resend | Free (100/gün) | $20–50 (10k+ mail/ay) |

> Not: Mail + bildirim **queue'ya alınmazsa** Resend ücreti ve API gecikmesi öngörülemez artar.

---

## 6. Somut, Öncelikli Öneriler (eyleme dönük)

1. **Migration `010_Indexes.sql`** (en yüksek getiri / en düşük maliyet):
   ```sql
   CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
   CREATE INDEX IF NOT EXISTS idx_hw_student_status_due ON homework_assignments(student_id, status, due_date);
   CREATE INDEX IF NOT EXISTS idx_hw_program_status ON homework_assignments(program_id, status);
   CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
   CREATE INDEX IF NOT EXISTS idx_program_coaches_coach ON program_coaches(coach_id);
   CREATE INDEX IF NOT EXISTS idx_courses_program ON courses(program_id);
   CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
   CREATE INDEX IF NOT EXISTS idx_program_teachers_teacher ON program_teachers(teacher_id);
   CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
   CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_time);
   ```
2. **Rate limiter:** `builder.Services.AddRateLimiter(...)` — login/forgot/register'a sliding window (örn. 5/15 sn/email).
3. **E-postayı kuyruğa al:** `IEmailService` zaten soyut; çağrıları bir kuyruğa (Redis/SQS veya başlangıçta basit DB tabanlı outbox) yaz, worker göndersin. Endpoint anında dönsün.
4. **Background job'a `pg_try_advisory_lock`:** tek instance işlesin (duplicate bildirim önlemi).
5. **`AddMemoryCache` → Redis** (IDistributedCache) geçişi; program listesi ve `system_settings` cache'le.
6. **Pagination:** listeleri `page`/`pageSize` + keyset ile sınırla.
7. **Observability:** OpenTelemetry + Prometheus metrics + Sentry; Serilog structured sink.
8. **`OverdueHomeworkJob` N+1'i düzelt:** tek batch `INSERT ... SELECT ... FROM unnest(...)`.

---

## 7. Sonuç

Sistemin temeli (stateless JWT, Dapper + Neon pooler, tenant-izolasyonlu sorgular, Testcontainers testleri) **ölçeklenebilir bir başlangıç** için sağlam. Ancak "10.000'lerce öğretmen + koç" hedefi için **kritik yol şu sıradadır:**

1. **Index'ler** (bugün yapılabilir, en yüksek ROI)
2. **Rate limiting** (güvenlik + stabilite)
3. **E-posta & background job'ı kuyruk + distributed lock ile ayır** (çoklu makinede çakışma)
4. **Redis + observability** (yatay ölçeklemeye geçmeden önce)

Bunlar yapılmadan **yatay ölçekleme (birden fazla Fly makinesi) risklidir**: duplicate bildirim, cache çakışması ve DB tam taramaları kullanıcı deneyimini bozar. Doğru sıra: önce DB/cache/queue sağlamlaştır, sonra makine sayısını artır.

