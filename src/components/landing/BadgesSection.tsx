// Server Component — statik veri + Reveal/LazyVideo client leaf.
import { Reveal } from '@/components/motion/Reveal';
import { LazyVideo } from './LazyVideo';
import {
  Star,
  Trophy,
  Zap,
  Target,
  Flame,
  Award,
  Crown,
  Medal,
} from 'lucide-react';

const BADGES = [
  {
    icon: Star,
    label: 'İlk Adım',
    color: '#F2C94C',
    description: 'İlk test tamamlandı',
  },
  {
    icon: Trophy,
    label: 'Tam Tarama',
    color: '#F2C94C',
    description: '7 testin tamamı bitti',
  },
  {
    icon: Zap,
    label: 'Şimşek',
    color: '#F4B6C2',
    description: 'Reaksiyon skoru 80+',
  },
  {
    icon: Target,
    label: 'Akrobat',
    color: '#A8D5BA',
    description: 'Denge skoru 80+',
  },
  {
    icon: Flame,
    label: 'Roketsırtı',
    color: '#F2C94C',
    description: 'Sıçrama skoru 80+',
  },
  {
    icon: Award,
    label: 'Yedi Yıldız',
    color: '#A8D5BA',
    description: '7 boyutta 60+',
  },
  {
    icon: Crown,
    label: 'Spor Profili',
    color: '#F2C94C',
    description: 'Spor eşleşmesi %80+',
  },
  {
    icon: Medal,
    label: 'Süreklilik',
    color: '#C4E0D0',
    description: 'Son 14 günde test günleri',
  },
];

const PROGRESS_STEPS = [
  {
    label: 'Çocuk bazlı',
    value: 'Ayrı profil',
    detail: 'Her çocuğun rozetleri ve geçmişi ayrı tutulur.',
  },
  {
    label: 'Performans',
    value: '80+ skor',
    detail: 'Testlerde güçlü boyutlar rozet olarak görünür.',
  },
  {
    label: 'Eşleşme',
    value: '%80+',
    detail: 'Spor önerisi yüksek güvenle geldiğinde profil rozeti açılır.',
  },
  {
    label: 'Süreklilik',
    value: '14 gün',
    detail: 'Yakın dönem test günleri gelişim takibi için sayılır.',
  },
];

export function BadgesSection() {
  return (
    <section
      id="badges"
      className="lp-section section-padding relative"
      style={{ background: 'var(--mindar-pink)' }}
    >
      <div
        className="absolute top-0 left-0 h-[2px] w-full"
        style={{ background: 'var(--form-navy)' }}
      />

      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <Reveal>
          <div className="mb-16 text-center">
            <p
              className="mb-4 text-xs tracking-[0.4em] uppercase"
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
              ROZETLER & GELİŞİM
            </h2>
            <div
              className="mx-auto mt-4 h-[3px] w-16"
              style={{ background: 'var(--track-mustard)' }}
            />
          </div>
        </Reveal>

        <Reveal delay={120}>
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
                  className="mb-2 text-[10px] tracking-[0.3em] uppercase"
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
                className="mb-6 text-center text-sm font-bold tracking-[0.2em] uppercase lg:text-left"
                style={{
                  color: 'var(--form-navy)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                KAZANILABİLECEK ROZETLER
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
                        className="text-center text-[8px] leading-tight tracking-wider uppercase"
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
                className="mb-6 text-center text-sm font-bold tracking-[0.2em] uppercase lg:text-left"
                style={{
                  color: 'var(--form-navy)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                NASIL İŞLER?
              </h3>
              <div
                className="overflow-hidden rounded-xl"
                style={{
                  background: 'rgba(255, 245, 225, 0.6)',
                  backdropFilter: 'blur(8px)',
                  border: '2px solid rgba(44, 62, 107, 0.15)',
                }}
              >
                {PROGRESS_STEPS.map((entry, index) => (
                  <div
                    key={entry.label}
                    className="grid grid-cols-12 gap-3 px-4 py-4 transition-colors duration-200 hover:bg-white/30"
                    style={{
                      borderBottom: '1px solid rgba(44, 62, 107, 0.08)',
                    }}
                  >
                    <span className="col-span-2 flex items-start">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black"
                        style={{
                          background:
                            index === 0
                              ? '#F2C94C'
                              : index === 1
                                ? '#C4E0D0'
                                : index === 2
                                  ? '#E8A0B0'
                                  : 'rgba(44,62,107,0.1)',
                          color: 'var(--form-navy)',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {index + 1}
                      </span>
                    </span>
                    <span
                      className="col-span-4 text-xs font-bold tracking-wider uppercase"
                      style={{
                        color: 'var(--form-navy)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {entry.label}
                    </span>
                    <span
                      className="col-span-3 text-[10px] font-bold"
                      style={{
                        color: 'var(--form-navy)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {entry.value}
                    </span>
                    <span
                      className="col-span-3 text-right text-[10px] leading-snug"
                      style={{
                        color: 'var(--form-navy)',
                        opacity: 0.68,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {entry.detail}
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
