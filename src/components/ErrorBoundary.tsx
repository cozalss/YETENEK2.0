/**
 * React Error Boundary.
 *
 * Test akışı sırasında beklenmedik bir component crash olursa
 * bunu layout seviyesinde yakalar.
 * Mesaj kullanıcı dostu Türkçe, "Tekrar Dene" butonu ile reset.
 */

'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Production'da bunu Sentry/LogRocket'e göndereceğiz; şimdilik konsol.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          className="mx-auto my-12 max-w-2xl space-y-4 rounded-2xl border-2 p-8 text-center"
          style={{
            background: 'rgba(244, 182, 194, 0.22)',
            borderColor: 'var(--mindar-pink)',
          }}
        >
          <h2
            className="text-xl font-black"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Beklenmedik bir hata oluştu
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-ink-2)' }}
          >
            Test sırasında bir sorun çıktı. Tekrar denemek için butona bas.
            Sorun devam ederse sayfayı yenile.
          </p>
          {this.state.error?.message && (
            <pre
              className="overflow-x-auto rounded-lg p-3 text-left text-xs"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                color: 'var(--color-ink-2)',
                border: '1px solid rgba(244, 182, 194, 0.5)',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.reset}
            className="h-11 rounded-full px-6 text-sm font-black tracking-wide transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
      );
    }

    return this.props.children;
  }
}
