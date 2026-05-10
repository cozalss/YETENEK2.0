/**
 * Geçmiş test sessionlarını localStorage'da tutan basit history store.
 *
 * sessionStore.finalize() sonrasında otomatik history'ye eklenir.
 * Profil sayfasında ve /history sayfasında listelenir.
 *
 * KVKK: Sadece cihazda saklanır, sunucuya gönderilmez. Kullanıcı manuel
 * olarak silebilir. Maksimum 50 entry tutulur (eski olanlar düşer).
 */

import type { SessionSummary } from '@/lib/session/store';

const HISTORY_KEY = 'yetenek:history:v1';
const MAX_HISTORY = 50;

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
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: HistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const historyStore = {
  add(session: SessionSummary): HistoryEntry | null {
    if (!session.completedAt) return null;
    const entry: HistoryEntry = {
      id: makeId(),
      session,
      archivedAt: new Date().toISOString(),
    };
    const entries = [entry, ...readAll()].slice(0, MAX_HISTORY);
    writeAll(entries);
    return entry;
  },

  list(): HistoryEntry[] {
    return readAll();
  },

  get(id: string): HistoryEntry | null {
    return readAll().find((e) => e.id === id) ?? null;
  },

  remove(id: string): void {
    writeAll(readAll().filter((e) => e.id !== id));
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(HISTORY_KEY);
  },

  count(): number {
    return readAll().length;
  },
};
