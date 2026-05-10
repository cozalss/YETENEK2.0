/**
 * Reaksiyon süresi testi — bilişsel hız ölçümü.
 *
 * Klasik "go-stimulus" paradigması:
 *   - Ekran beklemede (gri/lacivert).
 *   - Rastgele 1-4 saniye sonra ekran yeşile döner.
 *   - Kullanıcı dokunur. Yeşil ile dokunma arasındaki süre = reaksiyon süresi.
 *
 * False start: kullanıcı yeşil olmadan tıklarsa o deneme geçersiz sayılır
 * ve baştan başlar. Bu, sadece "hızlı tıklayan" değil, "uyarana doğru tepki
 * veren" çocukları ölçmek için kritik.
 *
 * Yaş norm referansı (ms cinsinden tipik basit reaksiyon):
 *   - 8 yaş:  ~330ms
 *   - 12 yaş: ~280ms
 *   - 15 yaş: ~250ms
 *   - Yetişkin: ~220ms
 * (Der ve Deary 2006, Dykiert 2012 — basitleştirilmiş)
 */

export interface ReactionTrial {
  index: number;
  reactionMs: number;
  falseStart: boolean;
}

export interface ReactionAnalysis {
  trials: ReactionTrial[];
  averageMs: number;
  bestMs: number;
  worstMs: number;
  /** Standart sapmaya dayalı 0-100 tutarlılık skoru */
  consistencyScore: number;
  /** Yaş normuna göre 0-100 hız skoru */
  ageNormScore: number;
}

const REACTION_NORMS_MS: Record<number, number> = {
  8: 330,
  9: 320,
  10: 305,
  11: 290,
  12: 280,
  13: 270,
  14: 260,
  15: 250,
};

/**
 * Bekleme süresi: rastgele 1500-4000ms.
 * Çok kısa = kullanıcı önceden tahmin eder.
 * Çok uzun = sıkılır.
 */
export function pickWaitDelayMs(): number {
  return 1500 + Math.random() * 2500;
}

export function analyzeReaction(
  trials: ReactionTrial[],
  ageYears: number
): ReactionAnalysis {
  const valid = trials.filter((t) => !t.falseStart);

  if (valid.length === 0) {
    return {
      trials,
      averageMs: 0,
      bestMs: 0,
      worstMs: 0,
      consistencyScore: 0,
      ageNormScore: 0,
    };
  }

  const times = valid.map((t) => t.reactionMs);
  const averageMs = times.reduce((s, v) => s + v, 0) / times.length;
  const bestMs = Math.min(...times);
  const worstMs = Math.max(...times);

  // Tutarlılık: ortalama etrafında ne kadar oturuyor (düşük std = yüksek skor)
  const variance =
    times.reduce((s, v) => s + (v - averageMs) ** 2, 0) / times.length;
  const std = Math.sqrt(variance);
  // 0ms std = 100, 150ms std = 0
  const consistencyScore = Math.max(0, Math.min(100, (1 - std / 150) * 100));

  // Yaş norm skoru
  const ages = Object.keys(REACTION_NORMS_MS).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const norm = REACTION_NORMS_MS[closestAge];
  // Norm = 50 puan, %50 daha hızlı = 100, %50 daha yavaş = 0
  const ratio = averageMs / norm;
  const ageNormScore = Math.max(
    0,
    Math.min(100, ((1.5 - ratio) / 1.0) * 100)
  );

  return {
    trials,
    averageMs,
    bestMs,
    worstMs,
    consistencyScore,
    ageNormScore,
  };
}
