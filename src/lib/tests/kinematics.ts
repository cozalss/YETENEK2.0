/**
 * Serbest düşüş kinematiği — eşik tabanlı tespitin yerine fizik tabanlı ölçüm.
 *
 * ## Neden gerekli
 *
 * Eşik tabanlı uçuş tespiti (ayak bileği baseline'dan X birim kalkınca toe-off)
 * uçuş süresini **sistematik olarak kısa** ölçer: ayak bileği yerden ayrıldığı
 * anda değil, eşiği aştığı anda toe-off sayılır. Aynı hata inişte de olur.
 * Toplam sapma tek yönlü değildir ama varyansı büyüktür ve eşiğin kendisi
 * kadraj doluluğuna bağlıdır — yani cihazdan cihaza değişir.
 *
 * ## Yöntem
 *
 * Uçuş fazında gövde serbest düşüştedir; ayak bileği işaretçisi kütle merkeziyle
 * aynı parabolü çizer:
 *
 *     y(t) = a·t² + b·t + c        (görüntü koordinatı — aşağı pozitif, a > 0)
 *
 * Taban çizgisini kestiği iki kök gerçek kalkış ve iniş anlarıdır:
 *
 *     T = √(b² − 4a(c − y_baseline)) / a
 *
 * Eşik tamamen devre dışı kalır — kök çözümü alt-kare hassasiyetindedir.
 *
 * ## Bedava gelen iki sonuç
 *
 * 1. **Kendi kendini kalibrasyon.** Parabolün eğriliği yerçekimini içerir:
 *    normalize birimdeki `a`, gerçek dünyada ½g'ye karşılık gelir. Dolayısıyla
 *
 *        cmPerUnit = ½g / a
 *
 *    Çocuğun boyu veya world landmark gerekmez — ölçek, yerçekiminden çıkar.
 *
 * 2. **Fizik doğrulaması.** Gerçek bir sıçramada `a` yerçekimiyle tutarlı olmak
 *    zorundadır. Topuk kaldırma, ağırlık aktarımı veya yavaş yükselme balistik
 *    değildir — parabol fit'i tutmaz. Bu, yer değiştirme eşiğinin yakalayamadığı
 *    yanlış pozitifleri yakalar.
 *
 * Ref: Bosco C, Luhtanen P, Komi PV (1983). Eur J Appl Physiol 50:273–282.
 */

/** Yerçekimi ivmesi, cm/ms² — normalize birim dönüşümleri bu ölçekte yapılıyor. */
export const GRAVITY_CM_PER_MS2 = 9.81 * 100 / 1_000_000; // 9.81 m/s² → 9.81e-4 cm/ms²

/** Parabolün ikinci derece katsayısının beklenen gerçek karşılığı: ½g. */
export const HALF_GRAVITY_CM_PER_MS2 = GRAVITY_CM_PER_MS2 / 2;

/**
 * Ölçeğin fiziksel olarak makul aralığı (cm / normalize birim).
 *
 * Kadraj yüksekliği 1.0 normalize birim. 120-180cm boyundaki bir çocuk kadrajı
 * tamamen doldurursa ~120-180; kadrajın onda birini kaplarsa ~1200-1800 (bu
 * mesafede poz tespiti zaten çöker). Aşırı yakın çekimde alt sınır ~40.
 *
 * Bu aralık bir eşik değil, bir **fizik doğrulamasıdır**: eğriliği bu aralığın
 * dışına düşen bir hareket serbest düşüş değildir. Doğrusal bir rampa (yavaş
 * yükselme, ağırlık aktarımı) float gürültüsü kadar eğrilik üretir → ölçek
 * astronomik çıkar → reddedilir. Yer değiştirme eşiğinin yakalayamadığı
 * yanlış pozitifler burada elenir.
 */
export const MIN_PLAUSIBLE_CM_PER_UNIT = 40;
export const MAX_PLAUSIBLE_CM_PER_UNIT = 1200;

export interface ParabolaFit {
  /** y = a·t² + b·t + c — t milisaniye, y normalize görüntü birimi. */
  readonly a: number;
  readonly b: number;
  readonly c: number;
  /** Fit artıklarının standart sapması (normalize birim) — gürültü tahmini. */
  readonly residualStd: number;
  /** Fit'e giren örnek sayısı. */
  readonly n: number;
}

/**
 * En küçük kareler ile 2. derece polinom fit.
 *
 * Normal denklemleri kapalı formda çözer (3×3 sistem, Cramer). Zaman ekseni
 * ortalamaya göre merkezlenir — ham milisaniye değerleriyle t⁴ terimi 1e14
 * mertebesine çıkıp float hassasiyetini bitiriyor.
 *
 * @returns Fit; tekil sisteme düşerse (yetersiz/dejenere örnek) null.
 */
export function fitParabola(
  ts: readonly number[],
  ys: readonly number[]
): ParabolaFit | null {
  const n = ts.length;
  if (n < 5 || ys.length !== n) return null;

  // Sayısal koşullandırma: zamanı merkezle, sonda kaydırmayı geri al.
  const tBar = ts.reduce((s, t) => s + t, 0) / n;

  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
  let y0 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const u = ts[i] - tBar;
    const u2 = u * u;
    s0 += 1;
    s1 += u;
    s2 += u2;
    s3 += u2 * u;
    s4 += u2 * u2;
    y0 += ys[i];
    y1 += ys[i] * u;
    y2 += ys[i] * u2;
  }

  // [s4 s3 s2] [A]   [y2]
  // [s3 s2 s1] [B] = [y1]
  // [s2 s1 s0] [C]   [y0]
  const det =
    s4 * (s2 * s0 - s1 * s1) -
    s3 * (s3 * s0 - s1 * s2) +
    s2 * (s3 * s1 - s2 * s2);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-30) return null;

  const detA =
    y2 * (s2 * s0 - s1 * s1) -
    s3 * (y1 * s0 - s1 * y0) +
    s2 * (y1 * s1 - s2 * y0);
  const detB =
    s4 * (y1 * s0 - y0 * s1) -
    y2 * (s3 * s0 - s1 * s2) +
    s2 * (s3 * y0 - y1 * s2);
  const detC =
    s4 * (s2 * y0 - s1 * y1) -
    s3 * (s3 * y0 - y1 * s2) +
    y2 * (s3 * s1 - s2 * s2);

  const A = detA / det;
  const B = detB / det;
  const C = detC / det;

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const u = ts[i] - tBar;
    const pred = A * u * u + B * u + C;
    const r = ys[i] - pred;
    sse += r * r;
  }
  // 3 parametre tahmin edildi → n-3 serbestlik derecesi.
  const residualStd = n > 3 ? Math.sqrt(sse / (n - 3)) : 0;

  // Merkezlemeyi geri al: y = A(t−t̄)² + B(t−t̄) + C
  const a = A;
  const b = B - 2 * A * tBar;
  const c = A * tBar * tBar - B * tBar + C;

  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
    return null;
  }
  return { a, b, c, residualStd, n };
}

/** Artık eşiği — 2.5σ üstü kareler budanır. Tam RANSAC'tan ucuz, 6-24 örnekte daha kararlı. */
const PRUNE_SIGMA = 2.5;
/** Budamadan sonra fit için asgari kalan örnek. */
const MIN_PRUNED_SAMPLES = 5;

/**
 * Aykırı kareye dayanıklı parabol fit'i.
 *
 * Düz en küçük kareler tek bir kaçık landmark'ı (bulanık uçuş karesi)
 * bütün eğriliği kaydırır. Budanmış yeniden fit: kaba çözüm → |artık| >
 * 2.5σ olanları at → yeniden fit. Kalan örnek yetmezse kaba çözüm korunur.
 */
export function fitParabolaRobust(
  ts: readonly number[],
  ys: readonly number[]
): ParabolaFit | null {
  const coarse = fitParabola(ts, ys);
  if (!coarse) return null;
  if (coarse.n < 8 || !(coarse.residualStd > 0)) return coarse;

  const keptT: number[] = [];
  const keptY: number[] = [];
  const limit = PRUNE_SIGMA * coarse.residualStd;
  for (let i = 0; i < ts.length; i++) {
    const pred = coarse.a * ts[i] * ts[i] + coarse.b * ts[i] + coarse.c;
    if (Math.abs(ys[i] - pred) <= limit) {
      keptT.push(ts[i]);
      keptY.push(ys[i]);
    }
  }
  if (keptT.length < MIN_PRUNED_SAMPLES || keptT.length === ts.length) {
    return coarse;
  }
  return fitParabola(keptT, keptY) ?? coarse;
}

/**
 * Parabol eğriliğinin yerçekimiyle tutarlı olup olmadığı — taban çizgisinden
 * bağımsız. Çocuk geri sayımda çömelmişse baseline kayar; eğrilik kaymaz.
 *
 * @returns cm / normalize-birim; eğrilik balistik değilse null.
 */
export function gravityConsistentCmPerUnit(a: number): number | null {
  if (!(a > 0) || !Number.isFinite(a)) return null;
  const cmPerUnit = HALF_GRAVITY_CM_PER_MS2 / a;
  if (
    !Number.isFinite(cmPerUnit) ||
    cmPerUnit < MIN_PLAUSIBLE_CM_PER_UNIT ||
    cmPerUnit > MAX_PLAUSIBLE_CM_PER_UNIT
  ) {
    return null;
  }
  return cmPerUnit;
}

/** Fit'in açıkladığı varyans oranı (R²). */
export function parabolaRSquared(
  fit: ParabolaFit,
  ys: readonly number[]
): number {
  if (ys.length === 0) return 0;
  const mean = ys.reduce((s, y) => s + y, 0) / ys.length;
  let ssTot = 0;
  for (const y of ys) ssTot += (y - mean) * (y - mean);
  const ssRes = fit.residualStd * fit.residualStd * Math.max(1, fit.n - 3);
  return ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
}

export interface FlightSolution {
  /** Taban çizgisi kesişimlerinden gerçek uçuş süresi (ms). */
  readonly flightTimeMs: number;
  /** Kalkış anı (ms, girdi zaman ekseninde). */
  readonly takeoffMs: number;
  /** İniş anı (ms). */
  readonly landingMs: number;
  /** Uçuş süresinin 1σ belirsizliği (ms) — fit artığından türetilir. */
  readonly sigmaMs: number;
  /**
   * Parabol eğriliğinden çıkan ölçek: `½g / a`.
   * Boy veya world landmark gerekmeden cm/normalize-birim verir.
   */
  readonly cmPerUnitFromGravity: number;
  /** Fit'in açıkladığı varyans oranı (R²) — balistik uyum kalitesi. */
  readonly rSquared: number;
}

/**
 * Uçuş fazı parabolünden taban çizgisi köklerini çözer.
 *
 * @param fit          Uçuş fazı örneklerine yapılmış parabol fit'i.
 * @param baselineY    Yere basarken ayak bileğinin normalize Y'si.
 * @param ys           Fit'e giren ham Y değerleri (R² için).
 * @returns Çözüm; parabol taban çizgisini kesmiyorsa veya ters yönlüyse null.
 */
export function solveFlightFromParabola(
  fit: ParabolaFit,
  baselineY: number,
  ys: readonly number[]
): FlightSolution | null {
  const { a, b, c, residualStd } = fit;

  // Görüntü koordinatında yukarı = küçük Y. Uçuşta Y önce azalır sonra artar
  // → parabol yukarı açılır → a > 0 olmalı. Değilse balistik değil.
  const cmPerUnit = gravityConsistentCmPerUnit(a);
  if (cmPerUnit == null) return null;

  const disc = b * b - 4 * a * (c - baselineY);
  if (!(disc > 0)) return null;

  const sqrtDisc = Math.sqrt(disc);
  const takeoffMs = (-b - sqrtDisc) / (2 * a);
  const landingMs = (-b + sqrtDisc) / (2 * a);
  const flightTimeMs = landingMs - takeoffMs;
  if (!Number.isFinite(flightTimeMs) || flightTimeMs <= 0) return null;

  // Kök belirsizliği: eğrinin kökteki eğimi |dy/dt| = √disc.
  // Dikey gürültü σ_y → zaman belirsizliği σ_t = σ_y / |eğim|.
  // İki kök bağımsız → σ_T = √2 · σ_y / √disc.
  const sigmaMs =
    sqrtDisc > 0 ? (Math.SQRT2 * residualStd) / sqrtDisc : Number.POSITIVE_INFINITY;

  return {
    flightTimeMs,
    takeoffMs,
    landingMs,
    sigmaMs,
    cmPerUnitFromGravity: cmPerUnit,
    rSquared: parabolaRSquared(fit, ys),
  };
}

/**
 * Bosco: uçuş süresinden sıçrama yüksekliği.
 *
 *   h (m) = g·t² / 8
 */
export function flightTimeToHeightCm(flightTimeMs: number): number {
  const t = flightTimeMs / 1000;
  return ((9.81 * t * t) / 8) * 100;
}

/**
 * Bosco yüksekliğinin belirsizliği — hata yayılımı.
 *
 *   h = g·t²/8  →  dh/dt = g·t/4  →  σ_h = (g·t/4)·σ_t
 */
export function heightSigmaCm(flightTimeMs: number, sigmaMs: number): number {
  const t = flightTimeMs / 1000;
  const sigmaS = sigmaMs / 1000;
  const dhdt = (9.81 * t) / 4; // m/s per s
  return Math.abs(dhdt * sigmaS) * 100;
}
