/**
 * Kullanıcının test sonrası bir çocuk için seçtiği branşı persist eder.
 *
 * Schema (localStorage):
 *   yetenek:enrollment:{childId} → { sportSlug, enrolledAt }
 *
 * Bir veli birden çok çocuğu olduğunda her çocuğun ayrı slot'u var.
 * DB tarafı: lesson_enrollment (user_id, child_id) PK.
 */

const STORAGE_PREFIX = 'yetenek:enrollment:';

export interface SportEnrollment {
  childId: string;
  sportSlug: string;
  enrolledAt: number; // ms epoch
}

function storageKey(childId: string): string {
  return `${STORAGE_PREFIX}${childId}`;
}

function readEnrollment(childId: string): SportEnrollment | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(childId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SportEnrollment>;
    if (
      typeof parsed?.sportSlug !== 'string' ||
      typeof parsed.enrolledAt !== 'number'
    ) {
      return null;
    }
    return {
      childId,
      sportSlug: parsed.sportSlug,
      enrolledAt: parsed.enrolledAt,
    };
  } catch {
    return null;
  }
}

function writeEnrollment(enrollment: SportEnrollment | null, childId: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (enrollment == null) {
      window.localStorage.removeItem(storageKey(childId));
    } else {
      window.localStorage.setItem(storageKey(childId), JSON.stringify(enrollment));
    }
  } catch {
    // localStorage quota / private browsing — sessizce yut
  }
}

export function enrollInSport(
  childId: string,
  sportSlug: string,
): SportEnrollment {
  const enrollment: SportEnrollment = {
    childId,
    sportSlug,
    enrolledAt: Date.now(),
  };
  writeEnrollment(enrollment, childId);
  void persistEnrollmentToServer(childId, sportSlug);
  return enrollment;
}

export function getEnrolledSport(childId: string): SportEnrollment | null {
  return readEnrollment(childId);
}

export function unenroll(childId: string): void {
  writeEnrollment(null, childId);
}

async function persistEnrollmentToServer(
  childId: string,
  sportSlug: string,
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/lessons/enroll', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ childId, sportSlug }),
    });
  } catch {
    // Offline / network hatası — localStorage zaten yazıldı.
  }
}
