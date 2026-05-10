/**
 * AI Koç chat port arayüzü — streaming text üretimi.
 *
 * Async iterator döner — caller chunk'ları progressive olarak yazar.
 */

import type { Result } from '@/core/types/result';
import type { SessionSummarySchema } from '@/core/schemas/session.schema';
import type { ChatMessage } from '@/core/schemas/chat.schema';

export interface CoachChatRequest {
  readonly session: SessionSummarySchema;
  readonly history: ReadonlyArray<ChatMessage>;
  readonly message: string;
  readonly signal?: AbortSignal;
}

export interface CoachChat {
  /** Stream text chunk'ları yield eder. Hata Result.err olarak geri döner. */
  stream(
    req: CoachChatRequest
  ): Promise<Result<AsyncIterable<string>>>;
}
