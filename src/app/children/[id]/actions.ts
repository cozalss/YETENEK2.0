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

  // Çocuk detay sayfasını revalidate et (rozet/geçmiş güncel gelsin)
  revalidatePath(`/children/${input.childId}`);
  revalidatePath('/profile');
  return { ok: true, sessionId: result.value.sessionId };
}
