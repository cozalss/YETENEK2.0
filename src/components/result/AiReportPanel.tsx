/**
 * Veliye AI raporu paneli — TanStack Query ile rapor üretimi.
 *
 * State akışı (TanStack Query'den türetilir):
 *   - idle/loading: skeleton placeholder + "AI raporu hazırlanıyor…"
 *   - success: rapor metni + kaynak rozeti (Gemini / Fallback)
 *   - error: hata mesajı + "Tekrar Dene" butonu (refetch)
 *
 * Cache: useReportQuery.staleTime = 10 dk → aynı session navigation'da
 * yeniden fetch yapmaz.
 */

'use client';

import { useReportQuery } from '@/hooks/use-report-query';
import type { SessionSummary } from '@/lib/session/store';

interface Props {
  session: SessionSummary;
  /**
   * Önceden hazırlanmış rapor metni varsa API çağrısı yapma, direkt göster.
   * Örnek sonuçlarda ve yedek rapor senaryolarında kullanılır.
   */
  initialReport?: string;
  initialSource?: 'gemini' | 'fallback';
}

export function AiReportPanel({
  session,
  initialReport,
  initialSource = 'fallback',
}: Props) {
  // initialReport varsa hook'u disable et (gereksiz network).
  const enabled = !initialReport;
  const { data, isLoading, isError, error, refetch, isFetching } =
    useReportQuery(enabled ? session : null);

  if (initialReport) {
    return (
      <ReportContainer source={initialSource}>
        <ReportText text={initialReport} />
      </ReportContainer>
    );
  }

  if (isLoading || (!data && !isError)) {
    return (
      <ReportContainer source={null} loading>
        <Skeleton />
      </ReportContainer>
    );
  }

  if (isError || !data) {
    return (
      <ReportContainer source={null}>
        <div className="space-y-3">
          <p className="text-sm text-red-300">
            Rapor üretilemedi:{' '}
            {error instanceof Error ? error.message : 'Beklenmedik hata.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 rounded-full bg-amber-400 px-4 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none disabled:opacity-50"
          >
            {isFetching ? 'Deneniyor…' : 'Tekrar Dene'}
          </button>
        </div>
      </ReportContainer>
    );
  }

  return (
    <ReportContainer source={data.source}>
      <ReportText text={data.report} />
    </ReportContainer>
  );
}

function ReportContainer({
  children,
  source,
  loading = false,
}: {
  children: React.ReactNode;
  source: 'gemini' | 'fallback' | null;
  loading?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-amber-400 uppercase">
          Veliye AI Raporu
        </h3>
        {loading && (
          <span className="text-xs text-neutral-300">Hazırlanıyor…</span>
        )}
        {source === 'gemini' && (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
            Gemini AI
          </span>
        )}
        {source === 'fallback' && (
          <span className="rounded-full bg-neutral-700/50 px-2.5 py-0.5 text-xs font-medium text-neutral-200">
            Şablon
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function ReportText({ text }: { text: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-neutral-200">
      {text}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-800" />
      <div className="h-4 w-full animate-pulse rounded bg-neutral-800" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-800" />
      <div className="h-4 w-4/6 animate-pulse rounded bg-neutral-800" />
    </div>
  );
}
