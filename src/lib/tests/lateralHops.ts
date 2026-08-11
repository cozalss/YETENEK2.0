/**
 * Lateral Hops — 15 saniye iki nokta arası yan sıçrama (çeviklik testi).
 *
 * Side-Hop testi (Munro & Herrington 2011 JSCR; Larsen 2022 PMC8453553)
 * pediatric versiyonuna karşılık geliyor. Çeviklik / change-of-direction
 * (COD) bio-motor yetisini ölçer — futbol, badminton, taekwondo gibi
 * sporlarda kritik ayrıştırıcı.
 *
 * Algoritma:
 *   1. Calibration frame'de kullanıcının ankle midpoint X = midline.
 *   2. 15sn boyunca her frame'de ankle X midline'ın hangi tarafında say.
 *   3. Geçiş = hop. 300ms debounce ile yarım hareketleri filtrele.
 *
 * Kamera: frontal görüntü (kullanıcı direkt kameraya baksın).
 *
 * Yaş normları: Larsen 2022 pediatric trajectory + Munro 2011 yetişkin scaling.
 * 8-10 yaş için pilot doğrulama önerilir (literatür kısmen eksik).
 */

import type { PoseFrame } from '@/types';
import { POSE_LANDMARKS } from '@/types';
import { hasVisibleLandmarks, smoothSeries } from '@/lib/pose/extractKeypoints';
import { zScorePercentile } from '@/lib/stats/normalCdf';

const REQUIRED_LANDMARKS = [
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
];

export interface LateralHopSample {
  t: number;
  ankleX: number; // ayak ortalaması X, normalize 0-1
}

export interface LateralHopsAnalysis {
  hopCount: number;
  frequencyHz: number;
  durationMs: number;
  /** Frame eksikliği yüksekse 'low' */
  dataQuality: 'good' | 'low';
  valid: boolean;
  reason?: string;
}

export const LATERAL_HOPS_DURATION_MS = 15_000;

/**
 * Hop debounce: 250ms = 4 Hz üst sınır. Maksimum insan side-hop frekansı
 * tipik 3.0-3.5 Hz (Munro & Herrington 2011 hop test reliability paper'da
 * mean ~2.4 Hz, peak ~3.3 Hz). 250ms eşiği:
 *   - 4 Hz altı tüm "anlamlı" side-step'leri sayar
 *   - Aşırı hızlı pose noise / titreme false-positive engeller
 *   - Larsen 2022 pediatric data ile uyumlu (mean 2.0-2.8 Hz yaş 8-15)
 *
 * Eşik 300ms'den 250ms'ye düşürüldü çünkü 300ms 3.3Hz altı her hop'u
 * sayardı — pediatrik elit (örn. 12 yaş futbolcu) tipik 3.0-3.5 Hz peak
 * yapabilir, 300ms onları undercounting'e götürürdü.
 */
const HOP_DEBOUNCE_MS = 250;

export function isLateralHopFrameUsable(frame: PoseFrame): boolean {
  return hasVisibleLandmarks(frame, REQUIRED_LANDMARKS, 0.4);
}

export function frameToLateralHopSample(
  frame: PoseFrame
): LateralHopSample | null {
  if (!isLateralHopFrameUsable(frame)) return null;
  const la = frame.landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const ra = frame.landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  if (!la || !ra) return null;
  return { t: frame.timestamp, ankleX: (la.x + ra.x) / 2 };
}

/**
 * @param midlineX Calibration frame'den alınmış ankle midpoint X.
 *                 Eğer null ise samples'ın ilk %20'sinin medyanı kullanılır.
 */
export function analyzeLateralHops(
  samples: LateralHopSample[],
  midlineX: number | null
): LateralHopsAnalysis {
  if (samples.length < 60) {
    return {
      hopCount: 0,
      frequencyHz: 0,
      durationMs: 0,
      dataQuality: 'low',
      valid: false,
      reason: 'Yetersiz frame. Vücudunun kameraya tam görünmesi gerekiyor.',
    };
  }

  const xs = smoothSeries(
    samples.map((s) => s.ankleX),
    3
  );

  // Midline yoksa ilk %20'lik dilimin medyanı = kullanıcı dik dururken X.
  let mid = midlineX;
  if (mid == null) {
    const headSize = Math.max(1, Math.floor(samples.length * 0.2));
    const head = [...xs.slice(0, headSize)].sort((a, b) => a - b);
    // Çift uzunluklu diziler için iki orta değerin ortalaması (true median).
    const mIdx = Math.floor(head.length / 2);
    mid =
      head.length % 2 === 0 ? (head[mIdx - 1] + head[mIdx]) / 2 : head[mIdx];
  }

  let hopCount = 0;
  let lastSide: 'left' | 'right' | null = null;
  let lastHopT = -Infinity;

  for (let i = 0; i < samples.length; i++) {
    const currentSide: 'left' | 'right' = xs[i] < mid ? 'left' : 'right';
    const t = samples[i].t;
    if (
      lastSide !== null &&
      currentSide !== lastSide &&
      t - lastHopT > HOP_DEBOUNCE_MS
    ) {
      hopCount++;
      lastHopT = t;
    }
    lastSide = currentSide;
  }

  const durationMs = samples[samples.length - 1].t - samples[0].t;
  const durationS = durationMs / 1000;
  const frequencyHz = durationS > 0 ? hopCount / durationS : 0;

  const expectedFrames = Math.round((durationMs / 1000) * 30);
  const dataQuality: 'good' | 'low' =
    samples.length >= expectedFrames * 0.7 ? 'good' : 'low';

  return {
    hopCount,
    frequencyHz,
    durationMs,
    dataQuality,
    valid: hopCount >= 4,
    reason:
      hopCount < 4
        ? 'Yeterli atlama algılanamadı. Daha geniş ve net yan sıçramalar dene.'
        : undefined,
  };
}

/**
 * Yaş × cinsiyet × hop sayısı normları (mean + SD), 15 saniye için.
 *
 * Kaynaklar:
 *   - Larsen et al. 2022 (Translational Sports Medicine PMC8453553) — pediatric
 *   - Munro & Herrington 2011 (J Strength Cond Res 25:1470) — yetişkin anchor
 *
 * SD'ler tipik ~%18-22 (pediatric COD task literature ortalaması).
 * 8-10 yaş için pilot doğrulama önerilir; norm aralığı geniş tutuldu.
 */
interface HopsNorm {
  mean: number;
  sd: number;
}
const LATERAL_HOP_NORMS: Record<number, { male: HopsNorm; female: HopsNorm }> = {
  8: { male: { mean: 13, sd: 3 }, female: { mean: 12, sd: 2.5 } },
  9: { male: { mean: 14, sd: 3 }, female: { mean: 13, sd: 2.7 } },
  10: { male: { mean: 15, sd: 3.2 }, female: { mean: 14, sd: 2.8 } },
  11: { male: { mean: 17, sd: 3.5 }, female: { mean: 15, sd: 3 } },
  12: { male: { mean: 18, sd: 3.8 }, female: { mean: 16, sd: 3.2 } },
  13: { male: { mean: 20, sd: 4 }, female: { mean: 17, sd: 3.3 } },
  14: { male: { mean: 21, sd: 4.2 }, female: { mean: 18, sd: 3.5 } },
  15: { male: { mean: 22, sd: 4.5 }, female: { mean: 19, sd: 3.7 } },
};

/**
 * Hop sayısını yaş+cinsiyet normuna göre persentile çevirir.
 *
 * Örnek: 12 yaş erkek, 18 hop/15s → Z=0 → 50. persentil
 *        12 yaş erkek, 22 hop → Z=+1.05 → ~85. persentil
 */
export function lateralHopsPercentile(
  hopCount: number,
  ageYears: number,
  sex: 'male' | 'female',
  durationMs: number = LATERAL_HOPS_DURATION_MS
): number {
  const ages = Object.keys(LATERAL_HOP_NORMS).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const { mean, sd } = LATERAL_HOP_NORMS[closestAge][sex];

  // Norm tablosu 15 saniyelik pencereye ait. Yakalama erken kesilirse ham
  // hop sayısı doğrudan karşılaştırılamaz — kısa kayıt otomatik olarak düşük
  // persentil verirdi. `enduranceJacks` bu ölçeklemeyi zaten yapıyordu;
  // burada eksikti.
  //
  // Alt sınır: 5 saniyenin altındaki kayıtları ölçekleyip tam pencereymiş
  // gibi göstermek uydurma olur — o kadar kısa kayıt zaten `valid: false`.
  const durationS = Math.max(durationMs / 1000, 5);
  const nominalS = LATERAL_HOPS_DURATION_MS / 1000;
  const normalizedHops = hopCount * (nominalS / durationS);

  return zScorePercentile(normalizedHops, mean, sd);
}

/**
 * 0-100 skor — persentil tabanlı (jump/broadJump ile tutarlı).
 * Backward-compat: `durationMs` verilmezse nominal 15 sn varsayılır.
 */
export function lateralHopsScore(
  hopCount: number,
  ageYears: number,
  sex: 'male' | 'female',
  durationMs: number = LATERAL_HOPS_DURATION_MS
): number {
  return lateralHopsPercentile(hopCount, ageYears, sex, durationMs);
}
