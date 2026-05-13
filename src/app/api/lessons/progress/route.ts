/**
 * POST /api/lessons/progress — bir dersin tamamlandığını işle.
 * GET  /api/lessons/progress?sport=...?optional — kullanıcının tamamladığı
 *      dersleri listele.
 *
 * Dual-write akışı: LessonRunner success ekranında localStorage'a yazar
 * (anında UI), sonra bu route'u fire-and-forget POST'lar (DB persistence).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseLessonRepository } from '@/infrastructure/storage/supabase-lesson-repository';
import { logger } from '@/shared/logger/logger';

const log = logger.child('api-lessons-progress');

const bodySchema = z.object({
  lessonId: z.string().min(1).max(80),
  sportSlug: z.string().min(1).max(40),
  durationMs: z.number().int().nonnegative().optional(),
  reps: z.number().int().nonnegative().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  let parsed;
  try {
    const json = await request.json();
    parsed = bodySchema.safeParse(json);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Geçersiz JSON gövdesi.' },
      { status: 400 },
    );
  }

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Geçersiz alanlar.',
      },
      { status: 400 },
    );
  }

  const result = await supabaseLessonRepository.markCompleted(parsed.data);
  if (!result.ok) {
    if (result.error.kind === 'unauthorized') {
      return NextResponse.json(
        { ok: false, error: 'Önce giriş yapmalısın.' },
        { status: 401 },
      );
    }
    log.error('markCompleted storage hatası', { cause: result.error.message });
    return NextResponse.json(
      { ok: false, error: 'İlerleme kaydedilemedi.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, progress: result.value });
}

export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get('sport') ?? undefined;
  const result = await supabaseLessonRepository.listCompleted(sport);
  if (!result.ok) {
    if (result.error.kind === 'unauthorized') {
      return NextResponse.json(
        { ok: false, error: 'Önce giriş yapmalısın.', completed: [] },
        { status: 401 },
      );
    }
    log.error('listCompleted storage hatası', { cause: result.error.message });
    return NextResponse.json(
      { ok: false, error: 'İlerleme okunamadı.', completed: [] },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, completed: result.value });
}
