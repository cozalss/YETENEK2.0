/**
 * POST /api/report
 *
 * Çocuğun session özetini alır, Anthropic Claude API üzerinden veliye
 * Türkçe rapor üretir. Anahtar yoksa veya API hata verirse otomatik fallback.
 *
 * Server-only — Anthropic API key bu route üzerinden çıkış yapmaz.
 *
 * Hız sınırı stratejisi: hackathon kapsamında IP başı 10 req/dk basit
 * in-memory limiter. Production için Redis/Upstash gerekir.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionSummarySchema } from '@/core/schemas/session.schema';
import { generateReport, generateReportStream } from '@/lib/llm/claudeReport';
import type { SessionSummary } from '@/lib/session/store';
import { logger } from '@/shared/logger/logger';

const log = logger.child('api:report');

// Route segment config — Next.js 16
// dynamic: 'force-dynamic' → her istek server'da çalışsın (cache yok, KVKK gereği)
// revalidate: 0 → kesin cache yok
// maxDuration: Vercel için Claude cevabı için yeterli pencere
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

// Session payload'ını runtime'da doğrula (client kötü niyetli veri gönderebilir).
/**
 * İstek gövdesi — **çekirdek şema yeniden kullanılıyor**.
 *
 * Burada 120 satırlık bir kopya şema vardı ve çekirdekten daha gevşekti:
 * `.finite()` yoktu, skorlarda `.min(0).max(100)` yoktu, `completedTests`
 * `.default([])` yerine `.optional()` idi. İki şema aynı nesneyi farklı
 * doğruluyordu; drift zaten başlamıştı. `/api/chat` çekirdeği zaten yeniden
 * kullanıyordu — bu route istisnaydı.
 *
 * `.passthrough()` bilinçli: istemci ileride yeni alan gönderirse istek
 * reddedilmesin, ama bilinen alanların doğrulaması sıkı kalsın.
 */
const payloadSchema = z.object({
  session: sessionSummarySchema.passthrough(),
});

// Basit IP bazlı rate limit (Map, sadece bu süreçte yaşar).
const RATE_LIMIT = 10; // istek
const WINDOW_MS = 60_000; // 1 dakika
const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Map büyürse stale entry'leri temizle (long-lived process'te memory leak'i önler).
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      if (v.resetAt < now) ipHits.delete(k);
    }
  }
  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Çok fazla istek, lütfen bir dakika bekleyin.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Geçersiz JSON gövde.' },
      { status: 400 }
    );
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      // Ham Zod `issues` dizisi dışarı verilmiyordu diye bir sebep yok:
      // iç şema yapısını, alan adlarını ve doğrulama kurallarını sızdırıyor.
      // Sunucuda log'lanıyor, istemciye yalnız kullanıcıya dönük mesaj gidiyor.
      { error: 'Geçersiz session verisi.' },
      { status: 400 }
    );
  }

  // Zod parse edilmiş veriden SessionSummary'ye dönüştür: completedTests
  // varsayılan olarak tamamlanan test alanlarından türetilir (eski client
  // payload'larıyla geriye dönük uyumluluk için).
  const data = parsed.data.session;
  const inferredCompleted: string[] = [];
  if (data.jump) inferredCompleted.push('jump');
  if (data.balance) inferredCompleted.push('balance');
  if (data.reaction) inferredCompleted.push('reaction');
  if (data.broadJump) inferredCompleted.push('broadJump');
  if (data.lateralHops) inferredCompleted.push('lateralHops');
  if (data.coordination) inferredCompleted.push('coordination');
  if (data.endurance) inferredCompleted.push('endurance');

  // Zod schema her test alanını yapısal olarak validate ediyor; aşağıdaki
  // cast yalnızca branded `SessionSummary` tipinin TypeScript view'ını
  // alır — runtime garantisini Zod schema'sı sağlar.
  const session = {
    ...data,
    completedTests: data.completedTests ?? inferredCompleted,
  } as unknown as SessionSummary;

  // Streaming yolu: ?stream=1 → NDJSON akışı (text/plain; chunked)
  const url = new URL(request.url);
  if (url.searchParams.get('stream') === '1') {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (obj: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
        };
        try {
          for await (const event of generateReportStream(session)) {
            write(event);
          }
        } catch (err) {
          log.error('streaming rapor üretiminde beklenmedik hata', {
            cause: err instanceof Error ? err.message : String(err),
          });
          write({
            type: 'meta',
            source: 'fallback',
            reason: 'Akış kesildi.',
          });
          write({
            type: 'delta',
            text: 'Rapor anlık olarak üretilemedi. Birkaç saniye sonra tekrar deneyin.',
          });
          write({ type: 'done' });
        } finally {
          controller.close();
        }
      },
    });
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  try {
    const result = await generateReport(session);
    return NextResponse.json({
      report: result.text,
      source: result.source,
      // reason sadece dev/log'da; cevaba istemiyoruz çünkü kullanıcıya görünür.
    });
  } catch (err) {
    log.error('rapor üretiminde beklenmedik hata', {
      cause: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: 'Rapor üretilemedi, lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
