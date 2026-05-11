/**
 * Geçmiş test sessionlarını localStorage'da tutan history store.
 *
 * sessionStore.finalize() sonrasında otomatik history'ye eklenir.
 * Profil sayfasında ve /history sayfasında listelenir.
 *
 * KVKK: Sadece cihazda saklanır, sunucuya gönderilmez. Kullanıcı manuel
 * olarak silebilir. Maksimum 50 entry tutulur (eski olanlar düşer).
 *
 * Hata yönetimi: Tüm I/O hataları (JSON parse, localStorage quota) shared
 * logger'a `warn` seviyesinde düşer. Silent swallow yapmıyoruz — demo
 * sırasında "history boş gözüküyor ama veri vardı" gibi sessiz fail'leri
 * kullanıcıya bildirmek için `add()` artık `HistoryEntry | null` döner.
 */

import type { SessionSummary } from '@/lib/session/store';
import { logger } from '@/shared/logger/logger';

const HISTORY_KEY = 'yetenek:history:v1';
const MAX_HISTORY = 50;

const log = logger.child('history-store');

export interface HistoryEntry {
  id: string;
  session: SessionSummary;
  archivedAt: string;
}

function readAll(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      log.warn('history payload array değil', { typeofParsed: typeof parsed });
      return [];
    }
    return parsed as HistoryEntry[];
  } catch (err) {
    log.warn('history parse hatası, boş döndü', {
      cause: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

function writeAll(entries: HistoryEntry[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    return true;
  } catch (err) {
    // QuotaExceededError, private-mode storage block vb. — gizli kalmamalı.
    log.warn('history yazma başarısız (quota?)', {
      cause: err instanceof Error ? err.message : String(err),
      count: entries.length,
    });
    return false;
  }
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ───────── Subscribe API — useSyncExternalStore için ───────── */

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

/** React `useSyncExternalStore` subscribe handle'ı. */
export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Snapshot — same-array kararlılığı için cache. localStorage değişmediği
 * sürece her okumada aynı reference döner; React shallow compare bunu
 * "değişmedi" olarak görür ve re-render etmez.
 */
let cachedSnapshot: HistoryEntry[] | null = null;

function readSnapshot(): HistoryEntry[] {
  if (cachedSnapshot) return cachedSnapshot;
  cachedSnapshot = readAll();
  return cachedSnapshot;
}

function invalidate(): void {
  cachedSnapshot = null;
  notify();
}

/** SSR fallback (window yok) için boş array. */
const SSR_SNAPSHOT: HistoryEntry[] = [];

export function getHistorySnapshot(): HistoryEntry[] {
  if (typeof window === 'undefined') return SSR_SNAPSHOT;
  return readSnapshot();
}

export function getHistoryServerSnapshot(): HistoryEntry[] {
  return SSR_SNAPSHOT;
}

export const historyStore = {
  /**
   * Session'ı history'ye ekler. `null` döner: ya completedAt yok, ya da
   * localStorage yazımı başarısız oldu — caller UI'a bildirebilir.
   */
  add(session: SessionSummary): HistoryEntry | null {
    if (!session.completedAt) return null;
    const entry: HistoryEntry = {
      id: makeId(),
      session,
      archivedAt: new Date().toISOString(),
    };
    const entries = [entry, ...readAll()].slice(0, MAX_HISTORY);
    const ok = writeAll(entries);
    if (ok) invalidate();
    return ok ? entry : null;
  },

  list(): HistoryEntry[] {
    return readAll();
  },

  get(id: string): HistoryEntry | null {
    return readAll().find((e) => e.id === id) ?? null;
  },

  remove(id: string): void {
    writeAll(readAll().filter((e) => e.id !== id));
    invalidate();
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(HISTORY_KEY);
      invalidate();
    } catch (err) {
      log.warn('history clear başarısız', {
        cause: err instanceof Error ? err.message : String(err),
      });
    }
  },

  count(): number {
    return readAll().length;
  },
};
