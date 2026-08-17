/**
 * Kamera pozu — zemin homografisinden eğim (pitch) ve yatıklık (roll).
 *
 * ## Neden bu modül
 *
 * Laptop'ta jiroskop yoktur; ekran aç/kapa kameranın **eğimini** değiştirir ve
 * `useDeviceTilt` sensör olmadığı için sessizce atlanır. Zemindeki A4'ten kurulan
 * homografi (bkz. `homography.ts`), yaklaşık kamera iç parametreleriyle
 * birlikte, kameranın açısını **görsel olarak** — sensörsüz — verir. Böylece
 * "kamera açısını tam zamanlı gösteren algoritma" laptop'ta da çalışır.
 *
 * ## Dürüst sınır
 *
 * Web kamerası odak uzaklığını (intrinsics) bildirmez; FoV **varsayılır**
 * (`DEFAULT_HFOV_DEG`). Bu yüzden çıkan pitch/roll **mutlak** değildir — birkaç
 * derece kayabilir. Ama tutarlıdır: baseline'a göre **değişim** (drift) doğru
 * ölçülür, ekran aç/kapa güvenilir yakalanır. Ürün ihtiyacı da budur.
 *
 * Bu modül saftır — DOM/kamera yok, yalnız matris matematiği. Vitest ile
 * sentetik eğik A4 köşelerinden geri kazanım test edilir.
 */

import type { Mat3 } from './homography';

/** Kamera iç parametreleri (piksel). */
export interface Intrinsics {
  readonly fx: number;
  readonly fy: number;
  readonly cx: number;
  readonly cy: number;
}

/**
 * Tipik laptop/telefon web kamerası yatay görüş açısı. Ölçülemediği için
 * varsayılır; pitch/roll'un mutlak değil göreli (drift) kullanımının nedeni.
 */
export const DEFAULT_HFOV_DEG = 60;

/** Görüntü boyutu + varsayılan FoV'dan intrinsics kurar. */
export function intrinsicsFromFov(
  widthPx: number,
  heightPx: number,
  hFovDeg: number = DEFAULT_HFOV_DEG
): Intrinsics {
  const f = widthPx / 2 / Math.tan((hFovDeg * Math.PI) / 180 / 2);
  return { fx: f, fy: f, cx: widthPx / 2, cy: heightPx / 2 };
}

/**
 * Kamera açısı okuması.
 *   - `pitchDeg`  : yukarı/aşağı eğim (ekran aç/kapa bunu değiştirir).
 *   - `rollDeg`   : optik eksen etrafında yatıklık (ufuk çizgisi eğimi).
 *   - `yawDeg`    : sağa/sola dönüş.
 *   - `confidence`: çözümün ortonormalliği (0-1); düşükse okuma güvenilmez.
 */
export interface CameraPose {
  readonly pitchDeg: number;
  readonly rollDeg: number;
  readonly yawDeg: number;
  readonly confidence: number;
}

/**
 * Homografi + intrinsics'ten kamera pozunu çözer.
 *
 * H = K · [r1 r2 t] (ölçek belirsizliğine kadar). Kinv·H'nin ilk iki kolonu
 * dönüş matrisinin ilk iki kolonunu (ölçekli) verir; üçüncü kolon çapraz
 * çarpımla tamamlanır. Euler açıları bu dönüşten çıkar.
 *
 * Not: `H` zemin(mm)→görüntü(px) eşlemesi olmalı (bkz. `homography.ts`).
 */
export function poseFromHomography(H: Mat3, K: Intrinsics): CameraPose | null {
  // Kinv · H — intrinsics etkisini soyar, geriye [r1 r2 t]·λ kalır.
  const Kinv: Mat3 = [
    1 / K.fx,
    0,
    -K.cx / K.fx,
    0,
    1 / K.fy,
    -K.cy / K.fy,
    0,
    0,
    1,
  ];
  const B = mat3Mul(Kinv, H);

  // Kolonlar (satır-öncelikli matristen kolon çıkarımı).
  const b1: Vec3 = [B[0], B[3], B[6]];
  const b2: Vec3 = [B[1], B[4], B[7]];
  const b3: Vec3 = [B[2], B[5], B[8]];

  const n1 = norm(b1);
  const n2 = norm(b2);
  if (n1 < 1e-9 || n2 < 1e-9) return null;

  // Ölçek: iki kolon aynı λ ile normalize edilmeli — ortalaması alınır.
  const lambda = 2 / (n1 + n2);
  const r1 = scale(b1, lambda);
  const r2 = scale(b2, lambda);
  const r3 = cross(r1, r2);
  const t = scale(b3, lambda);
  void t; // t (kamera-zemin ötelemesi) mutlak yükseklik için; FoV tahmini yüzünden raporlanmıyor.

  // Ortonormallik güveni: |r1|≈|r2|≈1 ve r1⊥r2 olmalı.
  const orthoErr = Math.abs(dot(r1, r2));
  const unitErr = (Math.abs(norm(r1) - 1) + Math.abs(norm(r2) - 1)) / 2;
  const confidence = clamp01(1 - (orthoErr + unitErr));

  // R = [r1 r2 r3] (kolonlar). Euler açıları (Z-Y-X konvansiyonu).
  const R: Mat3 = [
    r1[0],
    r2[0],
    r3[0],
    r1[1],
    r2[1],
    r3[1],
    r1[2],
    r2[2],
    r3[2],
  ];
  const euler = eulerFromRotation(R);

  return { ...euler, confidence };
}

/** İki poz okuması arasındaki sapma. */
export interface DriftReading {
  readonly pitchDeltaDeg: number;
  readonly rollDeltaDeg: number;
  /** Birleşik büyüklük (derece) — hibrit politikanın eşiklediği değer. */
  readonly magnitudeDeg: number;
  readonly severity: 'ok' | 'minor' | 'major';
}

/**
 * Küçük sapma eşiği (derece). Altı = sorun yok. Üstü ama MAJOR altı = σ
 * genişletilir, ölçüm tutulur (hibrit politikanın "küçük kayma" kolu).
 */
export const MINOR_DRIFT_DEG = 3;
/**
 * Büyük sapma eşiği (derece). Üstü = ölçüm geçersiz, yeniden hizalama istenir
 * (hibrit politikanın "büyük kayma" kolu). Ekran belirgin aç/kapa bu bölgeye
 * düşer.
 */
export const MAJOR_DRIFT_DEG = 8;

/** İki pozun sapmasını hesaplar (pitch + roll baskın; yaw sıçramada ikincil). */
export function driftFromBaseline(
  current: CameraPose,
  baseline: CameraPose
): DriftReading {
  const pitchDeltaDeg = current.pitchDeg - baseline.pitchDeg;
  const rollDeltaDeg = current.rollDeg - baseline.rollDeg;
  const magnitudeDeg = Math.hypot(pitchDeltaDeg, rollDeltaDeg);
  const severity: DriftReading['severity'] =
    magnitudeDeg >= MAJOR_DRIFT_DEG
      ? 'major'
      : magnitudeDeg >= MINOR_DRIFT_DEG
        ? 'minor'
        : 'ok';
  return { pitchDeltaDeg, rollDeltaDeg, magnitudeDeg, severity };
}

/**
 * Küçük sapmayı σ çarpanına çevirir (hibrit politikanın minor kolu).
 *
 * MINOR eşiğinde 1.0, MAJOR eşiğinde `maxAtMajor`'a lineer çıkar. `applyVerdict`
 * felsefesiyle uyumlu: kusur ölçümü kaydırmaz, belirsizliğini büyütür.
 */
export function driftToSigmaMultiplier(
  drift: DriftReading,
  maxAtMajor = 1.5
): number {
  if (drift.magnitudeDeg <= MINOR_DRIFT_DEG) return 1;
  const span = MAJOR_DRIFT_DEG - MINOR_DRIFT_DEG;
  const t = Math.min(1, (drift.magnitudeDeg - MINOR_DRIFT_DEG) / span);
  return 1 + t * (maxAtMajor - 1);
}

/**
 * Kamera eğiminin (pitch) ölçüm belirsizliğine etkisi — σ çarpanı.
 *
 * ## Neden düzeltme değil, ceza
 *
 * Naif bir "foreshortening düzeltmesi" (değeri cos(pitch) ile bölmek) burada
 * **çift sayım** olurdu: çocuk-boyu kalibrasyonu (`estimateScaleCmPerUnit`)
 * dikey uzanımı aynı eğik görüşten ölçtüğü için pitch'i zaten telafi eder;
 * flight-time yöntemi ise zaman tabanlı, perspektiften tamamen bağımsız. Yani
 * eğim değeri sistematik kaydırmaz. Ama büyük eğimde geometri modeli (özellikle
 * FoV tahmini) zayıflar ve gürültü artar — bu bir **belirsizlik** kaynağıdır.
 * `applyVerdict` felsefesiyle uyumlu: ölçümü kaydırma, σ'yı genişlet.
 */
export const TILT_SIGMA_FREE_DEG = 12;

export function tiltSigmaMultiplier(pitchDeg: number, maxMult = 1.5): number {
  const excess = Math.abs(pitchDeg) - TILT_SIGMA_FREE_DEG;
  if (excess <= 0) return 1;
  const t = Math.min(1, excess / 30); // 12°+30°=42°'de tam ceza
  return 1 + t * (maxMult - 1);
}

// --- Vektör/matris yardımcıları (saf, dışa kapalı) -----------------------

type Vec3 = readonly [number, number, number];

function mat3Mul(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] =
        a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out as unknown as Mat3;
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function norm(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Dönüş matrisinden Euler açıları (derece). Z-Y-X (yaw-pitch-roll) sırası.
 * Gimbal kilidine yakın (|pitch|≈90°) yaw/roll ayrışması bozulur; bu kurulumda
 * kamera zemine böyle dik bakmaz, pratikte güvenli.
 */
function eulerFromRotation(R: Mat3): {
  pitchDeg: number;
  rollDeg: number;
  yawDeg: number;
} {
  // R indeksleri (satır-öncelikli): [0]=r00 [1]=r01 [2]=r02
  //                                 [3]=r10 [4]=r11 [5]=r12
  //                                 [6]=r20 [7]=r21 [8]=r22
  const sy = Math.hypot(R[0], R[3]);
  const toDeg = 180 / Math.PI;
  if (sy > 1e-6) {
    return {
      pitchDeg: Math.atan2(-R[6], sy) * toDeg,
      yawDeg: Math.atan2(R[3], R[0]) * toDeg,
      rollDeg: Math.atan2(R[7], R[8]) * toDeg,
    };
  }
  // Dejenere (nadir): roll'ü sıfırla, pitch/yaw'ı tek eksenden oku.
  return {
    pitchDeg: Math.atan2(-R[6], sy) * toDeg,
    yawDeg: Math.atan2(-R[5], R[4]) * toDeg,
    rollDeg: 0,
  };
}
