/**
 * `server-only` paketinin test stub'ı.
 *
 * `server-only`, bir modülün istemci paketine sızmasını **derleme zamanında**
 * engelleyen Next.js koruyucusudur. Vitest'in node ortamında çözümlenmiyor,
 * ama korumayı kaldırmak yanlış olurdu: sunucuya ait modüller (API anahtarı
 * okuyanlar) o kapıya gerçekten ihtiyaç duyuyor.
 *
 * Bu yüzden paketi silmek yerine testte boş bir modüle yönlendiriyoruz —
 * Next derlemesinde gerçek koruma yerinde kalır.
 */
export {};
