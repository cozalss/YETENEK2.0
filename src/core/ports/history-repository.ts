/**
 * History repository port — tamamlanmış oturumların listesi.
 *
 * Adapter'lar:
 *   - LocalStorageHistoryRepository (varsayılan, max 50 entry)
 *   - SupabaseHistoryRepository (cloud sync, gelecekte)
 *   - InMemoryHistoryRepository (testler)
 */

import type { Result } from '@/core/types/result';
import type { HistoryEntryId } from '@/core/types/branded';
import type { SessionSummarySchema } from '@/core/schemas/session.schema';

export interface HistoryEntry {
  readonly id: HistoryEntryId;
  readonly session: SessionSummarySchema;
  readonly archivedAt: string;
}

export interface HistoryRepository {
  /** Yeni entry ekle (eski sona düşer). */
  add(session: SessionSummarySchema): Result<HistoryEntry>;
  /** Tüm entry'leri en yeniden eskiye sıralı dön. */
  list(): Result<ReadonlyArray<HistoryEntry>>;
  /** Tek entry'yi getir. */
  get(id: HistoryEntryId): Result<HistoryEntry | null>;
  /** Tek entry'yi sil. */
  remove(id: HistoryEntryId): Result<void>;
  /** Tüm geçmişi sil. */
  clear(): Result<void>;
  /** Toplam entry sayısı. */
  count(): Result<number>;
}
