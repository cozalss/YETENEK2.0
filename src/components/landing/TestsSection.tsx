'use client';

import { Reveal } from '@/components/motion/Reveal';
import { LazyVideo } from './LazyVideo';

const TESTS = [
  {
    id: 'cmj',
    title: 'CMJ',
    subtitle: 'Countermovement Jump',
    description:
      'Patlayıcı bacak gücünü ve dikey sıçrama yüksekliğini ters hareket dinamiğiyle ölçer.',
    video: '/videos/test-cmj.mp4',
    poster: '/images/test-cmj-poster.jpg',
    color: '#F4B6C2',
    metric: '24.3 cm',
    metricLabel: 'Ortalama sıçrama',
  },
  {
    id: 'balance',
    title: 'DENGE',
    subtitle: 'Single-Leg Balance',
    description:
      'Tek bacak duruşuyla propriosepsiyon, çekirdek kararlılık ve sol-sağ asimetri.',
    video: '/videos/test-balance.mp4',
    poster: '/images/test-balance-poster.jpg',
    color: '#A8D5BA',
    metric: '32.8 sn',
    metricLabel: 'Ortalama denge',
  },
  {
    id: 'reaction',
    title: 'REAKSİYON',
    subtitle: 'Reaction Time',
    description:
      'Görsel-motor tepki hızını rastgele uyaranlarla ölçer. Beyin–kas hattı.',
    video: '/videos/test-reaction.mp4',
    poster: '/images/test-reaction-poster.jpg',
    color: '#F2C94C',
    metric: '0.24 sn',
    metricLabel: 'Ortalama tepki',
  },
];

export function TestsSection() {
  return (
    <section
      id="tests"
      className="lp-section section-padding relative"
      style={{ background: 'var(--whistle-cream)' }}
    >
      <div
        className="absolute left-0 top-0 h-[2px] w-full"
        style={{ background: 'var(--form-navy)' }}
      />

      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <Reveal>
          <div className="mb-16 text-center">
            <p
              className="mb-4 text-xs uppercase tracking-[0.4em]"
              style={{
                color: 'var(--form-navy)',
                opacity: 0.5,
                fontFamily: 'var(--font-body)',
              }}
            >
              01 — Fiziksel Değerlendirme
            </p>
            <h2
              className="text-4xl font-black tracking-tight md:text-5xl"
              style={{
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              FİZİKSEL TESTLERİMİZ
            </h2>
            <div
              className="mx-auto mt-4 h-[3px] w-16"
              style={{ background: 'var(--track-mustard)' }}
            />
            <p
              className="mx-auto mt-6 max-w-xl text-sm leading-relaxed"
              style={{
                color: 'var(--form-navy)',
                opacity: 0.7,
                fontFamily: 'var(--font-body)',
              }}
            >
              Üç temel atletik blok: patlayıcı güç, denge kontrolü ve reaksiyon
              hızı. Sıralı bir akış, tek bir telefon kamerası.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-10">
          {TESTS.map((test, i) => (
            <Reveal key={test.id} delay={i * 0.1}>
              <div
                className="group relative overflow-hidden rounded-xl"
                style={{ background: test.color }}
              >
                <div className="relative aspect-square overflow-hidden">
                  <LazyVideo
                    src={test.video}
                    poster={test.poster}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className="absolute right-4 top-4 rounded-full px-3 py-1.5"
                    style={{
                      background: 'rgba(255, 245, 225, 0.9)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <span
                      className="text-xs font-bold tracking-wider"
                      style={{
                        color: 'var(--form-navy)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {test.metric}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3
                    className="mb-1 text-2xl font-black tracking-wide"
                    style={{
                      color: 'var(--form-navy)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {test.title}
                  </h3>
                  <p
                    className="mb-3 text-xs uppercase tracking-[0.2em]"
                    style={{
                      color: 'var(--form-navy)',
                      opacity: 0.6,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {test.subtitle}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: 'var(--form-navy)',
                      opacity: 0.8,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {test.description}
                  </p>
                  <div
                    className="mt-4 flex items-center justify-between pt-4"
                    style={{ borderTop: '1px solid rgba(44, 62, 107, 0.2)' }}
                  >
                    <span
                      className="text-[10px] uppercase tracking-[0.2em]"
                      style={{
                        color: 'var(--form-navy)',
                        opacity: 0.5,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {test.metricLabel}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <div className="flex items-center gap-4">
            <div
              className="h-[1px] w-12"
              style={{ background: 'var(--form-navy)', opacity: 0.3 }}
            />
            <span
              className="text-[10px] tracking-[0.3em]"
              style={{
                color: 'var(--form-navy)',
                opacity: 0.4,
                fontFamily: 'var(--font-body)',
              }}
            >
              SYMMETRY IN MEASUREMENT
            </span>
            <div
              className="h-[1px] w-12"
              style={{ background: 'var(--form-navy)', opacity: 0.3 }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
