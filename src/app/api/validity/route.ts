/**
 * POST /api/validity — görsel geçerlilik denetimi.
 *
 * ## Neden sunucuda
 *
 * Kural tabanlı hakem tarayıcıda çalışıyor ve orada kalmalı: ücretsiz,
 * çevrimdışı ve anında. Bu route yalnız **görsel** hakem için var, çünkü o
 * bir API anahtarı gerektiriyor ve anahtar istemciye gönderilemez.
 *
 * ## Bu route olmadan ne oluyordu
 *
 * `CompositeValidityJudge` yazılmıştı ama hiçbir yerden çağrılmıyordu:
 * `openai-vision-judge.ts` `server-only` taşıdığı için tarayıcıdan import
 * edilemiyor, ve onu sunucuda açan bir uç nokta yoktu. Yani anahtar
 * eklenmiş olsa bile görsel hakem devreye girmiyordu — yazılmış ama
 * bağlanmamış bir katman.
 *
 * ## Neden burada kural hakemi ÇALIŞMIYOR
 *
 * İlk uygulamada bu route `CompositeValidityJudge`'ı çağırıyordu, yani kural
 * hakemini bir kez daha koşturuyordu. Sonuç sessiz bir felçti: şema veri
 * minimizasyonu için en fazla 8 kare kabul ediyor, kural hakemi ise karar
 * verebilmek için ≥30 kare istiyor. Dolayısıyla sunucudaki kural hakemi her
 * seferinde `insufficient_data` + güven 0.9 dönüyor, composite bunu "kesin
 * karar" sayıp görsel çağrıyı **atlıyordu**. Görsel hakem üretimde hiç
 * çalışmayacaktı; gerçek bir çağrıyla yapılan smoke-test'te yakalandı.
 *
 * Doğrusu: kural aşaması istemcide, TAM kare seti üzerinde zaten koştu.
 * Burası yalnız görsel aşama. Birleştirme de istemcide yapılıyor
 * (`use-validity-gate.ts` → `mergeVerdicts`).
 *
 * ## Gizlilik
 *
 * İstemci ham kamera görüntüsü göndermiyor; yalnız landmark koordinatları
 * geliyor ve iskelet görüntüsü **burada**, sunucuda çiziliyor. Yüz, arka
 * plan, oda, kıyafet hiçbir zaman cihazdan çıkmıyor. Şema en fazla 8 kare
 * kabul ediyor.
 */

import { NextResponse } from 'next/server';
import { judgeRequestSchema } from '@/core/schemas/validity.schema';
import {
  OpenAiVisionValidityJudge,
  isVisionJudgeConfigured,
} from '@/infrastructure/validity/openai-vision-judge';
import { logger } from '@/shared/logger/logger';
import type { Keypoint, PoseFrame } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

const log = logger.child('api:validity');

/** Tek örnek — istekler arasında yeniden kullanılıyor. */
const visionJudge = new OpenAiVisionValidityJudge();

// Basit IP bazlı rate limit — /api/report ile aynı desen.
// Görsel çağrı pahalı olduğu için sınır daha dar: tam batarya 7 test.
const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  hit.count += 1;
  if (ipHits.size > 5000) {
    for (const [key, value] of ipHits) {
      if (now > value.resetAt) ipHits.delete(key);
    }
  }
  return hit.count > RATE_LIMIT;
}

/** Şema tipinden `PoseFrame`'e — eksik `z` alanı 0 kabul edilir. */
function toPoseFrame(f: {
  timestamp: number;
  landmarks: { x: number; y: number; visibility?: number }[];
}): PoseFrame {
  const landmarks: Keypoint[] = f.landmarks.map((l) => ({
    x: l.x,
    y: l.y,
    z: 0,
    visibility: l.visibility,
  }));
  return { timestamp: f.timestamp, landmarks };
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Çok fazla istek, lütfen bir dakika bekleyin.' },
      { status: 429 }
    );
  }

  // Anahtar yoksa istemciyi boşuna bekletme: kural hakemi zaten tarayıcıda
  // çalıştı, buradan ek bilgi çıkmayacak.
  if (!isVisionJudgeConfigured()) {
    return NextResponse.json(
      { error: 'Görsel denetim yapılandırılmamış.', configured: false },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON gövde.' }, { status: 400 });
  }

  const parsed = judgeRequestSchema.safeParse(body);
  if (!parsed.success) {
    // Ham Zod issue'ları istemciye verilmiyor — iç şema yapısını sızdırır.
    log.warn('gecersiz istek', {
      issues: parsed.error.issues.length,
    });
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const { test, frames, measurementClaim } = parsed.data;

  try {
    const result = await visionJudge.judge({
      test,
      frames: frames.map(toPoseFrame),
      measurementClaim,
      signal: request.signal,
    });

    if (!result.ok) {
      // Hakem düştü. Bu bir hata değil bir yokluk: istemci kural kararıyla
      // devam etmeli, ölçüm bloklanmamalı.
      log.warn('hakem karar veremedi', { code: result.error.code });
      return NextResponse.json(
        { error: 'Görsel denetim yapılamadı.', code: result.error.code },
        { status: 503 }
      );
    }

    return NextResponse.json(result.value, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (cause) {
    log.error('beklenmedik hata', {
      cause: cause instanceof Error ? cause.message : String(cause),
    });
    return NextResponse.json(
      { error: 'Görsel denetim yapılamadı.' },
      { status: 500 }
    );
  }
}
