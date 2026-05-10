/**
 * Örnek profil seçici — kamera kullanmadan sonuç ekranını inceleme akışı.
 *
 * Persona seç → ResultScreen hazır session ile direkt açılır.
 */

'use client';

import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ResultScreen } from '@/components/result/ResultScreen';
import { PERSONAS } from '@/lib/demo/fixtures';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import type { SessionSummary } from '@/lib/session/store';

export default function DemoPage() {
  const [session, setSession] = useState<SessionSummary | null>(null);

  if (session) {
    return (
      <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
        <SiteHeader />
        <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-12">
            <button
              type="button"
              onClick={() => setSession(null)}
              className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Persona değiştir
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-signal)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-signal)]">
              <Sparkles className="h-3 w-3" />
              Örnek Profil · {session.child.name}
            </span>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-12">
          <ResultScreen session={session} />
        </div>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 pt-12 pb-20 md:px-12 md:pt-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>

        <header className="mt-10 max-w-3xl space-y-5">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Örnek Profiller
          </p>
          <h1 className="text-5xl leading-[0.95] font-bold tracking-tight md:text-7xl">
            Test yapmadan
            <br />
            <span className="text-[var(--color-signal)]">sonucu</span> incele.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--color-ink-2)] md:text-xl">
            Kamera izni vermeden veya testleri tamamlamadan önce sonuç ekranının
            nasıl göründüğünü incele. Üç farklı çocuk profili aynı spor
            eşleştirme mantığıyla hazırlanmış örnek sonuçları gösterir.
          </p>
        </header>

        <section className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PERSONAS.map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => setSession(persona.buildSession())}
              className="group flex flex-col rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 text-left transition-all hover:border-[var(--color-signal)]/60 hover:shadow-[0_15px_40px_-10px_rgba(246,196,83,0.25)] focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] focus-visible:outline-none"
            >
              <div className="text-5xl" aria-hidden="true">
                {persona.emoji}
              </div>
              <h2 className="mt-5 text-2xl font-bold">{persona.name}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-2)]">
                {persona.blurb}
              </p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-signal)] transition-transform group-hover:translate-x-0.5">
                Sonucunu Aç →
              </span>
            </button>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6">
          <p className="text-xs font-semibold tracking-[0.25em] text-amber-300 uppercase">
            Nasıl çalışır?
          </p>
          <p className="mt-3 text-sm leading-relaxed text-amber-100/90">
            Örnek profiller, gerçek test akışında üretilen skor yapısını
            kullanır. Her profil farklı güçlü yönleri öne çıkarır; böylece
            sonuç ekranındaki spor önerisi, risk uyarısı ve AI rapor bölümlerini
            tek bakışta karşılaştırabilirsin.
          </p>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
