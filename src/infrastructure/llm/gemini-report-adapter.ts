/**
 * Gemini-backed ReportGenerator adapter.
 *
 * Mevcut `lib/llm/claudeReport.ts`'ı sarmalar; Result-typed API sunar.
 * UI tarafı bu port üzerinden konuşmalı, infra detaylarını bilmesin.
 */

import 'server-only';
import type {
  GeneratedReport,
  ReportGenerator,
} from '@/core/ports/report-generator';
import type { SessionSummarySchema } from '@/core/schemas/session.schema';
import { err, ok, type Result } from '@/core/types/result';
import { logger } from '@/shared/logger/logger';
import { generateReport } from '@/lib/llm/claudeReport';
import { generateFallbackReport } from '@/lib/llm/fallbackReport';
import type { SessionSummary } from '@/lib/session/store';

const log = logger.child('gemini-report');

class GeminiReportAdapter implements ReportGenerator {
  async generate(
    session: SessionSummarySchema
  ): Promise<Result<GeneratedReport>> {
    try {
      const result = await generateReport(session as SessionSummary);
      const generatedAt = new Date().toISOString();
      if (!result.text) {
        log.warn('empty report text', { source: result.source });
        return err({ code: 'llm.empty-response' });
      }
      return ok({
        text: result.text,
        source: result.source,
        generatedAt,
      });
    } catch (cause) {
      log.error('generate failed', { cause: String(cause) });
      return err({
        code: 'llm.unavailable',
        reason: cause instanceof Error ? cause.message : 'unknown',
      });
    }
  }

  generateFallback(session: SessionSummarySchema): GeneratedReport {
    return {
      text: generateFallbackReport(session as SessionSummary),
      source: 'fallback',
      generatedAt: new Date().toISOString(),
    };
  }
}

export const geminiReportAdapter: ReportGenerator = new GeminiReportAdapter();
