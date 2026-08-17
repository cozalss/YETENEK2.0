/**
 * Test sonuçlarını session'a ekleyen pure use-case'ler.
 *
 * Her fonksiyon: (session, analysis) → yeni Session (immutable).
 * IO yok, side-effect yok, dolayısıyla framework'sız Vitest'le test edilir.
 *
 * Validity gates: analiz invalid'se session değiştirilmez (mevcut davranış
 * korundu — sessionStore.recordX'te de aynı pattern vardı).
 */

import type { JumpAnalysis } from '@/lib/tests/jump';
import type { BalanceAnalysis } from '@/lib/tests/balance';
import type { ReactionAnalysis } from '@/lib/tests/reaction';
import type { BroadJumpAnalysis } from '@/lib/tests/broadJump';
import type { LateralHopsAnalysis } from '@/lib/tests/lateralHops';
import type { CoordinationAnalysis } from '@/lib/tests/coordination';
import type { EnduranceJacksAnalysis } from '@/lib/tests/enduranceJacks';
import type { CharacterAnalysis } from '@/lib/character/score';

import {
  type Session,
  withCompletedTest,
  withInjuryWarning,
} from '@/core/domain/session';


/**
 * Teknik cezasını oturuma yazar.
 *
 * Hakem kusurlu ama geçerli bir denemeyi kabul ettiğinde ölçüm değeri
 * korunur, belirsizliği büyür. Çarpan burada saklanır ve
 * `sessionToZProfile` onu ilgili boyutun σ'sına uygular.
 */
function withTechniqueMultiplier(
  session: Session,
  test: keyof NonNullable<Session['techniqueMultipliers']>,
  multiplier: number | undefined
): Session {
  if (multiplier == null || multiplier <= 1) return session;
  return {
    ...session,
    techniqueMultipliers: {
      ...session.techniqueMultipliers,
      [test]: Math.min(3, multiplier),
    },
  };
}

/**
 * Hakemin gördüğü sakatlanma sinyallerini oturuma ekler.
 *
 * Aynı uyarı birden çok testte görülebilir (örneğin diz valgusu hem CMJ hem
 * broad jump inişinde); tekrarlar eleniyor ki veli aynı cümleyi üç kez
 * okumasın.
 */
function withJudgeInjuryWarnings(
  session: Session,
  warnings: readonly string[] | undefined
): Session {
  if (!warnings || warnings.length === 0) return session;
  const merged = [...new Set([...session.injuryWarnings, ...warnings])];
  // Şema en fazla 10 uyarı kabul ediyor.
  return { ...session, injuryWarnings: merged.slice(0, 10) };
}

export function recordJump(
  session: Session,
  analysis: JumpAnalysis & { score: number | null },
  techniqueMultiplier?: number,
  judgeInjuryWarnings?: readonly string[]
): Session {
  if (!analysis.valid) return session;
  const next: Session = {
    ...session,
    jump: {
      jumpHeightCm: analysis.jumpHeightCm,
      jumpHeightSigmaCm: analysis.jumpHeightSigmaCm,
      jumpUnits: analysis.jumpUnits,
      flightTimeMs: analysis.flightTimeMs,
      score: analysis.score ?? Math.min(100, analysis.jumpUnits * 1000),
      method: analysis.method,
      consistent: analysis.consistent,
    },
  };
  return withCompletedTest(
    withJudgeInjuryWarnings(
      withTechniqueMultiplier(next, 'jump', techniqueMultiplier),
      judgeInjuryWarnings
    ),
    'jump'
  );
}

export function recordBalance(
  session: Session,
  analysis: BalanceAnalysis,
  techniqueMultiplier?: number,
  judgeInjuryWarnings?: readonly string[]
): Session {
  // Diğer beş testte olan geçerlilik kapısı burada eksikti: yeterli kare
  // toplanamadığında `analyzeLeg` skor 0 döner, o sıfırlar oturuma yazılır ve
  // test "tamamlandı" sayılırdı. Sıfır denge skoru spor eşleştirmesine gerçek
  // bir ölçümmüş gibi giriyordu. İki bacak da yeterli veri üretmeliyse yaz.
  if (!analysis.right.hasEnoughData || !analysis.left.hasEnoughData) {
    return session;
  }
  let next: Session = {
    ...session,
    balance: {
      rightScore: analysis.right.score,
      leftScore: analysis.left.score,
      asymmetryPercent: analysis.asymmetryRatio * 100,
      asymmetryWarning: analysis.asymmetryWarning,
      weakerSide: analysis.weakerSide,
      averageScore: (analysis.right.score + analysis.left.score) / 2,
    },
  };
  if (analysis.asymmetryWarning) {
    next = withInjuryWarning(next, analysis.summary);
  }
  return withCompletedTest(
    withJudgeInjuryWarnings(
      withTechniqueMultiplier(next, 'balance', techniqueMultiplier),
      judgeInjuryWarnings
    ),
    'balance'
  );
}

export function recordReaction(
  session: Session,
  analysis: ReactionAnalysis
): Session {
  // Yetersiz deneme (< MIN_VALID_TRIALS) istatistiksel olarak yorumlanamaz;
  // eskiden sıfırlar oturuma yazılıyor ve "en yavaş refleks" gibi okunuyordu.
  if (!analysis.valid) {
    return session;
  }
  const next: Session = {
    ...session,
    reaction: {
      averageMs: analysis.averageMs,
      bestMs: analysis.bestMs,
      consistencyScore: analysis.consistencyScore,
      ageNormScore: analysis.ageNormScore,
    },
  };
  return withCompletedTest(next, 'reaction');
}

export function recordBroadJump(
  session: Session,
  analysis: BroadJumpAnalysis & { score: number },
  techniqueMultiplier?: number,
  judgeInjuryWarnings?: readonly string[]
): Session {
  if (!analysis.valid) return session;
  const next: Session = {
    ...session,
    broadJump: {
      jumpDistanceCm: analysis.jumpDistanceCm,
      jumpUnits: analysis.jumpUnits,
      score: analysis.score,
    },
  };
  return withCompletedTest(
    withJudgeInjuryWarnings(
      withTechniqueMultiplier(next, 'broadJump', techniqueMultiplier),
      judgeInjuryWarnings
    ),
    'broadJump'
  );
}

export function recordLateralHops(
  session: Session,
  analysis: LateralHopsAnalysis & { score: number },
  techniqueMultiplier?: number,
  judgeInjuryWarnings?: readonly string[]
): Session {
  if (!analysis.valid) return session;
  const next: Session = {
    ...session,
    lateralHops: {
      hopCount: analysis.hopCount,
      frequencyHz: analysis.frequencyHz,
      score: analysis.score,
      dataQuality: analysis.dataQuality,
    },
  };
  return withCompletedTest(
    withJudgeInjuryWarnings(
      withTechniqueMultiplier(next, 'lateralHops', techniqueMultiplier),
      judgeInjuryWarnings
    ),
    'lateralHops'
  );
}

export function recordCoordination(
  session: Session,
  analysis: CoordinationAnalysis,
  techniqueMultiplier?: number,
  judgeInjuryWarnings?: readonly string[]
): Session {
  if (!analysis.valid) return session;
  const next: Session = {
    ...session,
    coordination: {
      trackingEvents: analysis.trackingEvents,
      avgErrorPx: analysis.avgErrorPx,
      bestErrorPx: analysis.bestErrorPx,
      avgGapMs: analysis.avgGapMs,
      score: analysis.coordScore,
    },
  };
  return withCompletedTest(
    withJudgeInjuryWarnings(
      withTechniqueMultiplier(next, 'coordination', techniqueMultiplier),
      judgeInjuryWarnings
    ),
    'coordination'
  );
}

export function recordEndurance(
  session: Session,
  analysis: EnduranceJacksAnalysis & { score: number },
  techniqueMultiplier?: number,
  judgeInjuryWarnings?: readonly string[]
): Session {
  if (!analysis.valid) return session;
  const next: Session = {
    ...session,
    endurance: {
      totalReps: analysis.totalReps,
      decayPercent: analysis.decayPercent,
      durationMs: analysis.durationMs,
      score: analysis.score,
    },
  };
  return withCompletedTest(
    withJudgeInjuryWarnings(
      withTechniqueMultiplier(next, 'endurance', techniqueMultiplier),
      judgeInjuryWarnings
    ),
    'endurance'
  );
}

export function recordCharacter(
  session: Session,
  analysis: CharacterAnalysis
): Session {
  // Anket eksik kalmışsa kaydetme — nötr (3) varsayımı zaten skor'da var
  // ama "complete" gates "submit" butonunu; defansif olarak burada da bakıyoruz.
  if (!analysis.complete) return session;
  const next: Session = {
    ...session,
    character: {
      teamAffinity: analysis.teamAffinity,
      factors: analysis.factors,
      averageScore: analysis.averageScore,
      band: analysis.band,
      summary: analysis.summary,
      topFactor: analysis.topFactor,
      bottomFactor: analysis.bottomFactor,
    },
  };
  return withCompletedTest(next, 'character');
}
