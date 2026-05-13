/**
 * Ders kartı — ders listesindeki bir hareketi temsil eder.
 *
 * Tamamlanma durumunu localStorage'dan okur (`isLessonCompleted`).
 * Sırayla kilitlemiyoruz — kullanıcı istediği derse atlayabilir
 * (hackathon demo basitliği için).
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isLessonCompleted } from '@/lib/lessons/store';
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
}

export function LessonCard({ lesson }: LessonCardProps) {
  // SSR sırasında bilinemez — mount sonrası read et.
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    setCompleted(isLessonCompleted(lesson.id));
  }, [lesson.id]);

  return (
    <Link
      href={`/lessons/${lesson.sportSlug}/${lesson.id}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
      style={{
        borderColor: 'var(--color-line)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header satırı — order numarası + difficulty pill + completed badge */}
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
