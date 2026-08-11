/**
 * Güvenilirlik istatistikleri — pilot çalışmanın hesap makinesi.
 *
 * ## Neden veri yokken yazılıyor
 *
 * "Test-tekrar güvenilirliği ölçülmedi" satırı `ACCURACY.md`'de duruyor ve
 * kapatılması 30+ çocukla saha ölçümü gerektiriyor. Ama ölçüm gününde
 * istatistiği *yazmaya* başlamak, hem gecikme hem hata kaynağı. Makine şimdi
 * kuruluyor ve birim testleriyle doğrulanıyor; pilot günü yapılacak tek iş
 * CSV'yi beslemek.
 *
 * Buradaki hiçbir fonksiyon veri uydurmaz: girdi yoksa `null` döner.
 *
 * ## Kapsam
 *
 * - **ICC(2,1)** — iki-yönlü rastgele etkiler, tek ölçüm, mutlak uyum.
 *   Test-tekrar güvenilirliği için doğru varyant: hem çocuk hem oturum
 *   rastgele etki, ve oturumlar arası sistematik kayma (öğrenme etkisi)
 *   güvenilirliği düşürmeli — mutlak uyum bunu yapar, tutarlılık yapmaz.
 * - **Cohen's κ** — hakem ile insan etiketleyici uyumu.
 * - **MAE / bias / LoA** — eş zamanlı geçerlilik (mezura karşılaştırması).
 *
 * Ref: Koo TK, Li MY (2016). "A Guideline of Selecting and Reporting
 * Intraclass Correlation Coefficients for Reliability Research."
 * J Chiropr Med 15:155–163.
 */

/** Aynı deneğin tekrarlı ölçümleri. Satır = denek, sütun = oturum. */
export type RepeatedMeasures = readonly (readonly number[])[];

export interface IccResult {
  /** ICC(2,1) — mutlak uyum, tek ölçüm. */
  readonly icc: number;
  /** Koo & Li 2016 yorum bandı. */
  readonly interpretation: 'poor' | 'moderate' | 'good' | 'excellent';
  readonly subjects: number;
  readonly sessions: number;
}

function mean(xs: readonly number[]): number {
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

/**
 * ICC(2,1) — iki yönlü rastgele etkiler, mutlak uyum, tek ölçüm.
 *
 *              MSR − MSE
 *   ICC = ─────────────────────────────────────
 *         MSR + (k−1)·MSE + k·(MSC − MSE)/n
 *
 * MSR: denekler arası kareler ortalaması
 * MSC: oturumlar arası kareler ortalaması
 * MSE: artık
 *
 * @returns Sonuç; en az 2 denek × 2 oturum yoksa veya varyans sıfırsa null.
 */
export function icc21(data: RepeatedMeasures): IccResult | null {
  const n = data.length;
  if (n < 2) return null;
  const k = data[0]?.length ?? 0;
  if (k < 2) return null;
  if (data.some((row) => row.length !== k)) return null;
  if (data.some((row) => row.some((v) => !Number.isFinite(v)))) return null;

  const grand = mean(data.flat());
  const rowMeans = data.map(mean);
  const colMeans = Array.from({ length: k }, (_, j) =>
    mean(data.map((row) => row[j]))
  );

  let ssRows = 0;
  for (const rm of rowMeans) ssRows += (rm - grand) ** 2;
  ssRows *= k;

  let ssCols = 0;
  for (const cm of colMeans) ssCols += (cm - grand) ** 2;
  ssCols *= n;

  let ssTotal = 0;
  for (const row of data) for (const v of row) ssTotal += (v - grand) ** 2;

  const ssError = ssTotal - ssRows - ssCols;

  const msr = ssRows / (n - 1);
  const msc = ssCols / (k - 1);
  const mse = ssError / ((n - 1) * (k - 1));

  const denom = msr + (k - 1) * mse + (k * (msc - mse)) / n;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return null;

  // Negatif ICC teorik olarak mümkün ama yorumlanamaz; 0'a sıkıştırılır.
  const icc = Math.max(0, Math.min(1, (msr - mse) / denom));

  return {
    icc,
    interpretation: interpretIcc(icc),
    subjects: n,
    sessions: k,
  };
}

/** Koo & Li 2016 bantları. */
function interpretIcc(icc: number): IccResult['interpretation'] {
  if (icc < 0.5) return 'poor';
  if (icc < 0.75) return 'moderate';
  if (icc < 0.9) return 'good';
  return 'excellent';
}

export interface KappaResult {
  readonly kappa: number;
  readonly observedAgreement: number;
  readonly expectedAgreement: number;
  readonly n: number;
}

/**
 * Cohen's κ — iki etiketleyicinin şans ötesi uyumu.
 *
 * Ham uyum yüzdesi yanıltıcıdır: bir sınıf baskınsa (örneğin denemelerin
 * %90'ı geçerliyse) her şeye "geçerli" diyen bir hakem %90 uyum alır. κ bunu
 * düzeltir.
 *
 * @param a Birinci etiketleyicinin kararları.
 * @param b İkinci etiketleyicinin kararları (aynı sırada).
 */
export function cohensKappa<T extends string | number | boolean>(
  a: readonly T[],
  b: readonly T[]
): KappaResult | null {
  const n = a.length;
  if (n === 0 || b.length !== n) return null;

  const labels = [...new Set([...a, ...b])];
  let observed = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) observed++;
  const po = observed / n;

  let pe = 0;
  for (const label of labels) {
    const pa = a.filter((x) => x === label).length / n;
    const pb = b.filter((x) => x === label).length / n;
    pe += pa * pb;
  }

  // Tam uyum + tek sınıf → pe = 1, κ tanımsız. Bu durumda κ = 1 raporlanır
  // ama tek sınıflı veriden güvenilirlik çıkarılamayacağı unutulmamalı.
  const kappa = Math.abs(1 - pe) < 1e-12 ? (po === 1 ? 1 : 0) : (po - pe) / (1 - pe);

  return { kappa, observedAgreement: po, expectedAgreement: pe, n };
}

export interface AgreementResult {
  readonly mae: number;
  /** Ortalama işaretli fark — sistematik sapma. */
  readonly bias: number;
  /** Bland-Altman uyum sınırları: bias ± 1.96·SD. */
  readonly limitsOfAgreement: readonly [number, number];
  readonly n: number;
}

/**
 * Eş zamanlı geçerlilik — sistem ölçümü ile referans (mezura, kuvvet platformu)
 * arasındaki uyum.
 *
 * Yalnız MAE raporlamak yetmez: sistematik sapma (bias) ile rastgele hata
 * farklı sorunlardır ve farklı çözümleri vardır. Bland-Altman uyum sınırları
 * ikisini birden gösterir.
 */
export function agreement(
  measured: readonly number[],
  reference: readonly number[]
): AgreementResult | null {
  const n = measured.length;
  if (n === 0 || reference.length !== n) return null;

  const diffs = measured.map((m, i) => m - reference[i]);
  if (diffs.some((d) => !Number.isFinite(d))) return null;

  const bias = mean(diffs);
  const mae = mean(diffs.map(Math.abs));
  // Örneklem SD'si (n−1) — popülasyon değil, ölçüm çalışması.
  const variance =
    n > 1 ? diffs.reduce((s, d) => s + (d - bias) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);

  return {
    mae,
    bias,
    limitsOfAgreement: [bias - 1.96 * sd, bias + 1.96 * sd] as const,
    n,
  };
}
