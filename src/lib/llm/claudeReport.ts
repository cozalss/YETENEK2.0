/**
 * AI rapor üretimi — Anthropic Claude ile.
 *
 * Server-only (API key process.env'den okunur, browser'a SIZMAMALI).
 * Hata durumunda fallback (rule-based) rapor üretilir → demo asla
 * boş ekran kalmaz. Default model: claude-sonnet-4-6 (.env üzerinden
 * değiştirilebilir).
 */

import 'server-only';
import type { SessionSummary } from '@/lib/session/store';
import {
  AnthropicError,
  generateText,
  isAnthropicConfigured,
  streamText,
} from './anthropic';
import { generateFallbackReport } from './fallbackReport';
import {
  checkGrounding,
  describeGroundingFailure,
  factsFromSession,
} from '@/core/use-cases/ground-narrative';
import { REPORT_SYSTEM_PROMPT, buildReportUserMessage } from './reportPrompt';

export interface ReportResult {
  /** Türkçe rapor metni (her durumda dolu — fallback olsa bile) */
  text: string;
  /** Hangi pipeline kullanıldı: claude veya fallback */
  source: 'claude' | 'fallback';
  /** Fallback kullanıldıysa sebebi (kullanıcı görmez, sadece log'da) */
  reason?: string;
}

/**
 * Veliye Türkçe rapor üretir. Anahtar yoksa veya API hata verirse
 * rule-based fallback'e düşer; sonuç her zaman dolu metin döndürür.
 */
export async function generateReport(
  session: SessionSummary
): Promise<ReportResult> {
  const fallbackText = () => generateFallbackReport(session);

  if (!isAnthropicConfigured()) {
    return {
      text: fallbackText(),
      source: 'fallback',
      reason: 'ANTHROPIC_API_KEY tanımlı değil.',
    };
  }

  const userMessage = buildReportUserMessage(session);

  try {
    const text = await generateText({
      systemPrompt: REPORT_SYSTEM_PROMPT,
      userMessage,
      generationConfig: {
        temperature: 0.7,
        maxTokens: 1500,
      },
    });
    if (!text) {
      return {
        text: fallbackText(),
        source: 'fallback',
        reason: 'Claude boş içerik döndü.',
      };
    }

    // Sayı-topraklama kapısı: metindeki her sayı ve spor adı oturumda
    // bulunmak zorunda. Prompt'a "uydurma" yazmak bir dilek; bu bir kontrol.
    // Reddedilen metin yayınlanmaz, kural tabanlı rapora düşülür.
    const failure = checkGrounding(text, factsFromSession(session));
    if (failure) {
      return {
        text: fallbackText(),
        source: 'fallback',
        reason: describeGroundingFailure(failure),
      };
    }

    return { text, source: 'claude' };
  } catch (err) {
    const reason = describeError(err);
    console.error('[claudeReport] Hata, fallback devreye giriyor:', reason);
    return {
      text: fallbackText(),
      source: 'fallback',
      reason,
    };
  }
}

/**
 * Streaming rapor üretimi — text delta'ları yield eden async generator.
 *
 * İlk yield her zaman bir meta event'i ('claude' veya 'fallback'); ardından
 * `delta` event'leri text parçaları taşır. Hata olursa fallback metin tek
 * parçada gelir — UI iki kod yolu yazmak zorunda kalmaz.
 */
export type ReportStreamEvent =
  | { type: 'meta'; source: 'claude' | 'fallback'; reason?: string }
  | { type: 'delta'; text: string }
  | { type: 'done' };

export async function* generateReportStream(
  session: SessionSummary,
  signal?: AbortSignal
): AsyncGenerator<ReportStreamEvent, void, void> {
  if (!isAnthropicConfigured()) {
    yield {
      type: 'meta',
      source: 'fallback',
      reason: 'ANTHROPIC_API_KEY tanımlı değil.',
    };
    yield { type: 'delta', text: generateFallbackReport(session) };
    yield { type: 'done' };
    return;
  }

  yield { type: 'meta', source: 'claude' };

  const userMessage = buildReportUserMessage(session);
  let received = '';

  try {
    for await (const chunk of streamText({
      systemPrompt: REPORT_SYSTEM_PROMPT,
      userMessage,
      generationConfig: { temperature: 0.7, maxTokens: 1500 },
      signal,
    })) {
      received += chunk;
      yield { type: 'delta', text: chunk };
    }

    if (received.trim().length === 0) {
      // Claude boş döndü — fallback'e geç ve UI'a yeniden meta sinyalle
      yield {
        type: 'meta',
        source: 'fallback',
        reason: 'Claude boş içerik döndü.',
      };
      yield { type: 'delta', text: generateFallbackReport(session) };
    }
    yield { type: 'done' };
  } catch (err) {
    const reason = describeError(err);
    console.error(
      '[claudeReport:stream] Hata, fallback devreye giriyor:',
      reason
    );
    // Akış ortasında hata: kullanıcının görmediği partial'ı atıp fallback'i tek seferde gönder
    yield { type: 'meta', source: 'fallback', reason };
    yield { type: 'delta', text: generateFallbackReport(session) };
    yield { type: 'done' };
  }
}

function describeError(err: unknown): string {
  if (err instanceof AnthropicError) {
    if (err.status === 0) return err.message;
    if (err.status === 401 || err.status === 403)
      return 'Geçersiz veya yetkisiz Anthropic API anahtarı.';
    if (err.status === 429) return 'Anthropic rate limit aşıldı.';
    if (err.status >= 500) return `Anthropic sunucu hatası (${err.status}).`;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Bilinmeyen hata.';
}
