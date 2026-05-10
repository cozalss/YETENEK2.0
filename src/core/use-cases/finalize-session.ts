/**
 * Session finalize use-case — pure orchestration.
 *
 * Mevcut tüm test skorlarından 7-dim bio-motor vektörü üretir,
 * antropometrik bağlamı hesaplar, spor önerilerini ekler, completedAt
 * damgasını basar.
 *
 * Eksik testler popülasyon medyanı (0.5) ile doldurulur — bu davranış
 * `testScoresToVector`'ün içinde; biz sadece skorları aktarıyoruz.
 *
 * Hiçbir testin tamamlanmamışsa session'ı dokunulmamış döndürür.
 */

import {
  estimateBmiPercentile,
  estimateHeightPercentile,
  recommendSports,
  testScoresToVector,
  type AnthroContext,
} from '@/lib/matching/recommend';
import {
  type Session,
  hasAnyTest,
  withCompletedAt,
  withRecommendations,
} from '@/core/domain/session';

const TOP_N_RECOMMENDATIONS = 5;

export function finalizeSession(session: Session): Session {
  if (!hasAnyTest(session)) return session;

  const vector = testScoresToVector({
    jumpScore: session.jump?.score,
    broadJumpScore: session.broadJump?.score,
    balanceScore: session.balance?.averageScore,
    reactionScore: session.reaction?.ageNormScore,
    agilityScore: session.lateralHops?.score,
    coordScore: session.coordination?.score,
    enduranceScore: session.endurance?.score,
  });

  const anthro = computeAnthroContext(session);
  const recommendations = recommendSports(
    vector,
    anthro,
    TOP_N_RECOMMENDATIONS
  );

  return withCompletedAt(
    withRecommendations(session, recommendations),
    new Date().toISOString()
  );
}

function computeAnthroContext(session: Session): AnthroContext | null {
  const { heightCm, weightKg, ageYears, sex } = session.child;
  if (heightCm == null) return null;
  const heightPercentile = estimateHeightPercentile(
    heightCm,
    ageYears,
    sex
  );
  const bmiPercentile =
    weightKg != null
      ? estimateBmiPercentile(heightCm, weightKg, ageYears, sex)
      : 50;
  return { heightPercentile, bmiPercentile };
}
