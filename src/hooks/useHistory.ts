/**
 * `useSyncExternalStore` ile historyStore'a abone olan hook.
 *
 * useEffect + setState pattern'inin double-render'ını ortadan kaldırır:
 * hydration anında doğru snapshot alınır, store değiştikçe React
 * otomatik re-render eder. SSR-safe — server snapshot boş array.
 */

'use client';

import { useSyncExternalStore } from 'react';
import {
  getHistoryServerSnapshot,
  getHistorySnapshot,
  subscribeHistory,
  type HistoryEntry,
} from '@/lib/history/store';

export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getHistoryServerSnapshot,
  );
}
