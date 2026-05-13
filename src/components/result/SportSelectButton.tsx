/**
 * "Bu sporu seç" CTA — tıklayınca enrollment localStorage'a yazılır
 * ve kullanıcı /lessons/[sport] sayfasına yönlendirilir.
 *
 * Server component olan SportRecommendations'tan client-side davranışı
 * ayırmak için ayrı bir bileşen olarak duruyor.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { enrollInSport } from '@/lib/lessons/enrollment';

interface SportSelectButtonProps {
  slug: string;
  sportName: string;
  /** Hangi çocuk için kayıt — enrollment'in per-child olması zorunlu. */
  childId: string;
  isTop?: boolean;
}

export function SportSelectButton({
  slug,
  sportName,
  childId,
  isTop = false,
}: SportSelectButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onSelect = useCallback(() => {
    if (busy) return;
    setBusy(true);
    enrollInSport(childId, slug);
    // Kısa bir görsel onay için ufak gecikme; UI "Kaydedildi" hissini verir.
    setTimeout(() => {
      router.push(`/lessons/${slug}?childId=${encodeURIComponent(childId)}`);
    }, 220);
  }, [busy, router, slug, childId]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${sportName} ile devam et ve dersleri başlat`}
      className="group inline-flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all hover:translate-x-0.5 disabled:cursor-not-allowed disabled:opacity-80"
      disabled={busy}
      style={
        isTop
          ? {
              background: 'var(--form-navy)',
              color: 'var(--whistle-cream)',
              borderColor: 'var(--form-navy)',
            }
          : {
              background: 'var(--color-canvas)',
              color: 'var(--form-navy)',
              borderColor: 'var(--color-line-strong)',
            }
      }
    >
      {busy ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          <span>{sportName} seçildi — yönlendiriliyor…</span>
          <span aria-hidden />
        </>
      ) : (
        <>
          <span>Bu sporu seç ve derslere başla</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}
