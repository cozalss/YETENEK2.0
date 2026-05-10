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
 * Yaş × cinsiyet × cm tablosu — kaynak: Thomas 2020 (11-18) + Tomkinson 2018 +
 * FUPRECOL (Ramírez-Vélez 2017) ekstrapolasyonu (8-10 yaş literatür eksik,
 * pediatric pilot doğrulaması önerilir).
 */
const BROAD_JUMP_NORMS_CM: Record<number, { male: number; female: number }> = {
  8: { male: 118, female: 113 },
  9: { male: 128, female: 122 },
  10: { male: 137, female: 131 },
  11: { male: 147, female: 140 },
  12: { male: 162, female: 144 },
  13: { male: 175, female: 147 },
  14: { male: 186, female: 150 },
  15: { male: 195, female: 152 },
};

/**
 * Mesafeyi yaş normuna göre 0-100 puan'a çevirir.
 *  50% norm → 0, norm → 50, 150% norm → 100 (lineer).
 */
export function broadJumpScore(
  distanceCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const ages = Object.keys(BROAD_JUMP_NORMS_CM).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const norm = BROAD_JUMP_NORMS_CM[closestAge][sex];
  const ratio = distanceCm / norm;
  return Math.max(0, Math.min(100, ((ratio - 0.5) / 1.0) * 100));
}
