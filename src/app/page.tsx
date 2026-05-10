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
        Hero için kritik kaynak ipuçları. Browser HTML parse anında bu iki
        dosyayı (poster + video) JS hydrate'i beklemeden almaya başlar, böylece
        sayfa açıldığında hero görseli neredeyse anında belirir.
      */}
      <link
        rel="preload"
        as="image"
        href="/images/hero-gym-poster.jpg"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="video"
        type="video/mp4"
        href="/videos/hero-gym.mp4"
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
