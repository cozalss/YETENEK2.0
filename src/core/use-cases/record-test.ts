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

export function recordJump(
  session: Session,
  analysis: JumpAnalysis & { score: number | null }
): Session {
  if (!analysis.valid) return session;
  const next: Session = {
    ...session,
    jump: {
      jumpHeightCm: analysis.jumpHeightCm,
      jumpUnits: analysis.jumpUnits,
      flightTimeMs: analysis.flightTimeMs,
      score: analysis.score ?? Math.min(100, analysis.jumpUnits * 1000),
      method: analysis.method,
      consistent: analysis.consistent,
    },
  };
  return withCompletedTest(next, 'jump');
}

export function recordBalance(
  session: Session,
  analysis: BalanceAnalysis
): Session {
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
  return withCompletedTest(next, 'balance');
}

export function recordReaction(
  session: Session,
  analysis: ReactionAnalysis
): Session {
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
  analysis: BroadJumpAnalysis & { score: number }
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
  return withCompletedTest(next, 'broadJump');
}

export function recordLateralHops(
  session: Session,
  analysis: LateralHopsAnalysis & { score: number }
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
  return withCompletedTest(next, 'lateralHops');
}

export function recordCoordination(
  session: Session,
  analysis: CoordinationAnalysis
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
  return withCompletedTest(next, 'coordination');
}

export function recordEndurance(
  session: Session,
  analysis: EnduranceJacksAnalysis & { score: number }
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
  return withCompletedTest(next, 'endurance');
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
