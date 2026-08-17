/**
 * Session domain — pure transformations, no IO.
 *
 * Tüm session güncellemeleri immutable: input session değiştirilmez,
 * yeni snapshot döndürülür. Bu sayede:
 *   - Test edilebilirlik (assertion = data eşitlik)
 *   - Reactivity (referans değişimi React re-render tetikler)
 *   - Time-travel debugging (her adım ayrı snapshot)
 *
 * Type'lar Zod şemasından inferred — drift olmaz.
 */

import type {
  SessionSummarySchema,
  TestKeySchema,
} from '@/core/schemas/session.schema';

export type Session = SessionSummarySchema;
export type TestKey = TestKeySchema;
export type ChildIdentity = Session['child'];
export type SessionPatch = Partial<Session>;

/* ───────── Constructors ───────── */

export function emptySession(child: ChildIdentity): Session {
  return {
    child,
    injuryWarnings: [],
    completedTests: [],
    startedAt: new Date().toISOString(),
  };
}

/* ───────── Pure transformations ───────── */

export function withCompletedTest(session: Session, key: TestKey): Session {
  const current = session.completedTests ?? [];
  if (current.includes(key)) return session;
  return {
    ...session,
    completedTests: [...current, key],
  };
}

export function withInjuryWarning(
  session: Session,
  warning: string
): Session {
  return {
    ...session,
    injuryWarnings: [...session.injuryWarnings, warning],
  };
}

export function withCompletedAt(session: Session, isoDate: string): Session {
  return {
    ...session,
    completedAt: isoDate,
  };
}

export function withRecommendations(
  session: Session,
  recommendations: NonNullable<Session['recommendations']>
): Session {
  return { ...session, recommendations };
}

/**
 * `decide.ts`'in ürettiği `excludedByNorm`/`missingMeasurement`'ı oturuma
 * yazar. Bu veri eskiden hesaplanıp atılıyordu — `finalizeSession` `decide()`
 * çağırıyor ama sonucun bu iki alanını hiç session'a taşımıyordu, yani
 * "denge ve koordinasyon karara girmiyor" gerçeği koddaydı ama UI'ya hiç
 * ulaşmıyordu (bkz. `MatchScopeNote` bileşeni, bunu tüketen taraf).
 */
export function withMatchScope(
  session: Session,
  scope: {
    excludedDimensions: Session['matchExcludedDimensions'];
    missingDimensions: Session['matchMissingDimensions'];
  }
): Session {
  return {
    ...session,
    matchExcludedDimensions: scope.excludedDimensions,
    matchMissingDimensions: scope.missingDimensions,
  };
}

/* ───────── Queries ───────── */

export function isCompleted(session: Session): boolean {
  return session.completedAt != null;
}

export function completedCount(session: Session): number {
  return session.completedTests?.length ?? 0;
}

export function hasAnyTest(session: Session): boolean {
  return completedCount(session) > 0;
}

export function isAllSevenComplete(session: Session): boolean {
  return (
    !!session.jump &&
    !!session.balance &&
    !!session.reaction &&
    !!session.broadJump &&
    !!session.lateralHops &&
    !!session.coordination &&
    !!session.endurance
  );
}
