/**
 * Ders → rehber video URL eşlemesi.
 *
 * Tüm videolar `public/videos/lessons/${lessonId}.mp4` formatında;
 * fakat 1 ders eksik: `badminton-1` videosu yok (kullanıcı not).
 * Bu fonksiyon eksikse `null` döner ve UI rehber paneli render etmez.
 */

const MISSING_LESSON_VIDEOS = new Set<string>(['badminton-1']);

export function getLessonVideoUrl(lessonId: string): string | null {
  if (MISSING_LESSON_VIDEOS.has(lessonId)) return null;
  return `/videos/lessons/${lessonId}.mp4`;
}
