/**
 * Ders kartı — ders listesindeki bir hareketi temsil eder.
 *
 * Sıralı kilit: 1. ders her zaman açık; 2. ders 1'i bitirince açılır;
 * 3. ders 2'yi bitirince açılır… (Duolingo paterni). Kilitli ders kart
 * görseli pasif, tıklanamaz.
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  getCompletedLessonIdsForSport,
  isLessonCompleted,
  isLessonUnlocked,
} from '@/lib/lessons/store';
import type { SportLesson } from '@/lib/lessons/types';

const DIFFICULTY_LABEL: Record<SportLesson['difficulty'], string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

const DIFFICULTY_COLOR: Record<SportLesson['difficulty'], string> = {
  beginner: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  intermediate: 'bg-amber-100 text-amber-900 ring-amber-300',
  advanced: 'bg-rose-100 text-rose-900 ring-rose-300',
};

interface LessonCardProps {
  lesson: SportLesson;
  /** Aynı branştaki tüm dersler — kilit zinciri için. */
  allLessons: ReadonlyArray<Pick<SportLesson, 'id' | 'order'>>;
  /** Hangi çocuğun ilerlemesini göstereceğiz; verilmezse "anonim" mod. */
  childId?: string;
  /** Server-side bilinen tamamlanma (DB query); set'liyse SSR doğru gösterir. */
  initialCompleted?: boolean;
  /** Server-side bilinen tamamlanmış ders id'leri — kilit SSR-friendly. */
  initialCompletedIds?: ReadonlyArray<string>;
}

export function LessonCard({
  lesson,
  allLessons,
  childId,
  initialCompleted = false,
  initialCompletedIds,
}: LessonCardProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [completedIds, setCompletedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialCompletedIds ?? []),
  );

  useEffect(() => {
    if (!childId) return;
    setCompleted(isLessonCompleted(childId, lesson.id));
    setCompletedIds(getCompletedLessonIdsForSport(childId, lesson.sportSlug));
  }, [childId, lesson.id, lesson.sportSlug]);

  const unlocked = isLessonUnlocked(lesson, allLessons, completedIds);

  // Kilitliyse → tıklanmayan static div; açıksa → Link.
  if (!unlocked) {
    return (
      <div
        className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border-2 border-dashed bg-white/40 p-6 opacity-70"
        style={{ borderColor: 'var(--color-line-strong)' }}
        aria-disabled="true"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full font-black"
              style={{
                background: 'rgba(44, 62, 107, 0.12)',
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {lesson.order}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 ${DIFFICULTY_COLOR[lesson.difficulty]}`}
            >
              {DIFFICULTY_LABEL[lesson.difficulty]}
            </span>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background: 'rgba(44, 62, 107, 0.08)',
              color: 'var(--color-ink-2)',
            }}
            aria-label="Bu ders kilitli"
          >
            <Lock className="h-3.5 w-3.5" />
            Kilitli
          </span>
        </div>

        <h3
          className="text-xl font-bold leading-tight"
          style={{ color: 'var(--color-ink-2)', fontFamily: 'var(--font-display)' }}
        >
          {lesson.name}
        </h3>

        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--color-ink-3)' }}
        >
          {lesson.description}
        </p>

        <p
          className="mt-auto rounded-lg px-3 py-2 text-xs font-bold"
          style={{
            background: 'rgba(242, 201, 76, 0.18)',
            color: 'var(--form-navy)',
          }}
        >
          🔒 Önce {lesson.order - 1}. dersi tamamla
        </p>
      </div>
    );
  }

  const href = childId
    ? `/lessons/${lesson.sportSlug}/${lesson.id}?childId=${encodeURIComponent(childId)}`
    : `/lessons/${lesson.sportSlug}/${lesson.id}`;

  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
      style={{
        borderColor: 'var(--color-line)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full font-black"
            style={{
              background: 'var(--track-mustard)',
              color: 'var(--deep-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {lesson.order}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 ${DIFFICULTY_COLOR[lesson.difficulty]}`}
          >
            {DIFFICULTY_LABEL[lesson.difficulty]}
          </span>
        </div>
        {completed && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background: 'var(--field-mint)',
              color: 'var(--deep-navy)',
            }}
            aria-label="Bu ders tamamlandı"
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 0 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0Z"
                clipRule="evenodd"
              />
            </svg>
            Tamam
          </span>
        )}
      </div>

      <h3
        className="text-xl font-bold leading-tight"
        style={{ color: 'var(--form-navy)', fontFamily: 'var(--font-display)' }}
      >
        {lesson.name}
      </h3>

      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-ink-2)' }}
      >
        {lesson.description}
      </p>

      <div className="mt-auto flex items-center justify-between pt-2">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--color-ink-3)' }}
        >
          {validatorLabel(lesson)}
        </span>
        <span
          className="inline-flex items-center gap-1 text-sm font-bold transition-transform group-hover:translate-x-1"
          style={{ color: 'var(--form-navy)' }}
        >
          {completed ? 'Tekrar yap' : 'Başla'}
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L11.6 10 7.3 5.7a1 1 0 0 1 0-1.4Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function validatorLabel(lesson: SportLesson): string {
  switch (lesson.validator.type) {
    case 'staticPose':
      return `${(lesson.validator.holdMs / 1000).toFixed(0)} sn sabit dur`;
    case 'reach':
      return `${lesson.validator.reps} tekrar uzanma`;
    case 'verticalRep':
      return `${lesson.validator.reps} tekrar ${lesson.validator.pattern === 'jumpUp' ? 'sıçra' : 'çömel'}`;
    case 'demo':
      return 'Demo modu';
  }
}
