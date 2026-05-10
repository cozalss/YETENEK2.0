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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-center text-white">
      <div className="max-w-md space-y-4">
        <p className="text-xs uppercase tracking-widest text-amber-300">
          Bir aksilik oldu
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Sayfa yüklenirken bir sorun çıktı
        </h1>
        <p className="text-sm leading-relaxed text-neutral-300">
          Üzgünüz, beklenmeyen bir hata oluştu. Tekrar denemek için aşağıdaki
          butona basabilir veya ana sayfaya dönebilirsin.
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-neutral-500">
            ref: {error.digest}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
        >
          Tekrar Dene
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          Ana Sayfa
        </Link>
      </div>
    </main>
  );
}
