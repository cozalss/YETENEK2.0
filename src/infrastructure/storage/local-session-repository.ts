/**
 * LocalStorage-backed SessionRepository implementation.
 *
 * - Tek aktif session tutar (yerel cache + persist).
 * - 4h TTL: paylaşılan cihazlarda (okul tablet vb) eski oturum otomatik silinir.
 * - Result-typed API; throw etmez.
 *
 * Domain entity'sini `core/domain/session.ts` sunar; bu dosya sadece
 * IO işini yapar.
 */

import type { SessionRepository } from '@/core/ports/session-repository';
import type { Session, ChildIdentity } from '@/core/domain/session';
import { emptySession } from '@/core/domain/session';
import { sessionSummarySchema } from '@/core/schemas/session.schema';
import { err, ok, type Result } from '@/core/types/result';
import { logger } from '@/shared/logger/logger';

const STORAGE_KEY = 'yetenek:current-session';
// KVKK: paylaşılan cihazlarda çocuk verisi süresiz kalmasın.
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

const log = logger.child('session-repo');

class LocalSessionRepository implements SessionRepository {
  /** In-memory cache — frequent localStorage round-trip'leri önler. */
  private cache: Session | null = null;

  start(child: ChildIdentity): Result<Session> {
    const session = emptySession(child);
    this.cache = session;
    const persisted = this.persist(session);
    if (!persisted.ok) return persisted;
    return ok(session);
  }

  current(): Result<Session | null> {
    if (this.cache) return ok(this.cache);
    if (typeof window === 'undefined') {
      // SSR'de empty — error değil.
      return ok(null);
    }
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (cause) {
      return err({ code: 'storage.unavailable', cause });
    }
    if (!raw) return ok(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      log.warn('json parse failed, clearing');
      this.unsafeRemove();
      return ok(null);
    }

    // KVKK TTL kontrolü ham veride — schema parse'ından önce.
    const startedAt =
      typeof (parsed as { startedAt?: unknown })?.startedAt === 'string'
        ? Date.parse((parsed as { startedAt: string }).startedAt)
        : NaN;
    if (Number.isFinite(startedAt) && Date.now() - startedAt > SESSION_TTL_MS) {
      log.info('session ttl expired, clearing');
      this.unsafeRemove();
      return ok(null);
    }

    // Geriye dönük uyumluluk: completedTests yoksa boş array doldur.
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray((parsed as Record<string, unknown>).completedTests)
    ) {
      (parsed as Record<string, unknown>).completedTests = [];
    }

    const validated = sessionSummarySchema.safeParse(parsed);
    if (!validated.success) {
      log.warn('schema validation failed', {
        issues: validated.error.issues.length,
      });
      // Bozuk veri — sessize temizle, yenisi başlatılsın.
      this.unsafeRemove();
      return ok(null);
    }
    this.cache = validated.data;
    return ok(this.cache);
  }

  update(patch: Partial<Session>): Result<Session> {
    const cur = this.current();
    if (!cur.ok) return cur;
    if (!cur.value) {
      return err({
        code: 'session.invalid',
        reason: 'aktif session yok',
      });
    }
    const merged: Session = { ...cur.value, ...patch };
    this.cache = merged;
    const persisted = this.persist(merged);
    if (!persisted.ok) return persisted;
    return ok(merged);
  }

  clear(): Result<void> {
    this.cache = null;
    this.unsafeRemove();
    return ok(undefined);
  }

  private persist(session: Session): Result<void> {
    if (typeof window === 'undefined') return ok(undefined);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return ok(undefined);
    } catch (cause) {
      log.warn('persist failed', { cause: String(cause) });
      return err({ code: 'storage.quota', cause });
    }
  }

  private unsafeRemove(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const localSessionRepository: SessionRepository =
  new LocalSessionRepository();
