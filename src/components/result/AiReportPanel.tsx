/**
 * Veliye AI raporu paneli — TanStack Query ile rapor üretimi.
 *
 * State akışı (TanStack Query'den türetilir):
 *   - idle/loading: skeleton placeholder + "AI raporu hazırlanıyor…"
 *   - success: rapor metni + kaynak rozeti (Claude / Fallback)
 *   - error: hata mesajı + "Tekrar Dene" butonu (refetch)
 *
 * Cache: useReportQuery.staleTime = 10 dk → aynı session navigation'da
 * yeniden fetch yapmaz.
 */

'use client';

import { useReportStream } from '@/hooks/use-report-stream';
import type { SessionSummary } from '@/lib/session/store';

interface Props {
  session: SessionSummary;
  /**
   * Önceden hazırlanmış rapor metni varsa API çağrısı yapma, direkt göster.
   * Örnek sonuçlarda ve yedek rapor senaryolarında kullanılır.
   */
  initialReport?: string;
  initialSource?: 'claude' | 'fallback';
}

export function AiReportPanel({
  session,
  initialReport,
  initialSource = 'fallback',
}: Props) {
  // initialReport varsa hook'u disable et (gereksiz network).
  const enabled = !initialReport;
  const { text, source, isStreaming, isError, error, refetch } =
    useReportStream(enabled ? session : null);

  if (initialReport) {
    return (
      <ReportContainer source={initialSource}>
        <ReportText text={initialReport} />
      </ReportContainer>
    );
  }

  // Henüz hiç token gelmediyse skeleton; ilk parça gelir gelmez metni göster
  if (isStreaming && text.length === 0) {
    return (
      <ReportContainer source={null} loading>
        <Skeleton />
      </ReportContainer>
    );
  }

  if (isError) {
    return (
      <ReportContainer source={null}>
        <div className="space-y-3">
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--deep-navy)' }}
          >
            Rapor üretilemedi: {error ?? 'Beklenmedik hata.'}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="h-10 rounded-full px-4 text-sm font-black tracking-wide transition-transform hover:scale-[1.03]"
            style={{
              background: 'var(--track-mustard)',
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 4px 0 rgba(44, 62, 107, 0.18)',
            }}
          >
            Tekrar Dene
          </button>
        </div>
      </ReportContainer>
    );
  }

  return (
    <ReportContainer source={source} loading={isStreaming}>
      <ReportText text={text} typing={isStreaming} />
    </ReportContainer>
  );
}

function ReportContainer({
  children,
  source,
  loading = false,
}: {
  children: React.ReactNode;
  source: 'claude' | 'fallback' | null;
  loading?: boolean;
}) {
  return (
    <section
      className="rounded-3xl border-2 p-6"
      style={{
        background: 'var(--color-surface-elevated)',
        borderColor: 'var(--color-line)',
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3
          className="text-xs font-bold tracking-[0.25em] uppercase"
          style={{
            color: 'var(--color-ink-3)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Veliye AI Raporu
        </h3>
        {loading && (
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-ink-3)' }}
          >
            Hazırlanıyor…
          </span>
        )}
        {source === 'claude' && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide"
            style={{
              background: 'var(--field-mint)',
              color: 'var(--form-navy)',
            }}
          >
            Claude AI
          </span>
        )}
        {source === 'fallback' && (
          <span
            className="rounded-full border px-2.5 py-0.5 text-xs font-bold"
            style={{
              borderColor: 'var(--color-line-strong)',
              background: 'var(--color-canvas)',
              color: 'var(--color-ink-2)',
            }}
          >
            Şablon
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function ReportText({
  text,
  typing = false,
}: {
  text: string;
  typing?: boolean;
}) {
  return (
    <div
      className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap"
      style={{ color: 'var(--color-ink-1)' }}
    >
      {text}
      {typing && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block animate-pulse"
          style={{ color: 'var(--track-mustard)' }}
        >
          ▍
        </span>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-line-strong)]" />
      <div className="h-4 w-full animate-pulse rounded bg-[var(--color-line-strong)]" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--color-line-strong)]" />
      <div className="h-4 w-4/6 animate-pulse rounded bg-[var(--color-line-strong)]" />
    </div>
  );
}
