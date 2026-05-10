import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Activity,
  ScanFace,
  ShieldAlert,
  Award,
  BookOpenText,
  Target,
} from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';

export default function Home() {
  return (
    <main className="bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <Hero />
      <ProblemSection />
      <HowItWorksSection />
      <SamplePreviewSection />
      <ScienceStrip />
      <FeaturesGrid />
      <ClosingCTA />
      <SiteFooter />
    </main>
  );
}

/* ============================================================ */
/*  HERO                                                        */
/* ============================================================ */

function Hero() {
  return (
    <section className="aurora-bg relative isolate flex min-h-screen flex-col">
      <Header />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pb-24 pt-16 md:px-12">
        <Reveal>
          <p className="eyebrow">METU Sports Tech Hackathon · Mayıs 2026</p>
        </Reveal>

        <Reveal delay={0.1}>
          <h1 className="headline-hero mt-8 max-w-6xl">
            Çocuğunun yeteneği,
            <br />
            <span className="bg-gradient-to-r from-[var(--color-signal)] via-amber-200 to-[var(--color-signal)] bg-clip-text text-transparent">
              tesadüfe bırakılamaz.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.25}>
          <p className="mt-10 max-w-2xl text-lg text-[var(--color-ink-2)] md:text-xl">
            Yetenek 2.0 — telefon kamerasından 5 dakikalık üç fiziksel test.
            AI çocuğa en uygun sporu öneriyor, sakatlanma riskini erken
            yakalıyor, gelişimi rozetlerle takip ediyor.
          </p>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Link
              href="/test/full"
              className="group inline-flex h-14 items-center gap-3 rounded-full bg-[var(--color-signal)] px-8 text-base font-bold text-[var(--color-canvas)] shadow-[0_8px_30px_-8px_rgba(246,196,83,0.6)] transition-all hover:scale-[1.02] hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-signal)]"
            >
              Tam akışa başla
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-14 items-center gap-2 rounded-full border border-[var(--color-line-strong)] px-7 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-signal)] hover:text-[var(--color-ink-1)]"
            >
              <Sparkles className="h-4 w-4" />
              Demo&apos;yu aç
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.55}>
          <HeroStrip />
        </Reveal>
      </div>

      <ScrollHint />
    </section>
  );
}

function Header() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 pt-8 md:px-12">
      <Link
        href="/"
        className="font-display text-xl font-bold tracking-tight"
      >
        Yetenek<span className="text-[var(--color-signal)]">.</span>
      </Link>
      <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--color-ink-2)] md:flex">
        <Link href="/test" className="transition-colors hover:text-[var(--color-ink-1)]">
          Testler
        </Link>
        <Link href="/demo" className="transition-colors hover:text-[var(--color-ink-1)]">
          Demo
        </Link>
        <Link href="/training" className="transition-colors hover:text-[var(--color-ink-1)]">
          Antrenman
        </Link>
        <Link href="/sports" className="transition-colors hover:text-[var(--color-ink-1)]">
          Spor Rehberi
        </Link>
        <Link href="/about" className="transition-colors hover:text-[var(--color-ink-1)]">
          Hakkında
        </Link>
        <Link href="/profile" className="transition-colors hover:text-[var(--color-ink-1)]">
          Cüzdanım
        </Link>
      </nav>
      <Link
        href="/test/full"
        className="rounded-full border border-[var(--color-line)] px-4 py-1.5 text-xs font-semibold text-[var(--color-ink-1)] transition-colors hover:border-[var(--color-signal)]"
      >
        Başla →
      </Link>
    </header>
  );
}

function HeroStrip() {
  const stats = [
    { value: '5', label: 'Dakikalık test', sub: 'Kameraya geç, hareket et' },
    { value: '12', label: 'Milyon çocuk', sub: 'Türkiye 8-15 yaş' },
    { value: '%85+', label: 'Doğruluk', sub: 'AI sport matching' },
    { value: '0₺', label: 'Donanım maliyeti', sub: 'Sadece telefon' },
  ];
  return (
    <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-[var(--color-canvas)] px-6 py-5"
        >
          <div className="font-display text-3xl font-bold tracking-tight text-[var(--color-ink-1)] md:text-4xl">
            {s.value}
          </div>
          <div className="mt-1 text-xs font-semibold tracking-wider text-[var(--color-signal)] uppercase">
            {s.label}
          </div>
          <div className="mt-0.5 text-xs text-[var(--color-ink-3)]">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

function ScrollHint() {
  return (
    <div className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-[var(--color-ink-3)] md:flex">
      <span className="font-mono uppercase tracking-widest">Aşağı kaydır</span>
      <span className="block h-8 w-px animate-pulse bg-gradient-to-b from-[var(--color-signal)] to-transparent" />
    </div>
  );
}

/* ============================================================ */
/*  PROBLEM                                                     */
/* ============================================================ */

function ProblemSection() {
  return (
    <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-[var(--space-section)]">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <Reveal>
          <p className="eyebrow">Problem</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="headline-display mt-4 max-w-5xl text-balance">
            1985'te Karaman'da{' '}
            <em className="not-italic text-[var(--color-signal)]">
              tesadüfen
            </em>{' '}
            keşfedilen bir çocuk vardı.
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-8 max-w-3xl text-lg text-[var(--color-ink-2)] leading-relaxed md:text-xl">
            Adı Naim Süleymanoğlu. 3 olimpiyat altın madalyası kazandı. Şu an
            Türkiye'nin köylerinde, mahallelerinde, okullarında onun gibi yüz
            binlerce çocuk var. Hiçbir antrenörün dikkatini çekmiyorlar.
            Aileleri sezgileriyle, akrabalarına bakarak, bütçelerine göre spor
            seçiyor.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <p className="mt-6 max-w-3xl text-lg text-[var(--color-ink-2)] leading-relaxed md:text-xl">
            Sonuç: Türkiye yıllar önce başlayabilecek olimpiyat hayallerini
            kaybediyor. Çocuklar potansiyellerinin uzağında bir spor seçiyor,
            hayal kırıklığıyla bırakıyor.
          </p>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            <FactCard
              big="60%"
              label="Spor bırakma oranı"
              detail="Yanlış spor seçimi nedeniyle 15 yaşa kadar"
            />
            <FactCard
              big="800M ₺"
              label="GSB yıllık bütçesi"
              detail="Yetenek tarama programı için ayrılmış"
            />
            <FactCard
              big="0"
              label="Türkiye lokal çözüm"
              detail="Bu segmentte çalışan tek ürün biziz"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FactCard({
  big,
  label,
  detail,
}: {
  big: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="grain rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-8">
      <div className="font-display text-5xl font-bold tracking-tight text-[var(--color-signal)] md:text-6xl">
        {big}
      </div>
      <div className="mt-4 text-base font-semibold text-[var(--color-ink-1)]">
        {label}
      </div>
      <div className="mt-1 text-sm text-[var(--color-ink-3)]">{detail}</div>
    </div>
  );
}

/* ============================================================ */
/*  HOW IT WORKS                                                */
/* ============================================================ */

function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Profil',
      desc: 'Çocuğun ismini, yaşını, cinsiyetini gir. 30 saniye.',
      icon: ScanFace,
    },
    {
      num: '02',
      title: '3 Fiziksel Test',
      desc: 'Sıçrama, denge ve refleks. AI MediaPipe ile vücut hareketini analiz eder.',
      icon: Activity,
    },
    {
      num: '03',
      title: 'AI Raporu',
      desc: 'Bilimsel temelli spor önerisi, sakatlanma riski uyarısı, kişiselleştirilmiş Türkçe rapor.',
      icon: Award,
    },
  ];

  return (
    <section className="bg-[var(--color-surface)] py-[var(--space-section)]">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <Reveal>
              <p className="eyebrow">Akış</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="headline-display mt-4 text-balance">
                Cebindeki telefon, profesyonel bir spor laboratuvarına dönüşür.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-md text-lg text-[var(--color-ink-2)] leading-relaxed">
                Donanım yok. Klinik yok. Randevu yok. Tek bir telefonla
                gerçekleşen, ama aynı bilime dayalı bir tarama.
              </p>
            </Reveal>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.num} delay={0.1 + idx * 0.1} from="right">
                  <div className="group relative flex gap-6 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-6 transition-colors hover:border-[var(--color-signal)]">
                    <div className="shrink-0 font-display text-5xl font-bold tracking-tight text-[var(--color-line-strong)] transition-colors group-hover:text-[var(--color-signal)]">
                      {step.num}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-base font-bold text-[var(--color-ink-1)]">
                        <Icon className="h-5 w-5 text-[var(--color-signal)]" />
                        {step.title}
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-ink-2)] leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SAMPLE PREVIEW                                              */
/* ============================================================ */

function SamplePreviewSection() {
  return (
    <section className="aurora-bg relative isolate overflow-hidden border-y border-[var(--color-line)] py-[var(--space-section)]">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-5">
          <div className="md:col-span-2">
            <Reveal>
              <p className="eyebrow">Çıktı</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="headline-display mt-4 text-balance">
                Sadece skor değil. Bir hikaye.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-6 max-w-md text-lg text-[var(--color-ink-2)] leading-relaxed">
                Çocuğun bio-motor profili, en uygun 3 spor önerisi, varsa
                sakatlanma uyarısı, ve veliye yazılı kişiselleştirilmiş AI
                raporu. Hepsi tek ekranda.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <Link
                href="/result/demo"
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-signal)] transition-colors hover:text-amber-200"
              >
                Tam örneği gör
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.2} from="right" className="md:col-span-3">
            <SampleReportCard />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function SampleReportCard() {
  return (
    <div className="grain relative overflow-hidden rounded-3xl border border-[var(--color-line-strong)] bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-canvas)] to-[var(--color-surface)] p-8 shadow-2xl">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="eyebrow">Yetenek Profili</div>
          <h3 className="font-display mt-2 text-3xl font-bold">
            Zeynep · 9 yaş
          </h3>
        </div>
        <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
          ● Canlı
        </div>
      </div>

      <p className="mt-6 max-w-md text-base text-[var(--color-ink-2)] leading-relaxed">
        En güçlü uyumun{' '}
        <span className="font-bold text-[var(--color-signal)]">Voleybol</span>{' '}
        ile. Patlayıcı gücün ve reflekslerin bu spor için ideal.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { label: 'Sıçrama', value: '24.3 cm', sub: '78/100' },
          { label: 'Refleks', value: '282 ms', sub: '84/100' },
          { label: 'Asimetri', value: '%18', sub: 'Uyarı', danger: true },
        ].map((m) => (
          <div
            key={m.label}
            className={`rounded-xl border p-3 ${
              m.danger
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-[var(--color-line)] bg-[var(--color-canvas)]/50'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-3)]">
              {m.label}
            </div>
            <div
              className={`mt-1 text-lg font-bold ${
                m.danger ? 'text-amber-300' : 'text-[var(--color-ink-1)]'
              }`}
            >
              {m.value}
            </div>
            <div className="text-[10px] text-[var(--color-ink-3)]">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {['🏐 Voleybol Yıldızı', '⚡ Şimşek', '🎯 Tam Tarama'].map((b) => (
          <span
            key={b}
            className="rounded-full border border-[var(--color-signal)]/30 bg-[var(--color-signal)]/10 px-3 py-1 text-xs font-medium text-[var(--color-signal)]"
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ */
/*  SCIENCE STRIP                                               */
/* ============================================================ */

function ScienceStrip() {
  const sources = [
    'Tudor Bompa — Total Training for Young Champions',
    'Joe Brewer — Talent Identification in Sport',
    'Gençlik Spor Bakanlığı — Yetenek Seçimi Kılavuzu 2019',
    'Hewett et al. — ACL Risk Mechanics',
    'Verrall — Hamstring Risk Criteria',
    'WCAG 2.2 AA — Erişilebilir Tasarım',
  ];

  return (
    <section className="border-y border-[var(--color-line)] bg-[var(--color-canvas)] py-12">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <Reveal>
          <p className="eyebrow flex items-center gap-2">
            <BookOpenText className="h-4 w-4" />
            Bilimsel temel
          </p>
        </Reveal>
      </div>

      <div className="relative mt-6 overflow-hidden">
        <div className="animate-marquee flex gap-12 whitespace-nowrap text-base font-medium text-[var(--color-ink-2)] md:text-lg">
          {[...sources, ...sources].map((s, idx) => (
            <span key={idx} className="flex items-center gap-12">
              {s}
              <span className="text-[var(--color-signal)]">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  FEATURES GRID                                               */
/* ============================================================ */

function FeaturesGrid() {
  const features = [
    {
      icon: Activity,
      title: 'Pose Estimation',
      desc: 'MediaPipe BlazePose 33 keypoint, on-device, gizlilik dostu. Veri telefondan çıkmıyor.',
      span: 'md:col-span-2',
    },
    {
      icon: Award,
      title: '12 Rozet Sistemi',
      desc: 'Performans, profil, genel kategorilerinde rozet topla.',
      span: 'md:col-span-1',
    },
    {
      icon: ShieldAlert,
      title: 'Sakatlanma Erken Uyarısı',
      desc: 'Sol-sağ asimetri %15 üstüne çıkarsa anında uyarı + egzersiz önerisi.',
      span: 'md:col-span-1',
    },
    {
      icon: Sparkles,
      title: 'AI Yazdığı Rapor',
      desc: 'Google Gemini ile veliye samimi Türkçe rapor. Anahtar yoksa otomatik fallback.',
      span: 'md:col-span-2',
    },
    {
      icon: Target,
      title: 'Spor Eşleştirme',
      desc: 'Euclidean similarity ile 14 spor profili: voleybol, basketbol, futbol, tenis, yüzme, atletizm, cimnastik, judo, taekwondo, boks, masa tenisi, badminton, hentbol.',
      span: 'md:col-span-3',
    },
  ];

  return (
    <section className="bg-[var(--color-canvas)] py-[var(--space-section)]">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Reveal>
              <p className="eyebrow">Özellikler</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="headline-display mt-4 max-w-3xl text-balance">
                Tek ekran, çok katman.
              </h2>
            </Reveal>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={idx * 0.07} className={f.span}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-7 transition-all hover:border-[var(--color-signal)]">
                  <Icon className="h-7 w-7 text-[var(--color-signal)]" />
                  <h3 className="mt-6 text-xl font-bold text-[var(--color-ink-1)] md:text-2xl">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm text-[var(--color-ink-2)] leading-relaxed md:text-base">
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  CLOSING CTA                                                 */
/* ============================================================ */

function ClosingCTA() {
  return (
    <section className="aurora-bg relative isolate overflow-hidden border-t border-[var(--color-line)] py-[var(--space-section)]">
      <div className="mx-auto max-w-5xl px-6 text-center md:px-12">
        <Reveal>
          <p className="eyebrow">Başla</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="headline-display mt-6 text-balance">
            Türkiye'nin gelecek olimpiyatçısı
            <br />
            <span className="text-[var(--color-signal)]">
              ekrandan bakıyor olabilir.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={0.25}>
          <p className="mt-8 text-lg text-[var(--color-ink-2)] md:text-xl">
            5 dakika. Sadece bir telefon. Kimse keşfedilmemiş kalmasın.
          </p>
        </Reveal>
        <Reveal delay={0.4}>
          <Link
            href="/test/full"
            className="group mt-12 inline-flex h-16 items-center gap-3 rounded-full bg-[var(--color-signal)] px-10 text-lg font-bold text-[var(--color-canvas)] shadow-[0_15px_40px_-10px_rgba(246,196,83,0.7)] transition-all hover:scale-[1.03] hover:bg-amber-300"
          >
            Tam akışa başla
            <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  FOOTER                                                      */
/* ============================================================ */

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center md:px-12">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-bold tracking-tight">
            Yetenek<span className="text-[var(--color-signal)]">.</span>
          </span>
          <span className="text-sm text-[var(--color-ink-3)]">
            METU Sports Tech Hackathon 2026
          </span>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-[var(--color-ink-3)]">
          <Link href="/test/full" className="hover:text-[var(--color-ink-1)]">
            Tam Akış
          </Link>
          <Link href="/test" className="hover:text-[var(--color-ink-1)]">
            Tek Tek Test
          </Link>
          <Link href="/result/demo" className="hover:text-[var(--color-ink-1)]">
            Örnek Sonuç
          </Link>
          <Link href="/profile" className="hover:text-[var(--color-ink-1)]">
            Cüzdan
          </Link>
        </div>
      </div>
    </footer>
  );
}
