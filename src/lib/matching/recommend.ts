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
// Tek Φ(z) implementasyonu. Bu dosyada ikinci bir kopya vardı (A&S 7.1.26,
// clamp'siz) — iki yaklaşım aynı girdiye farklı persentil veriyordu.
import { normalCdf } from '@/lib/stats/normalCdf';
// Bonus hesapları tek kaynakta; `decide.ts` de aynılarını kullanıyor.
import {
  computeAnthroBonusFor,
  computeCharacterSimilarityBoost,
  computeTeamAffinityBoost as sharedTeamAffinityBoost,
} from './bonuses';

/**
 * Karakter 4 alt faktörü — `src/lib/character/score.ts`'in ürettiği
 * `factors` objesinin runtime tipi. Burada bağımsız tanımlanır ki matching
 * modülü character/* paketine doğrudan import etmek zorunda kalmasın.
 */
export interface CharacterFactors {
  cooperation: number; // 0-100
  encouragement: number;
  persistence: number;
  fairPlay: number;
}

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
  /**
   * 0-100 kullanıcıya gösterilen değer.
   *
   * **Anlamı değişti:** eskiden `round(finalScore × 100)` — mesafenin kozmetik
   * dönüşümü, istatistiksel karşılığı yok. Artık `decide.ts`'in ürettiği
   * "ilk 3'te olma olasılığı". Eski `recommendSports` yolu hâlâ eski anlamı
   * üretiyor; yeni yol `finalizeSession` üzerinden geçiyor.
   */
  confidencePercent: number;
  reason: string;

  // ── Olasılıksal alanlar — yalnız `decide.ts` yolunda dolu ──────────────
  /**
   * İlk 3'te olma olasılığı (0-1). Yokluğu "olasılık iddia edilemedi"
   * anlamına gelir; `confidencePercent` o zaman profil yakınlığıdır.
   */
  pTopK?: number;
  /** Birinci olma olasılığı (0-1). */
  pTopOne?: number;
  /** Bu spor için ölçülebilen ağırlık payı (0-1). */
  weightCoverage?: number;
  /** Yüzde iddiası geri çekildiyse sebebi. */
  probabilityWithheldReason?: string;
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
function vectorSimilarity(child: SportVector, profile: SportProfile): number {
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
  return computeAnthroBonusFor(profile, ctx);
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
   * 4-faktörlü karakter vektörü (Karakter testi v2). Verilirse her sporun
   * `characterFavor`'u ile weighted similarity hesaplanır (±0.10 boost).
   * Eski tek-boyutlu `teamAffinity`'den daha hassas ayrıştırma.
   */
  characterFactors?: CharacterFactors;
  /**
   * Geriye uyumluluk — 0-100 tek-boyutlu takım uyumu skoru. Yalnız
   * `characterFactors` verilmemişse fallback olarak çalışır.
   */
  teamAffinity?: number;
}

// NOT: `CHARACTER_FACTOR_KEYS` buradan kaldırıldı — tek tanımı `bonuses.ts`
// içinde. Karakter hesabı oraya taşınınca bu kopya ölü koda dönüşmüştü.

/**
 * Karakter benzerlik boost'u — biomotor matching ile aynı mantık:
 * çocuğun 4-faktörlü karakter vektörü ile sporun ideal `characterFavor`
 * arasında weighted Euclidean benzerlik. Sporun `characterFavor` değerleri
 * AYRICA per-faktör ağırlık olarak kullanılır — sporun önemsemediği
 * faktörde uyumsuzluk cezalandırılmaz.
 *
 *   similarity = 1 - sqrt( Σ favor[f] · (child[f]/100 - favor[f])² / Σ favor[f] )
 *   boost = (similarity - 0.5) × 0.20   →  ±0.10 aralığı
 */
function computeCharacterBoost(
  profile: SportProfile,
  factors: CharacterFactors | undefined
): number {
  // Tek implementasyon `bonuses.ts` içinde — burada ikinci bir kopya
  // tutmak, iki farklı davranışa dönüşmenin en kısa yoluydu.
  return computeCharacterSimilarityBoost(profile, factors);
}

/**
 * Legacy: tek-boyutlu teamAffinity boost'u. Yalnız characterFactors yokken.
 *   teamAffinity=50 nötr; team→+, individual→-, partner→ yarı şiddet.
 */
function computeTeamAffinityBoost(
  profile: SportProfile,
  teamAffinity: number | undefined
): number {
  return sharedTeamAffinityBoost(profile, teamAffinity);
}

export function recommendSports(
  child: SportVector,
  anthro: AnthroContext | null,
  options: number | RecommendOptions = {}
): SportMatch[] {
  // Geriye uyumluluk: eski API `recommendSports(child, anthro, 5)` çağrıları
  // için ikinci argümanın number olmasına izin ver.
  const opts: RecommendOptions =
    typeof options === 'number' ? { topN: options } : options;
  const {
    topN = 5,
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    characterFactors,
    teamAffinity,
  } = opts;

  const scored: SportMatch[] = SPORT_PROFILES.map((profile) => {
    const similarity = vectorSimilarity(child, profile);
    const anthroBonus = computeAnthroBonus(profile, anthro);
    // characterFactors verildiyse 4-faktör similarity (tercih),
    // yoksa legacy tek-boyutlu teamAffinity fallback'i.
    const charBoost = characterFactors
      ? computeCharacterBoost(profile, characterFactors)
      : computeTeamAffinityBoost(profile, teamAffinity);
    const finalScore = Math.min(
      1,
      Math.max(0, similarity + anthroBonus + charBoost)
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

/**
 * Norm tablosundan yaşa göre medyan okur — **komşu yaşlar arasında doğrusal
 * interpolasyon** yapar.
 *
 * Eskiden "en yakın yaş"a yuvarlanıyordu. İki norm yaşına eşit uzaklıktaki
 * yaşlar (BMI tablosunda 9, 11, 13) `Math.abs(b-age) < Math.abs(a-age)`
 * karşılaştırması strict `<` olduğu için **her zaman küçük yaşa** düşüyordu:
 * 9 yaşındaki bir çocuk 8 yaş normuyla ölçülüyor, sistematik olarak fazla
 * kilolu görünüyordu. İnterpolasyon hem bu sapmayı hem de yuvarlamanın
 * kendi basamak hatasını kaldırır.
 *
 * Tablo aralığının dışındaki yaşlar uçtaki değere sabitlenir (extrapolasyon
 * yok — 6 yaşındaki bir çocuk için 8 yaş normundan öteye uydurma yapmayız).
 */
function interpolateNorm(
  table: Record<number, { male: number; female: number }>,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const ages = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);

  if (ageYears <= ages[0]) return table[ages[0]][sex];
  const last = ages[ages.length - 1];
  if (ageYears >= last) return table[last][sex];

  for (let i = 0; i < ages.length - 1; i++) {
    const lo = ages[i];
    const hi = ages[i + 1];
    if (ageYears >= lo && ageYears <= hi) {
      const w = (ageYears - lo) / (hi - lo);
      return table[lo][sex] * (1 - w) + table[hi][sex] * w;
    }
  }
  return table[last][sex];
}

export function estimateHeightPercentile(
  heightCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const median = interpolateNorm(HEIGHT_NORM_MEDIAN_CM, ageYears, sex);
  const z = (heightCm - median) / HEIGHT_NORM_SD;
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
  const median = interpolateNorm(bmiNorm, ageYears, sex);
  const sd = 2.2;
  const z = (bmi - median) / sd;
  return Math.round(normalCdf(z) * 100);
}
