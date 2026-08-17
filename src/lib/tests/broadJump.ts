/**
 * Standing Long Jump (Broad Jump) — yatay patlayıcı güç testi.
 *
 * CMJ dikey patlayıcı gücü ölçer; sprint, futbol, judo gibi sporlar
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

/**
 * İniş konumunu bulur.
 *
 * Bu fonksiyon eskiden yoktu: `endX` yakalamanın **son** 15 karesinin
 * ortalamasıydı. Yakalama penceresi 6 saniye, atlama ise ~1 saniye sürüyor;
 * çocuk indikten sonra kalan 4-5 saniyede başlangıca doğru bir iki adım
 * atarsa `endX` başlangıca yaklaşıyor, `jumpUnits` sıfıra iniyor ve gerçek
 * bir atlama "belirgin yatay hareket algılanmadı" diye reddediliyordu.
 *
 * Modülün kendi dokümantasyonu zaten doğru davranışı tarif ediyordu
 * (READY → LAUNCH → **LAND: ankle X tekrar stabilize, yeni konum**); burada
 * uygulanan o.
 *
 * Yöntem: çocuk başlangıçtan anlamlı biçimde ayrıldıktan sonra serinin
 * durduğu İLK yeri iniş kabul et ve o civarın ortalamasını al.
 *
 * "İlk duruş" olması önemli: en uzak noktayı aramak yanlış olurdu, çünkü
 * çocuk indikten sonra bir adım daha atarsa en uzak nokta o adım olur ve
 * mesafe şişer. İlk duruş ise inişin kendisidir; sonrasında ne yaptığı —
 * geri yürümek de dahil — ölçüme karışmaz.
 */
function findLandingX(xs: number[], startX: number): number {
  if (xs.length === 0) return startX;

  // Kare başına hareket bunun altındaysa çocuk durmuş sayılır — 30 fps'te
  // saniyede ~%9 kadraj, yani yürümenin belirgin altında.
  const STILL_PER_FRAME = 0.003;
  const STILL_RUN = 5;

  // 1) Ayrılış: başlangıçtan gerçekten uzaklaştığı ilk kare. Eşik olarak
  //    geçerlilik eşiğini kullanıyoruz — hazırlık fazındaki küçük salınım
  //    "atlama başladı" sanılmasın.
  let departIdx = -1;
  for (let i = 0; i < xs.length; i++) {
    if (Math.abs(xs[i] - startX) > MIN_JUMP_UNITS) {
      departIdx = i;
      break;
    }
  }
  if (departIdx < 0) {
    // Hiç ayrılmamış: son pencerenin ortalaması yeterli, zaten geçersiz
    // sayılacak.
    const tail = xs.slice(-END_WINDOW_FRAMES);
    return tail.reduce((a, b) => a + b, 0) / tail.length;
  }

  // 2) Ayrılıştan sonra ilk duruş = iniş.
  let still = 0;
  let landIdx = -1;
  for (let i = departIdx + 1; i < xs.length; i++) {
    still = Math.abs(xs[i] - xs[i - 1]) < STILL_PER_FRAME ? still + 1 : 0;
    if (still >= STILL_RUN) {
      landIdx = i;
      break;
    }
  }

  // Hiç durmadıysa (sürekli hareket) en uzak noktaya düş.
  if (landIdx < 0) {
    let peakIdx = departIdx;
    let peakDist = -1;
    for (let i = departIdx; i < xs.length; i++) {
      const d = Math.abs(xs[i] - startX);
      if (d > peakDist) {
        peakDist = d;
        peakIdx = i;
      }
    }
    landIdx = peakIdx;
  }

  // İniş civarının ortalaması — tek kare gürültüsüne dayanmasın.
  const half = Math.floor(END_WINDOW_FRAMES / 2);
  const lo = Math.max(0, landIdx - half);
  const hi = Math.min(xs.length, landIdx + half + 1);
  const win = xs.slice(lo, hi);
  return win.reduce((a, b) => a + b, 0) / win.length;
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
  const startX = startSlice.reduce((a, b) => a + b, 0) / startSlice.length;
  const endX = findLandingX(xs, startX);
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
 * Norm aggregate metodu:
 *   8-10 yaş   → Castro-Piñero 2010 (J Strength Cond Res 24:1810; N≈2700,
 *                 İspanya). Genç yaş için en güçlü pediatrik dataset.
 *   11-13 yaş  → Tomkinson 2018 (Br J Sports Med 52:1445; meta-analiz
 *                 N>1.3M, pan-Avrupa). Bu aralıkta gold standard.
 *   14-15 yaş  → Thomas 2020 (Eur J Transl Myol 30:9050) ve Ramírez-Vélez
 *                 2017 (Nutrients 9:1167; FUPRECOL, N≈8200 Kolombiya)
 *                 ağırlıklı ortalama.
 *
 * SD'ler tipik olarak ortalamanın ~%14-18'i (literatürde rapor edilen aralık).
 * Etnik popülasyonlar arası ortalama farkı tipik ±5-8 cm; tüm tablomuz
 * pan-popülasyon ortalama → her etnik için fine-tuning post-hackathon roadmap'te.
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
