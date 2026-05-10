/**
 * Counter-Movement Jump (CMJ) — patlayıcı güç testi.
 *
 * Phases (algılama mantığı):
 *   READY       → kullanıcı dik duruyor, kalça Y baseline.
 *   LOADING     → kalça Y aşağı iner (çömelme).
 *   LAUNCH      → kalça Y hızla yukarı çıkar (patlayıcı kalkış).
 *   AIRBORNE    → ayaklar yerden kesilir, kalça maksimum Y'de.
 *   LANDING     → kalça tekrar iner.
 *
 * Sıçrama yüksekliği:
 *   takeoff_hip_y - apex_hip_y  (normalize edilmiş, sonra cm'e çevrilir)
 *
 * MediaPipe'da Y aşağı doğru artıyor (görüntü koordinat sistemi).
 *   → daha küçük Y = daha yukarıda
 *   → "yukarı çıkmak" Y'nin AZALMASI demek
 */

import type { PoseFrame } from '@/types';
import {
  getCmPerUnit,
  getHipCenter,
  hasVisibleLandmarks,
  smoothSeries,
} from '@/lib/pose/extractKeypoints';
import { POSE_LANDMARKS } from '@/types';

// Hip + ayak görünmeden ölçüm güvenilmez.
const REQUIRED_LANDMARKS = [
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
];

export interface HipSample {
  t: number; // ms (frame timestamp)
  y: number; // normalized image y (0-1, daha küçük = daha yukarıda)
}

export interface JumpAnalysis {
  /** Net sıçrama yüksekliği (normalize birim cinsinden, takeoff-apex) */
  jumpUnits: number;
  /** Sıçrama yüksekliği cm (kalibrasyon yapılmadıysa null) */
  jumpHeightCm: number | null;
  /** Yer durumundaki kalça Y (apex'ten önceki son local maksimum) */
  takeoffY: number;
  /** Tepe noktasındaki kalça Y (en küçük Y değeri) */
  apexY: number;
  /** Hava süresi yaklaşık (apex etrafında simetri varsayımı) */
  flightTimeMs: number;
  /** Yorumlama yapacak kadar veri var mıydı */
  valid: boolean;
  /** Validasyon başarısızsa sebep */
  reason?: string;
}

// CMJ algılama eşikleri.
// MIN_JUMP_UNITS: 5cm'lik bir gerçek sıçramaya tipik olarak ~0.025 normalize
// karşılık geliyor (kişi çerçevenin %80'ini kaplarsa). Bunun altı "ufak baş
// hareketi" rejyonu, yanlış pozitif riski büyük.
const MIN_JUMP_UNITS = 0.04;

// Sıçrama hızlı bir olay olmalı: takeoff <-> apex arası 100-700ms.
// Daha uzunsa muhtemelen kullanıcı yavaşça eğilip kalkıyor — gerçek CMJ değil.
const MAX_TAKEOFF_TO_APEX_MS = 700;
const MIN_TAKEOFF_TO_APEX_MS = 100;

/**
 * Kalça Y zaman serisinden CMJ analizini çıkarır.
 *
 * Beklenen örüntü:
 *   - başlangıç düz (READY)
 *   - aşağı eğri (LOADING)
 *   - yukarı keskin (LAUNCH/AIRBORNE)
 *   - tekrar aşağı (LANDING)
 *
 * En düşük Y (apex) ile apex'ten hemen önceki yerel maksimum (takeoff) farkı
 * sıçrama yüksekliğini verir.
 *
 * Yanlış pozitif filtreleri:
 *   - Toplam hareket çok küçükse → ufak baş hareketi sayılır, reddedilir
 *   - Apex 100ms'den hızlı veya 700ms'den yavaş ulaşılmışsa → reddedilir
 */
export function analyzeJump(samples: HipSample[]): JumpAnalysis {
  if (samples.length < 30) {
    return {
      jumpUnits: 0,
      jumpHeightCm: null,
      takeoffY: 0,
      apexY: 0,
      flightTimeMs: 0,
      valid: false,
      reason: 'Yetersiz örnek. Vücudunun kameraya tam görünmesi gerekiyor.',
    };
  }

  // Frame jitter'ını kır.
  const ys = samples.map((s) => s.y);
  const smoothedYs = smoothSeries(ys, 5);

  // Apex = en küçük Y (en yüksek nokta)
  let apexIdx = 0;
  for (let i = 1; i < smoothedYs.length; i++) {
    if (smoothedYs[i] < smoothedYs[apexIdx]) apexIdx = i;
  }
  const apexY = smoothedYs[apexIdx];

  // Apex'ten geriye gidip yerel maksimumu (takeoff yani yer yüksekliği) bul.
  // Pratik olarak apex'ten önceki en yüksek Y (en alttaki kalça noktası — yere basıyor).
  let takeoffIdx = 0;
  let takeoffY = smoothedYs[0];
  for (let i = 0; i < apexIdx; i++) {
    if (smoothedYs[i] > takeoffY) {
      takeoffY = smoothedYs[i];
      takeoffIdx = i;
    }
  }

  const jumpUnits = takeoffY - apexY;
  const upDurationMs = samples[apexIdx].t - samples[takeoffIdx].t;

  if (jumpUnits < MIN_JUMP_UNITS) {
    return {
      jumpUnits,
      jumpHeightCm: null,
      takeoffY,
      apexY,
      flightTimeMs: 0,
      valid: false,
      reason:
        'Belirgin bir sıçrama algılanmadı. Çömelip patlayıcı bir şekilde zıplaman gerekiyor.',
    };
  }

  if (upDurationMs < MIN_TAKEOFF_TO_APEX_MS) {
    return {
      jumpUnits,
      jumpHeightCm: null,
      takeoffY,
      apexY,
      flightTimeMs: 0,
      valid: false,
      reason: 'Hareket çok kısa süreli — gerçek sıçrama yerine titreşim olabilir.',
    };
  }

  if (upDurationMs > MAX_TAKEOFF_TO_APEX_MS) {
    return {
      jumpUnits,
      jumpHeightCm: null,
      takeoffY,
      apexY,
      flightTimeMs: 0,
      valid: false,
      reason:
        'Hareket çok yavaş. CMJ patlayıcı bir sıçrama; çömelip hızla yukarı çık.',
    };
  }

  // Hava süresi: takeoff <-> apex arasını ikiye katlayarak yaklaşık.
  // (Düşüş yaklaşık aynı süre alır, simetrik düşey atış varsayımı.)
  const flightTimeMs = upDurationMs * 2;

  return {
    jumpUnits,
    jumpHeightCm: null, // calibrate ile doldurulur
    takeoffY,
    apexY,
    flightTimeMs,
    valid: true,
  };
}

/**
 * Sıçrama yüksekliğini cm'e çevirir.
 *
 * Önce calibrationFrame'in worldLandmarks'ı varsa onu kullanır (gerçek metre,
 * boy bilgisi gerekmez). Yoksa kullanıcının girdiği boy ile fallback.
 *
 * @param heightCm opsiyonel — worldLandmarks varsa kullanılmıyor
 */
export function calibrateJumpHeight(
  analysis: JumpAnalysis,
  calibrationFrame: PoseFrame,
  heightCm: number | null
): JumpAnalysis {
  if (!analysis.valid) return analysis;
  const cmPerUnit = getCmPerUnit(calibrationFrame, heightCm);
  if (cmPerUnit == null) return analysis;
  return {
    ...analysis,
    jumpHeightCm: analysis.jumpUnits * cmPerUnit,
  };
}

/**
 * Frame'in sıçrama testinde kullanılabilir olup olmadığını söyler.
 * Hip ve ayak keypoint'leri görünür olmalı.
 */
export function isJumpFrameUsable(frame: PoseFrame): boolean {
  return hasVisibleLandmarks(frame, REQUIRED_LANDMARKS, 0.5);
}

/**
 * Frame'den HipSample üretir. Frame kullanılamaz ise null döner.
 */
export function frameToHipSample(frame: PoseFrame): HipSample | null {
  if (!isJumpFrameUsable(frame)) return null;
  const hip = getHipCenter(frame);
  if (!hip) return null;
  return { t: frame.timestamp, y: hip.y };
}

/**
 * Yaş + cinsiyet için ortalama CMJ sıçrama yüksekliği (cm).
 * Kaynak: çocuk yaş gruplarında genel literatür özetleri (Bompa, Brewer).
 * Gerçek değerler ulusal verilerle kalibre edilmeli.
 */
const CMJ_NORMS: Record<number, { male: number; female: number }> = {
  8: { male: 18, female: 17 },
  9: { male: 20, female: 19 },
  10: { male: 22, female: 21 },
  11: { male: 25, female: 23 },
  12: { male: 28, female: 25 },
  13: { male: 31, female: 27 },
  14: { male: 34, female: 28 },
  15: { male: 37, female: 30 },
};

/**
 * Sıçramayı yaş normuna göre 0-100 score'a çevirir.
 * 100 = norm değerinin %150'si veya üstü.
 *  50 = tam normal.
 *   0 = norm değerinin %50'si veya altı.
 */
export function jumpScore(
  jumpHeightCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const ages = Object.keys(CMJ_NORMS).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const norm = CMJ_NORMS[closestAge][sex];
  // 50% norm = 0, norm = 50, 150% norm = 100, lineer.
  const ratio = jumpHeightCm / norm;
  const score = ((ratio - 0.5) / (1.5 - 0.5)) * 100;
  return Math.max(0, Math.min(100, score));
}
