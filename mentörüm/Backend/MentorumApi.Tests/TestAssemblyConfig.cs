using Xunit;

// Testcontainers (gerçek PostgreSQL) tabanlı entegrasyon testleri paylaşımlı
// ortam değişkenleri (DATABASE_URL) ve WebApplicationFactory kullandığı için
// seri çalıştırılmalıdır. Paralel çalıştırmada "entry point exited" hatası oluşuyor.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
