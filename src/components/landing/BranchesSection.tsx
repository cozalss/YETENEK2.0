/**
 * BranchesSection — landing'in 12 branş showcase'i.
 * Server Component — statik veri + Reveal/LazyVideo client leaf.
 *
 * Bu liste artık algoritmanın gerçek tavsiye listesiyle (sportProfiles.ts)
 * SENKRONİZE. Önceki sürümde binicilik/kayak/buz pateni gibi videosu olan
 * fakat algoritmada bulunmayan branşlar gösteriliyordu — bu kullanıcıyı
 * yanıltıyordu (test sonrası önerilen sporlar listede olmuyordu).
 *
 * Motion-detection battery (CMJ + balance + reaction + broad jump + lateral
 * hops + endurance) bu 12 sporun seçim kriterlerini bio-motor düzeyde
 * ölçebiliyor (kaynak: sportProfiles.ts bibliyografisi).
 */

import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { LazyVideo } from './LazyVideo';

interface BranchCard {
  slug: string;
  name: string;
  en: string;
  src: string;
  poster: string;
  color: string;
}

const BRANCHES: BranchCard[] = [
  {
    slug: 'voleybol',
    name: 'VOLEYBOL',
    en: 'Volleyball',
    src: '/videos/sport-volleyball.mp4',
    poster: '/images/sport-volleyball-poster.jpg',
    color: '#F2C94C',
  },
  {
    slug: 'basketbol',
    name: 'BASKETBOL',
    en: 'Basketball',
    src: '/videos/sport-basketball.mp4',
    poster: '/images/sport-basketball-poster.jpg',
    color: '#8BB8E8',
  },
  {
    slug: 'futbol',
    name: 'FUTBOL',
    en: 'Football',
    src: '/videos/sport-football.mp4',
    poster: '/images/sport-football-poster.jpg',
    color: '#A8D5BA',
  },
  {
    slug: 'tenis',
    name: 'TENİS',
    en: 'Tennis',
    src: '/videos/sport-tennis.mp4',
    poster: '/images/sport-tennis-poster.jpg',
    color: '#C4E0D0',
  },
  {
    slug: 'masa-tenisi',
    name: 'MASA TENİSİ',
    en: 'Table Tennis',
    src: '/videos/sport-tabletennis.mp4',
    poster: '/images/sport-tabletennis-poster.jpg',
    color: '#F4B6C2',
  },
  {
    slug: 'yuzme',
    name: 'YÜZME',
    en: 'Swimming',
    src: '/videos/sport-swimmer.mp4',
    poster: '/images/sport-swimmer-poster.jpg',
    color: '#A8D5BA',
  },
  {
    slug: 'atletizm',
    name: 'ATLETİZM',
    en: 'Athletics',
    src: '/videos/sport-athletics.mp4',
    poster: '/images/sport-athletics-poster.jpg',
    color: '#F2C94C',
  },
  {
    slug: 'cimnastik',
    name: 'CİMNASTİK',
    en: 'Gymnastics',
    src: '/videos/sport-gymnastics.mp4',
    poster: '/images/sport-gymnastics-poster.jpg',
    color: '#F4B6C2',
  },
  {
    slug: 'taekwondo',
    name: 'TEKVANDO',
    en: 'Taekwondo',
    src: '/videos/sport-taekwondo.mp4',
    poster: '/images/sport-taekwondo-poster.jpg',
    color: '#E8A0B0',
  },
  {
    slug: 'judo',
    name: 'JUDO',
    en: 'Judo',
    src: '/videos/sport-judo.mp4',
    poster: '/images/sport-judo-poster.jpg',
    color: '#A8D5BA',
  },
  {
    slug: 'badminton',
    name: 'BADMİNTON',
    en: 'Badminton',
    src: '/videos/sport-badminton.mp4',
    poster: '/images/sport-badminton-poster.jpg',
    color: '#F4B6C2',
  },
  {
    slug: 'boks',
    name: 'BOKS',
    en: 'Boxing',
    src: '/videos/sport-boks.mp4',
    poster: '/images/sport-boks-poster.jpg',
    color: '#F2C94C',
  },
];

export function BranchesSection() {
  return (
    <section
      id="branches"
      className="lp-section section-padding relative"
      style={{ background: 'var(--whistle-cream)' }}
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
              03 — Branşlar
            </p>
            <h2
              className="text-4xl font-black tracking-tight md:text-5xl"
              style={{
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              12 BRANŞ
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
              Voleyboldan badmintona — yapay zeka, çocuğun benzersiz fiziksel
              profilini telefon kamerasıyla ölçtüğü bio-motor verilerle
              gerçekten parlayacağı sporla eşleştirir.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {BRANCHES.map((branch, i) => (
            <Reveal key={branch.name} delay={(i % 4) * 90}>
              <Link
                href={`/sports/${branch.slug}`}
                aria-label={`${branch.name} spor rehberi`}
                className="group relative block overflow-hidden rounded-xl"
                style={{ background: branch.color }}
              >
                <div className="relative aspect-square overflow-hidden">
                  <LazyVideo
                    src={branch.src}
                    poster={branch.poster}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  <div
                    className="absolute inset-x-0 bottom-0 p-4 transition-all duration-300 group-hover:translate-y-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(26, 37, 64, 0.86), transparent)',
                    }}
                  >
                    <h3
                      className="text-sm font-black tracking-wider md:text-lg"
                      style={{
                        color: '#FFF5E1',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {branch.name}
                    </h3>
                    <p
                      className="mt-1 text-[10px] tracking-[0.2em] uppercase opacity-70 transition-opacity group-hover:opacity-100"
                      style={{
                        color: '#FFF5E1',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {branch.en}
                    </p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
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
              12 BRANCH — ALGORITHM-MATCHED
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
