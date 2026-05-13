/**
 * Sport recommendations adapter — bir test oturumunun önerdiği sporları
 * `sport_recommendations` tablosuna yazar/okur.
 *
 * Dual-write pattern: `recordChildSessionAction` önce `sessions` tablosuna
 * yazar, sonra dönen `sessionId` ile bu adapter'ı çağırarak önerileri
 * normalize tabloda yazar. JSONB summary.recommendations alanı geriye
 * uyumluluk için kalır.
 */

import 'server-only';
import { getServerClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger/logger';

const log = logger.child('supabase-sport-recommendations');

// Sport adı → slug eşlemesi. SportMatch.sport "Voleybol" / "Masa Tenisi"
// formatında geliyor; sports tablosu slug'larına haritalanır.
const SPORT_NAME_TO_SLUG: Record<string, string> = {
  Voleybol: 'voleybol',
  Basketbol: 'basketbol',
  Tenis: 'tenis',
  Yüzme: 'yuzme',
  Futbol: 'futbol',
  Atletizm: 'atletizm',
  Cimnastik: 'cimnastik',
  Judo: 'judo',
  Taekwondo: 'taekwondo',
  Boks: 'boks',
  'Masa Tenisi': 'masa-tenisi',
  Badminton: 'badminton',
};

export interface SportRecommendationInput {
  sport: string; // "Voleybol"
  similarity: number;
  anthroBonus: number;
  confidencePercent: number;
  reason: string;
}

export interface SportRecommendationRecord {
  id: string;
  sessionId: string;
  childId: string;
  sportSlug: string;
  sportName: string;
  rank: number;
  confidencePercent: number;
  similarity: number | null;
  anthroBonus: number | null;
  reason: string;
  selected: boolean;
  selectedAt: string | null;
  createdAt: string;
}

export type RepoError =
  | { kind: 'unauthorized' }
  | { kind: 'storage'; message: string };

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function getUserOrFail(): Promise<
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof getServerClient>> }
  | { ok: false; error: RepoError }
> {
  const supabase = await getServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { ok: false, error: { kind: 'unauthorized' } };
  return { ok: true, userId: user.id, supabase };
}

interface RecRow {
  id: string;
  session_id: string;
  child_id: string;
  sport_slug: string;
  sport_name: string;
  rank: number;
  confidence_percent: number;
  similarity: number | null;
  anthro_bonus: number | null;
  reason: string;
  selected: boolean;
  selected_at: string | null;
  created_at: string;
}

function rowToRec(r: RecRow): SportRecommendationRecord {
  return {
    id: r.id,
    sessionId: r.session_id,
    childId: r.child_id,
    sportSlug: r.sport_slug,
    sportName: r.sport_name,
    rank: r.rank,
    confidencePercent: r.confidence_percent,
    similarity: r.similarity,
    anthroBonus: r.anthro_bonus,
    reason: r.reason,
    selected: r.selected,
    selectedAt: r.selected_at,
    createdAt: r.created_at,
  };
}

export const supabaseSportRecommendationsRepository = {
  /**
   * Bir test oturumu için önerilen sporları yazar.
   * Idempotent: aynı session_id + rank için ikinci çağrı önceyi günceller.
   * `recommendations` array sıralı varsayılır — index = rank-1.
   */
  async writeForSession(input: {
    sessionId: string;
    childId: string;
    recommendations: ReadonlyArray<SportRecommendationInput>;
  }): Promise<Result<readonly SportRecommendationRecord[], RepoError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return { ok: false, error: auth.error };

    const rows = input.recommendations.map((rec, idx) => ({
      session_id: input.sessionId,
      child_id: input.childId,
      parent_user_id: auth.userId,
      sport_slug: SPORT_NAME_TO_SLUG[rec.sport] ?? slugify(rec.sport),
      sport_name: rec.sport,
      rank: idx + 1,
      confidence_percent: rec.confidencePercent,
      similarity: rec.similarity,
      anthro_bonus: rec.anthroBonus,
      reason: rec.reason,
    }));

    if (rows.length === 0) return { ok: true, value: [] };

    // Upsert by (session_id, rank) — yeniden çalışırsa eski satırlar güncel.
    const { data, error } = await auth.supabase
      .from('sport_recommendations')
      .upsert(rows, { onConflict: 'session_id,rank' })
      .select(
        'id, session_id, child_id, sport_slug, sport_name, rank, confidence_percent, similarity, anthro_bonus, reason, selected, selected_at, created_at',
      );

    if (error) {
      log.error('sport_recommendations upsert hatası', { cause: error.message });
      return { ok: false, error: { kind: 'storage', message: error.message } };
    }
    return {
      ok: true,
      value: (data ?? []).map((row) => rowToRec(row as RecRow)),
    };
  },

  /**
   * Bir kullanıcının seçtiği sporun `selected` flag'ini günceller.
   * Aynı session içinde diğer önerilerin `selected` flag'i değiştirilmez
   * (kullanıcı geri dönüp başka bir öneriyi seçebilir).
   */
  async markSelected(input: {
    sessionId: string;
    sportSlug: string;
  }): Promise<Result<void, RepoError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return { ok: false, error: auth.error };

    const { error } = await auth.supabase
      .from('sport_recommendations')
      .update({ selected: true, selected_at: new Date().toISOString() })
      .eq('session_id', input.sessionId)
      .eq('sport_slug', input.sportSlug)
      .eq('parent_user_id', auth.userId);

    if (error) {
      log.warn('sport_recommendations markSelected hatası', { cause: error.message });
      return { ok: false, error: { kind: 'storage', message: error.message } };
    }
    return { ok: true, value: undefined };
  },

  async listForChild(
    childId: string,
  ): Promise<Result<readonly SportRecommendationRecord[], RepoError>> {
    const auth = await getUserOrFail();
    if (!auth.ok) return { ok: false, error: auth.error };

    const { data, error } = await auth.supabase
      .from('sport_recommendations')
      .select(
        'id, session_id, child_id, sport_slug, sport_name, rank, confidence_percent, similarity, anthro_bonus, reason, selected, selected_at, created_at',
      )
      .eq('child_id', childId)
      .eq('parent_user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) {
      log.warn('sport_recommendations listForChild hatası', {
        cause: error.message,
      });
      return { ok: false, error: { kind: 'storage', message: error.message } };
    }
    return { ok: true, value: (data ?? []).map((row) => rowToRec(row as RecRow)) };
  },
} as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
