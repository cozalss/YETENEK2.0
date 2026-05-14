/**
 * Endurance Jumping Jacks — 30sn anaerobik dayanıklılık testi.
 *
 * Bir jumping jack döngüsü:
 *   - Kollar yukarı (her iki bilek shoulder seviyesinin üstünde)
 *   - VE bacaklar açık (ankle X spread > kalça genişliği × 1.6)
 * Bu state'e geçiş = 1 tekrar.
 *
 * 30sn'deki toplam tekrar + tempo decay (son 5sn vs ilk 5sn) → endurance skoru.
 *
 * Bilimsel anchor: Podstawski 2019 J Hum Kinet 70:129 (3-min burpee youth norm),
 * FitnessGram 2017 cadenced-test methodology. Direkt pediatric jumping-jack
 * normu literatürde yok → analog bazlı tahmin, pilot doğrulama önerilir.
 *
 * Risk: kollar tam yukarı çıkınca wrist'lar frame'den dışarı çıkabilir
 * (özellikle portrait mod). visibility threshold 0.3 (daha gevşek)
 * ve "kollarını yukarı kaldır" ipucu UI'da net.
 */

import type { PoseFrame } from '@/types';
import { POSE_LANDMARKS } from '@/types';
import { hasVisibleLandmarks } from '@/lib/pose/extractKeypoints';

const REQUIRED_LANDMARKS = [
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
];

const ARM_UP_MARGIN = 0.02;
const LEGS_APART_MULTIPLIER = 1.6;

export interface JackSample {
  t: number;
  armsUp: boolean;
  legsApart: boolean;
}

export interface EnduranceJacksAnalysis {
  totalReps: number;
  first5sReps: number;
  last5sReps: number;
  /** (1 - last5/first5) × 100, yorgunluk göstergesi */
  decayPercent: number;
  durationMs: number;
  valid: boolean;
  reason?: string;
}

export const ENDURANCE_DURATION_MS = 30_000;

export function isJackFrameUsable(frame: PoseFrame): boolean {
  return hasVisibleLandmarks(frame, REQUIRED_LANDMARKS, 0.3);
}

export function frameToJackSample(frame: PoseFrame): JackSample | null {
  if (!isJackFrameUsable(frame)) return null;
  const ls = frame.landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rs = frame.landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const lw = frame.landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rw = frame.landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const lh = frame.landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rh = frame.landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const la = frame.landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const ra = frame.landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  if (!ls || !rs || !lh || !rh || !la || !ra) return null;

  // Wrist görünmezse "kol aşağıda" varsayılır — false negatif tarafa düş.
  const armsUp =
    lw != null &&
    rw != null &&
    lw.y < ls.y - ARM_UP_MARGIN &&
    rw.y < rs.y - ARM_UP_MARGIN;

  const ankleSpread = Math.abs(la.x - ra.x);
  const hipWidth = Math.abs(lh.x - rh.x);
  const legsApart =
    hipWidth > 0 ? ankleSpread > hipWidth * LEGS_APART_MULTIPLIER : false;

  return { t: frame.timestamp, armsUp, legsApart };
}

export function analyzeEnduranceJacks(
  samples: JackSample[]
): EnduranceJacksAnalysis {
  if (samples.length < 60) {
    return {
      totalReps: 0,
      first5sReps: 0,
      last5sReps: 0,
      decayPercent: 0,
      durationMs: 0,
      valid: false,
      reason: 'Yetersiz frame. Vücudunun kameraya tam görünmesi gerekiyor.',
    };
  }

  const startT = samples[0].t;
  const endT = samples[samples.length - 1].t;
  const durationMs = endT - startT;

  let inJack = false;
  let totalReps = 0;
  let first5sReps = 0;
  let last5sReps = 0;

  for (const s of samples) {
    const fullJack = s.armsUp && s.legsApart;
    if (fullJack && !inJack) {
      totalReps++;
      const elapsed = s.t - startT;
      if (elapsed < 5000) first5sReps++;
      if (elapsed > durationMs - 5000) last5sReps++;
    }
    inJack = fullJack;
  }

  const decayPercent =
    first5sReps > 0
      ? Math.max(0, Math.round((1 - last5sReps / first5sReps) * 100))
      : 0;

  return {
    totalReps,
    first5sReps,
    last5sReps,
    decayPercent,
    durationMs,
    // Minimum 8 rep gerekli — 30s'lik testte beklenen alt limit yaş 8 yaklaşık
    // 22 rep. 8 alt limit "anlamlı katılım" filtresi (çok düşük çocuk
    // hatalı detection veya iptal sayılır, validity koruması).
    valid: totalReps >= 8,
    reason:
      totalReps < 8
        ? 'Yeterli jumping jack algılanamadı (en az 8 doğru tekrar bekleniyor). Kollarını başının üstüne kaldır ve ayaklarını aç.'
        : undefined,
  };
}

/**
 * Yaş × cinsiyet × 30sn jumping jack tablosu.
 *
 * Norm aggregate metodu (gerçek pediatric jumping-jack peer-reviewed norm
 * yayını yok — analog scaling kullanılır):
 *   1. Podstawski 2019 (J Hum Kinet 70:129) — 3 dakika burpee normu
 *      pediatrik (yaş 7-15, N≈350). Burpee/jack metabolik equivalent (MET)
 *      oranı ~3:1 (Compendium of Physical Activities 2011: burpee 7.0 MET,
 *      jumping jack 7.7 MET ama jack daha basit hareket → cadance yüksek).
 *   2. FitnessGram 2017 cadenced curl-up trajectory + WHO Cardiorespiratory
 *      Fitness Reference 2017 (yaş 6-11 normalize).
 *   3. Manuel skala: 30 sn'lik test için tipik elite gencin 35-40 rep'i.
 *
 * Bu tablo **research-grade**, klinik kullanım için doğrulanmamış.
 * Validity 3.5/5 — 30+ çocukla pilot post-hackathon önerilir.
 */
const JACKS_NORMS_30S: Record<number, { male: number; female: number }> = {
  8: { male: 22, female: 20 },
  9: { male: 25, female: 23 },
  10: { male: 28, female: 25 },
  11: { male: 30, female: 27 },
  12: { male: 32, female: 29 },
  13: { male: 34, female: 30 },
  14: { male: 36, female: 31 },
  15: { male: 38, female: 32 },
};

export function enduranceScore(
  totalReps: number,
  durationMs: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const durationS = Math.max(durationMs / 1000, 10);
  const normalizedReps = totalReps * (30 / durationS);

  const ages = Object.keys(JACKS_NORMS_30S).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const norm = JACKS_NORMS_30S[closestAge][sex];
  const ratio = normalizedReps / norm;
  return Math.max(0, Math.min(100, ((ratio - 0.5) / 1.0) * 100));
}
