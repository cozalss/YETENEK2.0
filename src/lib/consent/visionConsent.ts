/**
 * Görsel denetim rızası — cihazdan veri çıkmasının tek kapısı.
 *
 * ## Neden gerekli
 *
 * Kural tabanlı hakem tamamen cihazda çalışıyor; hiçbir veri çıkmıyor.
 * Görsel hakem ise landmark koordinatlarını sunucuya, oradan da OpenAI'a
 * gönderiyor. Ham kamera görüntüsü hiçbir zaman çıkmıyor (iskelet sunucuda
 * çiziliyor, yüz ve arka plan yok) ama **yine de bir çocuğa ait biyomekanik
 * veri üçüncü tarafa gidiyor.** Bu, velinin bilerek vermesi gereken bir
 * karar.
 *
 * ## Varsayılan KAPALI
 *
 * Rıza vermeyen velide sistem tam olarak çalışmaya devam ediyor: kural
 * hakemi iki ayak üstünde denge, uçuş fazı olmayan sıçrama, genliksiz hop
 * gibi ihlallerin hepsini zaten yakalıyor. Görsel katman bir iyileştirme,
 * bir bağımlılık değil — bu yüzden varsayılanı kapalı yapmak bir işlev
 * kaybı değil.
 */

const STORAGE_KEY = 'yetenek.consent.vision.v1';

export interface VisionConsent {
  readonly granted: boolean;
  /** Rızanın verildiği/geri alındığı an (ISO). */
  readonly decidedAt: string;
  /** Onaylanan metnin sürümü — metin değişirse rıza yenilenmeli. */
  readonly textVersion: number;
}

/**
 * Rıza metninin sürümü. Metin değiştiğinde artırın: eski sürümle verilmiş
 * rıza geçersiz sayılır ve veliye yeniden sorulur.
 */
export const CONSENT_TEXT_VERSION = 1;

/** Veliye gösterilecek metin — kodda tutuluyor ki sürümle birlikte gitsin. */
export const CONSENT_TEXT = [
  'Hareket kalitesi denetimi için çocuğunuzun vücut noktalarının',
  'koordinatları (33 nokta, en fazla 8 kare) sunucumuza ve oradan OpenAI',
  'servisine gönderilir. Kamera görüntüsü, yüz veya arka plan hiçbir zaman',
  'cihazdan çıkmaz — gönderilen şey noktalardan yeniden çizilen bir çubuk',
  'figürdür. Veriler saklanmaz.',
  '',
  'Onaylamazsanız sistem tam olarak çalışmaya devam eder: cihazda çalışan',
  'denetim, testin doğru yapılıp yapılmadığını zaten kontrol eder.',
].join(' ');

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Mevcut rıza durumu.
 *
 * Sunucuda, depolama erişilemezse veya metin sürümü eskimişse **kapalı**
 * döner — belirsizlikte veri göndermemek doğru varsayılan.
 */
export function getVisionConsent(): VisionConsent | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisionConsent>;
    if (typeof parsed.granted !== 'boolean') return null;
    if (parsed.textVersion !== CONSENT_TEXT_VERSION) return null;
    return {
      granted: parsed.granted,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : '',
      textVersion: CONSENT_TEXT_VERSION,
    };
  } catch {
    return null;
  }
}

/** Görsel denetim şu an açık mı? Karar verilmemişse `false`. */
export function isVisionConsentGranted(): boolean {
  return getVisionConsent()?.granted === true;
}

/** Rızayı kaydeder. `granted: false` de kaydedilir — "sorma tekrar" demek. */
export function setVisionConsent(granted: boolean): void {
  if (!isBrowser()) return;
  try {
    const value: VisionConsent = {
      granted,
      decidedAt: new Date().toISOString(),
      textVersion: CONSENT_TEXT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Depolama kotası dolu veya engelli — rıza kaydedilemedi demek rıza
    // yok demektir; sessizce geçiyoruz, varsayılan zaten kapalı.
  }
}

/** Rızayı tamamen siler — veli "verilerimi unut" dediğinde. */
export function clearVisionConsent(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // yok sayılır
  }
}
