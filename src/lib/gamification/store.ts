/**
 * Gamification persistence — kullanıcının kazandığı rozetler + streak.
 *
 * Storage: localStorage (browser-only). Sayfa yeniden yüklemelerini
 * tolere eder, tarayıcı çerezleri silinirse sıfırlanır.
 *
 * `unlock(badges)`:
 *   - Yeni rozetleri ekler, daha önce kazanılmışları filtreler.
 *   - Yeni rozet sayısını döndürür (UI'da "X yeni rozet" gösterimi için).
 *
 * Streak hesaplama:
 *   - Her test oturumu tamamlandığında `recordSession(date)` çağrılır.
 *   - Son 7 gün içinde kaç farklı gün test yapıldı = current streak window.
 *   - 7+ gün önceki testler streak hesabına dahil değil (haftalık reset).
 */

import type { Badge } from './badges';
import { BADGES } from './badges';

const STORAGE_KEY = 'yetenek:gamification';

interface PersistedState {
  unlockedBadgeIds: string[];
  /** ISO tarih string'leri (sadece YYYY-MM-DD) — test yapılan günler */
  testDates: string[];
}

interface UnlockResult {
  /** Yeni eklenen rozet sayısı (eski hak kazanılanları saymaz) */
  newCount: number;
  /** Yeni rozetlerin kendileri (UI'da reveal animasyonu için) */
  newlyUnlocked: Badge[];
  /** Tüm sahiplenilmiş rozetler (yeni + eski) */
  allUnlocked: Badge[];
}

class GamificationStore {
  private state: PersistedState | null = null;

  private load(): PersistedState {
    if (this.state) return this.state;
    if (typeof window === 'undefined') {
      return { unlockedBadgeIds: [], testDates: [] };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.state = { unlockedBadgeIds: [], testDates: [] };
      return this.state;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as PersistedState).unlockedBadgeIds) &&
        Array.isArray((parsed as PersistedState).testDates)
      ) {
        this.state = parsed as PersistedState;
        return this.state;
      }
    } catch {
      // bozuk veri — sıfırla
    }
    this.state = { unlockedBadgeIds: [], testDates: [] };
    return this.state;
  }

  private save(): void {
    if (typeof window === 'undefined' || !this.state) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  /**
   * Yeni rozetleri kullanıcının cüzdanına ekler.
   * Daha önce kazanılmış olanlar göz ardı edilir.
   */
  unlock(badges: Badge[]): UnlockResult {
    const state = this.load();
    const owned = new Set(state.unlockedBadgeIds);
    const newlyUnlocked: Badge[] = [];

    for (const badge of badges) {
      if (!owned.has(badge.id)) {
        owned.add(badge.id);
        newlyUnlocked.push(badge);
      }
    }

    state.unlockedBadgeIds = Array.from(owned);
    this.save();

    const allUnlocked = state.unlockedBadgeIds
      .map((id) => BADGES[id])
      .filter((b): b is Badge => b !== undefined);

    return {
      newCount: newlyUnlocked.length,
      newlyUnlocked,
      allUnlocked,
    };
  }

  getAllUnlocked(): Badge[] {
    const state = this.load();
    return state.unlockedBadgeIds
      .map((id) => BADGES[id])
      .filter((b): b is Badge => b !== undefined);
  }

  recordSession(date: Date = new Date()): void {
    const state = this.load();
    const isoDate = date.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!state.testDates.includes(isoDate)) {
      state.testDates.push(isoDate);
    }
    this.save();
  }

  /**
   * Şu anki streak: son 14 gün içinde kaç farklı gün test yapıldı.
   * Demo için yeterince granüler ölçüm.
   */
  getCurrentStreak(): { days: number; recentDates: string[] } {
    const state = this.load();
    const now = Date.now();
    const cutoff = now - 14 * 24 * 60 * 60 * 1000; // 14 gün önce
    const recentDates = state.testDates
      .filter((d) => new Date(d).getTime() >= cutoff)
      .sort();
    return { days: recentDates.length, recentDates };
  }

  reset(): void {
    this.state = { unlockedBadgeIds: [], testDates: [] };
    this.save();
  }
}

export const gamificationStore = new GamificationStore();
