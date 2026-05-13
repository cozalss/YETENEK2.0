/**
 * Supabase lesson enrollment + progress adapter.
 *
 * Per-user (auth.uid()) tek slot enrollment + ders ilerleme kaydı.
 * RLS politikası kullanıcıyı kendi satırlarına kilitler; adapter ayrıca
 * `user_id` filtresiyle defensive query yazar.
 *
 * Dual-write akışında bu repo API route'lardan çağrılır; client-side
 * `lib/lessons/store.ts` localStorage'a yazıp sonra API'yi fire-and-forget
 * tetikler.
 */

import 'server-only';
import { getServerClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger/logger';

const log = logger.child('supabase-lessons');

export type LessonRepoError =
  | { kind: 'unauthorized' }
  | { kind: 'storage'; message: string };

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface EnrollmentRecord {
  userId: string;
  sportSlug: string;
  enrolledAt: string;
}

export interface ProgressRecord {
  userId: string;
  lessonId: string;
  sportSlug: string;
  completedAt: string;
  durationMs: number | null;
  reps: number | null;
}

async function getUserOrFail(): Promise<
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof getServerClient>> }
  | { ok: false; error: LessonRepoError }
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

export const supabaseLessonRepository = {
  async enroll(
    sportSlug: string,
  ): Promise<Result<EnrollmentRecord, LessonRepoError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return { ok: false, error: auth.error };

    const { data, error } = await auth.supabase
      .from('lesson_enrollment')
      .upsert(
        { user_id: auth.userId, sport_slug: sportSlug, enrolled_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select('user_id, sport_slug, enrolled_at')
      .single();

    if (error) {
      log.error('enroll başarısız', { cause: error.message });
      return { ok: false, error: { kind: 'storage', message: error.message } };
    }
    return {
      ok: true,
      value: {
        userId: data.user_id,
        sportSlug: data.sport_slug,
        enrolledAt: data.enrolled_at,
      },
    };
  },

  async getEnrollment(): Promise<Result<EnrollmentRecord | null, LessonRepoError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return { ok: false, error: auth.error };

    const { data, error } = await auth.supabase
      .from('lesson_enrollment')
      .select('user_id, sport_slug, enrolled_at')
      .eq('user_id', auth.userId)
      .maybeSingle();

    if (error) {
      log.error('getEnrollment başarısız', { cause: error.message });
      return { ok: false, error: { kind: 'storage', message: error.message } };
    }
    if (!data) return { ok: true, value: null };
    return {
      ok: true,
      value: {
        userId: data.user_id,
        sportSlug: data.sport_slug,
        enrolledAt: data.enrolled_at,
      },
    };
  },

  async markCompleted(input: {
    lessonId: string;
    sportSlug: string;
    durationMs?: number;
    reps?: number;
  }): Promise<Result<ProgressRecord, LessonRepoError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return { ok: false, error: auth.error };

    const { data, error } = await auth.supabase
      .from('lesson_progress')
      .upsert(
        {
          user_id: auth.userId,
          lesson_id: input.lessonId,
          sport_slug: input.sportSlug,
          completed_at: new Date().toISOString(),
          duration_ms: input.durationMs ?? null,
          reps: input.reps ?? null,
        },
        { onConflict: 'user_id,lesson_id' },
      )
      .select('user_id, lesson_id, sport_slug, completed_at, duration_ms, reps')
      .single();

    if (error) {
      log.error('markCompleted başarısız', { cause: error.message });
      return { ok: false, error: { kind: 'storage', message: error.message } };
    }
    return {
      ok: true,
      value: {
        userId: data.user_id,
        lessonId: data.lesson_id,
        sportSlug: data.sport_slug,
        completedAt: data.completed_at,
        durationMs: data.duration_ms,
        reps: data.reps,
      },
    };
  },

  async listCompleted(
    sportSlug?: string,
  ): Promise<Result<ReadonlyArray<ProgressRecord>, LessonRepoError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return { ok: false, error: auth.error };

    let query = auth.supabase
      .from('lesson_progress')
      .select('user_id, lesson_id, sport_slug, completed_at, duration_ms, reps')
      .eq('user_id', auth.userId)
      .order('completed_at', { ascending: false });

    if (sportSlug) {
      query = query.eq('sport_slug', sportSlug);
    }

    const { data, error } = await query;

    if (error) {
      log.error('listCompleted başarısız', { cause: error.message });
      return { ok: false, error: { kind: 'storage', message: error.message } };
    }
    return {
      ok: true,
      value: (data ?? []).map((row) => ({
        userId: row.user_id,
        lessonId: row.lesson_id,
        sportSlug: row.sport_slug,
        completedAt: row.completed_at,
        durationMs: row.duration_ms,
        reps: row.reps,
      })),
    };
  },
} as const;
