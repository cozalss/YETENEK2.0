/**
 * Child progress port — bir çocuğun rozet cüzdanı + test geçmişi + streak.
 *
 * Adapter Supabase (auth'lı kullanıcı) ile DB tablolarına yazar/okur.
 * Offline/anon demo akışında child-progress yok — kullanıcı önce kayıt
 * olmalı ki çocuk eklesin.
 */

import type { ChildId } from '@/core/types/branded';
import type {
  ChildBadgeRecord,
  ChildProgressSummary,
  ChildSessionRecord,
} from '@/core/schemas/child-progress.schema';
import type { SessionSummarySchema } from '@/core/schemas/session.schema';
import type { Result } from '@/core/types/result';
import type { ChildError } from './child-repository';

export interface ChildProgressRepository {
  listBadges(
    childId: ChildId,
  ): Promise<Result<ReadonlyArray<ChildBadgeRecord>, ChildError>>;

  listSessions(
    childId: ChildId,
    limit?: number,
  ): Promise<Result<ReadonlyArray<ChildSessionRecord>, ChildError>>;

  getSummary(
    childId: ChildId,
  ): Promise<Result<ChildProgressSummary, ChildError>>;

  /**
   * Bir test oturumunu kaydeder + kazanılan rozetleri ekler (idempotent —
   * aynı badge_id ikinci kez insert edilirse silently skip).
   */
  recordSession(args: {
    readonly childId: ChildId;
    readonly summary: SessionSummarySchema;
    readonly earnedBadgeIds: ReadonlyArray<string>;
    readonly startedAt: string;
    readonly completedAt: string;
  }): Promise<Result<{ readonly sessionId: string }, ChildError>>;
}
