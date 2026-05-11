/**
 * AI rapor üretimi — Google Gemini ile.
 *
 * Server-only (API key process.env'den okunur, browser'a SIZMAMALI).
 * Hata durumunda fallback (rule-based) rapor üretilir → demo asla
 * boş ekran kalmaz. Model: gemini-2.0-flash (varsayılan, hızlı + ücretsiz tier).
 */

import 'server-only';
import type { SessionSummary } from '@/lib/session/store';
import { generateFallbackReport } from './fallbackReport';
import { GeminiError, generateText, isGeminiConfigured } from './gemini';
import {
  REPORT_SYSTEM_PROMPT,
  buildReportUserMessage,
} from './reportPrompt';

export interface ReportResult {
  /** Türkçe rapor metni (her durumda dolu — fallback olsa bile) */
  text: string;
  /** Hangi pipeline kullanıldı: gemini veya fallback */
  source: 'gemini' | 'fallback';
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

  if (!isGeminiConfigured()) {
    return {
      text: fallbackText(),
      source: 'fallback',
      reason: 'GEMINI_API_KEY tanımlı değil.',
    };
  }

  const userMessage = buildReportUserMessage(session);

  try {
    const text = await generateText({
      systemPrompt: REPORT_SYSTEM_PROMPT,
      userMessage,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
      },
    });
    if (!text) {
      return {
        text: fallbackText(),
        source: 'fallback',
        reason: 'Gemini boş içerik döndü.',
      };
    }
    return { text, source: 'gemini' };
  } catch (err) {
    const reason = describeError(err);
    console.error('[geminiReport] Hata, fallback devreye giriyor:', reason);
    return {
      text: fallbackText(),
      source: 'fallback',
      reason,
    };
  }
}

function describeError(err: unknown): string {
  if (err instanceof GeminiError) {
    if (err.status === 0) return err.message;
    if (err.status === 401 || err.status === 403)
      return 'Geçersiz veya yetkisiz Gemini API anahtarı.';
    if (err.status === 429) return 'Gemini rate limit aşıldı.';
    if (err.status >= 500) return `Gemini sunucu hatası (${err.status}).`;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Bilinmeyen hata.';
}
