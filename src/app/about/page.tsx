/**
 * Hakkında sayfası — misyon, metodoloji, ekip, bilim referansları.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  Brain,
  Camera,
  Database,
  Heart,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { SiteHeaderServer } from '@/components/layout/SiteHeaderServer';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { REFERENCES } from '@/lib/content/bibliography';
import { getAllReferences } from '@/infrastructure/storage/supabase-content-repository';

export const revalidate = 300; // 5 dk ISR — içerik nadiren değişir

export const metadata: Metadata = {
  title: 'Hakkında',
  description:
    'Yetenek 2.0 metodolojisi, ekibi ve bilim arkasında 24+ peer-reviewed kaynağın özeti.',
};

export default async function AboutPage() {
  // DB önceliği; eksikse static fallback
  const dbRefs = await getAllReferences();
  const references = dbRefs.length > 0 ? dbRefs : REFERENCES;
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeaderServer />

      <div className="mx-auto max-w-6xl px-6 pt-12 pb-20 md:px-12 md:pt-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>

        {/* Hero */}
        <header className="mt-10 max-w-4xl space-y-5">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Hakkında
          </p>
          <h1 className="text-5xl leading-[0.95] font-bold tracking-tight text-balance md:text-7xl">
            Her çocukta
            <br />
            <span className="text-[var(--color-signal)]">bir yetenek</span>{' '}
            saklı.
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-[var(--color-ink-2)] md:text-xl">
            Yetenek 2.0, telefon kamerasıyla 5 dakikada 7 boyutlu çocuk yetenek
            profili çıkaran, AI destekli açık kaynak bir spor tarama
            platformudur. Hedefimiz: Türkiye'de hiçbir potansiyel tespit
            edilmeden kaybolmasın.
          </p>
        </header>

        {/* Misyon kartları */}
        <section className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          <MissionCard
            icon={Trophy}
            title="Erken keşif"
            body="8-15 yaş aralığı yetenek penceresinin altın çağı. Geç kalmadan profil çıkararak çocuğa doğru sporu öneriyoruz."
          />
          <MissionCard
            icon={Heart}
            title="Sakatlanmadan önle"
            body="Asimetri %10'u geçen çocukları kibarca uyarıyoruz. Croisier 2008 (AJSM 36:1469) eşiği klinik referansımız."
          />
          <MissionCard
            icon={Brain}
            title="Bilim arkasında"
            body="24+ peer-reviewed kaynak. Tomkinson 2018 BJSM normları, Bompa, Pion, Mancha-Triguero... Hepsi referanslı."
          />
        </section>

        {/* Metodoloji */}
        <section className="mt-24" id="metodoloji">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Metodoloji
          </p>
          <h2 className="mt-3 max-w-3xl text-4xl leading-tight font-bold text-balance md:text-5xl">
            7 boyut. 12 spor. Bir profil.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[var(--color-ink-2)]">
            Talent identification literatüründe (Bompa, Régnier, Vaeyens) her
            spor için tipik 5-7 bio-motor yetinin önemli olduğu söylenir.
            Yetenek 2.0 bu 7 yetiyi kameralı testlerle ölçüyor — ardından 12
            sporun ideal profili ile karşılaştırarak kişiselleştirilmiş öneri
            çıkarıyor.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <MethodStep
              num="01"
              title="Pose tahmini"
              body="MediaPipe BlazePose tarayıcıda 33 keypoint, 22-30 fps. Video sunucuya gitmez."
              icon={Camera}
            />
            <MethodStep
              num="02"
              title="Bio-motor metrikler"
              body="Sıçrama yüksekliği, ankle X delta, hop frekansı, jack tempo decay — hepsi keypoint serilerinden türetiliyor."
              icon={Database}
            />
            <MethodStep
              num="03"
              title="Weighted matching"
              body="Per-sport ağırlıklı Euclidean distance + antropometrik bonus (boy/lean). Cluster sorununu çözer."
              icon={Sparkles}
            />
          </div>
        </section>

        {/* Boyutlar tablosu */}
        <section className="mt-24" id="boyutlar">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            7 Fiziksel + 1 Psikolojik Boyut
          </p>
          <h2 className="mt-3 text-4xl leading-tight font-bold md:text-5xl">
            Her test ne ölçer?
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2">
            <DimensionRow
              title="Dikey Patlayıcı Güç"
              method="Counter-Movement Jump (CMJ) · kalça Y delta"
              norm="Tomkinson 2018"
            />
            <DimensionRow
              title="Yatay Patlayıcı Güç"
              method="Standing Long Jump · ankle X delta"
              norm="Thomas 2020 (P50 11-15 yaş)"
            />
            <DimensionRow
              title="Denge"
              method="Single-leg postural sway (7s × 2)"
              norm="Hewett 2005 asimetri >%10"
            />
            <DimensionRow
              title="Reaksiyon"
              method="Simple visual RT (6 deneme, ortalama + SD)"
              norm="Dykiert 2012 pediatric"
            />
            <DimensionRow
              title="Çeviklik"
              method="Lateral Hops 15sn · ankle midline crossing"
              norm="Larsen 2022 + Munro 2011"
            />
            <DimensionRow
              title="Koordinasyon"
              method="Visual tracking (Lissajous) · pixel error"
              norm="Flowers 2010 PRT analog"
            />
            <DimensionRow
              title="Dayanıklılık"
              method="30sn Jumping Jacks · rep + decay"
              norm="Podstawski 2019 + FitnessGram"
            />
            <DimensionRow
              title="Karakter / Takım Uyumu"
              method="14 soruluk Likert anketi · 4 faktör (iş birliği, teşvik, sebat, fair play) · ters kodlamalı maddeler"
              norm="Big Five Agreeableness + Eklund 2008 sport personality"
            />
          </div>
        </section>

        {/* Bilim referansları */}
        <section
          className="mt-24 border-t border-[var(--color-line)] pt-16"
          id="bilim"
        >
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Bilim Referansları
          </p>
          <h2 className="mt-3 text-4xl leading-tight font-bold md:text-5xl">
            {references.length} kaynak — hepsi peer-reviewed.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-[var(--color-ink-2)]">
            Norm tabloları ve sport profile vektörleri için kullanılan
            kaynaklar. Her birini doğrulayabilir, kendin de okuyabilirsin. Eksik
            kalan boyutlar (lateral hops 8-10 yaş, jumping jacks pediatric norm)
            Türkiye pilot validasyon ile tamamlanacak.
          </p>

          <ol className="mt-12 space-y-4">
            {references.map((ref, idx) => (
              <li
                key={ref.id}
                className="flex gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
              >
                <span className="shrink-0 rounded-md bg-[var(--color-canvas)] px-2 py-1 font-mono text-xs font-bold text-[var(--color-signal)]">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--color-ink-1)]">
                    {ref.authors}{' '}
                    <span className="text-[var(--color-ink-3)]">
                      ({ref.year})
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-[var(--color-ink-2)]">
                    {ref.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-3)]">
                    <em>{ref.journal}</em>
                    {ref.url && (
                      <>
                        {' · '}
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--color-signal)] underline-offset-2 hover:underline"
                        >
                          link
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Ekip ve hackathon */}
        <section className="mt-24 rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-8 md:p-12">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Ekip
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">Ekip ve ürün</h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-[var(--color-ink-2)]">
            Yetenek 2.0 açık kaynak, ücretsiz ve donanım bağımsız bir pilot ürün
            olarak geliştiriliyor. Hedefimiz, bilimsel testleri herkesin
            erişebileceği sade bir web deneyimine taşımak.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Tag>AI / ML</Tag>
            <Tag>Frontend</Tag>
            <Tag>Backend</Tag>
            <Tag>Tasarım</Tag>
            <Tag>Spor Bilimleri</Tag>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

function MissionCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Trophy;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
      <Icon className="h-6 w-6 text-[var(--color-signal)]" />
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-2)]">
        {body}
      </p>
    </div>
  );
}

function MethodStep({
  num,
  title,
  body,
  icon: Icon,
}: {
  num: string;
  title: string;
  body: string;
  icon: typeof Camera;
}) {
  return (
    <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm tracking-widest text-[var(--color-ink-3)]">
          {num}
        </span>
        <Icon className="h-5 w-5 text-[var(--color-signal)]" />
      </div>
      <h3 className="mt-6 text-xl font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-2)]">
        {body}
      </p>
    </div>
  );
}

function DimensionRow({
  title,
  method,
  norm,
}: {
  title: string;
  method: string;
  norm: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <h3 className="text-base font-bold text-[var(--color-ink-1)]">{title}</h3>
      <p className="mt-1.5 text-sm text-[var(--color-ink-2)]">{method}</p>
      <p className="mt-2 font-mono text-[11px] tracking-wider text-[var(--color-signal)] uppercase">
        {norm}
      </p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-1 text-xs font-medium text-[var(--color-ink-2)]">
      {children}
    </span>
  );
}
