/**
 * Sport matching v2 — 7 boyutlu weighted Euclidean + antropometrik bonus.
 *
 * NEDEN weighted Euclidean (raw L2 değil):
 *   Çocukların çoğu profili 50-70 puan bandında oluşur. Raw 7D Euclidean
 *   tüm boyutları eşit cezalandırır → mesafeler birbirine çok yakın olur
 *   ve "Voleybol %92, Basketbol %90, Futbol %88" gibi anlamsız küme oluşur.
 *
 *   Per-sport weights mismatch'i kritik boyutlarda daha sert cezalandırır:
 *   basketbol için explosive ve agility yüksek ağırlıklı, mesafe için
 *   yalnızca endurance kritik. Bu gerçek bir ayrıştırma sağlar.
 *
 * NEDEN antropometrik bonus AYRI:
 *   Boy ve BMI gerçek bio-motor performansı değiştirmiyor; sporların hangi
 *   morfolojiyi tercih ettiğini gösteriyor. Vektöre karıştırmak iki anlamı
 *   karıştırır. Bonus = post-score multiplier (max +%15).
 */

import {
  SPORT_PROFILES,
  DIMENSION_KEYS,
  type SportProfile,
  type SportVector,
} from './sportProfiles';

export type { SportVector } from './sportProfiles';

export interface SportMatch {
  sport: string;
  description: string;
  /** 0-1 weighted similarity (boyut + ağırlık) */
  similarity: number;
  /** 0-0.15 antropometrik avantaj eklemesi */
  anthroBonus: number;
  /** similarity + anthroBonus, 0-1 clamp */
  finalScore: number;
  /** 0-100 yuvarlanmış kullanıcı görünür değer */
  confidencePercent: number;
  reason: string;
}

export interface AnthroContext {
  /** 0-100, yaş normuna göre boy persentili */
  heightPercentile: number;
  /** 0-100, yaş normuna göre BMI persentili (düşük = lean) */
  bmiPercentile: number;
}

/**
 * Weighted Euclidean — boyut farkları, sporun o boyut için ağırlığı ile
 * çarpılarak karelenir. Maksimum mesafe = √(Σ weights) × 1, normalize için
 * bu ile bölüyoruz.
 *
 * Internal — recommendSports içinde kullanılır.
 */
function weightedEuclidean(
  child: SportVector,
  profile: SportVector,
  weights: SportVector
): number {
  let sumSq = 0;
  let weightSum = 0;
  for (const dim of DIMENSION_KEYS) {
    const diff = child[dim] - profile[dim];
    sumSq += weights[dim] * diff * diff;
    weightSum += weights[dim];
  }
  return weightSum > 0 ? Math.sqrt(sumSq / weightSum) : 0;
}

/**
 * Mesafe → similarity. Distance ∈ [0, 1] aralığında olduğu için
 * lineer 1-distance kullanıyoruz; UX'te %1 mesafe = %1 düşüş.
 */
function vectorSimilarity(
  child: SportVector,
  profile: SportProfile
): number {
  const distance = weightedEuclidean(child, profile.vector, profile.weights);
  return Math.max(0, 1 - distance);
}

/**
 * Antropometrik bonus: boy persentili × heightAdvantage + lean persentili
 * (= 1 - bmiPercentile/100) × leanAdvantage. Toplam max 0.15.
 */
function computeAnthroBonus(
  profile: SportProfile,
  ctx: AnthroContext | null
): number {
  if (!ctx) return 0;
  const heightFactor = ctx.heightPercentile / 100;
  const leanFactor = 1 - ctx.bmiPercentile / 100;
  const bonus =
    profile.anthroFavor.heightAdvantage * heightFactor * 0.1 +
    profile.anthroFavor.leanAdvantage * leanFactor * 0.1;
  return Math.min(0.15, Math.max(0, bonus));
}

/**
 * Default min confidence — bu eşiğin altındaki spor önerileri filtrelenir.
 * 0.50 = popülasyon ortalamasına yakın "yorum-değer" alt sınırı; düşük
 * tutmak demo'da "her çocuk için 3-5 spor" garantisi verir, ama gerçekten
 * uyumsuz sporları (örn. cimnastik için boy=99 percentile) tasfiye eder.
 */
export const DEFAULT_MIN_CONFIDENCE = 0.5;

export interface RecommendOptions {
  /** Üst kaç spor döndürülsün. */
  topN?: number;
  /** Bu skorun altındakileri filtrele (0-1). Default 0.5. */
  minConfidence?: number;
  /**
   * 0-100 takım uyumu skoru (Karakter testi). Yüksek değer takım sporlarını
   * yükseltir, düşük değer bireysel/dövüş sporlarını öne çıkarır.
   */
  teamAffinity?: number;
}

/**
 * Takım uyumu boost'u — Likert anket skorunu (0-100) sporun `teamType`
 * etiketine göre lineer bir bonus/cezaya çevirir. max ±0.10.
 *   teamAffinity=50 nötr; team→+, individual→-, partner→ yarı şiddet.
 */
function computeTeamAffinityBoost(
  profile: SportProfile,
  teamAffinity: number | undefined,
): number {
  if (teamAffinity == null) return 0;
  const centered = (teamAffinity - 50) / 50;
  const magnitude = 0.1;
  if (profile.teamType === 'team') return centered * magnitude;
  if (profile.teamType === 'individual') return -centered * magnitude;
  return centered * magnitude * 0.5;
}

export function recommendSports(
  child: SportVector,
  anthro: AnthroContext | null,
  options: number | RecommendOptions = {},
): SportMatch[] {
  // Geriye uyumluluk: eski API `recommendSports(child, anthro, 5)` çağrıları
  // için ikinci argümanın number olmasına izin ver.
  const opts: RecommendOptions =
    typeof options === 'number' ? { topN: options } : options;
  const {
    topN = 5,
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    teamAffinity,
  } = opts;

  const scored: SportMatch[] = SPORT_PROFILES.map((profile) => {
    const similarity = vectorSimilarity(child, profile);
    const anthroBonus = computeAnthroBonus(profile, anthro);
    const teamBoost = computeTeamAffinityBoost(profile, teamAffinity);
    const finalScore = Math.min(
      1,
      Math.max(0, similarity + anthroBonus + teamBoost),
    );
    return {
      sport: profile.sport,
      description: profile.description,
      similarity,
      anthroBonus,
      finalScore,
      confidencePercent: Math.round(finalScore * 100),
      reason: profile.reasonTemplate,
    };
  });

  const sorted = scored.sort((a, b) => b.finalScore - a.finalScore);
  // Önce eşiği geçenleri al; en az 1 spor garanti et (sıralı listede ilk).
  // Bu sayede "tüm sporlar düşük skor" durumunda kullanıcı yine bir öneri görür.
  const filtered = sorted.filter((m) => m.finalScore >= minConfidence);
  const finalList = filtered.length > 0 ? filtered : sorted.slice(0, 1);
  return finalList.slice(0, topN);
}

/**
 * 0-100 test skorlarını 0-1 SportVector'a dönüştürür.
 * Eksik test skorları varsa (kullanıcı atladıysa) default 0.5 (popülasyon
 * medyanı) kullanılır — fake bir 0 verip sporu yanlış cezalandırma.
 */
export function testScoresToVector(scores: {
  jumpScore?: number | null;
  broadJumpScore?: number | null;
  balanceScore?: number | null;
  reactionScore?: number | null;
  agilityScore?: number | null;
  coordScore?: number | null;
  enduranceScore?: number | null;
}): SportVector {
  const toUnit = (v: number | null | undefined) =>
    v == null ? 0.5 : clamp01(v / 100);
  return {
    explosivePower: toUnit(scores.jumpScore),
    horizontalPower: toUnit(scores.broadJumpScore),
    balance: toUnit(scores.balanceScore),
    reaction: toUnit(scores.reactionScore),
    agility: toUnit(scores.agilityScore),
    coordination: toUnit(scores.coordScore),
    endurance: toUnit(scores.enduranceScore),
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * CDC LMS-yaklaşımlı basit boy persentil tahmini (8-15 yaş).
 * Tablo: WHO 2007 / TC GSB Yetenek Kılavuzu medyan değerleri.
 * Gerçek persentil hesabı için z-skoru hesaplaması istenirse
 * LMS parametreleri eklenmeli; demo için yeterli yaklaşım.
 */
const HEIGHT_NORM_MEDIAN_CM: Record<number, { male: number; female: number }> =
  {
    8: { male: 128, female: 127 },
    9: { male: 134, female: 133 },
    10: { male: 138, female: 138 },
    11: { male: 144, female: 145 },
    12: { male: 149, female: 152 },
    13: { male: 156, female: 157 },
    14: { male: 164, female: 160 },
    15: { male: 170, female: 162 },
  };

const HEIGHT_NORM_SD = 7;

export function estimateHeightPercentile(
  heightCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const ages = Object.keys(HEIGHT_NORM_MEDIAN_CM).map(Number);
  const closest = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const median = HEIGHT_NORM_MEDIAN_CM[closest][sex];
  const z = (heightCm - median) / HEIGHT_NORM_SD;
  // Normal dağılım CDF yaklaşımı (errör ≤ 0.005)
  return Math.round(normalCdf(z) * 100);
}

/**
 * Kilo verilirse BMI persentil, yoksa null. BMI = kg / (m^2).
 */
export function estimateBmiPercentile(
  heightCm: number,
  weightKg: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  // Kaba pediatric BMI 50p (CDC 2000):
  // 8 yaş ~16, 12 yaş ~17.5, 15 yaş ~20.5
  const bmiNorm: Record<number, { male: number; female: number }> = {
    8: { male: 16, female: 16 },
    10: { male: 16.5, female: 17 },
    12: { male: 17.5, female: 18.5 },
    14: { male: 19, female: 20 },
    15: { male: 20.5, female: 20.5 },
  };
  const ages = Object.keys(bmiNorm).map(Number);
  const closest = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const median = bmiNorm[closest][sex];
  const sd = 2.2;
  const z = (bmi - median) / sd;
  return Math.round(normalCdf(z) * 100);
}

/**
 * Normal CDF Φ(z) — Abramowitz & Stegun 7.1.26 yaklaşımı (|err| < 1.5e-7).
 * Φ(z) = (1 + erf(z/√2)) / 2; bu yüzden erf'in argümanı `z/√2`.
 */
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const erfArg = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + 0.3275911 * erfArg);
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-erfArg * erfArg);
  return 0.5 * (1 + sign * erf);
}
