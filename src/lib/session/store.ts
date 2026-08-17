/**
 * Session store — yeni mimariye facade.
 *
 * Tarihsel sebeple bu dosya UI tarafından doğrudan import ediliyor:
 *   import { sessionStore } from '@/lib/session/store';
 *
 * Artık iç-implementasyon hexagonal mimaride:
 *   - Domain transformations:  src/core/domain/session.ts
 *   - Pure use-cases:           src/core/use-cases/{record-test, finalize-session}.ts
 *   - LocalStorage adapter:     src/infrastructure/storage/local-session-repository.ts
 *
 * Bu facade public API'yi (sessionStore.start, recordX, finalize, current, clear)
 * korur — eski callsite'lar değişmedi. Dolayısıyla yeni mimariye geçiş
 * UI kodunu kırmadan yapıldı.
 */

import type { JumpAnalysis } from '@/lib/tests/jump';
import type { BalanceAnalysis } from '@/lib/tests/balance';
import type { ReactionAnalysis } from '@/lib/tests/reaction';
import type { BroadJumpAnalysis } from '@/lib/tests/broadJump';
import type { LateralHopsAnalysis } from '@/lib/tests/lateralHops';
import type { CoordinationAnalysis } from '@/lib/tests/coordination';
import type { EnduranceJacksAnalysis } from '@/lib/tests/enduranceJacks';
import type { CharacterAnalysis } from '@/lib/character/score';

import type { SessionSummarySchema } from '@/core/schemas/session.schema';
import type { Session, ChildIdentity, TestKey } from '@/core/domain/session';
import * as recordUseCase from '@/core/use-cases/record-test';
import { finalizeSession } from '@/core/use-cases/finalize-session';
import { localSessionRepository } from '@/infrastructure/storage/local-session-repository';
import { logger } from '@/shared/logger/logger';

/* ───────── Public types — UI import'ları için ───────── */

export type { ChildIdentity, TestKey };

export type SessionSummary = SessionSummarySchema;
export type JumpSummary = NonNullable<Session['jump']>;
export type BalanceSummary = NonNullable<Session['balance']>;
export type ReactionSummary = NonNullable<Session['reaction']>;
export type BroadJumpSummary = NonNullable<Session['broadJump']>;
export type LateralHopsSummary = NonNullable<Session['lateralHops']>;
export type CoordinationSummary = NonNullable<Session['coordination']>;
export type EnduranceSummary = NonNullable<Session['endurance']>;
export type CharacterSummary = NonNullable<Session['character']>;

const log = logger.child('session-store');

/* ───────── Facade ───────── */

class SessionStoreFacade {
  start(child: ChildIdentity): SessionSummary {
    const r = localSessionRepository.start(child);
    if (!r.ok) {
      log.warn('start failed, in-memory degrade', { code: r.error.code });
      // Storage yoksa bile in-memory session başlat (server-side render veya
      // private mode). UI çalışmaya devam etsin — TTL gibi özellikler kapanır.
      return {
        child,
        injuryWarnings: [],
        completedTests: [],
        startedAt: new Date().toISOString(),
      };
    }
    return r.value;
  }

  current(): SessionSummary | null {
    const r = localSessionRepository.current();
    return r.ok ? r.value : null;
  }

  recordJump(
    analysis: JumpAnalysis & { score: number | null },
    techniqueMultiplier?: number,
    judgeInjuryWarnings?: readonly string[]
  ): void {
    this.applyTransform((s) =>
      recordUseCase.recordJump(s, analysis, techniqueMultiplier, judgeInjuryWarnings)
    );
  }

  recordBalance(
    analysis: BalanceAnalysis,
    techniqueMultiplier?: number,
    judgeInjuryWarnings?: readonly string[]
  ): void {
    this.applyTransform((s) =>
      recordUseCase.recordBalance(s, analysis, techniqueMultiplier, judgeInjuryWarnings)
    );
  }

  recordReaction(analysis: ReactionAnalysis): void {
    this.applyTransform((s) => recordUseCase.recordReaction(s, analysis));
  }

  recordBroadJump(
    analysis: BroadJumpAnalysis & { score: number },
    techniqueMultiplier?: number,
    judgeInjuryWarnings?: readonly string[]
  ): void {
    this.applyTransform((s) =>
      recordUseCase.recordBroadJump(s, analysis, techniqueMultiplier, judgeInjuryWarnings)
    );
  }

  recordLateralHops(
    analysis: LateralHopsAnalysis & { score: number },
    techniqueMultiplier?: number,
    judgeInjuryWarnings?: readonly string[]
  ): void {
    this.applyTransform((s) =>
      recordUseCase.recordLateralHops(s, analysis, techniqueMultiplier, judgeInjuryWarnings)
    );
  }

  recordCoordination(
    analysis: CoordinationAnalysis,
    techniqueMultiplier?: number,
    judgeInjuryWarnings?: readonly string[]
  ): void {
    this.applyTransform((s) =>
      recordUseCase.recordCoordination(s, analysis, techniqueMultiplier, judgeInjuryWarnings)
    );
  }

  recordEndurance(
    analysis: EnduranceJacksAnalysis & { score: number },
    techniqueMultiplier?: number,
    judgeInjuryWarnings?: readonly string[]
  ): void {
    this.applyTransform((s) =>
      recordUseCase.recordEndurance(s, analysis, techniqueMultiplier, judgeInjuryWarnings)
    );
  }

  recordCharacter(analysis: CharacterAnalysis): void {
    this.applyTransform((s) => recordUseCase.recordCharacter(s, analysis));
  }

  finalize(): SessionSummary | null {
    const cur = localSessionRepository.current();
    if (!cur.ok || !cur.value) return null;
    const finalized = finalizeSession(cur.value);
    // Replace = full Session as patch (merge semantik aynı).
    const updated = localSessionRepository.update(finalized);
    return updated.ok ? updated.value : finalized;
  }

  clear(): void {
    localSessionRepository.clear();
  }

  /**
   * Pure transform al, repository üzerinden uygula. Active session yoksa
   * sessizce no-op (UI tarafında bu zaten beklenen davranış).
   */
  private applyTransform(transform: (s: Session) => Session): void {
    const cur = localSessionRepository.current();
    if (!cur.ok || !cur.value) {
      log.debug('record skipped: no active session');
      return;
    }
    const next = transform(cur.value);
    if (next === cur.value) return; // transform no-op (örn. invalid analysis)
    const updated = localSessionRepository.update(next);
    if (!updated.ok) {
      log.warn('persist failed', { code: updated.error.code });
    }
  }
}

/** Singleton facade — `import { sessionStore } from '@/lib/session/store'` */
export const sessionStore = new SessionStoreFacade();

/** Re-export — yeni kod doğrudan port'tan da import edebilir. */
export { localSessionRepository as sessionRepository };
