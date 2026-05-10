/**
 * PDF İndirme Butonu — client-only.
 *
 * @react-pdf/renderer 'use client' altında çalışır.
 */

'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { useMemo, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import type { SessionSummary } from '@/lib/session/store';
import type { Badge } from '@/lib/gamification/badges';
import { PdfReportDocument } from './PdfReport';

interface Props {
  session: SessionSummary;
  badges: Badge[];
  aiReport?: string | null;
}

export function PdfExportButton({ session, badges, aiReport }: Props) {
  const [loading, setLoading] = useState(false);
  const filename = useMemo(
    () =>
      `Yetenek-Profili-${session.child.name}-${new Date().toISOString().slice(0, 10)}.pdf`,
    [session.child.name]
  );

  const document = useMemo(
    () => (
      <PdfReportDocument
        session={session}
        badges={badges}
        aiReport={aiReport}
      />
    ),
    [session, badges, aiReport]
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
        Tüm test sonuçları, spor önerileri ve AI değerlendirmesini PDF olarak kaydet.
      </p>

      <div className="mt-5">
        <PDFDownloadLink document={document} fileName={filename}>
          {({ loading: pdfLoading }) => (
            <button
              type="button"
              onClick={() => setLoading(true)}
              disabled={pdfLoading || loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-signal)] px-6 text-sm font-bold text-[var(--color-canvas)] transition-all hover:scale-[1.02] hover:bg-amber-300 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-signal)]"
            >
              {pdfLoading || loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {pdfLoading || loading ? 'PDF Hazırlanıyor…' : 'PDF Olarak İndir'}
            </button>
          )}
        </PDFDownloadLink>
      </div>

      <p className="mt-3 text-[10px] text-[var(--color-ink-3)]">
        PDF cihazınıza indirilir; sunucuya yüklenmez. Kişisel verileriniz güvende.
      </p>
    </div>
  );
}
