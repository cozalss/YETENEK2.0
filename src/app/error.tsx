'use client';

/**
 * Route segment error boundary — App Router'ın yakalayamadığı client/server
 * hataları yakalar. KVKK kapsamında kullanıcıya generic mesaj gösteriyoruz;
 * stack trace'i sadece dev'de console'a yazıyoruz.
 *
 * Kamera veya model yükleme hatası burada kullanıcı dostu kapanır.
 */

import Link from 'next/link';
import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[error.tsx] yakalandı:', error);
    }
  }, [error]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
      style={{
        background: 'var(--whistle-cream)',
        color: 'var(--form-navy)',
      }}
    >
      <div className="max-w-md space-y-4">
        <p
          className="text-xs uppercase tracking-widest"
          style={{
            color: 'var(--track-mustard)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Bir aksilik oldu
        </p>
        <h1
          className="text-2xl font-bold sm:text-3xl"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Sayfa yüklenirken bir sorun çıktı
        </h1>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--form-navy)', opacity: 0.7 }}
        >
          Üzgünüz, beklenmeyen bir hata oluştu. Tekrar denemek için aşağıdaki
          butona basabilir veya ana sayfaya dönebilirsin.
        </p>
        {error.digest && (
          <p
            className="font-mono text-[10px]"
            style={{ color: 'var(--form-navy)', opacity: 0.5 }}
          >
            ref: {error.digest}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="rounded-full px-6 py-3 text-sm font-bold transition-transform hover:scale-[1.02] focus-visible:outline-none"
          style={{
            background: 'var(--track-mustard)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Tekrar Dene
        </button>
        <Link
          href="/"
          className="rounded-full border-2 px-6 py-3 text-sm font-bold transition-colors hover:bg-neutral-50 focus-visible:outline-none"
          style={{
            borderColor: 'var(--form-navy)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Ana Sayfa
        </Link>
      </div>
    </main>
  );
}
