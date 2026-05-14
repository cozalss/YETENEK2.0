/**
 * Ders ilerlemesi — localStorage tabanlı per-child, client-side only.
 *
 * Schema:
 *   yetenek:lessons:{childId} → { completed: Record<lessonId, LessonAttempt> }
 *
 * Dual-write: localStorage anında, sonra POST /api/lessons/progress
 * fire-and-forget (logged-in user için DB persistence).
 */

import type { LessonAttempt } from './types';

const STORAGE_PREFIX = 'yetenek:lessons:';

interface LessonsState {
  completed: Record<string, LessonAttempt>;
}

function storageKey(childId: string): string {
  return `${STORAGE_PREFIX}${childId}`;
}

function readState(childId: string): LessonsState {
  if (typeof window === 'undefined') return { completed: {} };
  try {
    const raw = window.localStorage.getItem(storageKey(childId));
    if (!raw) return { completed: {} };
    const parsed = JSON.parse(raw) as Partial<LessonsState>;
    return { completed: parsed?.completed ?? {} };
  } catch {
    return { completed: {} };
  }
}

function writeState(childId: string, state: LessonsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(childId), JSON.stringify(state));
  } catch {
    // localStorage quota / private browsing — sessizce yut
  }
}

export function markLessonCompleted(
  childId: string,
  attempt: LessonAttempt,
): void {
  const state = readState(childId);
  const next: LessonsState = {
    completed: { ...state.completed, [attempt.lessonId]: attempt },
  };
  writeState(childId, next);
  void persistLessonToServer(childId, attempt);
}

export function isLessonCompleted(childId: string, lessonId: string): boolean {
  return readState(childId).completed[lessonId] != null;
}

export function getCompletedLessons(
  childId: string,
): readonly LessonAttempt[] {
  return Object.values(readState(childId).completed).sort(
    (a, b) => b.completedAt - a.completedAt,
  );
}

export function getCompletedCountForSport(
  childId: string,
  sportSlug: string,
): number {
  return Object.values(readState(childId).completed).filter(
    (a) => a.sportSlug === sportSlug,
  ).length;
}

/**
 * Bir sporun tamamlanmış ders id'lerinin set'i — sıralı kilit kontrolü için.
 */
export function getCompletedLessonIdsForSport(
  childId: string,
  sportSlug: string,
): ReadonlySet<string> {
  return new Set(
    Object.values(readState(childId).completed)
      .filter((a) => a.sportSlug === sportSlug)
      .map((a) => a.lessonId),
  );
}

interface LessonOrderRef {
  readonly id: string;
  readonly order: number;
}

/**
 * Bir dersin kullanıcı tarafından oynanabilir (kilitsiz) olup olmadığı.
 *
 * Duolingo-stili sıralı progresyon:
 *   - order === 1 → her zaman kilitsiz
 *   - order > 1   → ÖNCEKİ ders tamamlanmış olmalı
 *
 * Çocuk seçilmemişse (childId yok) tamamlama bilinemez → sadece order=1
 * kilitsiz, gerisi kilitli görünür. Kullanıcı önce profil → çocuk seçer.
 */
export function isLessonUnlocked(
  lesson: LessonOrderRef,
  allLessonsForSport: readonly LessonOrderRef[],
  completedIds: ReadonlySet<string>,
): boolean {
  if (lesson.order <= 1) return true;
  const previous = allLessonsForSport.find((l) => l.order === lesson.order - 1);
  if (!previous) return true; // numerik boşluk varsa kilitsiz say
  return completedIds.has(previous.id);
}

export function clearAllLessons(childId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(childId));
  } catch {
    // ignored
  }
}

async function persistLessonToServer(
  childId: string,
  attempt: LessonAttempt,
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/lessons/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        childId,
        lessonId: attempt.lessonId,
        sportSlug: attempt.sportSlug,
        durationMs: Math.round(attempt.durationMs),
        reps: attempt.reps,
      }),
    });
  } catch {
    // Best-effort
  }
}
