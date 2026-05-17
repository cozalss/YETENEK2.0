/**
 * PDF İndirme Butonu — client-only, tamamen lazy.
 *
 * @react-pdf/renderer (~180 KB gzip) sadece kullanıcı "Paylaş & Devam"
 * tabına geçtiğinde yüklenir. ResultScreen bileşeni bu bileşeni zaten
 * next/dynamic ile sarıyor; burada ek olarak PDFDownloadLink ve
 * PdfReportDocument'ı dinamik import ile gerektiğinde çekiyoruz.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SessionSummary } from '@/lib/session/store';
import type { Badge } from '@/lib/gamification/badges';

interface Props {
  session: SessionSummary;
  badges: Badge[];
  aiReport?: string | null;
}

// Lazy-loaded PDF modülleri — ilk render'da yüklenmez.
type PdfMod = typeof import('@react-pdf/renderer');
type PdfReportMod = typeof import('./PdfReport');

export function PdfExportButton({ session, badges, aiReport }: Props) {
  const [pdfMods, setPdfMods] = useState<{
    PDFDownloadLink: PdfMod['PDFDownloadLink'];
    PdfReportDocument: PdfReportMod['PdfReportDocument'];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const loadStarted = useRef(false);

  // Modülleri component mount olduğunda arka planda yükle.
  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    Promise.all([import('@react-pdf/renderer'), import('./PdfReport')]).then(
      ([pdfRenderer, pdfReport]) => {
        setPdfMods({
          PDFDownloadLink: pdfRenderer.PDFDownloadLink,
          PdfReportDocument: pdfReport.PdfReportDocument,
        });
      }
    );
  }, []);

  const filename = useMemo(
    () =>
      `Yetenek-Profili-${session.child.name}-${new Date().toISOString().slice(0, 10)}.pdf`,
    [session.child.name]
  );

  return (
    <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
      <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
        PDF
      </p>
      <h3 className="mt-2 text-xl font-bold text-[var(--color-ink-1)] md:text-2xl">
        Raporu İndir
      </h3>
      <p className="mt-2 text-sm text-[var(--color-ink-2)]">
        Tüm test sonuçları, spor önerileri ve AI değerlendirmesini PDF olarak
        kaydet.
      </p>

      <div className="mt-5">
        {pdfMods ? (
          <pdfMods.PDFDownloadLink
            document={
              <pdfMods.PdfReportDocument
                session={session}
                badges={badges}
                aiReport={aiReport}
              />
            }
            fileName={filename}
          >
            {({ loading: pdfLoading }) => (
              <PdfButton
                busy={pdfLoading || loading}
                onClickStart={() => setLoading(true)}
              />
            )}
          </pdfMods.PDFDownloadLink>
        ) : (
          <PdfButton busy loading />
        )}
      </div>

      <p className="mt-3 text-[10px] text-[var(--color-ink-3)]">
        PDF cihazınıza indirilir; sunucuya yüklenmez. Kişisel verileriniz
        güvende.
      </p>
    </div>
  );
}

function PdfButton({
  busy,
  loading,
  onClickStart,
}: {
  busy: boolean;
  loading?: boolean;
  onClickStart?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClickStart}
      disabled={busy}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-signal)] px-6 text-sm font-bold text-[var(--color-canvas)] transition-all hover:scale-[1.02] hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-signal)] disabled:opacity-60"
    >
      {busy || loading ? (
        <>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          PDF Hazırlanıyor…
        </>
      ) : (
        <>
          <DownloadIcon />
          PDF Olarak İndir
        </>
      )}
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
