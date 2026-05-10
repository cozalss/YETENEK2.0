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
 * İki ayrı sıçrama yüksekliği hesabı çalışır, sonra cross-check edilir:
 *
 *   1. FLIGHT TIME (PRIMARY) — Bosco et al. 1983 protokolü
 *      h (m) = (g × t²) / 8, g = 9.81 m/s², t = uçuş süresi (s)
 *      Ayak bileği Y'sinin baseline'dan ne zaman kalktığı (toe-off) ve ne
 *      zaman geri döndüğü (landing) ile ölçülür. Perspektiften bağımsız.
 *
 *   2. HIP DISPLACEMENT (CROSS-CHECK) — hip Y delta * cmPerUnit
 *      Eski yaklaşım. Perspektif/kalibrasyon hatasına açık ama bağımsız bir
 *      sinyal — iki yöntem >%30 farklıysa düşük güven flag'i konur.
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

const GRAVITY_M_PER_S2 = 9.81;

// Hip + ayak görünmeden ölçüm güvenilmez.
const REQUIRED_LANDMARKS = [
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
];

export interface HipSample {
  t: number; // ms (frame timestamp)
  y: number; // normalized image y kalça merkezi (0-1, daha küçük = daha yukarıda)
  /** Ayak bileği Y (sol/sağ ortalaması). Flight-time tespiti için. */
  ankleY?: number;
}

export type HeightMethod = 'flight-time' | 'hip-displacement' | 'consensus';

export interface JumpAnalysis {
  /** Net hip Y delta — normalize birim cinsinden (cross-check için) */
  jumpUnits: number;
  /** Sıçrama yüksekliği cm (raporlanan birincil değer) */
  jumpHeightCm: number | null;
  /** Hip displacement metoduyla bulunan yükseklik (cross-check) */
  jumpHeightCmHip: number | null;
  /** Flight-time metoduyla bulunan yükseklik (Bosco protokolü) */
  jumpHeightCmFlight: number | null;
  /** Hangi metot birincil olarak raporlandı */
  method: HeightMethod;
  /** Flight-time / hip-displacement tutarlı mı? (% fark < 30 → true) */
  consistent: boolean;
  /** Yer durumundaki kalça Y (apex'ten önceki son local maksimum) */
  takeoffY: number;
  /** Tepe noktasındaki kalça Y (en küçük Y değeri) */
  apexY: number;
  /** Uçuş süresi (toe-off → landing). Tespit edilmediyse 0. */
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

// Flight-time tespit eşikleri.
// Ayak bileği baseline'dan en az ANKLE_LIFT_THRESHOLD kadar yukarı kalkarsa
// toe-off sayılır. Çocuk telefon karşısındayken vücut frame'in ~%70-80'ini
// dolduruyor → 5cm'lik bir kalkış normalize Y'de ~0.012-0.018 değişim demek.
// 0.015 = "çok hafif sıçrama" eşiği, üstünü kabul ediyoruz.
const ANKLE_LIFT_THRESHOLD = 0.015;
const MIN_FLIGHT_TIME_MS = 100; // 0.1s = ~12cm fiziksel limit
const MAX_FLIGHT_TIME_MS = 1200; // 1.2s = ~177cm — kimse bu kadar zıplamaz, glitch
const MIN_FLIGHT_HEIGHT_CM = 5; // Daha azı yanlış-pozitif

const HEIGHT_AGREEMENT_TOLERANCE = 0.3; // 30% — iki yöntem arası kabul edilen fark

/**
 * Bosco protokolü: uçuş süresinden sıçrama yüksekliği.
 *
 *   h (m) = (g × t²) / 8
 *
 * Ref: Bosco C, Luhtanen P, Komi PV (1983). "A simple method for measurement
 * of mechanical power in jumping". Eur J Appl Physiol 50: 273–282.
 */
function flightTimeToHeightCm(flightTimeMs: number): number {
  const t = flightTimeMs / 1000;
  return (GRAVITY_M_PER_S2 * t * t) / 8 * 100;
}

interface FlightDetection {
  takeoffIdx: number;
  landingIdx: number;
  flightTimeMs: number;
  /** Baseline ankle Y (ilk birkaç frame'in median'ı) */
  baselineAnkleY: number;
}

/**
 * Ankle Y zaman serisinden uçuş fazını tespit eder.
 *
 *   1. İlk 25 sample'ın median'ı = baseline ayak yüksekliği (yere basıyor).
 *   2. Ankle Y < baseline - ANKLE_LIFT_THRESHOLD → toe-off (yukarı kalktı).
 *   3. Ankle Y >= baseline - 0.005 ve toe-off'tan sonra → landing.
 *
 * @returns Uçuş tespit edildiyse FlightDetection, edilmediyse null.
 */
function detectFlightPhase(samples: HipSample[]): FlightDetection | null {
  const ankleSamples = samples.filter((s) => s.ankleY != null);
  if (ankleSamples.length < 30) return null;

  const ankleYs = ankleSamples.map((s) => s.ankleY as number);
  const smoothedAnkles = smoothSeries(ankleYs, 3);

  // Baseline: ilk 25 frame'in median'ı (yere basıyor varsayımı).
  const baselineSlice = [...smoothedAnkles.slice(0, Math.min(25, smoothedAnkles.length))]
    .sort((a, b) => a - b);
  const baselineAnkleY = baselineSlice[Math.floor(baselineSlice.length / 2)];

  let takeoffIdx = -1;
  let landingIdx = -1;

  for (let i = 0; i < smoothedAnkles.length; i++) {
    const lift = baselineAnkleY - smoothedAnkles[i]; // pozitif = yukarı kalktı
    if (takeoffIdx === -1 && lift > ANKLE_LIFT_THRESHOLD) {
      takeoffIdx = i;
    } else if (takeoffIdx !== -1 && i > takeoffIdx + 2 && lift < 0.005) {
      landingIdx = i;
      break;
    }
  }

  if (takeoffIdx === -1 || landingIdx === -1) return null;

  const flightTimeMs =
    ankleSamples[landingIdx].t - ankleSamples[takeoffIdx].t;

  if (flightTimeMs < MIN_FLIGHT_TIME_MS || flightTimeMs > MAX_FLIGHT_TIME_MS) {
    return null;
  }

  return { takeoffIdx, landingIdx, flightTimeMs, baselineAnkleY };
}

function invalid(
  reason: string,
  partial: Partial<JumpAnalysis> = {}
): JumpAnalysis {
  return {
    jumpUnits: 0,
    jumpHeightCm: null,
    jumpHeightCmHip: null,
    jumpHeightCmFlight: null,
    method: 'consensus',
    consistent: true,
    takeoffY: 0,
    apexY: 0,
    flightTimeMs: 0,
    valid: false,
    reason,
    ...partial,
  };
}

/**
 * Hip Y zaman serisinden CMJ analizini çıkarır + flight-time cross-check.
 *
 * Beklenen örüntü:
 *   - başlangıç düz (READY)
 *   - aşağı eğri (LOADING)
 *   - yukarı keskin (LAUNCH/AIRBORNE)
 *   - tekrar aşağı (LANDING)
 *
 * Yanlış pozitif filtreleri:
 *   - Toplam hareket çok küçükse → ufak baş hareketi sayılır, reddedilir
 *   - Apex 100ms'den hızlı veya 700ms'den yavaş ulaşılmışsa → reddedilir
 */
export function analyzeJump(samples: HipSample[]): JumpAnalysis {
  if (samples.length < 30) {
    return invalid('Yetersiz örnek. Vücudunun kameraya tam görünmesi gerekiyor.');
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

  // Flight-time her zaman dene (varsa primary olur).
  const flight = detectFlightPhase(samples);

  if (jumpUnits < MIN_JUMP_UNITS && !flight) {
    return invalid(
      'Belirgin bir sıçrama algılanmadı. Çömelip patlayıcı bir şekilde zıplaman gerekiyor.',
      { jumpUnits, takeoffY, apexY }
    );
  }

  if (upDurationMs < MIN_TAKEOFF_TO_APEX_MS && !flight) {
    return invalid(
      'Hareket çok kısa süreli — gerçek sıçrama yerine titreşim olabilir.',
      { jumpUnits, takeoffY, apexY }
    );
  }

  if (upDurationMs > MAX_TAKEOFF_TO_APEX_MS && !flight) {
    return invalid(
      'Hareket çok yavaş. CMJ patlayıcı bir sıçrama; çömelip hızla yukarı çık.',
      { jumpUnits, takeoffY, apexY }
    );
  }

  // Hip-displacement fallback uçuş süresi: apex etrafında simetri varsayımı.
  const fallbackFlightMs = upDurationMs * 2;
  const flightTimeMs = flight?.flightTimeMs ?? fallbackFlightMs;
  const jumpHeightCmFlight = flight ? flightTimeToHeightCm(flight.flightTimeMs) : null;

  // Flight-time çok düşük yükseklik veriyorsa noise — reddet.
  if (jumpHeightCmFlight != null && jumpHeightCmFlight < MIN_FLIGHT_HEIGHT_CM && jumpUnits < MIN_JUMP_UNITS) {
    return invalid(
      'Sıçrama algılandı ama çok küçük. Daha güçlü patlayıcı bir CMJ dene.',
      { jumpUnits, takeoffY, apexY }
    );
  }

  return {
    jumpUnits,
    jumpHeightCm: jumpHeightCmFlight, // flight-time primary; calibrate doldurursa hip de hesaplanır
    jumpHeightCmHip: null, // calibrateJumpHeight ile doldurulur
    jumpHeightCmFlight,
    method: jumpHeightCmFlight != null ? 'flight-time' : 'hip-displacement',
    consistent: true, // calibrateJumpHeight içinde re-check
    takeoffY,
    apexY,
    flightTimeMs,
    valid: true,
  };
}

/**
 * Hip displacement metoduyla sıçrama yüksekliğini cm'e çevirir + flight-time
 * sonucuyla cross-check eder. İki yöntem tutarlıysa flight-time birincil
 * kalır; tutarsızsa flag'lenir ve consensus (ortalama) raporlanır.
 *
 * Öncelik:
 *   1. flight-time varsa → birincil
 *   2. Worldlandmarks varsa → cmPerUnit hesaplanır, hip displacement ikincil
 *   3. heightCm verilmişse → boy fallback ile hip displacement
 */
export function calibrateJumpHeight(
  analysis: JumpAnalysis,
  calibrationFrame: PoseFrame,
  heightCm: number | null
): JumpAnalysis {
  if (!analysis.valid) return analysis;
  const cmPerUnit = getCmPerUnit(calibrationFrame, heightCm);
  const jumpHeightCmHip =
    cmPerUnit != null ? analysis.jumpUnits * cmPerUnit : null;

  // Birincil yükseklik: flight-time > hip > olduğu gibi
  let primary: number | null = analysis.jumpHeightCmFlight;
  let method: HeightMethod =
    analysis.jumpHeightCmFlight != null ? 'flight-time' : 'hip-displacement';
  let consistent = true;

  if (primary != null && jumpHeightCmHip != null && primary > 0) {
    const diff = Math.abs(primary - jumpHeightCmHip) / primary;
    consistent = diff <= HEIGHT_AGREEMENT_TOLERANCE;
    if (consistent) {
      // İki yöntem yakınsa ortalamasını al → daha düşük varyans
      primary = (primary + jumpHeightCmHip) / 2;
      method = 'consensus';
    }
    // Tutarsızsa flight-time'a güven (perspektif/kalibrasyon hatasından bağımsız)
  } else if (primary == null && jumpHeightCmHip != null) {
    primary = jumpHeightCmHip;
    method = 'hip-displacement';
  }

  return {
    ...analysis,
    jumpHeightCm: primary,
    jumpHeightCmHip,
    method,
    consistent,
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
 *
 * AnkleY ortalaması da yakalanır — flight-time tespiti için kullanılır.
 */
export function frameToHipSample(frame: PoseFrame): HipSample | null {
  if (!isJumpFrameUsable(frame)) return null;
  const hip = getHipCenter(frame);
  if (!hip) return null;
  const leftAnkle = frame.landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = frame.landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const ankleY =
    leftAnkle && rightAnkle ? (leftAnkle.y + rightAnkle.y) / 2 : undefined;
  return { t: frame.timestamp, y: hip.y, ankleY };
}

/**
 * Yaş + cinsiyet için ortalama CMJ sıçrama yüksekliği (cm) + standart sapma.
 *
 * Kaynaklar:
 *   - Temfemo et al. 2009 (Eur J Appl Physiol) — CMJ no-arm-swing, 7-15 yaş
 *   - Tomkinson et al. 2018 (Br J Sports Med) — Eurofit normative pan-Avrupa
 *   - Castro-Piñero et al. 2010 (J Strength Cond Res) — İspanyol çocuklar
 *
 * SD'ler tipik olarak ortalamanın ~%18-22'si (literatürde rapor edilen aralık).
 */
interface CmjNorm {
  mean: number; // ortalama CMJ (cm)
  sd: number; // standart sapma (cm)
}
const CMJ_NORMS: Record<number, { male: CmjNorm; female: CmjNorm }> = {
  8: { male: { mean: 18, sd: 4 }, female: { mean: 17, sd: 3.5 } },
  9: { male: { mean: 20, sd: 4 }, female: { mean: 19, sd: 4 } },
  10: { male: { mean: 22, sd: 4.5 }, female: { mean: 21, sd: 4 } },
  11: { male: { mean: 25, sd: 5 }, female: { mean: 23, sd: 4.5 } },
  12: { male: { mean: 28, sd: 5.5 }, female: { mean: 25, sd: 4.5 } },
  13: { male: { mean: 31, sd: 6 }, female: { mean: 27, sd: 5 } },
  14: { male: { mean: 34, sd: 6.5 }, female: { mean: 28, sd: 5 } },
  15: { male: { mean: 37, sd: 7 }, female: { mean: 30, sd: 5.5 } },
};

/**
 * Standart normal CDF — Abramowitz & Stegun 26.2.17 yaklaşımı.
 * Z-score → kümülatif olasılık (0..1). Persentile için ×100.
 */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2);
  const p =
    d *
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/**
 * CMJ değerini yaş+cinsiyet normuna göre persentile çevirir.
 * Z = (value - mean) / SD, persentil = Φ(Z) × 100.
 *
 * Örnek: 12 yaş erkek, 28cm sıçrama → Z=0 → 50. persentil
 *        12 yaş erkek, 33.5cm → Z=+1 → 84. persentil
 */
export function jumpPercentile(
  jumpHeightCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const ages = Object.keys(CMJ_NORMS).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const { mean, sd } = CMJ_NORMS[closestAge][sex];
  const z = (jumpHeightCm - mean) / sd;
  return Math.max(1, Math.min(99, normalCdf(z) * 100));
}

/**
 * Sıçramayı 0-100 skor'a çevirir — persentil tabanlı (1-99 aralığında lineer).
 *
 * Eski lineer (0.5x norm = 0, 1.5x norm = 100) yerine, sportif bilim
 * standardı persentil bazlı skor — tüm yaş gruplarında tutarlı.
 *
 * Backward-compat: imza aynı kaldı, JumpTest.tsx'i kırmaz.
 */
export function jumpScore(
  jumpHeightCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  return jumpPercentile(jumpHeightCm, ageYears, sex);
}
