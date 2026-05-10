'use client';

import { BalanceTest } from '@/components/tests/BalanceTest';

export default function BalancePage() {
  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-white md:p-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase">
            Yetenek 2.0 · Test 2
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">
            Tek Bacak Denge
          </h1>
          <p className="mt-3 max-w-2xl text-neutral-400">
            Postüral kontrol ölçümü + sol/sağ bacak asimetri tespiti.
            Kalça-omuz yatay salınım analizinden 0-100 skor üretilir, sol-sağ
            farkı %15'i geçerse sakatlanma riski uyarısı çıkar.
          </p>
        </header>

        <BalanceTest />
      </div>
    </main>
  );
}
