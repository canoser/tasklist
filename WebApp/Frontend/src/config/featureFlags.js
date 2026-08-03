/**
 * featureFlags.js
 * Uygulama genelindeki özellik bayrakları tek yerden yönetilir.
 *
 * USE_MOCK = true  → roleService, localStorage mock mekanizmasını kullanır.
 *                    Backend çalışmıyor olsa bile UI anında test edilebilir.
 * USE_MOCK = false → roleService, Axios üzerinden gerçek API'yi çağırır.
 *                    Canlıya geçmek için yalnızca bu satırı değiştirmek yeterlidir.
 *
 * DRY: Bu değişken sadece burada tanımlanır. Hiçbir servis veya bileşen
 * kendi içinde USE_MOCK tanımlamaz; hep buradan import eder.
 */
export const USE_MOCK = true;
export const DEFAULT_LANG = 'tr';       // 'tr' | 'en' | 'es' | 'fr' | 'de'
export const DEFAULT_TONE = 'formal';   // 'formal' | 'semi' | 'buddy'
