/**
 * Ders ilerlemesi — localStorage tabanlı, client-side only.
 *
 * Schema:
 *   yetenek:lessons → { completed: Record<lessonId, LessonAttempt> }
 *
 * Hackathon kapsamı: Supabase'e yazma yok. Profil sayfası ve ders kartları
 * "completed" rozetini bu store'dan okur. Demo'da localStorage temizlenmedikçe
 * progress kaybolmaz.
 */

import type { LessonAttempt } from './types';

const STORAGE_KEY = 'yetenek:lessons';

interface LessonsState {
  completed: Record<string, LessonAttempt>;
}

function readState(): LessonsState {
  if (typeof window === 'undefined') return { completed: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: {} };
    const parsed = JSON.parse(raw) as Partial<LessonsState>;
    return { completed: parsed?.completed ?? {} };
  } catch {
    return { completed: {} };
  }
}

function writeState(state: LessonsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage quota / private browsing — sessizce yut, ders sonuçları
    // ephemeral kalsın, akış bozulmasın.
  }
}

export function markLessonCompleted(attempt: LessonAttempt): void {
  const state = readState();
  const next: LessonsState = {
    completed: { ...state.completed, [attempt.lessonId]: attempt },
  };
  writeState(next);
  void persistLessonToServer(attempt);
}

async function persistLessonToServer(attempt: LessonAttempt): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/lessons/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lessonId: attempt.lessonId,
        sportSlug: attempt.sportSlug,
        durationMs: Math.round(attempt.durationMs),
        reps: attempt.reps,
      }),
    });
  } catch {
    // Best-effort — localStorage zaten yazıldı.
  }
}

export function isLessonCompleted(lessonId: string): boolean {
  return readState().completed[lessonId] != null;
}

export function getCompletedLessons(): readonly LessonAttempt[] {
  return Object.values(readState().completed).sort(
    (a, b) => b.completedAt - a.completedAt,
  );
}

export function getCompletedCountForSport(sportSlug: string): number {
  return Object.values(readState().completed).filter(
    (a) => a.sportSlug === sportSlug,
  ).length;
}

export function clearAllLessons(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignored
  }
}
