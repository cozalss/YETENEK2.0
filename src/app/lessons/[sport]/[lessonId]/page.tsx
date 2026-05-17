/**
 * Tek ders sayfası.
 *
 * Route: /lessons/[sport]/[lessonId]
 * Server Component shell — `LessonRunner` (client) içinde kamera + validator.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { SiteHeaderServer } from '@/components/layout/SiteHeaderServer';
import { LessonRunner } from '@/components/lessons/LessonRunner';
import { getLessonById } from '@/lib/lessons/curriculum';
import { getLessonInstruction } from '@/infrastructure/storage/supabase-content-repository';
import { supabaseLessonRepository } from '@/infrastructure/storage/supabase-lesson-repository';
import type { SportLesson } from '@/lib/lessons/types';

// ?childId query param ile dinamik — SSG kapatıldı.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ sport: string; lessonId: string }>;
  searchParams: Promise<{ childId?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { sport, lessonId } = await params;
  const data = getLessonById(sport, lessonId);
  if (!data) return { title: 'Ders bulunamadı' };
  return {
    title: `${data.lesson.name} · ${data.curriculum.sportName} Dersi`,
    description: data.lesson.description,
  };
}

export default async function LessonRunnerPage({
  params,
  searchParams,
}: PageProps) {
  const { sport, lessonId } = await params;
  const { childId } = await searchParams;
  const data = getLessonById(sport, lessonId);
  if (!data) notFound();

  const { curriculum, lesson } = data;

  // DB'de güncellenmiş talimat metni varsa kullan — validator config kod'da kalır.
  const dbInstr = await getLessonInstruction(lesson.id);
  const composedLesson: SportLesson = dbInstr
    ? {
        ...lesson,
        name: dbInstr.name,
        description: dbInstr.description,
        difficulty: dbInstr.difficulty,
        instructions: dbInstr.instructions,
      }
    : lesson;

  // Aynı branş içinde bir sonraki ders — başarı ekranında "Sonraki" link için.
  const currentIdx = curriculum.lessons.findIndex((l) => l.id === lesson.id);
  const next = curriculum.lessons[currentIdx + 1];

  // Sıralı kilit kontrolü: childId varsa (logged-in çocuk yolu) DB'den
  // tamamlanan dersleri çek; önceki ders bitmemişse kilitli panel göster.
  // childId yoksa (demo/anonim): her ders açık (persistence yok).
  let previousRequired: { id: string; name: string } | null = null;
  if (childId && lesson.order > 1) {
    const previous = curriculum.lessons.find(
      (l) => l.order === lesson.order - 1
    );
    if (previous) {
      const completedResult = await supabaseLessonRepository.listCompleted({
        childId,
        sportSlug: curriculum.sportSlug,
      });
      const completedIds = new Set(
        completedResult.ok ? completedResult.value.map((c) => c.lessonId) : []
      );
      if (!completedIds.has(previous.id)) {
        previousRequired = { id: previous.id, name: previous.name };
      }
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeaderServer />

      <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 md:px-8 md:pt-12">
        <Link
          href={
            childId
              ? `/lessons/${curriculum.sportSlug}?childId=${encodeURIComponent(childId)}`
              : `/lessons/${curriculum.sportSlug}`
          }
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {curriculum.sportName} dersleri
        </Link>

        {previousRequired ? (
          <LockedLessonPanel
            sportName={curriculum.sportName}
            sportSlug={curriculum.sportSlug}
            lessonName={composedLesson.name}
            previous={previousRequired}
            childId={childId}
          />
        ) : (
          <LessonRunner
            lesson={composedLesson}
            nextLessonId={next?.id}
            childId={childId}
          />
        )}
      </div>
    </main>
  );
}

function LockedLessonPanel({
  sportName,
  sportSlug,
  lessonName,
  previous,
  childId,
}: {
  sportName: string;
  sportSlug: string;
  lessonName: string;
  previous: { id: string; name: string };
  childId?: string;
}) {
  const qs = childId ? `?childId=${encodeURIComponent(childId)}` : '';
  return (
    <section
      className="mx-auto mt-8 max-w-2xl rounded-3xl border-2 p-8 text-center md:p-12"
      style={{
        background: 'rgba(242, 201, 76, 0.12)',
        borderColor: 'var(--track-mustard)',
      }}
    >
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'var(--track-mustard)' }}
      >
        <Lock className="h-8 w-8" style={{ color: 'var(--deep-navy)' }} />
      </div>
      <h2
        className="mt-5 text-3xl font-black md:text-4xl"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Bu ders henüz kilitli
      </h2>
      <p
        className="mx-auto mt-3 max-w-md text-base"
        style={{ color: 'var(--form-navy)', opacity: 0.75 }}
      >
        <strong>{lessonName}</strong> dersini açmak için önce{' '}
        <strong>{previous.name}</strong> dersini tamamlamalısın. Duolingo gibi
        sırayla ilerle — her ders öncekinin üstüne kuruluyor.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/lessons/${sportSlug}/${previous.id}${qs}`}
          className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-black tracking-widest uppercase"
          style={{
            background: 'var(--track-mustard)',
            color: 'var(--deep-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {previous.name} dersine git →
        </Link>
        <Link
          href={`/lessons/${sportSlug}${qs}`}
          className="inline-flex h-11 items-center gap-2 rounded-full border-2 px-5 text-sm font-bold"
          style={{
            borderColor: 'var(--form-navy)',
            color: 'var(--form-navy)',
          }}
        >
          ← {sportName} dersleri
        </Link>
      </div>
    </section>
  );
}
