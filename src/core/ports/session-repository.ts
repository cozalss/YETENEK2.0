/**
 * Session repository port — aktif test session'ı için tek-doğruluk-kaynağı.
 *
 * Adapter'lar:
 *   - LocalStorageSessionRepository (varsayılan, browser)
 *   - SupabaseSessionRepository (gelecekte cloud sync)
 *   - InMemorySessionRepository (testler için)
 *
 * KVKK: 4 saat TTL kontrolü `current()` çağrısında uygulanır.
 */

import type { Result } from '@/core/types/result';
import type { SessionSummarySchema } from '@/core/schemas/session.schema';

export interface SessionRepository {
  /** Yeni session başlat — eskisini overwrite eder. */
  start(child: SessionSummarySchema['child']): Result<SessionSummarySchema>;
  /** Aktif session'ı oku. TTL geçmişse otomatik temizlenir. */
  current(): Result<SessionSummarySchema | null>;
  /** Session'ı kısmen güncelle. Mutasyon yok — yeni snapshot yazılır. */
  update(
    patch: Partial<SessionSummarySchema>
  ): Result<SessionSummarySchema>;
  /** Aktif session'ı sil. */
  clear(): Result<void>;
}
