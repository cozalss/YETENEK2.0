import Link from 'next/link';
import {
  ArrowRight,
  Activity,
  Scale,
  Zap,
} from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { SiteHeaderServer } from '@/components/layout/SiteHeaderServer';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function TestIndex() {
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeaderServer />
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24">
        <Reveal>
          <p className="eyebrow">Test Bataryası</p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="headline-display mt-4 max-w-3xl text-balance">
            Yedi test. Bir profil.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-6 max-w-2xl text-lg text-[var(--color-ink-2)] leading-relaxed">
            Tam akış 7 boyutlu taramayı sırayla yapar ve AI raporunu üretir.
            Daha kısa başlamak istersen hızlı akışta 3 çekirdek test var.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <FullFlowCallout />
        </Reveal>

        <section className="mt-12">
          <Reveal>
            <p className="eyebrow">Tek Test Dene</p>
          </Reveal>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-2)]">
            Önce sistemi tanımak istersen üç çekirdek testten birini tek başına
            deneyebilirsin. Sonuç kaydedilir ama spor önerisi için tam akışı
            tamamlaman gerekir.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-6">
            <TestCard
              href="/test/jump"
              num="01"
              title="Sıçrama"
              desc="Counter-movement jump · patlayıcı güç. Kalçanın dikey ivmesinden sıçrama yüksekliği."
              span="md:col-span-2"
              icon={Activity}
              accent="amber"
            />
            <TestCard
              href="/test/balance"
              num="02"
              title="Denge"
              desc="Tek bacak postür · sol-sağ asimetri. Sakatlanma riskini erken yakalar."
              span="md:col-span-2"
              icon={Scale}
              accent="emerald"
            />
            <TestCard
              href="/test/reaction"
              num="03"
              title="Refleks"
              desc="Reaksiyon süresi · bilişsel hız. 5 deneme + tutarlılık skoru. Sesli yönlendirme."
              span="md:col-span-2"
              icon={Zap}
              accent="sky"
            />
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}

function FullFlowCallout() {
  return (
    <Link
      href="/test/full"
      className="grain group relative mt-12 block overflow-hidden rounded-3xl border border-[var(--color-signal)]/30 bg-gradient-to-br from-[var(--color-signal)]/15 via-[var(--color-canvas)] to-[var(--color-surface)] p-8 transition-all hover:border-[var(--color-signal)]/60 md:p-12"
    >
      <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow">Önerilen</p>
          <h2 className="headline-display mt-4 text-balance">Tam Akış</h2>
          <p className="mt-4 max-w-2xl text-base text-[var(--color-ink-2)] md:text-lg">
            Profilini gir, 7 testi ardışık yap, AI raporun ve spor önerin
            sonunda otomatik gelsin. Hızlı modda 3 çekirdek testle
            başlayabilirsin.{' '}
            <span className="font-mono text-[var(--color-signal)]">
              ~5 dk
            </span>
          </p>
        </div>
        <div className="inline-flex h-14 items-center gap-3 rounded-full bg-[var(--color-signal)] px-7 text-base font-bold text-[var(--color-canvas)] shadow-[0_8px_30px_-8px_rgba(246,196,83,0.6)] transition-all group-hover:scale-[1.03]">
          Başla
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--color-signal)]/20 blur-3xl" />
    </Link>
  );
}

interface TestCardProps {
  href: string;
  num: string;
  title: string;
  desc: string;
  span: string;
  icon: typeof Activity;
  accent: 'amber' | 'emerald' | 'sky' | 'neutral';
  compact?: boolean;
}

const accentStyles: Record<TestCardProps['accent'], string> = {
  amber: 'group-hover:border-amber-400/60',
  emerald: 'group-hover:border-emerald-400/60',
  sky: 'group-hover:border-sky-400/60',
  neutral: 'group-hover:border-neutral-500',
};

const iconAccentStyles: Record<TestCardProps['accent'], string> = {
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  sky: 'text-sky-400',
  neutral: 'text-[var(--color-ink-3)]',
};

function TestCard({
  href,
  num,
  title,
  desc,
  span,
  icon: Icon,
  accent,
  compact = false,
}: TestCardProps) {
  return (
    <Link
      href={href}
      className={`group block rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-7 transition-all ${accentStyles[accent]} ${span}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-[var(--color-ink-3)]">
          {num}
        </span>
        <Icon className={`h-6 w-6 ${iconAccentStyles[accent]}`} />
      </div>
      <h3
        className={`mt-${compact ? '4' : '6'} text-${compact ? 'xl' : '2xl'} font-bold text-[var(--color-ink-1)] md:text-${compact ? '2xl' : '3xl'}`}
      >
        {title}
      </h3>
      <p
        className={`mt-2 text-sm text-[var(--color-ink-2)] leading-relaxed ${compact ? '' : 'md:text-base'}`}
      >
        {desc}
      </p>
      <div className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[var(--color-signal)] opacity-0 transition-opacity group-hover:opacity-100">
        Başla <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
