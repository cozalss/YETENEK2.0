'use client';

/**
 * Root layout fail-safe — error.tsx'in tutamayacağı durumda devreye girer
 * (örn. layout.tsx'in kendisinde hata varsa). HTML+body wrapper'ı kendisi
 * tutmak zorunda — Next.js 16 kuralı.
 */

import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[global-error.tsx]', error);
    }
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#fff',
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>
          Sistem hatası
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#a3a3a3',
            maxWidth: '420px',
            lineHeight: 1.6,
          }}
        >
          Uygulama beklenmedik bir hatayla karşılaştı. Sayfayı yenile veya
          tekrar dene.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '24px',
            padding: '12px 24px',
            background: '#fbbf24',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: '999px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Tekrar Dene
        </button>
      </body>
    </html>
  );
}
