/**
 * POST /api/report
 *
 * Çocuğun session özetini alır, Gemini API üzerinden veliye Türkçe
 * rapor üretir. Anahtar yoksa veya API hata verirse otomatik fallback.
 *
 * Server-only — Gemini API key bu route üzerinden çıkış yapmaz.
 *
 * Hız sınırı stratejisi: hackathon kapsamında IP başı 10 req/dk basit
 * in-memory limiter. Production için Redis/Upstash gerekir.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateReport } from '@/lib/llm/claudeReport';
import type { SessionSummary } from '@/lib/session/store';

// Route segment config — Next.js 16
// dynamic: 'force-dynamic' → her istek server'da çalışsın (cache yok, KVKK gereği)
// revalidate: 0 → kesin cache yok
// maxDuration: Vercel için Gemini cevabı için yeterli pencere
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

// Session payload'ını runtime'da doğrula (client kötü niyetli veri gönderebilir).
const childSchema = z.object({
  name: z.string().min(1).max(60),
  ageYears: z.number().int().min(4).max(18),
  sex: z.enum(['male', 'female']),
  heightCm: z.number().min(80).max(220).optional(),
  weightKg: z.number().min(15).max(200).optional(),
});

const jumpSchema = z
  .object({
    jumpHeightCm: z.number().nullable(),
    jumpUnits: z.number(),
    flightTimeMs: z.number(),
    score: z.number(),
    method: z
      .enum(['flight-time', 'hip-displacement', 'consensus'])
      .optional(),
    consistent: z.boolean().optional(),
  })
  .optional();

const balanceSchema = z
  .object({
    rightScore: z.number(),
    leftScore: z.number(),
    asymmetryPercent: z.number(),
    asymmetryWarning: z.boolean(),
    weakerSide: z.enum(['right', 'left']).nullable(),
    averageScore: z.number(),
  })
  .optional();

const reactionSchema = z
  .object({
    averageMs: z.number(),
    bestMs: z.number(),
    consistencyScore: z.number(),
    ageNormScore: z.number(),
  })
  .optional();

const broadJumpSchema = z
  .object({
    jumpDistanceCm: z.number().nullable(),
    jumpUnits: z.number(),
    score: z.number(),
  })
  .optional();

const lateralHopsSchema = z
  .object({
    hopCount: z.number(),
    frequencyHz: z.number(),
    score: z.number(),
    dataQuality: z.enum(['good', 'low']),
  })
  .optional();

const coordinationSchema = z
  .object({
    trackingEvents: z.number(),
    avgErrorPx: z.number(),
    bestErrorPx: z.number(),
    avgGapMs: z.number(),
    score: z.number(),
  })
  .optional();

const enduranceSchema = z
  .object({
    totalReps: z.number(),
    decayPercent: z.number(),
    durationMs: z.number(),
    score: z.number(),
  })
  .optional();

const testKeySchema = z.enum([
  'jump',
  'balance',
  'reaction',
  'broadJump',
  'lateralHops',
  'coordination',
  'endurance',
]);

// String alanlar bilinçli olarak sınırlandırıldı — payload prompt'a doğrudan
// enjekte edildiği için unbounded string'ler prompt-injection vektörü olur.
const recommendationSchema = z.object({
  sport: z.string().max(50),
  description: z.string().max(300),
  similarity: z.number(),
  anthroBonus: z.number().optional(),
  finalScore: z.number().optional(),
  confidencePercent: z.number().min(0).max(100),
  reason: z.string().max(300),
});

const payloadSchema = z.object({
  session: z.object({
    child: childSchema,
    jump: jumpSchema,
    balance: balanceSchema,
    reaction: reactionSchema,
    broadJump: broadJumpSchema,
    lateralHops: lateralHopsSchema,
    coordination: coordinationSchema,
    endurance: enduranceSchema,
    recommendations: z.array(recommendationSchema).max(20).optional(),
    injuryWarnings: z.array(z.string().max(300)).max(10),
    completedTests: z.array(testKeySchema).max(20).optional(),
    startedAt: z.string().max(40),
    completedAt: z.string().max(40).optional(),
  }),
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
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

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
      { error: 'Geçersiz session verisi.', issues: parsed.error.issues },
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

  const session = {
    ...data,
    completedTests: data.completedTests ?? inferredCompleted,
  } as unknown as SessionSummary;

  try {
    const result = await generateReport(session);
    return NextResponse.json({
      report: result.text,
      source: result.source,
      // reason sadece dev/log'da; cevaba istemiyoruz çünkü kullanıcıya görünür.
    });
  } catch (err) {
    console.error('[/api/report] beklenmedik hata:', err);
    return NextResponse.json(
      { error: 'Rapor üretilemedi, lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
