/**
 * Standart normal CDF — Abramowitz & Stegun 26.2.17 yaklaşımı.
 *
 * Z-score → kümülatif olasılık (0..1). Persentile çevirmek için ×100.
 *
 * Hassasiyet: ±7.5e-8 maksimum mutlak hata (tüm Z için literatür eşliği).
 * Bizim kullanımımız için (yaş norm persentili) yeterli; 50, 84, 16 gibi
 * kritik noktalarda hata <0.1.
 *
 * Kullanım:
 *   const z = (value - mean) / sd;
 *   const percentile = normalCdf(z) * 100;
 */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2);
  const p =
    d *
    t *
    (0.319381530 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/**
 * (value - mean) / sd → Φ(Z) × 100, [1, 99] aralığında clamp.
 * Z-score persentil hesabının tek satır formu.
 */
export function zScorePercentile(
  value: number,
  mean: number,
  sd: number
): number {
  if (sd <= 0) return 50;
  const z = (value - mean) / sd;
  return Math.max(1, Math.min(99, normalCdf(z) * 100));
}
