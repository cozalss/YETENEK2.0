/**
 * AI rapor üretici port arayüzü.
 *
 * Adapter'lar:
 *   - GeminiReportAdapter (varsayılan)
 *   - FallbackReportAdapter (rule-based, offline)
 *   - MockReportAdapter (testler için)
 *
 * Implementer'lar `core/types/result.ts` dönmek zorunda — domain throw etmez.
 */

import type { Result } from '@/core/types/result';
import type { SessionSummarySchema } from '@/core/schemas/session.schema';

export type ReportSource = 'gemini' | 'fallback' | 'mock';

export interface GeneratedReport {
  readonly text: string;
  readonly source: ReportSource;
  readonly tokenCount?: number;
  readonly generatedAt: string;
}

export interface ReportGenerator {
  /** Veliye Türkçe rapor üret. Hata durumunda fallback metni dön. */
  generate(session: SessionSummarySchema): Promise<Result<GeneratedReport>>;
  /** Fallback üret (LLM olmadan). Test/demo için. */
  generateFallback(session: SessionSummarySchema): GeneratedReport;
}
