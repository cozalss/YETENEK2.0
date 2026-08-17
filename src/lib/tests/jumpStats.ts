/**
 * CMJ deneme istatistiği — aykırı deneme ve geçmiş tutarlılığı.
 *
 * Sabit 5 deneme yerine koşullu 4.: üç kabul edilen denemeden biri
 * medyandan belirgin sapıyorsa bir ekstra istenir. Geçmiş sapmada sessiz
 * düzeltme yok; veliye "tekrar denemek ister misin?" sorulur.
 */

import { historyStore } from '@/lib/history/store';

export const OUTLIER_SIGMA_K = 2.5;
export const MIN_SIGMA_CM = 2;
const HISTORY_RELATIVE = 0.4;

export function needsOutlierRetry(
  attempts: ReadonlyArray<{
    accepted: boolean;
    analysis: { jumpHeightCm: number | null; jumpHeightSigmaCm: number | null };
  }>
): boolean {
  const heights = attempts
    .filter((a) => a.accepted && a.analysis.jumpHeightCm != null)
    .map((a) => a.analysis.jumpHeightCm as number);
  if (heights.length < 3) return false;

  const sorted = [...heights].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const sigmas = attempts
    .filter((a) => a.accepted)
    .map((a) => a.analysis.jumpHeightSigmaCm)
    .filter((s): s is number => s != null && s > 0);
  const sigma = sigmas.length > 0 ? Math.max(...sigmas) : MIN_SIGMA_CM;
  const threshold = OUTLIER_SIGMA_K * Math.max(sigma, MIN_SIGMA_CM);
  return heights.some((h) => Math.abs(h - median) > threshold);
}

/**
 * En-iyi-3 protokolü geçerli deneme ister. "Sayılmadı" olanı 3'e katma;
 * tavan dolmadan bir deneme daha aç.
 */
export function needsReplacementAttempt(
  attempts: ReadonlyArray<{
    accepted: boolean;
    analysis: { jumpHeightCm: number | null };
  }>,
  baseAttempts: number,
  maxAttempts: number
): boolean {
  const accepted = attempts.filter(
    (a) => a.accepted && a.analysis.jumpHeightCm != null
  ).length;
  return accepted < baseAttempts && attempts.length < maxAttempts;
}

/** Aynı çocuğun önceki oturumlarındaki CMJ yükseklikleri (yeniden eskiye). */
export function previousJumpHeightsCm(): number[] {
  return historyStore
    .list()
    .map((e) => e.session.jump?.jumpHeightCm)
    .filter((h): h is number => h != null && Number.isFinite(h));
}

export function historyConsistencyHint(currentCm: number): string | null {
  const prev = previousJumpHeightsCm();
  if (prev.length === 0) return null;
  const last = prev[0];
  if (!(last > 0)) return null;
  const rel = Math.abs(currentCm - last) / last;
  if (rel < HISTORY_RELATIVE) return null;
  return `Bu sıçrama önceki kaydından (~${Math.round(last)} cm) belirgin farklı. Koşullar aynıysa bir set daha denemek ister misin?`;
}
