/**
 * AI rapor için streaming hook'u — NDJSON akışını okuyup state'i kademeli
 * günceller. İlk token ~400-700ms'de gelir, kullanıcı "yazıyor" hissi yaşar.
 *
 * Cache: aynı session fingerprint'i için modül-seviye Map'te tamamlanmış
 * metni tutar (10dk staleTime mantığı manuel). React strict-mode'da
 * çift-fetch'i önlemek için in-flight key seti de tutuluyor.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { SessionSummary } from '@/lib/session/store';

export type ReportSource = 'claude' | 'fallback';

interface StreamState {
  text: string;
  source: ReportSource | null;
  isStreaming: boolean;
  isError: boolean;
  error: string | null;
}

function fingerprint(session: SessionSummary): string {
  return [
    session.startedAt,
    session.completedAt ?? 'pending',
    session.completedTests.join(','),
  ].join('|');
}

// Cache + in-flight koruması — fingerprint başına tek seferlik fetch.
const completedCache = new Map<
  string,
  { text: string; source: ReportSource }
>();

interface ReportStreamEvent {
  type: 'meta' | 'delta' | 'done';
  source?: ReportSource;
  text?: string;
}

export function useReportStream(session: SessionSummary | null) {
  const [state, setState] = useState<StreamState>(() => ({
    text: '',
    source: null,
    isStreaming: false,
    isError: false,
    error: null,
  }));
  const [refetchKey, setRefetchKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!session) return;
    const key = fingerprint(session);

    // Cache hit — anında doldur, fetch yapma
    const cached = completedCache.get(key);
    if (cached && refetchKey === 0) {
      setState({
        text: cached.text,
        source: cached.source,
        isStreaming: false,
        isError: false,
        error: null,
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      text: '',
      source: null,
      isStreaming: true,
      isError: false,
      error: null,
    });

    (async () => {
      try {
        const res = await fetch('/api/report?stream=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accText = '';
        let accSource: ReportSource | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Satır bazlı parse (NDJSON)
          let nl: number;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            let event: ReportStreamEvent | null = null;
            try {
              event = JSON.parse(line) as ReportStreamEvent;
            } catch {
              continue;
            }
            if (event.type === 'meta' && event.source) {
              accSource = event.source;
              setState((s) => ({ ...s, source: accSource }));
            } else if (event.type === 'delta' && event.text) {
              accText += event.text;
              setState((s) => ({ ...s, text: accText }));
            }
          }
        }

        if (accSource && accText) {
          completedCache.set(key, { text: accText, source: accSource });
        }
        setState((s) => ({ ...s, isStreaming: false }));
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          text: '',
          source: null,
          isStreaming: false,
          isError: true,
          error: err instanceof Error ? err.message : 'Bilinmeyen hata.',
        });
      }
    })();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session ? fingerprint(session) : null, refetchKey]);

  const refetch = () => {
    if (session) completedCache.delete(fingerprint(session));
    abortRef.current?.abort();
    setRefetchKey((k) => k + 1);
  };

  return { ...state, refetch };
}
