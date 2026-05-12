/**
 * AI Coach chat — Anthropic Claude streaming endpoint.
 *
 * Veli "Voleybola ne zaman başlasın?" gibi takip soruları sorar; biz
 * Claude ile streaming text döneriz. Her istek session bağlamı +
 * son 10 mesajı içerir.
 *
 * KVKK: Çocuk ismi + raw anthro Claude'a gönderilmiyor. user mesajının
 * içinde paylaşılan PII varsa email/phone regex ile hafif filtre var.
 *
 * Rate limit: IP bazlı 30 mesaj/dakika.
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  COACH_SYSTEM_PROMPT,
  buildCoachContext,
} from '@/lib/llm/coachPrompt';
import {
  AnthropicError,
  isAnthropicConfigured,
  streamText,
} from '@/lib/llm/anthropic';
import type { SessionSummary } from '@/lib/session/store';
import {
  balanceSummarySchema,
  broadJumpSummarySchema,
  coordinationSummarySchema,
  enduranceSummarySchema,
  jumpSummarySchema,
  lateralHopsSummarySchema,
  reactionSummarySchema,
  sportMatchSchema,
} from '@/core/schemas/session.schema';
import { logger } from '@/shared/logger/logger';

const log = logger.child('api:chat');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; // streaming — uzun sürebilir

const MAX_HISTORY = 10;

const childSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  ageYears: z.number().int().min(4).max(18),
  sex: z.enum(['male', 'female']),
  heightCm: z.number().min(80).max(220).optional(),
  weightKg: z.number().min(15).max(200).optional(),
});

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
});

// Her test summary alt-schema'sı `core/schemas/session.schema.ts`'den
// reuse ediliyor — z.unknown() ile loose forward yerine Zod-validated.
// Bu Claude prompt boundary'sinin gerçek tip güvenliğini sağlar.
const payloadSchema = z.object({
  session: z
    .object({
      child: childSchema,
      jump: jumpSummarySchema.optional(),
      balance: balanceSummarySchema.optional(),
      reaction: reactionSummarySchema.optional(),
      broadJump: broadJumpSummarySchema.optional(),
      lateralHops: lateralHopsSummarySchema.optional(),
      coordination: coordinationSummarySchema.optional(),
      endurance: enduranceSummarySchema.optional(),
      recommendations: z.array(sportMatchSchema).max(20).optional(),
      injuryWarnings: z.array(z.string().max(300)).max(10),
      completedTests: z.array(z.string()).optional(),
      startedAt: z.string(),
      completedAt: z.string().optional(),
    })
    .passthrough(),
  history: z.array(messageSchema).max(MAX_HISTORY).optional(),
  message: z.string().min(1).max(800),
});

const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
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

const PII_REGEX =
  /(\+?\d{2,3}\s?\d{3}\s?\d{2,3}\s?\d{2,4}|[\w.+-]+@[\w-]+\.[\w.-]+)/;

export async function POST(request: Request): Promise<Response> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Çok fazla istek, biraz bekle.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON.' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz payload.' }, { status: 400 });
  }

  const { session: rawSession, history = [], message } = parsed.data;

  if (PII_REGEX.test(message)) {
    return NextResponse.json(
      {
        error:
          'Mesajında telefon/email gibi kişisel bilgi tespit edildi; bunu paylaşmamanı öneririm.',
      },
      { status: 400 }
    );
  }

  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      {
        error:
          'AI koç şu anda kullanılabilir değil. ANTHROPIC_API_KEY tanımlanmalı.',
      },
      { status: 503 }
    );
  }

  // Zod schema artık test alanlarını da validate ediyor; cast tipinin
  // SessionSummary'e uyumlu olması için minimum normalizasyon yapıyoruz.
  const session = rawSession as unknown as SessionSummary;
  log.debug('chat session validated', {
    ageYears: rawSession.child.ageYears,
    completedCount: rawSession.completedTests?.length ?? 0,
  });
  const sessionContext = buildCoachContext(session);
  const systemPrompt = `${COACH_SYSTEM_PROMPT}\n\n## Çocuğun profili\n${sessionContext}`;

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamText({
          systemPrompt,
          userMessage: message,
          history,
          generationConfig: {
            temperature: 0.65,
            maxTokens: 600,
          },
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const msg =
          err instanceof AnthropicError
            ? err.message
            : 'Koç şu anda yanıt veremiyor.';
        console.error('[/api/chat] stream hatası:', msg);
        controller.enqueue(encoder.encode(`\n\n[Hata: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
