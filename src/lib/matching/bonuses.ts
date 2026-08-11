/**
 * Eşleştirme bonusları — antropometri ve karakter.
 *
 * Bu iki terim bio-motor mesafesinden bağımsız: boy/BMI ve karakter profili
 * z-uzayına girmiyor (ölçüm değil, bağlam), ama son skoru etkiliyorlar.
 *
 * Eskiden `recommend.ts` içinde private idiler; hem eski (`recommendSports`)
 * hem yeni (`decide`) yol aynı hesabı kullandığı için buraya çıkarıldılar —
 * iki kopya, iki farklı davranışa dönüşmenin en kısa yolu olurdu.
 */

import type { SportProfile } from './sportProfiles';

export interface AnthroContext {
  /** 0-100, yaş normuna göre boy persentili */
  heightPercentile: number;
  /** 0-100, yaş normuna göre BMI persentili (düşük = lean) */
  bmiPercentile: number;
}

export interface CharacterFactors {
  cooperation: number;
  encouragement: number;
  persistence: number;
  fairPlay: number;
}

export const CHARACTER_FACTOR_KEYS = [
  'cooperation',
  'encouragement',
  'persistence',
  'fairPlay',
] as const;

/**
 * Antropometrik bonus: boy persentili × heightAdvantage + lean persentili
 * (= 1 − bmiPercentile/100) × leanAdvantage. Toplam max 0.15 ile sınırlı.
 */
export function computeAnthroBonusFor(
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
 * Karakter uyum boost'u.
 *
 * `characterFavor` **yalnızca ağırlıktır**: "bu spor bu özelliği ne kadar
 * değerli kılıyor" (`sportProfiles.ts`'in kendi tanımı). Hedef her faktörde
 * 1.0'dır — işbirliği, teşvik, sebat ve adil oyun her sporda daha fazlası
 * daha iyidir; spor yalnızca ne kadar önemsediğinde farklılaşır.
 *
 * Eskiden `favor` hem ağırlık hem HEDEF olarak kullanılıyordu
 * (`diff = child − favor`). Sonuç ters yönlüydü: voleybolun `persistence`
 * değeri 0.7 olduğu için sebat=70 diyen çocuk maksimum boost alırken,
 * sebat=100 diyen çocuk daha DÜŞÜK puan alıyordu. Maksimum azim bildirmek
 * çocuğu daha kötü bir voleybol adayı yapıyordu. Adversarial incelemede
 * yakalandı.
 *
 *   uyum  = Σ favor[f]·(child[f]/100) / Σ favor[f]      → 0-1
 *   boost = (uyum − 0.5) × 0.20                          → ±0.10
 */
export function computeCharacterSimilarityBoost(
  profile: SportProfile,
  factors: CharacterFactors | undefined
): number {
  if (!factors) return 0;
  const favor = profile.characterFavor;
  if (!favor) return 0;
  let weighted = 0;
  let weightSum = 0;
  for (const key of CHARACTER_FACTOR_KEYS) {
    const weight = favor[key];
    const childUnit = Math.max(0, Math.min(1, factors[key] / 100));
    weighted += weight * childUnit;
    weightSum += weight;
  }
  if (weightSum === 0) return 0;
  const alignment = weighted / weightSum;
  return (alignment - 0.5) * 0.2;
}

/**
 * Legacy: tek-boyutlu teamAffinity boost'u. Yalnız `characterFactors` yokken
 * devreye girer. teamAffinity=50 nötr; team→+, individual→−, partner→ yarı.
 */
export function computeTeamAffinityBoost(
  profile: SportProfile,
  teamAffinity: number | undefined
): number {
  if (teamAffinity == null) return 0;
  const centered = (teamAffinity - 50) / 50;
  const magnitude = 0.1;
  if (profile.teamType === 'team') return centered * magnitude;
  if (profile.teamType === 'individual') return -centered * magnitude;
  return centered * magnitude * 0.5;
}

/**
 * Karakter katkısı — 4-faktörlü vektör varsa onu, yoksa legacy tek-boyutlu
 * teamAffinity'yi kullanır. Çağıranın hangi yolun aktif olduğunu bilmesi
 * gerekmesin diye tek giriş noktası.
 */
export function computeCharacterBoostFor(
  profile: SportProfile,
  factors: CharacterFactors | undefined,
  teamAffinity: number | undefined
): number {
  return factors
    ? computeCharacterSimilarityBoost(profile, factors)
    : computeTeamAffinityBoost(profile, teamAffinity);
}
