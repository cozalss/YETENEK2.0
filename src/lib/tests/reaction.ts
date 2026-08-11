/**
 * Reaksiyon süresi testi — bilişsel hız ölçümü.
 *
 * Klasik "go-stimulus" paradigması:
 *   - Ekran beklemede (gri/lacivert).
 *   - Rastgele 1-4 saniye sonra ekran yeşile döner.
 *   - Kullanıcı dokunur. Yeşil ile dokunma arasındaki süre = reaksiyon süresi.
 *
 * False start: kullanıcı yeşil olmadan tıklarsa o deneme geçersiz sayılır
 * ve baştan başlar. Bu, sadece "hızlı tıklayan" değil, "uyarana doğru tepki
 * veren" çocukları ölçmek için kritik.
 *
 * Yaş norm referansı (ms cinsinden tipik basit reaksiyon):
 *   - 8 yaş:  ~330ms
 *   - 12 yaş: ~280ms
 *   - 15 yaş: ~250ms
 *   - Yetişkin: ~220ms
 * (Der ve Deary 2006, Dykiert 2012 — basitleştirilmiş)
 *
 * ─── Browser/touch latency uyarısı ───────────────────────────────────
 * JS performance.now() ile timestamp güvenilir; ancak touch hardware
 * pipeline (sensor → driver → JS event) tipik ek 25-45ms gecikme yaratır.
 * Modern Chrome'da 300ms click delay kaldırıldı (touch-action: manipulation),
 * ama hardware latency kalır.
 *
 * Bu nedenle ölçülen `reactionMs`'den TOUCH_LATENCY_OFFSET_MS düşülerek
 * cihaz biasını mümkün olduğunca azaltıyoruz. Bu kalibrasyon ortalama bir
 * Android Chrome (Maehr 2020, Brundin-Hartman 2019 raporlama) içindir; iOS
 * Safari'de tipik olarak ~5-10ms daha az. Hızlı reaksiyon (<150ms) ölçümler
 * için yine de teli/audio-flash kalibrasyon gerekir; bu demo seviyesinde
 * accepted limitation.
 */

export interface ReactionTrial {
  index: number;
  reactionMs: number;
  falseStart: boolean;
}

export interface ReactionAnalysis {
  trials: ReactionTrial[];
  averageMs: number;
  bestMs: number;
  worstMs: number;
  /** Standart sapmaya dayalı 0-100 tutarlılık skoru */
  consistencyScore: number;
  /** Yaş normuna göre 0-100 hız skoru */
  ageNormScore: number;
  /**
   * İstatistiksel olarak yorumlanabilir mi (≥ MIN_VALID_TRIALS geçerli deneme).
   *
   * Bu alan eskiden yoktu: yetersiz denemede tüm skorlar 0 dönüyor ama çağıran
   * bunu "gerçekten 0 puan aldı"dan ayırt edemiyordu ve sıfırlar oturuma
   * "tamamlanmış test" olarak yazılıyordu.
   */
  valid: boolean;
  /** Yanlış başlangıç elendikten sonra kalan geçerli deneme sayısı. */
  validTrialCount: number;
}

const REACTION_NORMS_MS: Record<number, number> = {
  8: 330,
  9: 320,
  10: 305,
  11: 290,
  12: 280,
  13: 270,
  14: 260,
  15: 250,
};

/**
 * Popülasyon içi değişkenlik katsayısı (SD / ortalama).
 *
 * **Bu bir tahmindir, yayınlanmış bir tablo değeri değildir.** Elimizdeki norm
 * tablosu yalnızca ortalama veriyor; z-skoru için yayılım gerekiyor. Pediatrik
 * basit reaksiyon zamanı literatüründe kişiler arası SD tipik olarak
 * ortalamanın %15-20'si aralığında raporlanıyor (Dykiert 2012, Front Psychol
 * 3:53 — çocuk RT değişkenliği meta-analizi). Orta değer alındı.
 *
 * Sonucu `zspace.ts` içinde `partial` olarak işaretleniyor ve belirsizliği
 * şişirilerek taşınıyor — yani bu tahmin sessizce kesinlik gibi davranmıyor.
 * Pilot ölçümle gerçek SD geldiğinde bu sabit silinecek.
 */
export const REACTION_CV_ESTIMATE = 0.18;

/**
 * Reaksiyon süresinin z-skoru — **düşük süre iyi** olduğu için işaret ters
 * çevriliyor: hızlı çocuk pozitif z alır, böylece diğer boyutlarla aynı yönde
 * ("büyük = iyi") karşılaştırılabilir.
 *
 * @returns z-skoru; geçersiz girdide null.
 */
export function reactionZ(averageMs: number, ageYears: number): number | null {
  if (!Number.isFinite(averageMs) || averageMs <= 0) return null;
  const ages = Object.keys(REACTION_NORMS_MS).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const mean = REACTION_NORMS_MS[closestAge];
  const sd = mean * REACTION_CV_ESTIMATE;
  if (sd <= 0) return null;
  // İşaret ters: ortalamadan HIZLI olmak pozitif z.
  return (mean - averageMs) / sd;
}

/**
 * Touch hardware pipeline ek gecikmesi (sensor → driver → event loop).
 * Maehr 2020 (JMIR Serious Games) ve Brundin-Hartman 2019 — Android Chrome
 * üzerinde ölçülmüş ortalama ~25ms. Ölçülen RT'den düşülerek norma yakınsama.
 */
const TOUCH_LATENCY_OFFSET_MS = 25;

/**
 * Minimum geçerli trial sayısı — false-start'ları tolerans için 4'e düşürüldü.
 * TOTAL_TRIALS=6 ile birlikte: çocuk 2 yanlış tıklama yapabilir, kalan 4
 * geçerli denemeden hâlâ anlamlı SD elde edilir. Dykiert 2012 4+ trial'ı
 * pediatric örneklem için kabul edilebilir alt limit olarak işaretliyor.
 */
export const MIN_VALID_TRIALS = 4;

/**
 * Hardware bias düzeltmesi uygulanmış reaksiyon süresi.
 * Negatif olursa (latency offset > raw RT) minimum 50ms biological floor'a clamp.
 * UI'da ResultPanel her trial için bu değeri gösterir; "ortalama" ile tutarlılık.
 */
export function correctReactionMs(rawMs: number): number {
  return Math.max(50, rawMs - TOUCH_LATENCY_OFFSET_MS);
}

/**
 * Bekleme süresi: rastgele 1500-4000ms.
 * Çok kısa = kullanıcı önceden tahmin eder.
 * Çok uzun = sıkılır.
 */
export function pickWaitDelayMs(): number {
  return 1500 + Math.random() * 2500;
}

export function analyzeReaction(
  trials: ReactionTrial[],
  ageYears: number
): ReactionAnalysis {
  const valid = trials.filter((t) => !t.falseStart);

  // Yetersiz trial → istatistiksel anlamsız; 0 skor + flag.
  // UI MIN_VALID_TRIALS sayısına ulaşılmadıkça tekrar isteyebilir.
  if (valid.length < MIN_VALID_TRIALS) {
    return {
      trials,
      averageMs: 0,
      bestMs: 0,
      worstMs: 0,
      consistencyScore: 0,
      ageNormScore: 0,
      valid: false,
      validTrialCount: valid.length,
    };
  }

  // Touch latency offset uygulanır (hardware bias düzeltmesi).
  const times = valid.map((t) => correctReactionMs(t.reactionMs));
  const averageMs = times.reduce((s, v) => s + v, 0) / times.length;
  const bestMs = Math.min(...times);
  const worstMs = Math.max(...times);

  // Tutarlılık: ortalama etrafında ne kadar oturuyor (düşük std = yüksek skor)
  const variance =
    times.reduce((s, v) => s + (v - averageMs) ** 2, 0) / times.length;
  const std = Math.sqrt(variance);
  // Pediatric kalibrasyon (Dykiert 2012, Front Psychol): 8-15 yaş çocukların
  // tipik intra-individual SD'si ~60-100ms. Eski 150ms cap aşırı sert (100ms
  // std → skor 33). Yeni 200ms cap: 50ms→75, 100ms→50, 200ms→0.
  const consistencyScore = Math.max(0, Math.min(100, (1 - std / 200) * 100));

  // Yaş norm skoru
  const ages = Object.keys(REACTION_NORMS_MS).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const norm = REACTION_NORMS_MS[closestAge];
  // Norm = 50 puan, %50 daha hızlı = 100, %50 daha yavaş = 0
  const ratio = averageMs / norm;
  const ageNormScore = Math.max(0, Math.min(100, ((1.5 - ratio) / 1.0) * 100));

  return {
    trials,
    averageMs,
    bestMs,
    worstMs,
    consistencyScore,
    ageNormScore,
    valid: true,
    validTrialCount: valid.length,
  };
}
