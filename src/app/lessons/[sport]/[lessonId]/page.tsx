/**
 * Tek ders sayfası.
 *
 * Route: /lessons/[sport]/[lessonId]
 * Server Component shell — `LessonRunner` (client) içinde kamera + validator.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { LessonRunner } from '@/components/lessons/LessonRunner';
import { getLessonById } from '@/lib/lessons/curriculum';
import { getLessonInstruction } from '@/infrastructure/storage/supabase-content-repository';
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

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeader />

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

        <LessonRunner
          lesson={composedLesson}
          nextLessonId={next?.id}
          childId={childId}
        />
      </div>
    </main>
  );
}
