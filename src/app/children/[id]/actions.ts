/**
 * Çocuk detay sayfası server action'ları.
 *
 * - `recordChildSessionAction`: client-side test akışı bittiğinde çağrılır.
 *   sessionStore.finalize() çıktısını + earned badge id'lerini DB'ye yazar.
 *
 * Form action olarak değil, doğrudan async function olarak invoke edilir
 * ("use server" + "use client" sınırını React server actions köprüsü
 * sağlar).
 */

'use server';

import { revalidatePath } from 'next/cache';
import { supabaseChildProgressRepository } from '@/infrastructure/storage/supabase-child-progress-repository';
import { supabaseSportRecommendationsRepository } from '@/infrastructure/storage/supabase-sport-recommendations-repository';
import { sessionSummarySchema } from '@/core/schemas/session.schema';
import type { SessionSummarySchema } from '@/core/schemas/session.schema';
import { makeChildId } from '@/core/types/branded';
import { logger } from '@/shared/logger/logger';

const log = logger.child('children-progress-actions');

interface RecordSessionInput {
  readonly childId: string;
  readonly summary: SessionSummarySchema;
  readonly earnedBadgeIds: ReadonlyArray<string>;
  readonly startedAt: string;
  readonly completedAt: string;
}

interface RecordSessionResult {
  readonly ok: boolean;
  readonly sessionId?: string;
  readonly error?: string;
}

/**
 * Test bittikten sonra client'tan çağrılır. RLS ve auth.uid kontrolünü
 * adapter yapar; başarısızlığı silent yutmuyoruz, client UI'da hint
 * gösterebilsin diye Result-benzeri obje dönüyoruz.
 */
export async function recordChildSessionAction(
  input: RecordSessionInput,
): Promise<RecordSessionResult> {
  const parsedSummary = sessionSummarySchema.safeParse(input.summary);
  if (!parsedSummary.success) {
    log.warn('session summary geçersiz', {
      issues: parsedSummary.error.issues.length,
    });
    return { ok: false, error: 'Test özeti doğrulanamadı.' };
  }

  const result = await supabaseChildProgressRepository.recordSession({
    childId: makeChildId(input.childId),
    summary: parsedSummary.data,
    earnedBadgeIds: input.earnedBadgeIds,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  });

  if (!result.ok) {
    const message =
      result.error.kind === 'unauthorized'
        ? 'Önce giriş yap.'
        : result.error.kind === 'not-found'
          ? 'Çocuk bulunamadı.'
          : 'Kayıt sunucuya yazılamadı (lokalde tutuldu).';
    log.warn('recordChildSession sunucu hatası', {
      kind: result.error.kind,
    });
    return { ok: false, error: message };
  }

  // Önerilen sporları normalize tabloya yaz (best-effort — JSONB summary
  // zaten yazıldı, bu hata olursa kullanıcı UI'sı bozulmaz).
  if (parsedSummary.data.recommendations && parsedSummary.data.recommendations.length > 0) {
    const recsResult = await supabaseSportRecommendationsRepository.writeForSession({
      sessionId: result.value.sessionId,
      childId: input.childId,
      recommendations: parsedSummary.data.recommendations.map((r) => ({
        sport: r.sport,
        similarity: r.similarity,
        anthroBonus: r.anthroBonus,
        confidencePercent: r.confidencePercent,
        reason: r.reason,
      })),
    });
    if (!recsResult.ok) {
      log.warn('sport_recommendations yazılamadı (best-effort)', {
        kind: recsResult.error.kind,
      });
    }
  }

  // Çocuk detay sayfasını revalidate et (rozet/geçmiş güncel gelsin)
  revalidatePath(`/children/${input.childId}`);
  revalidatePath('/profile');
  return { ok: true, sessionId: result.value.sessionId };
}
