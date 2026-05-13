/**
 * POST /api/lessons/enroll — kullanıcı bir çocuk için bir branşa kayıt olur.
 *
 * Body: { childId: string, sportSlug: string }
 * Response: 200 { ok: true, enrollment } | 401 unauthorized | 400 invalid body
 *
 * Client tarafı `lib/lessons/enrollment.ts` localStorage'a yazıp bu route'u
 * fire-and-forget tetikler (cross-device sync için).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseLessonRepository } from '@/infrastructure/storage/supabase-lesson-repository';
import { logger } from '@/shared/logger/logger';

const log = logger.child('api-lessons-enroll');

const bodySchema = z.object({
  childId: z.string().uuid(),
  sportSlug: z.string().min(1).max(40),
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

  const result = await supabaseLessonRepository.enroll({
    childId: parsed.data.childId,
    sportSlug: parsed.data.sportSlug,
  });
  if (!result.ok) {
    if (result.error.kind === 'unauthorized') {
      return NextResponse.json(
        { ok: false, error: 'Önce giriş yapmalısın.' },
        { status: 401 },
      );
    }
    log.error('enroll storage hatası', { cause: result.error.message });
    return NextResponse.json(
      { ok: false, error: 'Kayıt yapılamadı, tekrar dene.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, enrollment: result.value });
}
