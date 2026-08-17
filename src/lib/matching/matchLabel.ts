/**
 * "% eşleşme" / "% uyum" dilinin ortak, dürüst karşılığı.
 *
 * `confidencePercent` tek başına iki farklı şeyi ifade edebiliyor: ya
 * `decide.ts`'in ürettiği Monte Carlo olasılığı (`pTopK` doluysa — "ölçüm
 * belirsizliği altında bu spor ilk 3'te kaç kere kalıyor") ya da yalnızca
 * ham profil yakınlığı (`pTopK` yoksa — o zaman "olasılık" demek yanlış).
 *
 * "% eşleşme"/"% uyum" ifadesi ikisini de aynı cümleye sıkıştırıp "bu spor
 * sana uygun" izlenimi veriyordu. `pTopK` doluyken bile doğru okuma bu
 * DEĞİL: sayı "gürültü altında ilk 3'te kalır mı" sorusunu ölçüyor, "bu spor
 * uygun mu" sorusunu değil — ikisi ancak yeterli boyut ölçüldüğünde örtüşür
 * (bkz. `decide.ts` MIN_DIMENSIONS_FOR_PROBABILITY dokümanı).
 *
 * Bu modül her yüzeyde (sonuç ekranı, PDF, paylaşım kartı, geçmiş, LLM
 * prompt'ları) AYNI etiketi üretir — biri değişip diğeri unutulmasın diye.
 */

export interface MatchLabelInput {
  confidencePercent: number;
  pTopK?: number | null;
  probabilityWithheldReason?: string | null;
}

export interface MatchLabel {
  /** Gösterilecek sayı — olasılık iddiası geri çekildiyse `null`. */
  percent: number | null;
  /** Sayının (veya sayı yokluğunun) ne anlama geldiğini söyleyen kısa ek metin. */
  caption: string;
}

/**
 * Yapısal (JSX'te ayrı ayrı yerleştirilecek) etiket. `percent === null` ise
 * tüketici bir sayı yerine "—" veya benzeri bir yer tutucu göstermeli.
 */
export function describeMatchConfidence(match: MatchLabelInput): MatchLabel {
  if (match.probabilityWithheldReason) {
    return { percent: null, caption: 'bu spor için yeterli ölçüm yok' };
  }
  if (match.pTopK != null) {
    return { percent: match.confidencePercent, caption: "ilk 3'te olma ihtimali" };
  }
  // `pTopK`/`probabilityWithheldReason` hiç doldurulmadıysa (ör. eski
  // `recommendSports()` yolu, demo persona verisi) sayı hâlâ var ama
  // arkasında olasılık hesabı yok — yalnızca profil yakınlığı.
  return { percent: match.confidencePercent, caption: 'profil yakınlığı' };
}

/**
 * Düz metin yüzeyleri için (LLM prompt'ları, geçmiş listesi, PDF). JSX'te
 * sayı ile caption'ı ayrı stille göstermek isteyen yerler `describeMatchConfidence`
 * kullanmalı.
 */
export function formatMatchConfidenceText(match: MatchLabelInput): string {
  const { percent, caption } = describeMatchConfidence(match);
  return percent != null ? `%${percent} (${caption})` : caption;
}
