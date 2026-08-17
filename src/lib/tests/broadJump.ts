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
 * ## Mesafe ölçümü — görüntü X × bacak ölçeği
 *
 * MediaPipe `worldLandmarks` kalça orijinlidir: vücut öne gidince ayak–
 * kalça ofseti değişir, yerde kat edilen mesafe görünmez. ΔworldX bu yüzden
 * 1–8 cm gibi duruş farkı üretir (atlama değil).
 *
 * Yan kamera protokolünde atlama görüntü düzleminde X'tir. Ölçek aynı karede
 * bacak uzunluğundan gelir (`getCmPerUnit`: world hip–ankle / görüntü
 * hip–ankle). Mesafe = `|endX − startX| × cmPerUnit`. 40 cm altı (veya
 * ölçek yok) `null` — yaklaşık sayı uydurulmaz.
 *
 * Yaş normları (kaynak: Tomkinson 2018 BJSM 52:1445, Thomas 2020 EJTM 30(2):9050,
 * Ramírez-Vélez 2017 Nutrients 9:1167; <11 yaş için interp+pediatric pilot
 * doğrulaması önerilir).
 */

import type { PoseFrame } from '@/types';
import { POSE_LANDMARKS } from '@/types';
import { hasVisibleLandmarks, getCmPerUnit, smoothSeries } from '@/lib/pose/extractKeypoints';
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
  /**
   * Ayak ortalaması X, worldLandmarks'tan (metre, kalça-merkezli) — mevcutsa.
   * Mesafe hesabı bundan TÜRETİLMEZ (kalça orijini translasyonu gizler);
   * yalnız tanı/telemetri için tutulur.
   */
  worldAnkleX?: number | null;
}

export interface BroadJumpAnalysis {
  jumpUnits: number;
  jumpDistanceCm: number | null;
  startX: number;
  endX: number;
  /**
   * Başlangıç/iniş penceresindeki dünya-koordinat ankle X. Mesafe için
   * kullanılmaz; kalça-merkezli world X translasyonu ölçemez.
   */
  startWorldX: number | null;
  endWorldX: number | null;
  valid: boolean;
  reason?: string;
}

// 30cm normalize ≈ 0.08 birim (kişi çerçevenin %35'ini kaplarsa).
// Bunun altı kayma/titreşim olarak değerlendirilir.
const MIN_JUMP_UNITS = 0.06;
/** 8-15 yaş standing long jump nadiren 40 cm altındadır — altı ölçek hatası. */
const MIN_JUMP_DISTANCE_CM = 40;
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
  return {
    t: frame.timestamp,
    ankleX: (la.x + ra.x) / 2,
    worldAnkleX: worldAnkleMidX(frame),
  };
}

/** worldLandmarks'tan ayak ortalaması X (metre) — yoksa `null`. */
function worldAnkleMidX(frame: PoseFrame): number | null {
  const wl = frame.worldLandmarks;
  if (!wl || wl.length < 33) return null;
  const la = wl[POSE_LANDMARKS.LEFT_ANKLE];
  const ra = wl[POSE_LANDMARKS.RIGHT_ANKLE];
  if (!la || !ra) return null;
  return (la.x + ra.x) / 2;
}

function average(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * `null` içerebilen bir pencerenin ortalaması. Pencerenin yarısından azı
 * gerçek değer taşıyorsa `null` döner — kısmi bir ortalama, occlusion
 * gürültüsünü büyütür ve uydurmaktan daha iyi değildir.
 */
function averageNullable(values: ReadonlyArray<number | null>): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length < Math.ceil(values.length / 2)) return null;
  return average(present);
}

function windowAverage(
  xs: readonly number[],
  centerIdx: number,
  windowSize: number
): number {
  const half = Math.floor(windowSize / 2);
  const lo = Math.max(0, centerIdx - half);
  const hi = Math.min(xs.length, centerIdx + half + 1);
  return average(xs.slice(lo, hi));
}

function windowAverageNullable(
  xs: ReadonlyArray<number | null>,
  centerIdx: number,
  windowSize: number
): number | null {
  const half = Math.floor(windowSize / 2);
  const lo = Math.max(0, centerIdx - half);
  const hi = Math.min(xs.length, centerIdx + half + 1);
  return averageNullable(xs.slice(lo, hi));
}

/**
 * İniş anının kare indeksini bulur (ZAMANLAMA için — metrik dönüşüm için
 * değil, bkz. dosya başı doküman).
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
 * durduğu İLK yeri iniş kabul et.
 *
 * "İlk duruş" olması önemli: en uzak noktayı aramak yanlış olurdu, çünkü
 * çocuk indikten sonra bir adım daha atarsa en uzak nokta o adım olur ve
 * mesafe şişer. İlk duruş ise inişin kendisidir; sonrasında ne yaptığı —
 * geri yürümek de dahil — ölçüme karışmaz.
 */
function findLandIndex(xs: readonly number[], startX: number): number {
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
    // Hiç ayrılmamış: son pencerenin merkezine düş, zaten geçersiz sayılacak.
    return xs.length - 1 - Math.floor(END_WINDOW_FRAMES / 2);
  }

  // 2) Ayrılıştan sonra ilk duruş = iniş.
  let still = 0;
  for (let i = departIdx + 1; i < xs.length; i++) {
    still = Math.abs(xs[i] - xs[i - 1]) < STILL_PER_FRAME ? still + 1 : 0;
    if (still >= STILL_RUN) return i;
  }

  // Hiç durmadıysa (sürekli hareket) en uzak noktaya düş.
  let peakIdx = departIdx;
  let peakDist = -1;
  for (let i = departIdx; i < xs.length; i++) {
    const d = Math.abs(xs[i] - startX);
    if (d > peakDist) {
      peakDist = d;
      peakIdx = i;
    }
  }
  return peakIdx;
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
      startWorldX: null,
      endWorldX: null,
      valid: false,
      reason:
        'Yetersiz frame. Kameraya tam görün, atlamadan önce ve sonra bir saniye sabit dur.',
    };
  }

  const xs = smoothSeries(
    samples.map((s) => s.ankleX),
    5
  );
  // worldAnkleX smooth EDİLMİYOR — smoothSeries sayısal ortalama alır ve
  // `null`'ları NaN'a çevirir. Pencere ortalamaları (averageNullable) zaten
  // gürültüyü yumuşatıyor.
  const worldXs = samples.map((s) => s.worldAnkleX ?? null);

  const startSlice = xs.slice(0, START_WINDOW_FRAMES);
  const startX = average(startSlice);
  const landIdx = findLandIndex(xs, startX);
  const endX = windowAverage(xs, landIdx, END_WINDOW_FRAMES);
  const jumpUnits = Math.abs(endX - startX);

  const startWorldX = averageNullable(worldXs.slice(0, START_WINDOW_FRAMES));
  const endWorldX = windowAverageNullable(worldXs, landIdx, END_WINDOW_FRAMES);

  if (jumpUnits < MIN_JUMP_UNITS) {
    return {
      jumpUnits,
      jumpDistanceCm: null,
      startX,
      endX,
      startWorldX,
      endWorldX,
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
    startWorldX,
    endWorldX,
    valid: true,
  };
}

/**
 * Ölçülen mesafeyi cm'e çevirir: görüntü `jumpUnits` × bacak ölçeği
 * (`getCmPerUnit`). World ΔX kullanılmaz — kalça orijinli 3D translasyonu
 * gizler ve 1–8 cm üretir.
 *
 * Ölçek yoksa veya sonuç 40 cm altındaysa `jumpDistanceCm` `null` kalır.
 */
export function calibrateBroadJump(
  analysis: BroadJumpAnalysis,
  calibrationFrame: PoseFrame | null,
  heightCm: number | null = null
): BroadJumpAnalysis {
  if (!analysis.valid) return analysis;
  if (calibrationFrame == null) {
    return { ...analysis, jumpDistanceCm: null };
  }
  const cmPerUnit = getCmPerUnit(calibrationFrame, heightCm);
  if (cmPerUnit == null) {
    return { ...analysis, jumpDistanceCm: null };
  }
  const jumpDistanceCm = analysis.jumpUnits * cmPerUnit;
  if (
    !Number.isFinite(jumpDistanceCm) ||
    jumpDistanceCm < MIN_JUMP_DISTANCE_CM
  ) {
    return { ...analysis, jumpDistanceCm: null };
  }
  return { ...analysis, jumpDistanceCm };
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
