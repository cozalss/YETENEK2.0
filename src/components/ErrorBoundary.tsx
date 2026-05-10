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
          className="mx-auto my-12 max-w-2xl space-y-4 rounded-2xl border border-red-800 bg-red-950/30 p-8 text-center"
        >
          <h2 className="text-xl font-bold text-red-300">
            Beklenmedik bir hata oluştu
          </h2>
          <p className="text-sm text-red-200">
            Test sırasında bir sorun çıktı. Tekrar denemek için butona bas.
            Sorun devam ederse sayfayı yenile.
          </p>
          {this.state.error?.message && (
            <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-left text-xs text-red-200/80">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.reset}
            className="h-11 rounded-full bg-amber-400 px-6 font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
          >
            Tekrar Dene
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
