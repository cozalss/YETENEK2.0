/**
 * TanStack Query ile rapor üretimi — eski `useReport` hook'unun yerini alır.
 *
 * Avantaj:
 *   - In-memory cache (aynı session için tekrar fetch yok)
 *   - Auto retry strategisi config'lenmiş
 *   - Suspense uyumlu
 *   - Background refetch isteğe bağlı
 *
 * queryKey factory pattern: ['report', sessionFingerprint] — session
 * değişimini fingerprint ile yakalar (object referans karşılaştırması yerine).
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { SessionSummary } from '@/lib/session/store';

export type ReportSource = 'claude' | 'fallback';

export interface ReportData {
  report: string;
  source: ReportSource;
}

/** Session'ın stable fingerprint'i — cache key. */
function fingerprint(session: SessionSummary): string {
  const parts = [
    session.startedAt,
    session.completedAt ?? 'pending',
    session.completedTests.join(','),
  ];
  return parts.join('|');
}

async function fetchReport(
  session: SessionSummary,
  signal?: AbortSignal
): Promise<ReportData> {
  const res = await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session }),
    signal,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as ReportData;
}

export const reportQueryKeys = {
  all: ['report'] as const,
  bySession: (session: SessionSummary) =>
    [...reportQueryKeys.all, fingerprint(session)] as const,
};

export function useReportQuery(session: SessionSummary | null) {
  return useQuery({
    queryKey: session
      ? reportQueryKeys.bySession(session)
      : ['report', 'idle'],
    queryFn: ({ signal }) => {
      // `enabled: !!session` queryFn'in çalışmasını engellesin diye var,
      // ama TanStack Query session'ı queryFn parameter'ına narrow etmiyor.
      // Manuel refetch() veya enabled kaldırılırsa session null olabilir;
      // bu yüzden defensive guard — silent null deref yerine açık hata.
      if (!session) {
        return Promise.reject(
          new Error('useReportQuery: session gerekli ama null'),
        );
      }
      return fetchReport(session, signal);
    },
    enabled: !!session,
    // Rapor üretimi pahalı — bir kez al, 10 dk cache'te tut.
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
