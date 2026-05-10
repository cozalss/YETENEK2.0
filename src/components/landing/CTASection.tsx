'use client';

import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { LazyVideo } from './LazyVideo';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section
      id="enroll"
      className="lp-section section-padding relative overflow-hidden"
      style={{ minHeight: '100vh' }}
    >
      <LazyVideo
        src="/videos/form-floor.mp4"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(26, 37, 64, 0.78)' }}
      />

      <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-[1280px] flex-col items-center justify-center px-6 lg:px-10">
        <Reveal>
          <div className="mb-12 text-center">
            <p
              className="mb-4 text-xs uppercase tracking-[0.4em]"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.5,
                fontFamily: 'var(--font-body)',
              }}
            >
              05 — Başla
            </p>
            <h2
              className="text-4xl font-black tracking-tight md:text-6xl"
              style={{
                color: 'var(--whistle-cream)',
                fontFamily: 'var(--font-display)',
                textShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              TESTE BAŞLA
            </h2>
            <div
              className="mx-auto mt-4 h-[3px] w-16"
              style={{ background: 'var(--track-mustard)' }}
            />
            <p
              className="mx-auto mt-6 max-w-md text-sm leading-relaxed"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.85,
                fontFamily: 'var(--font-body)',
              }}
            >
              Çocuğunuzu AI destekli yetenek taramamızla buluşturun. 5 dakika,
              tek bir telefon, hassas sonuç.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div
            className="w-full max-w-md rounded-2xl p-8 text-center md:p-10"
            style={{
              background: 'rgba(255, 245, 225, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '2px solid rgba(44, 62, 107, 0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <p
              className="mb-2 text-[10px] uppercase tracking-[0.3em]"
              style={{
                color: 'var(--form-navy)',
                opacity: 0.6,
                fontFamily: 'var(--font-body)',
              }}
            >
              5 Dakika · 7 Boyut · Tek Telefon
            </p>
            <h3
              className="text-2xl font-black"
              style={{
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              YETENEĞİNİ KEŞFET
            </h3>
            <div
              className="mx-auto mt-3 h-[2px] w-12"
              style={{ background: 'var(--track-mustard)' }}
            />
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{
                color: 'var(--form-navy)',
                opacity: 0.75,
                fontFamily: 'var(--font-body)',
              }}
            >
              Cebindeki telefon profesyonel bir spor laboratuvarına dönüşür.
              Donanım yok. Klinik yok. Randevu yok.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/test/full"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-black uppercase tracking-[0.25em] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'var(--form-navy)',
                  color: 'var(--whistle-cream)',
                  fontFamily: 'var(--font-display)',
                  boxShadow:
                    '0 6px 0 var(--deep-navy), 0 8px 20px rgba(0,0,0,0.2)',
                }}
              >
                Tam Akış
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/test/full?mode=quick"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-2 px-6 text-xs font-bold uppercase tracking-[0.25em] transition-colors hover:bg-[rgba(44,62,107,0.05)]"
                style={{
                  borderColor: 'rgba(44, 62, 107, 0.3)',
                  color: 'var(--form-navy)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Hızlı Akış (3 dk)
              </Link>
              <Link
                href="/result/demo"
                className="mt-1 text-[11px] tracking-[0.25em] uppercase transition-opacity hover:opacity-70"
                style={{
                  color: 'var(--form-navy)',
                  opacity: 0.5,
                  fontFamily: 'var(--font-body)',
                }}
              >
                veya örnek sonucu incele →
              </Link>
            </div>

            <p
              className="mt-6 text-center text-[10px] tracking-wider"
              style={{
                color: 'var(--form-navy)',
                opacity: 0.4,
                fontFamily: 'var(--font-body)',
              }}
            >
              Veri cihazda işlenir. Video sunucuya gitmez.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
