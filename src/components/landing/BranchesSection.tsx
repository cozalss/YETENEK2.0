'use client';

/**
 * BranchesSection — landing'in 12 branş showcase'i.
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

import { Reveal } from '@/components/motion/Reveal';
import { LazyVideo } from './LazyVideo';
import { Hand, type LucideIcon } from 'lucide-react';

type BranchCard =
  | {
      kind: 'video';
      name: string;
      en: string;
      src: string;
      color: string;
    }
  | {
      kind: 'icon';
      name: string;
      en: string;
      icon: LucideIcon;
      color: string;
    };

const BRANCHES: BranchCard[] = [
  { kind: 'video', name: 'VOLEYBOL', en: 'Volleyball', src: '/videos/sport-volleyball.mp4', color: '#F2C94C' },
  { kind: 'video', name: 'BASKETBOL', en: 'Basketball', src: '/videos/sport-basketball.mp4', color: '#8BB8E8' },
  { kind: 'video', name: 'FUTBOL', en: 'Football', src: '/videos/sport-football.mp4', color: '#A8D5BA' },
  { kind: 'video', name: 'TENİS', en: 'Tennis', src: '/videos/sport-tennis.mp4', color: '#C4E0D0' },
  { kind: 'video', name: 'MASA TENİSİ', en: 'Table Tennis', src: '/videos/sport-tabletennis.mp4', color: '#F4B6C2' },
  { kind: 'video', name: 'YÜZME', en: 'Swimming', src: '/videos/sport-swimmer.mp4', color: '#A8D5BA' },
  { kind: 'video', name: 'ATLETİZM', en: 'Athletics', src: '/videos/sport-athletics.mp4', color: '#F2C94C' },
  { kind: 'video', name: 'JİMNASTİK', en: 'Gymnastics', src: '/videos/sport-gymnastics.mp4', color: '#F4B6C2' },
  { kind: 'video', name: 'TEKVANDO', en: 'Taekwondo', src: '/videos/sport-taekwondo.mp4', color: '#E8A0B0' },
  // Veo ile üretildi (8 sn, 1280×720, faststart, audio-stripped).
  { kind: 'video', name: 'JUDO', en: 'Judo', src: '/videos/sport-judo.mp4', color: '#A8D5BA' },
  { kind: 'video', name: 'BADMİNTON', en: 'Badminton', src: '/videos/sport-badminton.mp4', color: '#F4B6C2' },
  // Boks videosu henüz üretilmedi — ikon placeholder, kart rengi Veo
  // prompt'undaki mustard arka plana eşit (ileride tek hamle değişir).
  { kind: 'icon', name: 'BOKS', en: 'Boxing', icon: Hand, color: '#F2C94C' },
];

export function BranchesSection() {
  return (
    <section
      id="branches"
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
              profilini telefon kamerasıyla ölçtüğü bio-motor verilerle gerçekten
              parlayacağı sporla eşleştirir.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {BRANCHES.map((branch, i) => (
            <Reveal key={branch.name} delay={(i % 4) * 0.08}>
              <div
                className="group relative cursor-pointer overflow-hidden rounded-xl"
                style={{ background: branch.color }}
              >
                <div className="relative aspect-square overflow-hidden">
                  {branch.kind === 'video' ? (
                    <LazyVideo
                      src={branch.src}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center transition-transform duration-700 group-hover:scale-110">
                      <branch.icon
                        size={72}
                        strokeWidth={1.5}
                        style={{ color: 'rgba(44, 62, 107, 0.75)' }}
                      />
                    </div>
                  )}

                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: 'rgba(26, 37, 64, 0.6)' }}
                  >
                    <h3
                      className="text-lg font-black tracking-wider"
                      style={{
                        color: '#FFF5E1',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {branch.name}
                    </h3>
                    <p
                      className="mt-1 text-[10px] uppercase tracking-[0.2em]"
                      style={{
                        color: '#FFF5E1',
                        opacity: 0.7,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {branch.en}
                    </p>
                  </div>
                </div>
              </div>
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
