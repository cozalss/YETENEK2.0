/**
 * Probit — normal dağılımın ters kümülatif fonksiyonu, Φ⁻¹(p).
 *
 * Persentili z-skoruna çevirir. `normalCdf`'in tersi; z-uzayı birleştirmesinin
 * temel taşı: yayınlanmış norm tabloları persentil verir, mesafe metriği ise
 * z ister.
 *
 * Acklam'ın rasyonel yaklaşımı. Mutlak hata < 1.15e-9.
 *
 * Ref: Acklam PJ (2003). "An algorithm for computing the inverse normal
 * cumulative distribution function."
 */

import { normalCdf } from './normalCdf';

const A = [
  -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
  1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
];
const B = [
  -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
  6.680131188771972e1, -1.328068155288572e1,
];
const C = [
  -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
  -2.549732539343734, 4.374664141464968, 2.938163982698783,
];
const D = [
  7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
  3.754408661907416,
];

/** Düşük/yüksek kuyruk sınırı — rasyonel yaklaşımın bölge ayrımı. */
const P_LOW = 0.02425;
const P_HIGH = 1 - P_LOW;

/**
 * Φ⁻¹(p) — p ∈ (0, 1).
 *
 * p sınırlarda (0 veya 1) sonsuza gider; çağıranın clamp'lemesi beklenir.
 * Güvenlik için burada da ±8.3σ'ya sıkıştırılıyor (p = 1e-16 mertebesi).
 */
export function probit(p: number): number {
  if (!Number.isFinite(p)) return 0;
  if (p <= 0) return -8.3;
  if (p >= 1) return 8.3;

  let q: number;
  let r: number;
  let x: number;

  if (p < P_LOW) {
    q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
  } else if (p <= P_HIGH) {
    q = p - 0.5;
    r = q * q;
    x =
      ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) *
        q) /
      (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(
      (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
    );
  }

  // NOT: Buraya bir Halley düzeltme adımı eklemek CAZİP ama YANLIŞ.
  //
  // Düzeltme `normalCdf`'e yaslanıyor; bizim Φ implementasyonumuz (A&S
  // 26.2.17) ±7.5e-8 hatalı. Kuyrukta bu hata z'ye φ(z) ile bölünerek
  // yansıyor: z=3'te 1/φ(3) ≈ 226, yani 7.5e-8 → 1.7e-5 sapma. Acklam'ın ham
  // yaklaşımı zaten 1.15e-9 hassasiyetinde olduğundan "düzeltme" sonucu
  // ~15.000 kat kötüleştiriyordu. Testte yakalandı, kaldırıldı.
  return x;
}

/**
 * Persentil (0-100) → z-skoru.
 *
 * 0 ve 100 sonsuza gittiği için [0.5, 99.5] aralığına sıkıştırılır:
 * ±2.58σ. Norm tablolarımızın çözünürlüğü zaten bunun ötesini desteklemiyor.
 */
export function percentileToZ(percentile: number): number {
  const p = Math.max(0.5, Math.min(99.5, percentile)) / 100;
  return probit(p);
}

/** z-skoru → persentil (0-100). */
export function zToPercentile(z: number): number {
  return normalCdf(z) * 100;
}
