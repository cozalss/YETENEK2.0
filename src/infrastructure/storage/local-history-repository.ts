/**
 * LocalStorage-backed HistoryRepository implementation.
 *
 * Mevcut `lib/history/store.ts`'ı sarmalar (re-export değil; clean port
 * arayüzüyle). UI direkt buradan import edebilir; eski `historyStore`
 * import'ları da çalışmaya devam eder.
 */

import type {
  HistoryEntry,
  HistoryRepository,
} from '@/core/ports/history-repository';
import type { SessionSummarySchema } from '@/core/schemas/session.schema';
import { sessionSummarySchema } from '@/core/schemas/session.schema';
import {
  generateHistoryEntryId,
  type HistoryEntryId,
  makeHistoryEntryId,
} from '@/core/types/branded';
import { err, ok, type Result } from '@/core/types/result';
import { logger } from '@/shared/logger/logger';

const STORAGE_KEY = 'yetenek:history:v1';
const MAX_HISTORY = 50;

const log = logger.child('history-repo');

interface RawEntry {
  id: string;
  session: SessionSummarySchema;
  archivedAt: string;
}

function readRaw(): Result<RawEntry[]> {
  if (typeof window === 'undefined') {
    return err({ code: 'storage.unavailable' });
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return ok([]);
    const parsed = JSON.parse(raw) as RawEntry[];
    if (!Array.isArray(parsed)) return ok([]);
    return ok(parsed);
  } catch (cause) {
    log.warn('parse failed', { cause: String(cause) });
    return err({ code: 'storage.parse' });
  }
}

function writeRaw(entries: RawEntry[]): Result<void> {
  if (typeof window === 'undefined') {
    return err({ code: 'storage.unavailable' });
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return ok(undefined);
  } catch (cause) {
    log.warn('write failed', { cause: String(cause) });
    return err({ code: 'storage.quota', cause });
  }
}

function rawToEntry(raw: RawEntry): HistoryEntry | null {
  const parsed = sessionSummarySchema.safeParse(raw.session);
  if (!parsed.success) return null;
  return {
    id: makeHistoryEntryId(raw.id),
    session: parsed.data,
    archivedAt: raw.archivedAt,
  };
}

class LocalHistoryRepository implements HistoryRepository {
  add(session: SessionSummarySchema): Result<HistoryEntry> {
    if (!session.completedAt) {
      return err({
        code: 'session.invalid',
        reason: 'completedAt yok — tamamlanmamış oturum arşivlenemez',
      });
    }
    const id = generateHistoryEntryId();
    const entry: HistoryEntry = {
      id,
      session,
      archivedAt: new Date().toISOString(),
    };

    const current = readRaw();
    if (!current.ok) return current;

    const next = [
      { id: id as string, session, archivedAt: entry.archivedAt },
      ...current.value,
    ].slice(0, MAX_HISTORY);
    const write = writeRaw(next);
    if (!write.ok) return write;
    return ok(entry);
  }

  list(): Result<ReadonlyArray<HistoryEntry>> {
    const raw = readRaw();
    if (!raw.ok) return raw;
    const valid: HistoryEntry[] = [];
    for (const r of raw.value) {
      const e = rawToEntry(r);
      if (e) valid.push(e);
    }
    return ok(valid);
  }

  get(id: HistoryEntryId): Result<HistoryEntry | null> {
    const all = this.list();
    if (!all.ok) return all;
    return ok(all.value.find((e) => e.id === id) ?? null);
  }

  remove(id: HistoryEntryId): Result<void> {
    const raw = readRaw();
    if (!raw.ok) return raw;
    const next = raw.value.filter((r) => r.id !== id);
    return writeRaw(next);
  }

  clear(): Result<void> {
    if (typeof window === 'undefined') {
      return err({ code: 'storage.unavailable' });
    }
    window.localStorage.removeItem(STORAGE_KEY);
    return ok(undefined);
  }

  count(): Result<number> {
    const r = this.list();
    return r.ok ? ok(r.value.length) : r;
  }
}

export const localHistoryRepository: HistoryRepository =
  new LocalHistoryRepository();
