/**
 * Supabase child-progress adapter — rozet cüzdanı + test geçmişi + streak.
 *
 * RLS politikası `parent_user_id = auth.uid()` filtresi uygular; adapter
 * yine de defensive `parent_user_id` filter ile sorgular.
 *
 * Tüm rozetlerin `child_id`'ye bağlı yazılması, mevcut localStorage-tabanlı
 * `gamificationStore`'un yerini alır.
 */

import 'server-only';
import {
  childBadgeRecordSchema,
  childSessionRecordSchema,
  childProgressSummarySchema,
  type ChildBadgeRecord,
  type ChildProgressSummary,
  type ChildSessionRecord,
} from '@/core/schemas/child-progress.schema';
import { sessionSummarySchema, type SessionSummarySchema } from '@/core/schemas/session.schema';
import type {
  ChildProgressRepository,
} from '@/core/ports/child-progress-repository';
import type { ChildError } from '@/core/ports/child-repository';
import type { ChildId } from '@/core/types/branded';
import type { Result } from '@/core/types/result';
import { logger } from '@/shared/logger/logger';
import { getServerClient } from '@/lib/supabase/server';

const log = logger.child('supabase-child-progress');

function ok<T>(value: T): Result<T, ChildError> {
  return { ok: true, value };
}
function fail(error: ChildError): Result<never, ChildError> {
  return { ok: false, error };
}

async function getUserOrFail(): Promise<
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof getServerClient>> }
  | { ok: false; error: ChildError }
> {
  const supabase = await getServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false, error: { kind: 'unauthorized' } };
  }
  return { ok: true, userId: user.id, supabase };
}

interface ChildBadgeRow {
  child_id: string;
  badge_id: string;
  earned_in_session: string | null;
  earned_at: string;
}

interface ChildSessionRow {
  id: string;
  child_id: string;
  summary: unknown;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

function rowToBadge(row: ChildBadgeRow): ChildBadgeRecord {
  return {
    childId: row.child_id,
    badgeId: row.badge_id,
    earnedInSessionId: row.earned_in_session,
    earnedAt: row.earned_at,
  };
}

function rowToSession(row: ChildSessionRow): ChildSessionRecord | null {
  const parsed = sessionSummarySchema.safeParse(row.summary);
  if (!parsed.success) {
    log.warn('session summary parse hatası', {
      sessionId: row.id,
      issues: parsed.error.issues.length,
    });
    return null;
  }
  return {
    id: row.id,
    childId: row.child_id,
    summary: parsed.data,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export const supabaseChildProgressRepository: ChildProgressRepository = {
  async listBadges(
    childId: ChildId,
  ): Promise<Result<ReadonlyArray<ChildBadgeRecord>, ChildError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return fail(auth.error);

    const { data, error } = await auth.supabase
      .from('child_badges')
      .select('child_id, badge_id, earned_in_session, earned_at')
      .eq('child_id', childId)
      .eq('parent_user_id', auth.userId)
      .order('earned_at', { ascending: false });

    if (error) {
      log.error('child_badges list başarısız', { cause: error.message });
      return fail({ kind: 'storage', message: error.message });
    }
    return ok((data ?? []).map(rowToBadge));
  },

  async listSessions(
    childId: ChildId,
    limit: number = 50,
  ): Promise<Result<ReadonlyArray<ChildSessionRecord>, ChildError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return fail(auth.error);

    const { data, error } = await auth.supabase
      .from('sessions')
      .select('id, child_id, summary, started_at, completed_at, created_at')
      .eq('child_id', childId)
      .eq('parent_user_id', auth.userId)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      log.error('sessions list başarısız', { cause: error.message });
      return fail({ kind: 'storage', message: error.message });
    }
    const rows: ChildSessionRecord[] = [];
    for (const r of data ?? []) {
      const rec = rowToSession(r);
      if (rec) rows.push(rec);
    }
    return ok(rows);
  },

  async getSummary(
    childId: ChildId,
  ): Promise<Result<ChildProgressSummary, ChildError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return fail(auth.error);

    const { data, error } = await auth.supabase
      .from('child_progress_summary')
      .select('child_id, badge_count, session_count, last_tested_at, streak_days')
      .eq('child_id', childId)
      .eq('parent_user_id', auth.userId)
      .maybeSingle();

    if (error) {
      log.error('progress summary başarısız', { cause: error.message });
      return fail({ kind: 'storage', message: error.message });
    }
    if (!data) return fail({ kind: 'not-found', childId });

    const parsed = childProgressSummarySchema.safeParse({
      childId: data.child_id,
      badgeCount: data.badge_count,
      sessionCount: data.session_count,
      lastTestedAt: data.last_tested_at,
      streakDays: data.streak_days,
    });
    if (!parsed.success) {
      return fail({
        kind: 'validation',
        message: parsed.error.issues.map((i) => i.message).join('; '),
      });
    }
    return ok(parsed.data);
  },

  async recordSession({
    childId,
    summary,
    earnedBadgeIds,
    startedAt,
    completedAt,
  }): Promise<Result<{ readonly sessionId: string }, ChildError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return fail(auth.error);

    // 1) Session insert. recommendations + injury_warnings ayrı sütunlar.
    const { data: sessionRow, error: sessionErr } = await auth.supabase
      .from('sessions')
      .insert({
        child_id: childId,
        parent_user_id: auth.userId,
        summary,
        recommendations: summary.recommendations ?? null,
        injury_warnings: summary.injuryWarnings ?? [],
        started_at: startedAt,
        completed_at: completedAt,
      })
      .select('id')
      .single();

    if (sessionErr) {
      log.error('session insert başarısız', { cause: sessionErr.message });
      return fail({ kind: 'storage', message: sessionErr.message });
    }
    const sessionId = sessionRow.id as string;

    // 2) Badges upsert — composite primary key sayesinde aynı badge ikinci
    // kez kazanılırsa skip (idempotent).
    if (earnedBadgeIds.length > 0) {
      const badgeRows = earnedBadgeIds.map((badgeId) => ({
        child_id: childId,
        badge_id: badgeId,
        earned_in_session: sessionId,
        parent_user_id: auth.userId,
      }));
      const { error: badgeErr } = await auth.supabase
        .from('child_badges')
        .upsert(badgeRows, {
          onConflict: 'child_id,badge_id',
          ignoreDuplicates: true,
        });
      if (badgeErr) {
        log.error('badge upsert başarısız', { cause: badgeErr.message });
        // Session başarıyla yazıldı ama rozet eklenmedi — UI çocuk
        // detayında "0 rozet" gösterir, kullanıcı tekrar test edebilir.
        // Burada partial-success kabul: session ID döner, hata log'da.
      }
    }

    return ok({ sessionId });
  },
};

export { childBadgeRecordSchema, childSessionRecordSchema };
export type { SessionSummarySchema };
