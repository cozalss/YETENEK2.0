/**
 * Kullanıcının test sonrası seçtiği branşı persist eder.
 *
 * Schema:
 *   yetenek:enrollment → { sportSlug, enrolledAt }
 *
 * Tek slot — yeni seçim eskini değiştirir. Profil sayfasında "antrenman
 * programım" gösterilirken bu store'dan okunur.
 *
 * Supabase'e yazılmıyor (hackathon kapsamı). İleride çoklu çocuk × spor
 * için Supabase tablosuna geçirilebilir.
 */

const STORAGE_KEY = 'yetenek:enrollment';

export interface SportEnrollment {
  sportSlug: string;
  enrolledAt: number; // ms epoch
}

function readEnrollment(): SportEnrollment | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SportEnrollment>;
    if (typeof parsed?.sportSlug !== 'string' || typeof parsed.enrolledAt !== 'number') {
      return null;
    }
    return { sportSlug: parsed.sportSlug, enrolledAt: parsed.enrolledAt };
  } catch {
    return null;
  }
}

function writeEnrollment(enrollment: SportEnrollment | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (enrollment == null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enrollment));
    }
  } catch {
    // localStorage quota / private browsing — sessizce yut
  }
}

export function enrollInSport(sportSlug: string): SportEnrollment {
  const enrollment: SportEnrollment = {
    sportSlug,
    enrolledAt: Date.now(),
  };
  writeEnrollment(enrollment);
  // Best-effort DB persistence — user logged-in ise Supabase'e yaz, anonim
  // ise 401 sessizce yutulur. UI bunun bitmesini beklemez.
  void persistEnrollmentToServer(sportSlug);
  return enrollment;
}

async function persistEnrollmentToServer(sportSlug: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/lessons/enroll', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sportSlug }),
      // credentials default 'same-origin' — Supabase auth cookie'si zaten gelir.
    });
  } catch {
    // Offline / network hatası — localStorage zaten yazıldı, sonraki ziyarette
    // kullanıcı tekrar seçim yapabilir veya başka cihazdan yazılır.
  }
}

export function getEnrolledSport(): SportEnrollment | null {
  return readEnrollment();
}

export function unenroll(): void {
  writeEnrollment(null);
}
