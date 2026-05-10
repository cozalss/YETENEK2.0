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
 * Yaş × cinsiyet × hop sayısı tablosu — 15 saniye için.
 * Kaynak: Larsen 2022 pediatric side-hop trajectory + Munro 2011 yetişkin
 * anchor (~20 hop/15s). 8-10 yaş literatür eksik → pilot doğrulama önerilir.
 */
const LATERAL_HOP_NORMS: Record<number, { male: number; female: number }> = {
  8: { male: 13, female: 12 },
  9: { male: 14, female: 13 },
  10: { male: 15, female: 14 },
  11: { male: 17, female: 15 },
  12: { male: 18, female: 16 },
  13: { male: 20, female: 17 },
  14: { male: 21, female: 18 },
  15: { male: 22, female: 19 },
};

export function lateralHopsScore(
  hopCount: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const ages = Object.keys(LATERAL_HOP_NORMS).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const norm = LATERAL_HOP_NORMS[closestAge][sex];
  const ratio = hopCount / norm;
  return Math.max(0, Math.min(100, ((ratio - 0.5) / 1.0) * 100));
}
