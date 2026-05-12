'use client';

import { BalanceTest } from '@/components/tests/BalanceTest';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function BalancePage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--whistle-cream)', color: 'var(--form-navy)' }}
    >
      <SiteHeader />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-12 md:px-12 md:py-16">
        <header>
          <p
            className="text-xs font-bold tracking-[0.3em] uppercase"
            style={{
              color: 'var(--color-ink-3)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Tek Test · 02
          </p>
          <h1
            className="mt-2 text-3xl font-black md:text-5xl"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Tek Bacak Denge
          </h1>
          <p
            className="mt-3 max-w-2xl leading-relaxed"
            style={{ color: 'var(--color-ink-2)' }}
          >
            Postüral kontrol ölçümü + sol/sağ bacak asimetri tespiti.
            Kalça-omuz yatay salınım analizinden 0-100 skor üretilir, sol-sağ
            farkı %15'i geçerse sakatlanma riski uyarısı çıkar.
          </p>
        </header>

        <BalanceTest />
      </div>
      <SiteFooter />
    </main>
  );
}
