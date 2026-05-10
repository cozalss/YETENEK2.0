'use client';

import { Reveal } from '@/components/motion/Reveal';
import { LazyVideo } from './LazyVideo';
import { Star, Trophy, Zap, Target, Flame, Award, Crown, Medal } from 'lucide-react';

const BADGES = [
  { icon: Star, label: 'Yıldız', color: '#F2C94C', description: 'Bir testte ilk %10' },
  { icon: Trophy, label: 'Şampiyon', color: '#F2C94C', description: 'Branşta 1. sıra' },
  { icon: Zap, label: 'Şimşek', color: '#F4B6C2', description: 'En hızlı reaksiyon' },
  { icon: Target, label: 'Hassasiyet', color: '#A8D5BA', description: 'Mükemmel denge' },
  { icon: Flame, label: 'Güç', color: '#F2C94C', description: 'En yüksek CMJ' },
  { icon: Award, label: 'Çok Yönlü', color: '#A8D5BA', description: 'Tüm testlerde ilk %25' },
  { icon: Crown, label: 'Kraliyet', color: '#F2C94C', description: '3 ardışık 1. sıra' },
  { icon: Medal, label: 'Veteran', color: '#C4E0D0', description: '50 test tamamlanmış' },
];

const LEADERBOARD = [
  { rank: 1, name: 'Elif Y.', score: 97.4, branch: 'Jimnastik' },
  { rank: 2, name: 'Can D.', score: 95.1, branch: 'Yüzme' },
  { rank: 3, name: 'Zeynep A.', score: 93.8, branch: 'Okçuluk' },
  { rank: 4, name: 'Kerem B.', score: 91.2, branch: 'Basketbol' },
  { rank: 5, name: 'Ela S.', score: 89.7, branch: 'Eskrim' },
];

export function BadgesSection() {
  return (
    <section
      id="badges"
      className="lp-section section-padding relative"
      style={{ background: 'var(--mindar-pink)' }}
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
              04 — Başarılar
            </p>
            <h2
              className="text-4xl font-black tracking-tight md:text-5xl"
              style={{
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              SIRALAMA & ROZETLER
            </h2>
            <div
              className="mx-auto mt-4 h-[3px] w-16"
              style={{ background: 'var(--track-mustard)' }}
            />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="relative mb-16 overflow-hidden rounded-2xl"
            style={{ border: '3px solid rgba(44, 62, 107, 0.3)' }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'url(/images/cork-texture.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3,
              }}
            />
            <div className="relative aspect-video">
              <LazyVideo
                src="/videos/badges-board.mp4"
                poster="/images/badges-board-poster.jpg"
                className="h-full w-full object-cover"
                style={{ opacity: 0.85 }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <p
                  className="mb-2 text-[10px] uppercase tracking-[0.3em]"
                  style={{
                    color: 'var(--whistle-cream)',
                    fontFamily: 'var(--font-body)',
                    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  }}
                >
                  Merit Badge Collection
                </p>
                <h3
                  className="text-2xl font-black md:text-3xl"
                  style={{
                    color: 'var(--whistle-cream)',
                    fontFamily: 'var(--font-display)',
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  }}
                >
                  BAŞARI PANOSU
                </h3>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Reveal>
            <div>
              <h3
                className="mb-6 text-center text-sm font-bold uppercase tracking-[0.2em] lg:text-left"
                style={{
                  color: 'var(--form-navy)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                KAZANILABILECEK ROZETLER
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {BADGES.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.label}
                      className="flex cursor-pointer flex-col items-center rounded-xl p-3 transition-all duration-300 hover:scale-110"
                      style={{
                        background: 'rgba(255, 245, 225, 0.6)',
                        backdropFilter: 'blur(8px)',
                        border: '2px solid rgba(44, 62, 107, 0.15)',
                      }}
                      title={`${badge.label}: ${badge.description}`}
                    >
                      <div
                        className="mb-2 flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ background: badge.color }}
                      >
                        <Icon size={18} style={{ color: 'var(--form-navy)' }} />
                      </div>
                      <span
                        className="text-center text-[8px] uppercase leading-tight tracking-wider"
                        style={{
                          color: 'var(--form-navy)',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <Reveal from="right">
            <div>
              <h3
                className="mb-6 text-center text-sm font-bold uppercase tracking-[0.2em] lg:text-left"
                style={{
                  color: 'var(--form-navy)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                HAFTALIK LİDERLİK
              </h3>
              <div
                className="overflow-hidden rounded-xl"
                style={{
                  background: 'rgba(255, 245, 225, 0.6)',
                  backdropFilter: 'blur(8px)',
                  border: '2px solid rgba(44, 62, 107, 0.15)',
                }}
              >
                <div
                  className="grid grid-cols-12 gap-2 px-4 py-3"
                  style={{
                    borderBottom: '1px solid rgba(44, 62, 107, 0.15)',
                    background: 'rgba(44, 62, 107, 0.05)',
                  }}
                >
                  <span
                    className="col-span-2 text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      color: 'var(--form-navy)',
                      opacity: 0.5,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    Sıra
                  </span>
                  <span
                    className="col-span-4 text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      color: 'var(--form-navy)',
                      opacity: 0.5,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    Sporcu
                  </span>
                  <span
                    className="col-span-3 text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      color: 'var(--form-navy)',
                      opacity: 0.5,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    Branş
                  </span>
                  <span
                    className="col-span-3 text-right text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      color: 'var(--form-navy)',
                      opacity: 0.5,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    Skor
                  </span>
                </div>

                {LEADERBOARD.map((entry) => (
                  <div
                    key={entry.rank}
                    className="grid grid-cols-12 gap-2 px-4 py-3 transition-colors duration-200 hover:bg-white/30"
                    style={{ borderBottom: '1px solid rgba(44, 62, 107, 0.08)' }}
                  >
                    <span className="col-span-2 flex items-center">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black"
                        style={{
                          background:
                            entry.rank === 1
                              ? '#F2C94C'
                              : entry.rank === 2
                                ? '#C4E0D0'
                                : entry.rank === 3
                                  ? '#E8A0B0'
                                  : 'rgba(44,62,107,0.1)',
                          color: 'var(--form-navy)',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {entry.rank}
                      </span>
                    </span>
                    <span
                      className="col-span-4 flex items-center text-xs font-bold"
                      style={{
                        color: 'var(--form-navy)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {entry.name}
                    </span>
                    <span
                      className="col-span-3 flex items-center text-[10px]"
                      style={{
                        color: 'var(--form-navy)',
                        opacity: 0.6,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {entry.branch}
                    </span>
                    <span
                      className="col-span-3 flex items-center justify-end text-right text-xs font-bold"
                      style={{
                        color: 'var(--form-navy)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {entry.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
