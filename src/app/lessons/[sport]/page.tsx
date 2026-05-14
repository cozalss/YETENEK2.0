/**
 * Bir branş için ders listesi sayfası.
 *
 * Route: /lessons/[sport]
 * Server Component — statik render, curriculum.ts'den okur.
 * Ders kartlarının completion durumu LessonCard içinde client-side
 * (localStorage) okunur.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LessonCard } from '@/components/lessons/LessonCard';
import { getCurriculumBySlug } from '@/lib/lessons/curriculum';
import { getSport } from '@/lib/content/sports';
import {
  getLessonInstructions,
  getSportBySlug,
} from '@/infrastructure/storage/supabase-content-repository';
import { supabaseLessonRepository } from '@/infrastructure/storage/supabase-lesson-repository';
import type { SportLesson } from '@/lib/lessons/types';

// generateStaticParams kapatıldı — ?childId query param dinamik render gerektirir.
// Sayfanın kendisi hızlı; ISR cache içerik tablolarını çoktan cache'liyor.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ sport: string }>;
  searchParams: Promise<{ childId?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { sport } = await params;
  const curriculum = getCurriculumBySlug(sport);
  if (!curriculum) return { title: 'Dersler bulunamadı' };
  return {
    title: `${curriculum.sportName} Dersleri · Yetenek 2.0`,
    description: `${curriculum.sportName} için adım adım hareket dersleri — basitten zora.`,
  };
}

export default async function LessonsListPage({ params, searchParams }: PageProps) {
  const { sport } = await params;
  const { childId } = await searchParams;
  const curriculum = getCurriculumBySlug(sport);
  if (!curriculum) notFound();

  // Talimatları DB'den enrich et (varsa); validator config curriculum'da kalır.
  const dbInstr = await getLessonInstructions();
  const lessons: SportLesson[] = curriculum.lessons.map((l) => {
    const override = dbInstr.get(l.id);
    if (!override) return l;
    return {
      ...l,
      name: override.name,
      description: override.description,
      difficulty: override.difficulty,
      instructions: override.instructions,
    };
  });

  const sportInfo = (await getSportBySlug(sport)) ?? getSport(sport);

  // childId verilmişse DB'den o çocuğun tamamlanan derslerini çek (SSR doğru göster).
  let completedLessonIds = new Set<string>();
  if (childId) {
    const completedResult = await supabaseLessonRepository.listCompleted({
      childId,
      sportSlug: sport,
    });
    if (completedResult.ok) {
      completedLessonIds = new Set(completedResult.value.map((c) => c.lessonId));
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-6 pt-12 pb-20 md:px-12 md:pt-16">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Profilime dön
        </Link>

        {/* Hero */}
        <header className="mt-10 flex items-start gap-6">
          <span className="text-7xl md:text-8xl" aria-hidden="true">
            {curriculum.emoji}
          </span>
          <div className="flex-1 space-y-3">
            <p className="font-mono text-xs tracking-[0.25em] text-[var(--color-signal)] uppercase">
              Antrenman · Dersler
            </p>
            <h1 className="text-4xl leading-[0.95] font-bold tracking-tight md:text-5xl">
              {curriculum.sportName} dersleri
            </h1>
            <p className="text-base text-[var(--color-ink-2)] md:text-lg">
              Kamera önünde, kolay hareketten zora doğru. Her ders 30 sn – 1 dk.
            </p>
          </div>
        </header>

        {/* Lessons grid */}
        <section className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              allLessons={lessons.map((l) => ({ id: l.id, order: l.order }))}
              childId={childId}
              initialCompleted={completedLessonIds.has(lesson.id)}
              initialCompletedIds={Array.from(completedLessonIds)}
            />
          ))}
        </section>

        {/* Sport detail link */}
        {sportInfo && (
          <section className="mt-12 rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
            <p className="font-mono text-xs tracking-[0.2em] text-[var(--color-signal)] uppercase">
              Bu spor hakkında
            </p>
            <h2 className="mt-2 text-xl font-bold md:text-2xl">
              {sportInfo.name} nedir, kimler oynar?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-2)]">
              {sportInfo.description}
            </p>
            <Link
              href={`/sports/${sportInfo.slug}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--form-navy)] underline-offset-4 hover:underline"
            >
              Tam spor rehberini gör →
            </Link>
          </section>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
