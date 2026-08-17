/**
 * Session finalize use-case — pure orchestration.
 *
 * Ham ölçümlerden z-profil kurar, antropometrik bağlamı hesaplar, Monte Carlo
 * karar katmanını çalıştırır ve `completedAt` damgasını basar.
 *
 * ## Neyin değiştiği
 *
 * Eskiden 0-100 skorlar doğrudan bir "0-1 vektöre" çevrilip aralarında Öklid
 * mesafesi hesaplanıyordu. Skorlar aynı ölçekte olmadığı için bu mesafe
 * tanımsızdı (bkz. `zspace.ts`). Artık her boyut ham fiziksel ölçümünden
 * yaşa/cinsiyete göre z'ye çevriliyor, kalibre edilmemiş boyutlar karara
 * katılmıyor ve çıktı bir **olasılık** taşıyor.
 *
 * Eksik testler için eskiden popülasyon medyanı (0.5) uyduruluyordu; artık
 * eksik boyut karara hiç girmiyor ve `missingMeasurement` olarak raporlanıyor.
 * Uydurulmuş bir medyan, ölçülmemiş bir boyutu ölçülmüş gibi gösteriyordu.
 *
 * Hiçbir testin tamamlanmamışsa session'ı dokunulmamış döndürür.
 */

import {
  estimateBmiPercentile,
  estimateHeightPercentile,
  type AnthroContext,
} from '@/lib/matching/recommend';
import { sessionToZProfile } from '@/lib/matching/sessionToZ';
import { SPORT_PROFILES, type SportProfile } from '@/lib/matching/sportProfiles';
import {
  type Session,
  hasAnyTest,
  withCompletedAt,
  withRecommendations,
} from '@/core/domain/session';
import { decide } from './decide';
import {
  computeAnthroBonusFor,
  computeCharacterBoostFor,
} from '@/lib/matching/bonuses';

const TOP_N_RECOMMENDATIONS = 5;

export function finalizeSession(session: Session): Session {
  if (!hasAnyTest(session)) return session;

  const zProfile = sessionToZProfile(session);
  const anthro = computeAnthroContext(session);

  // NOT: `sigmaMultiplier` burada geçilmiyor çünkü teknik cezası artık
  // **boyut başına** taşınıyor: `sessionToZProfile` her boyutun σ'sını
  // kendi cezasıyla genişletiyor. Tek global çarpan, sıçraması kusurlu bir
  // çocuğun denge ölçümünü de aynı oranda belirsizleştirirdi.
  const decision = decide(zProfile, {
    topN: TOP_N_RECOMMENDATIONS,
    anthroBonus: (p: SportProfile) => computeAnthroBonusFor(p, anthro),
    characterBoost: (p: SportProfile) =>
      computeCharacterBoostFor(
        p,
        session.character?.factors,
        session.character?.teamAffinity
      ),
  });

  const recommendations = decision.ranking.map((r) => {
    const profile = SPORT_PROFILES.find((p) => p.sport === r.sport);
    return {
      sport: r.sport,
      description: r.description,
      similarity: r.similarity,
      // Bulunamayan profil için Voleybol'un bonusunu yazmak (eski
      // `?? SPORT_PROFILES[0]`) ilgisiz bir spora boy avantajı atfediyordu.
      anthroBonus: profile ? computeAnthroBonusFor(profile, anthro) : 0,
      finalScore: r.similarity,
      // Olasılık raporlanamadıysa (kanıt tabanı ince) nominal benzerliğe
      // düşülüyor — ama bu bir olasılık DEĞİL, ve `pTopK` null kalarak
      // tüketiciye bunu bildiriyor.
      confidencePercent: Math.round(
        (r.pTopK ?? r.similarity) * 100
      ),
      reason: profile?.reasonTemplate ?? r.description,
      pTopK: r.pTopK ?? undefined,
      pTopOne: r.pTopOne ?? undefined,
      weightCoverage: r.weightCoverage,
      probabilityWithheldReason: r.probabilityWithheldReason ?? undefined,
    };
  });

  return withCompletedAt(
    withRecommendations(session, recommendations),
    new Date().toISOString()
  );
}

function computeAnthroContext(session: Session): AnthroContext | null {
  const { heightCm, weightKg, ageYears, sex } = session.child;
  if (heightCm == null) return null;
  const heightPercentile = estimateHeightPercentile(heightCm, ageYears, sex);
  const bmiPercentile =
    weightKg != null
      ? estimateBmiPercentile(heightCm, weightKg, ageYears, sex)
      : 50;
  return { heightPercentile, bmiPercentile };
}
