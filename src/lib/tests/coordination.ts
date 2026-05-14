/**
 * Coordination — görsel-motor takip testi (Pursuit Rotor digital analog).
 *
 * Pure JS, MediaPipe yok. Ekranda Lissajous yörüngesinde hareket eden
 * bir nokta var; kullanıcı parmak/cursor ile takip ediyor.
 * Her dokunma anında dot ile dokunma noktası arası Euclidean piksel
 * mesafesi kaydediliyor; ortalama hata coord skorunu belirliyor.
 *
 * Bilimsel anchor: Pursuit Rotor Task (Flowers 2010 J Neurosci Methods,
 * Mueller & Piper 2014 PEBL). Yaş 9 → 15 arası fine-motor performans
 * büyük etki büyüklüğü ile artar (Cohen's d ≈ 1.23).
 *
 * Yetenek için bu test koordinasyon boyutunu ölçer:
 *   - Masa tenisi, badminton, raket sporları için kritik.
 *   - Cimnastik, dövüş sporlarında orta önemde.
 *
 * A11y notu: bu test inherently visual — görme zorluğu olan kullanıcıya
 * "atla" patikası net sunulmalı, fake bir alternatif üretilmemeli.
 */

export interface LissajousParams {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  freqXHz: number;
  freqYHz: number;
  phaseOffset: number;
}

export interface TrackingTouch {
  t: number;
  dotX: number;
  dotY: number;
  touchX: number;
  touchY: number;
}

export interface CoordinationAnalysis {
  trackingEvents: number;
  avgErrorPx: number;
  bestErrorPx: number;
  /** Canvas diagonal yüzdesi olarak normalize hata — cihaz bağımsız metrik. */
  avgErrorPctOfDiagonal: number;
  /** Ortalama dokunmalar arası süre (ms) — düşük = sürekli takip */
  avgGapMs: number;
  /** 0-100, koordinasyon skoru */
  coordScore: number;
  valid: boolean;
  reason?: string;
}

export const COORDINATION_DURATION_MS = 25_000;

/**
 * Dot pozisyonunu Lissajous yörüngesi formülü ile hesaplar.
 * Frekanslar farklı (irrasyonel orana yakın) — yörünge tahmin edilemez.
 */
export function computeDotPosition(
  params: LissajousParams,
  elapsedMs: number
): { x: number; y: number } {
  const t = elapsedMs / 1000;
  return {
    x:
      params.cx +
      params.rx *
        Math.sin(2 * Math.PI * params.freqXHz * t + params.phaseOffset),
    y: params.cy + params.ry * Math.sin(2 * Math.PI * params.freqYHz * t),
  };
}

/** Default canvas için makul Lissajous parametreleri. */
export function defaultLissajous(
  canvasWidth: number,
  canvasHeight: number
): LissajousParams {
  return {
    cx: canvasWidth / 2,
    cy: canvasHeight / 2,
    rx: canvasWidth * 0.38,
    ry: canvasHeight * 0.32,
    freqXHz: 0.32,
    freqYHz: 0.41,
    phaseOffset: Math.PI / 2,
  };
}

export function analyzeCoordination(
  touches: TrackingTouch[],
  canvasWidth = 500,
  canvasHeight = 500,
): CoordinationAnalysis {
  if (touches.length < 5) {
    return {
      trackingEvents: touches.length,
      avgErrorPx: 0,
      bestErrorPx: 0,
      avgErrorPctOfDiagonal: 0,
      avgGapMs: 0,
      coordScore: 0,
      valid: false,
      reason:
        'Yeterli dokunma kaydedilemedi. Test boyunca hareket eden noktayı parmağınla takip et.',
    };
  }

  const errors = touches.map((s) => {
    const dx = s.dotX - s.touchX;
    const dy = s.dotY - s.touchY;
    return Math.sqrt(dx * dx + dy * dy);
  });
  const avgErrorPx = errors.reduce((a, b) => a + b, 0) / errors.length;
  const bestErrorPx = Math.min(...errors);

  // Cihaz bağımsız normalize hata: canvas diagonal yüzdesi.
  // 1920px monitor vs 400px telefon arasındaki ölçüm tutarlılığını sağlar.
  const diagonal = Math.sqrt(canvasWidth ** 2 + canvasHeight ** 2);
  const avgErrorPctOfDiagonal = diagonal > 0 ? (avgErrorPx / diagonal) * 100 : 0;

  const gaps: number[] = [];
  for (let i = 1; i < touches.length; i++) {
    gaps.push(touches[i].t - touches[i - 1].t);
  }
  const avgGapMs =
    gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

  return {
    trackingEvents: touches.length,
    avgErrorPx,
    bestErrorPx,
    avgErrorPctOfDiagonal,
    avgGapMs,
    coordScore: coordinationScore(avgErrorPctOfDiagonal, avgGapMs),
    valid: true,
  };
}

/**
 * Skor — canvas diagonal yüzdesi olarak normalize hata.
 *
 *   - %1.5 hata (Lissajous canvas'ında ~10px @ 500x500) → ~100 skor
 *   - %15 hata (~100px @ 500x500) → ~0 skor
 *   - Gap penalty: 600ms üstü sürekliliksizlik (sezgisel)
 *
 * NOT (Flowers 2010 pediatric pursuit fine-motor curve):
 * Bu skor henüz peer-reviewed pediatric pursuit rotor norm tablosuna
 * dayanmıyor — Flowers 2010 yaş 9-15 fine-motor 1.2σ büyüklüğüyle
 * geliştiğini söyler ama kesin threshold yok. Demo öncesi 20+ çocuk
 * pilot çalışması önerilir. **Validity 3.5/5** — research-grade.
 */
export function coordinationScore(
  avgErrorPctOfDiagonal: number,
  avgGapMs: number
): number {
  // 1.5% diagonal hata = 100 skor; 15% diagonal hata = 0 skor.
  const errorScore = Math.max(
    0,
    Math.min(100, 100 - (avgErrorPctOfDiagonal - 1.5) * 7.4),
  );
  const gapPenalty = Math.max(0, (avgGapMs - 600) / 30);
  return Math.max(0, Math.min(100, errorScore - gapPenalty));
}
