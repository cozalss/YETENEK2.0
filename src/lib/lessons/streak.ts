/**
 * Streak (seri) sistemi — Duolingo benzeri günlük süreklilik takibi.
 *
 * Kural:
 *   - Çocuk yeni gün başlatınca (önceki tarih = dün) → streak +1
 *   - Aynı gün içinde başka bir ders → streak değişmez (zaten "aktif")
 *   - Bir veya daha fazla gün boşluk → sıfırla, sonra 1'e ayarla
 *
 * Saklama: localStorage, per-child.
 *   yetenek:streak:{childId} → { current, longest, lastDate }
 */

import { computeStreakBadges } from '@/lib/gamification/badges';
import { gamificationStore } from '@/lib/gamification/store';

const STORAGE_PREFIX = 'yetenek:streak:';

export interface StreakState {
  /** Bugün dahil ardışık aktif gün sayısı. */
  current: number;
  /** Hiç ulaşılmış en yüksek seri. */
  longest: number;
  /** Son aktivite tarihi — 'YYYY-MM-DD'. */
  lastDate: string | null;
}

export interface StreakSnapshot extends StreakState {
  /** Bugün streak aktif mi? */
  isActiveToday: boolean;
  /** Bir gün ara verilmiş mi (current artık 0 görünür)? */
  dormant: boolean;
}

const EMPTY_STATE: StreakState = {
  current: 0,
  longest: 0,
  lastDate: null,
};

function storageKey(childId: string): string {
  return `${STORAGE_PREFIX}${childId}`;
}

/** 'YYYY-MM-DD' lokal saat dilimine göre. */
export function getDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readState(childId: string): StreakState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(childId));
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    return {
      current: typeof parsed.current === 'number' ? parsed.current : 0,
      longest: typeof parsed.longest === 'number' ? parsed.longest : 0,
      lastDate: typeof parsed.lastDate === 'string' ? parsed.lastDate : null,
    };
  } catch {
    return EMPTY_STATE;
  }
}

function writeState(childId: string, state: StreakState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(childId), JSON.stringify(state));
  } catch {
    // quota / private mode — sessiz no-op
  }
}

/** İki YYYY-MM-DD tarihi arasındaki gün farkını hesaplar. */
function daysBetween(fromKey: string, toKey: string): number {
  const [y1, m1, d1] = fromKey.split('-').map(Number);
  const [y2, m2, d2] = toKey.split('-').map(Number);
  const from = Date.UTC(y1, m1 - 1, d1);
  const to = Date.UTC(y2, m2 - 1, d2);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * Ders tamamlandığında çağrılır. Aynı gün tekrarlı çağrılırsa state değişmez.
 * Önceki gün ise +1, daha eski ise sıfırla ve 1'e ayarla.
 */
export function recordLessonActivity(
  childId: string,
  date: Date = new Date()
): StreakSnapshot {
  const todayKey = getDateKey(date);
  const state = readState(childId);

  let next: StreakState;
  if (state.lastDate == null) {
    next = { current: 1, longest: 1, lastDate: todayKey };
  } else if (state.lastDate === todayKey) {
    next = {
      ...state,
      longest: Math.max(state.longest, state.current),
    };
  } else {
    const gap = daysBetween(state.lastDate, todayKey);
    if (gap === 1) {
      const incremented = state.current + 1;
      next = {
        current: incremented,
        longest: Math.max(state.longest, incremented),
        lastDate: todayKey,
      };
    } else {
      next = {
        current: 1,
        longest: Math.max(state.longest, 1),
        lastDate: todayKey,
      };
    }
  }

  writeState(childId, next);

  // Streak rozetlerini unlock et — gamificationStore "already-owned"ları yutar
  const streakBadges = computeStreakBadges(next.current);
  if (streakBadges.length > 0) {
    gamificationStore.unlock(streakBadges);
  }

  return {
    ...next,
    isActiveToday: next.lastDate === todayKey,
    dormant: false,
  };
}

/**
 * Pasif okuma — kayıt yapmaz, sadece state'i görsellemek için.
 * lastDate dünden bile eski ise `current` görünürde 0'a düşer (UI'da
 * "sıfırlandı" mesajı için), kalıcı state korunur — bir sonraki ders
 * tamamlamasında recordLessonActivity zaten 1'e set edecek.
 */
export function getStreakSnapshot(
  childId: string,
  date: Date = new Date()
): StreakSnapshot {
  const todayKey = getDateKey(date);
  const state = readState(childId);
  if (state.lastDate == null) {
    return { ...EMPTY_STATE, isActiveToday: false, dormant: false };
  }
  if (state.lastDate === todayKey) {
    return { ...state, isActiveToday: true, dormant: false };
  }
  const gap = daysBetween(state.lastDate, todayKey);
  if (gap === 1) {
    return { ...state, isActiveToday: false, dormant: false };
  }
  return {
    current: 0,
    longest: state.longest,
    lastDate: state.lastDate,
    isActiveToday: false,
    dormant: true,
  };
}

export function clearStreak(childId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(childId));
  } catch {
    // ignored
  }
}
