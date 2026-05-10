/**
 * Standing Long Jump (Broad Jump) — yatay patlayıcı güç testi.
 *
 * CMJ dikey patlayıcı gücü ölçer; sprint, futbol, judo, hentbol gibi sporlar
 * için yatay patlayıcı güç çok daha belirleyicidir. CMJ↔broad-jump korelasyonu
 * literatürde ~0.6 — ayrı boyut olarak ölçmek anlamlı.
 *
 * Algılama mantığı:
 *   READY    → kullanıcı dik durur, ankle-midpoint X baseline.
 *   LAUNCH   → ankle X hızlı yer değişimi (yatay patlayış).
 *   LAND     → ankle X tekrar stabilize, yeni konum.
 *
 * Mesafe ölçümü: |ankleX_end − ankleX_start| × cmPerUnit (calibration frame'den).
 *
 * Yan görünüm önerilir (kamera profil görür) ama frontal de çalışır — sadece
 * ankle X'in ekrandaki yer değiştirmesi ölçülür.
 *
 * Yaş normları (kaynak: Tomkinson 2018 BJSM 52:1445, Thomas 2020 EJTM 30(2):9050,
 * Ramírez-Vélez 2017 Nutrients 9:1167; <11 yaş için interp+pediatric pilot
 * doğrulaması önerilir).
 */

import type { PoseFrame } from '@/types';
import { POSE_LANDMARKS } from '@/types';
import {
  getCmPerUnit,
  hasVisibleLandmarks,
  smoothSeries,
} from '@/lib/pose/extractKeypoints';
import { zScorePercentile } from '@/lib/stats/normalCdf';

const REQUIRED_LANDMARKS = [
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
];

export interface BroadJumpSample {
  t: number;
  ankleX: number; // ayak ortalaması X, normalize 0-1
}

export interface BroadJumpAnalysis {
  jumpUnits: number;
  jumpDistanceCm: number | null;
  startX: number;
  endX: number;
  valid: boolean;
  reason?: string;
}

// 30cm normalize ≈ 0.08 birim (kişi çerçevenin %35'ini kaplarsa).
// Bunun altı kayma/titreşim olarak değerlendirilir.
const MIN_JUMP_UNITS = 0.06;
const START_WINDOW_FRAMES = 15;
const END_WINDOW_FRAMES = 15;

export function isBroadJumpFrameUsable(frame: PoseFrame): boolean {
  return hasVisibleLandmarks(frame, REQUIRED_LANDMARKS, 0.5);
}

export function frameToBroadJumpSample(
  frame: PoseFrame
): BroadJumpSample | null {
  if (!isBroadJumpFrameUsable(frame)) return null;
  const la = frame.landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const ra = frame.landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  if (!la || !ra) return null;
  return { t: frame.timestamp, ankleX: (la.x + ra.x) / 2 };
}

export function analyzeBroadJump(
  samples: BroadJumpSample[]
): BroadJumpAnalysis {
  if (samples.length < 60) {
    return {
      jumpUnits: 0,
      jumpDistanceCm: null,
      startX: 0,
      endX: 0,
      valid: false,
      reason:
        'Yetersiz frame. Kameraya tam görün, atlamadan önce ve sonra bir saniye sabit dur.',
    };
  }

  const xs = smoothSeries(
    samples.map((s) => s.ankleX),
    5
  );

  const startSlice = xs.slice(0, START_WINDOW_FRAMES);
  const endSlice = xs.slice(-END_WINDOW_FRAMES);
  const startX = startSlice.reduce((a, b) => a + b, 0) / startSlice.length;
  const endX = endSlice.reduce((a, b) => a + b, 0) / endSlice.length;
  const jumpUnits = Math.abs(endX - startX);

  if (jumpUnits < MIN_JUMP_UNITS) {
    return {
      jumpUnits,
      jumpDistanceCm: null,
      startX,
      endX,
      valid: false,
      reason:
        'Belirgin yatay hareket algılanmadı. İleri doğru atlaman gerekiyor.',
    };
  }

  return {
    jumpUnits,
    jumpDistanceCm: null,
    startX,
    endX,
    valid: true,
  };
}

/**
 * Ölçülen normalize jumpUnits'i cm'e çevirir.
 * Önce calibrationFrame.worldLandmarks ile (gerçek metre, boy gerekmez);
 * yoksa heightCm fallback'i.
 */
export function calibrateBroadJump(
  analysis: BroadJumpAnalysis,
  calibrationFrame: PoseFrame,
  heightCm: number | null
): BroadJumpAnalysis {
  if (!analysis.valid) return analysis;
  const cmPerUnit = getCmPerUnit(calibrationFrame, heightCm);
  if (cmPerUnit == null) return analysis;
  return {
    ...analysis,
    jumpDistanceCm: analysis.jumpUnits * cmPerUnit,
  };
}

/**
 * Yaş × cinsiyet × cm normları (mean + standart sapma).
 *
 * Kaynaklar:
 *   - Thomas et al. 2020 (Eur J Transl Myol 30:9050) — 11-18 yaş
 *   - Tomkinson et al. 2018 (Br J Sports Med 52:1445) — Eurofit
 *   - Castro-Piñero et al. 2010 (J Strength Cond Res) — 6-17 yaş
 *   - Ramírez-Vélez et al. 2017 (Nutrients 9:1167) — FUPRECOL Kolombiya
 *
 * SD'ler tipik olarak ortalamanın ~%14-18'i (literatürde rapor edilen aralık).
 */
interface BroadJumpNorm {
  mean: number; // cm
  sd: number; // cm
}
const BROAD_JUMP_NORMS_CM: Record<
  number,
  { male: BroadJumpNorm; female: BroadJumpNorm }
> = {
  8: { male: { mean: 118, sd: 18 }, female: { mean: 113, sd: 17 } },
  9: { male: { mean: 128, sd: 19 }, female: { mean: 122, sd: 18 } },
  10: { male: { mean: 137, sd: 21 }, female: { mean: 131, sd: 19 } },
  11: { male: { mean: 147, sd: 22 }, female: { mean: 140, sd: 20 } },
  12: { male: { mean: 162, sd: 24 }, female: { mean: 144, sd: 21 } },
  13: { male: { mean: 175, sd: 26 }, female: { mean: 147, sd: 22 } },
  14: { male: { mean: 186, sd: 28 }, female: { mean: 150, sd: 22 } },
  15: { male: { mean: 195, sd: 29 }, female: { mean: 152, sd: 23 } },
};

/**
 * Mesafeyi yaş+cinsiyet normuna göre persentile çevirir.
 *
 * Örnek: 12 yaş erkek, 162cm atlama → Z=0 → 50. persentil
 *        12 yaş erkek, 186cm → Z=+1 → 84. persentil
 */
export function broadJumpPercentile(
  distanceCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const ages = Object.keys(BROAD_JUMP_NORMS_CM).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const { mean, sd } = BROAD_JUMP_NORMS_CM[closestAge][sex];
  return zScorePercentile(distanceCm, mean, sd);
}

/**
 * Standing long jump 0-100 skor'u — persentil tabanlı (jump.ts ile tutarlı).
 *
 * Eski lineer yaklaşım (50% norm = 0, 150% norm = 100) yerine Z-score
 * persentili kullanılıyor — sportif bilim standardı + tüm yaşlarda tutarlı.
 *
 * Backward-compat: imza aynı kaldı.
 */
export function broadJumpScore(
  distanceCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  return broadJumpPercentile(distanceCm, ageYears, sex);
}
