/**
 * Profil sayfasında "Antrenman programım" kartı.
 *
 * Server tarafında `lesson_enrollment` + `lesson_progress` Supabase'den
 * çekilir; bu komponent saf görsel.
 *
 * Enrollment yoksa: nazikçe "henüz spor seçmedin" çağrısı.
 * Enrollment varsa: branş kartı + curriculum'daki toplam dersle eşleştirilmiş
 * tamamlama oranı + ders listesine link.
 */

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getCurriculumBySlug } from '@/lib/lessons/curriculum';
import type { EnrollmentRecord, ProgressRecord } from '@/infrastructure/storage/supabase-lesson-repository';

interface EnrolledSportCardProps {
  enrollment: EnrollmentRecord | null;
  completed: ReadonlyArray<ProgressRecord>;
  /** Çocuk id — ders linklerinin per-child kalmasi icin query'e eklenir. */
  childId: string;
}

export function EnrolledSportCard({
  enrollment,
  completed,
  childId,
}: EnrolledSportCardProps) {
  if (!enrollment) return <NotEnrolledCard childId={childId} />;

  const curriculum = getCurriculumBySlug(enrollment.sportSlug);
  if (!curriculum) return <NotEnrolledCard childId={childId} />;

  const completedForSport = completed.filter(
    (c) => c.sportSlug === enrollment.sportSlug,
  );
  const completedLessonIds = new Set(completedForSport.map((c) => c.lessonId));
  const total = curriculum.lessons.length;
  const done = curriculum.lessons.filter((l) =>
    completedLessonIds.has(l.id),
  ).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section
      className="mt-10 rounded-3xl border-2 p-6 md:p-8"
      style={{
        background: 'rgba(242, 201, 76, 0.12)',
        borderColor: 'var(--track-mustard)',
      }}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="text-5xl md:text-6xl" aria-hidden="true">
            {curriculum.emoji}
          </span>
          <div>
            <p
              className="text-xs font-bold tracking-[0.25em] uppercase"
              style={{ color: 'var(--track-mustard)' }}
            >
              Antrenman Programım
            </p>
            <h2
              className="mt-1 text-3xl font-black md:text-4xl"
              style={{
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {curriculum.sportName}
            </h2>
            <p
              className="mt-2 text-sm md:text-base"
              style={{ color: 'var(--form-navy)', opacity: 0.7 }}
            >
              Kayıt tarihi:{' '}
              {new Date(enrollment.enrolledAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <Link
          href={`/lessons/${curriculum.sportSlug}?childId=${encodeURIComponent(childId)}`}
          className="group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:translate-x-0.5"
          style={{
            background: 'var(--form-navy)',
            color: 'var(--whistle-cream)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Derslerime git
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </header>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <p
            className="text-sm font-bold"
            style={{ color: 'var(--form-navy)' }}
          >
            İlerleme
          </p>
          <p
            className="font-mono text-sm font-bold"
            style={{ color: 'var(--form-navy)' }}
          >
            {done} / {total} ders · %{percent}
          </p>
        </div>
        <div
          className="mt-2 h-3 w-full overflow-hidden rounded-full"
          style={{ background: 'rgba(44, 62, 107, 0.1)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${percent}%`,
              background: 'var(--track-mustard)',
            }}
            aria-hidden
          />
        </div>
      </div>

      {/* Lesson list */}
      <ol className="mt-6 space-y-2">
        {curriculum.lessons.map((lesson) => {
          const isDone = completedLessonIds.has(lesson.id);
          return (
            <li
              key={lesson.id}
              className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
              style={{
                background: isDone
                  ? 'rgba(168, 213, 186, 0.25)'
                  : 'rgba(255, 255, 255, 0.6)',
                borderColor: isDone
                  ? 'var(--field-mint)'
                  : 'var(--color-line)',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black"
                  style={{
                    background: isDone
                      ? 'var(--field-mint)'
                      : 'var(--whistle-cream)',
                    color: 'var(--form-navy)',
                    border: isDone
                      ? 'none'
                      : '1px solid var(--color-line-strong)',
                  }}
                >
                  {isDone ? '✓' : lesson.order}
                </span>
                <span
                  className="text-sm font-bold md:text-base"
                  style={{ color: 'var(--form-navy)' }}
                >
                  {lesson.name}
                </span>
              </div>
              <Link
                href={`/lessons/${curriculum.sportSlug}/${lesson.id}?childId=${encodeURIComponent(childId)}`}
                className="text-xs font-bold transition-colors hover:underline"
                style={{ color: 'var(--form-navy)' }}
              >
                {isDone ? 'Tekrar yap' : 'Başla'} →
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function NotEnrolledCard({ childId }: { childId: string }) {
  return (
    <section
      className="mt-10 rounded-3xl border-2 p-6 text-center md:p-10"
      style={{
        background: 'rgba(168, 213, 186, 0.18)',
        borderColor: 'var(--field-mint)',
      }}
    >
      <Sparkles
        className="mx-auto h-8 w-8"
        style={{ color: 'var(--form-navy)', opacity: 0.6 }}
      />
      <h2
        className="mt-3 text-2xl font-black md:text-3xl"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Henüz bir antrenman programı seçilmedi
      </h2>
      <p
        className="mx-auto mt-3 max-w-md text-sm md:text-base"
        style={{ color: 'var(--form-navy)', opacity: 0.75 }}
      >
        Testi tamamlayıp önerilen sporlardan birini seçerek antrenman programını
        başlat. Her ders 30 sn – 1 dk; basit hareketten zora doğru ilerle.
      </p>
      <Link
        href={`/test/full?childId=${encodeURIComponent(childId)}`}
        className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-widest"
        style={{
          background: 'var(--track-mustard)',
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Teste Başla
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
