/**
 * Supabase tabanlı çocuk repository — auth'lı kullanıcı için.
 *
 * RLS politikası kullanıcıyı zaten kendi `parent_user_id`'sine kilitler,
 * bu yüzden adapter `auth.uid()` filtresini ayrıca uygulamak zorunda
 * değil — yine de defensive: tüm sorgularda `parent_user_id = user.id`
 * eklemek hatalı row tetikleme'yi engeller.
 *
 * Bu adapter Server Component / Server Action / Route Handler içinde
 * `getServerClient()` üzerinden kullanılır. Browser-side direct kullanım
 * yapılmaz — UI server action'lardan tetikler.
 */

import 'server-only';
import { childInputSchema } from '@/core/schemas/child.schema';
import type { ChildInput, ChildRecord } from '@/core/schemas/child.schema';
import type { ChildRepository, ChildError } from '@/core/ports/child-repository';
import { makeChildId, type ChildId } from '@/core/types/branded';
import type { Result } from '@/core/types/result';
import { logger } from '@/shared/logger/logger';

function ok<T>(value: T): Result<T, ChildError> {
  return { ok: true, value };
}
function fail(error: ChildError): Result<never, ChildError> {
  return { ok: false, error };
}
import { getServerClient } from '@/lib/supabase/server';

const log = logger.child('supabase-child-repo');

interface ChildRow {
  id: string;
  parent_user_id: string;
  display_name: string;
  age_years: number;
  sex: 'male' | 'female';
  height_cm: number | null;
  weight_kg: number | null;
  avatar_emoji: string | null;
  created_at: string;
  session_count?: number;
  last_tested_at?: string | null;
}

function rowToRecord(row: ChildRow): ChildRecord {
  return {
    id: row.id,
    parentUserId: row.parent_user_id,
    displayName: row.display_name,
    ageYears: row.age_years,
    sex: row.sex,
    heightCm: row.height_cm ?? undefined,
    weightKg: row.weight_kg ?? undefined,
    avatarEmoji: row.avatar_emoji ?? undefined,
    createdAt: row.created_at,
    sessionCount: row.session_count ?? 0,
    lastTestedAt: row.last_tested_at ?? undefined,
  };
}

function inputToRow(input: ChildInput, parentUserId: string) {
  return {
    parent_user_id: parentUserId,
    display_name: input.displayName,
    age_years: input.ageYears,
    sex: input.sex,
    height_cm: input.heightCm ?? null,
    weight_kg: input.weightKg ?? null,
    avatar_emoji: input.avatarEmoji ?? null,
  };
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

export const supabaseChildRepository: ChildRepository = {
  async list(): Promise<Result<ReadonlyArray<ChildRecord>, ChildError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return fail(auth.error);

    const { data, error } = await auth.supabase
      .from('children_with_stats')
      .select('*')
      .eq('parent_user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('children list query başarısız', { cause: error.message });
      return fail({ kind: 'storage', message: error.message });
    }
    return ok((data ?? []).map(rowToRecord));
  },

  async get(id: ChildId): Promise<Result<ChildRecord, ChildError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return fail(auth.error);

    const { data, error } = await auth.supabase
      .from('children_with_stats')
      .select('*')
      .eq('id', id)
      .eq('parent_user_id', auth.userId)
      .maybeSingle();

    if (error) {
      log.error('children get query başarısız', { cause: error.message });
      return fail({ kind: 'storage', message: error.message });
    }
    if (!data) return fail({ kind: 'not-found', childId: id });
    return ok(rowToRecord(data));
  },

  async create(input: ChildInput): Promise<Result<ChildRecord, ChildError>> {
    const parsed = childInputSchema.safeParse(input);
    if (!parsed.success) {
      return fail({
        kind: 'validation',
        message: parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      });
    }

    const auth = await getUserOrFail();
    if (!auth.ok) return fail(auth.error);

    const { data, error } = await auth.supabase
      .from('children')
      .insert(inputToRow(parsed.data, auth.userId))
      .select('*')
      .single();

    if (error) {
      log.error('children insert başarısız', { cause: error.message });
      return fail({ kind: 'storage', message: error.message });
    }
    return ok(rowToRecord({ ...data, session_count: 0 }));
  },

  async update(
    id: ChildId,
    patch: Partial<ChildInput>,
  ): Promise<Result<ChildRecord, ChildError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return fail(auth.error);

    const updates: Record<string, unknown> = {};
    if (patch.displayName !== undefined) updates.display_name = patch.displayName;
    if (patch.ageYears !== undefined) updates.age_years = patch.ageYears;
    if (patch.sex !== undefined) updates.sex = patch.sex;
    if (patch.heightCm !== undefined) updates.height_cm = patch.heightCm;
    if (patch.weightKg !== undefined) updates.weight_kg = patch.weightKg;
    if (patch.avatarEmoji !== undefined) updates.avatar_emoji = patch.avatarEmoji;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await auth.supabase
      .from('children')
      .update(updates)
      .eq('id', id)
      .eq('parent_user_id', auth.userId)
      .select('*')
      .maybeSingle();

    if (error) {
      log.error('children update başarısız', { cause: error.message });
      return fail({ kind: 'storage', message: error.message });
    }
    if (!data) return fail({ kind: 'not-found', childId: id });
    return ok(rowToRecord(data));
  },

  async remove(id: ChildId): Promise<Result<void, ChildError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return fail(auth.error);

    const { error } = await auth.supabase
      .from('children')
      .delete()
      .eq('id', id)
      .eq('parent_user_id', auth.userId);

    if (error) {
      log.error('children delete başarısız', { cause: error.message });
      return fail({ kind: 'storage', message: error.message });
    }
    return ok(undefined);
  },
};

export { makeChildId };
