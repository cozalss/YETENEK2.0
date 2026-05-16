/**
 * Ders → rehber video URL eşlemesi.
 *
 * Tüm videolar `public/videos/lessons/${lessonId}.mp4` formatında.
 * Şu an 24/24 ders kapsanmış durumda — `MISSING_LESSON_VIDEOS` boş.
 * Eksik bir ders gelirse buraya eklenir, UI rehber paneli render etmez.
 */

const MISSING_LESSON_VIDEOS = new Set<string>();

export function getLessonVideoUrl(lessonId: string): string | null {
  if (MISSING_LESSON_VIDEOS.has(lessonId)) return null;
  return `/videos/lessons/${lessonId}.mp4`;
}
