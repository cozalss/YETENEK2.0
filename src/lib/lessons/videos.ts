/**
 * Ders → rehber video URL eşlemesi.
 *
 * Tüm videolar `public/videos/lessons/${lessonId}.mp4` formatında.
 * Şu an 24/84 ders video kapsamında — 60 yeni ders rehber video bekliyor.
 * Eksik bir ders gelirse buraya eklenir, UI rehber paneli render etmez.
 */

const MISSING_LESSON_VIDEOS = new Set<string>([
  'taekwondo-3',
  'taekwondo-4',
  'taekwondo-5',
  'taekwondo-6',
  'taekwondo-7',
  'boks-3',
  'boks-4',
  'boks-5',
  'boks-6',
  'boks-7',
  'voleybol-3',
  'voleybol-4',
  'voleybol-5',
  'voleybol-6',
  'voleybol-7',
  'basketbol-3',
  'basketbol-4',
  'basketbol-5',
  'basketbol-6',
  'basketbol-7',
  'tenis-3',
  'tenis-4',
  'tenis-5',
  'tenis-6',
  'tenis-7',
  'yuzme-3',
  'yuzme-4',
  'yuzme-5',
  'yuzme-6',
  'yuzme-7',
  'futbol-3',
  'futbol-4',
  'futbol-5',
  'futbol-6',
  'futbol-7',
  'atletizm-3',
  'atletizm-4',
  'atletizm-5',
  'atletizm-6',
  'atletizm-7',
  'cimnastik-3',
  'cimnastik-4',
  'cimnastik-5',
  'cimnastik-6',
  'cimnastik-7',
  'judo-3',
  'judo-4',
  'judo-5',
  'judo-6',
  'judo-7',
  'masa-tenisi-3',
  'masa-tenisi-4',
  'masa-tenisi-5',
  'masa-tenisi-6',
  'masa-tenisi-7',
  'badminton-3',
  'badminton-4',
  'badminton-5',
  'badminton-6',
  'badminton-7',
]);

export function getLessonVideoUrl(lessonId: string): string | null {
  if (MISSING_LESSON_VIDEOS.has(lessonId)) return null;
  return `/videos/lessons/${lessonId}.mp4`;
}
