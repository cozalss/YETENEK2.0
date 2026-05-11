import {
  HeroSection,
  TestsSection,
  AIAnalysisSection,
  BranchesSection,
  BadgesSection,
  CTASection,
  LandingNavigation,
  LandingFooter,
} from '@/components/landing';

export default function Home() {
  return (
    <>
      {/*
        Hero için kritik poster ipucu. Video kaynağını LazyVideo eager olarak
        kendisi başlatıyor; link rel=preload + as=video Chrome'da desteklenmediği
        için console warning üretiyordu.
      */}
      <link
        rel="preload"
        as="image"
        href="/images/hero-gym-poster.jpg"
        fetchPriority="high"
      />
      <main className="relative bg-[var(--whistle-cream)] text-[var(--form-navy)]">
        <LandingNavigation />
        <HeroSection />
        <TestsSection />
        <AIAnalysisSection />
        <BranchesSection />
        <BadgesSection />
        <CTASection />
        <LandingFooter />
      </main>
    </>
  );
}
