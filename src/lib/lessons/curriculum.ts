/**
 * 12 branş için ders curriculum'u.
 *
 * Her branş 2 ders alır:
 *   1. Hazır duruş (staticPose, 3 sn) — beginner
 *   2. Branşın temsili hareketi (reach veya verticalRep, 3 tekrar) — intermediate
 *
 * Tasarım kararı: az ama dolu — hackathon demo'da her branş için somut bir
 * şey gösterilir, validator config aynı 4 family'den seçilir, yeni branş
 * eklemek = 6-10 satır JSON.
 */

import type { SportCurriculum } from './types';

export const CURRICULUM: readonly SportCurriculum[] = [
  // ────────────────────────────────────────────────────────────
  // Taekwondo — pitch'in flagship branşı
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'taekwondo',
    sportName: 'Taekwondo',
    emoji: '🥋',
    lessons: [
      {
        id: 'taekwondo-1',
        sportSlug: 'taekwondo',
        order: 1,
        name: 'Hazır Duruş (Joonbi)',
        description: 'Taekwondo seansının başlangıç duruşu — odaklan, dengeli dur.',
        difficulty: 'beginner',
        instructions: [
          'Ayakların omuz genişliğinde, paralel dur.',
          'Yumrukları kapat, bel hizasına getir.',
          'Sırtın dik, omuzlar gevşek.',
          '3 saniye boyunca sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'fullBody' },
      },
      {
        id: 'taekwondo-2',
        sportSlug: 'taekwondo',
        order: 2,
        name: 'Ön Tekme (Ap Chagi)',
        description: 'Diz yukarı, ayak ileri — 3 tekrarlı ön tekme dizisi.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Sağ dizini bel hizasına kaldır.',
          'Ayağı düz öne uzat ve indir.',
          'Toplam 3 tekme yap.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightAnkle',
          direction: 'up',
          threshold: 0.18,
          reps: 3,
        },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Boks
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'boks',
    sportName: 'Boks',
    emoji: '🥊',
    lessons: [
      {
        id: 'boks-1',
        sportSlug: 'boks',
        order: 1,
        name: 'Guard Duruşu',
        description: 'Klasik boks guard pozisyonu — savunma temeli.',
        difficulty: 'beginner',
        instructions: [
          'Sol ayak önde, hafif dizler bükük.',
          'Yumruklar yanak hizasında, dirsekler içeri.',
          'Çene aşağıda, gözler ileride.',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'upperBody' },
      },
      {
        id: 'boks-2',
        sportSlug: 'boks',
        order: 2,
        name: 'Direkt Yumruk (Jab)',
        description: 'Sol elden hızlı, düz yumruk — 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Guard pozisyonunda başla.',
          'Sol yumruğu öne hızla uzat.',
          'Yumruğu geri çek, guard\'a dön.',
          'Toplam 3 jab at.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'up',
          threshold: 0.15,
          reps: 3,
        },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Voleybol
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'voleybol',
    sportName: 'Voleybol',
    emoji: '🏐',
    lessons: [
      {
        id: 'voleybol-1',
        sportSlug: 'voleybol',
        order: 1,
        name: 'Hazır Duruş',
        description: 'Servis karşılama pozisyonu — bacaklar bükülü, eller önde.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinde, hafif öne eğil.',
          'Dizler hafif bükülü.',
          'Eller önde, parmak uçları birleşik.',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'fullBody' },
      },
      {
        id: 'voleybol-2',
        sportSlug: 'voleybol',
        order: 2,
        name: 'Smaç Sıçraması',
        description: 'Çömel, patla, yukarı sıçra — 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur.',
          'Hızla çömel (squat pozisyonu).',
          'Patlayıcı bir hareketle yukarı sıçra.',
          'Toplam 3 sıçrama.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 3 },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Basketbol
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'basketbol',
    sportName: 'Basketbol',
    emoji: '🏀',
    lessons: [
      {
        id: 'basketbol-1',
        sportSlug: 'basketbol',
        order: 1,
        name: 'Savunma Duruşu',
        description: 'Düşük basket savunma pozisyonu — dengeli ve hızlı reaksiyon.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinden geniş açıkta.',
          'Dizler bükülü, vücut hafif öne eğik.',
          'Eller yanlarda, avuçlar dışa dönük.',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'fullBody' },
      },
      {
        id: 'basketbol-2',
        sportSlug: 'basketbol',
        order: 2,
        name: 'Şut Sıçraması',
        description: 'Pas sonrası şut için patlayıcı dikey sıçrama — 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, eller şut pozisyonunda.',
          'Çömel ve hızla sıçra.',
          'Havada düz dur, in.',
          'Toplam 3 sıçrama.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 3 },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Tenis
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'tenis',
    sportName: 'Tenis',
    emoji: '🎾',
    lessons: [
      {
        id: 'tenis-1',
        sportSlug: 'tenis',
        order: 1,
        name: 'Ready Position',
        description: 'Servis karşılama duruşu — denge ve hızlı reaksiyon.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinde, hafif çömelmiş.',
          'Raket önde, iki elle tut.',
          'Vücut hafif öne eğik.',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'fullBody' },
      },
      {
        id: 'tenis-2',
        sportSlug: 'tenis',
        order: 2,
        name: 'Forehand Vuruşu',
        description: 'Sağ kol sağa uzansın — top karşılama vuruşu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Ready pozisyonunda başla.',
          'Sağ kolu sağa doğru uzat (vuruş).',
          'Geri ready pozisyonuna dön.',
          'Toplam 3 forehand.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'right',
          threshold: 0.2,
          reps: 3,
        },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Yüzme — kamera önünde simülasyon (kuru kulaç)
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'yuzme',
    sportName: 'Yüzme',
    emoji: '🏊',
    lessons: [
      {
        id: 'yuzme-1',
        sportSlug: 'yuzme',
        order: 1,
        name: 'Vücut Hizalama',
        description: 'Yüzme öncesi gergin, hizalanmış duruş — postür çalışması.',
        difficulty: 'beginner',
        instructions: [
          'Dik dur, eller yan tarafta.',
          'Karın kasları gergin, sırtın düz.',
          'Bakışlar ileri.',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'fullBody' },
      },
      {
        id: 'yuzme-2',
        sportSlug: 'yuzme',
        order: 2,
        name: 'Kuru Kulaç',
        description: 'Sağ kolun ileri uzanması — serbest stil kulaç simülasyonu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur.',
          'Sağ kolu yukarı/ileri uzat.',
          'Geri çek (su itme hareketi).',
          'Toplam 3 kulaç.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'up',
          threshold: 0.25,
          reps: 3,
        },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Futbol
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'futbol',
    sportName: 'Futbol',
    emoji: '⚽',
    lessons: [
      {
        id: 'futbol-1',
        sportSlug: 'futbol',
        order: 1,
        name: 'Hazır Bekleme',
        description: 'Topa hızlı tepki için merkezde dengeli duruş.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinde.',
          'Dizler hafif bükülü, ağırlık parmak uçlarında.',
          'Sırt dik, eller yanlarda hareketli.',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'fullBody' },
      },
      {
        id: 'futbol-2',
        sportSlug: 'futbol',
        order: 2,
        // Şut için knee drive (back swing prep) — futbol biomekanik: bacak
        // önce dizden yukarı çekilir (~0.13 normalize Y delta), sonra ayak
        // ileri savrulur. Diz kaldırma reach validator için robust trigger;
        // ankle UP yanlış sinyaller verir (şutta ankle önce GERİ gider).
        name: 'Şut Hareketi (Diz Çek)',
        description: 'Sağ dizini bele doğru kaldır, ardından ayağı öne savur — şut simülasyonu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Sol ayak yere basılı, sağ ayak hazır.',
          'Sağ dizini bel hizasına yukarı çek (back swing).',
          'Düz öne savur (şut), dizini indir.',
          'Toplam 3 şut.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightKnee',
          direction: 'up',
          threshold: 0.13,
          reps: 3,
        },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Atletizm
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'atletizm',
    sportName: 'Atletizm',
    emoji: '🏃',
    lessons: [
      {
        id: 'atletizm-1',
        sportSlug: 'atletizm',
        order: 1,
        name: 'Start Pozisyonu',
        description: 'Sprint başlangıç duruşu — patlayıcı çıkış için temel.',
        difficulty: 'beginner',
        instructions: [
          'Bir ayak önde, bir ayak arkada.',
          'Dizler hafif bükülü, vücut öne eğik.',
          'Kollar hareket pozisyonunda (biri önde, biri arkada).',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'fullBody' },
      },
      {
        id: 'atletizm-2',
        sportSlug: 'atletizm',
        order: 2,
        name: 'Diz Çekme',
        description: 'Sprint diz çekme drili — dizini bele kadar yukarı çek, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur.',
          'Sağ dizini bel hizasına yukarı çek.',
          'İndir, sol dize geç.',
          'Toplam 3 diz çekme.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightKnee',
          direction: 'up',
          threshold: 0.15,
          reps: 3,
        },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Cimnastik
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'cimnastik',
    sportName: 'Cimnastik',
    emoji: '🤸',
    lessons: [
      {
        id: 'cimnastik-1',
        sportSlug: 'cimnastik',
        order: 1,
        name: 'Sırt Düz Duruş',
        description: 'Mükemmel postür — cimnastiğin temeli, sırt-omuz hizası.',
        difficulty: 'beginner',
        instructions: [
          'Dik dur, ayaklar bitişik.',
          'Karın içeri, omuzlar arkada.',
          'Eller yana açık, parmak uçları gergin.',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'upperBody' },
      },
      {
        id: 'cimnastik-2',
        sportSlug: 'cimnastik',
        order: 2,
        name: 'Çömelme Drili',
        description: 'Kontrollü çömel-kalk — bacak gücü için, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur.',
          'Yavaşça çömel (kalçayı geri it).',
          'Geri kalk.',
          'Toplam 3 squat.',
        ],
        validator: { type: 'verticalRep', pattern: 'squatDown', reps: 3 },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Judo
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'judo',
    sportName: 'Judo',
    emoji: '🥋',
    lessons: [
      {
        id: 'judo-1',
        sportSlug: 'judo',
        order: 1,
        name: 'Shisei (Doğru Duruş)',
        description: 'Judo temel duruşu — dengeli, esnek, hazır.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinde.',
          'Dizler hafif bükülü.',
          'Sırt dik, omuzlar gevşek.',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'fullBody' },
      },
      {
        id: 'judo-2',
        sportSlug: 'judo',
        order: 2,
        name: 'Çömelme Hazırlığı',
        description: 'Rakibe atak için alçalma drili — 3 tekrarlı squat.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Hızla çömel (rakibin altına gir).',
          'Geri kalk.',
          'Toplam 3 tekrar.',
        ],
        validator: { type: 'verticalRep', pattern: 'squatDown', reps: 3 },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Masa Tenisi
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'masa-tenisi',
    sportName: 'Masa Tenisi',
    emoji: '🏓',
    lessons: [
      {
        id: 'masa-tenisi-1',
        sportSlug: 'masa-tenisi',
        order: 1,
        name: 'Hazır Duruş',
        description: 'Servis bekleme — düşük, hızlı reaksiyon pozisyonu.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinden geniş.',
          'Dizler bükülü, vücut hafif öne eğik.',
          'Raket önde, bel hizasında.',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'fullBody' },
      },
      {
        id: 'masa-tenisi-2',
        sportSlug: 'masa-tenisi',
        order: 2,
        name: 'Forehand Vuruş',
        description: 'Sağ kol sağa, hızlı vuruş simülasyonu — 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Sağ kolu sağa hızla uzat (vuruş).',
          'Geri çek.',
          'Toplam 3 vuruş.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'right',
          threshold: 0.15,
          reps: 3,
        },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Badminton
  // ────────────────────────────────────────────────────────────
  {
    sportSlug: 'badminton',
    sportName: 'Badminton',
    emoji: '🏸',
    lessons: [
      {
        id: 'badminton-1',
        sportSlug: 'badminton',
        order: 1,
        name: 'Hazır Duruş',
        description: 'Servis karşılama — dengeli, yüksek bir reaksiyon pozisyonu.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinde.',
          'Dizler hafif bükülü.',
          'Raket önde, gözler ileride.',
          '3 saniye sabit dur.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'fullBody' },
      },
      {
        id: 'badminton-2',
        sportSlug: 'badminton',
        order: 2,
        name: 'Smaç Vuruşu',
        description: 'Sağ kol yukarı hızla uzansın — smaç simülasyonu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Sağ kolu başının üstüne hızla kaldır.',
          'İndir.',
          'Toplam 3 smaç.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'up',
          threshold: 0.25,
          reps: 3,
        },
      },
    ],
  },
] as const;

export function getCurriculumBySlug(slug: string): SportCurriculum | undefined {
  return CURRICULUM.find((c) => c.sportSlug === slug);
}

export function getLessonById(
  slug: string,
  lessonId: string,
): { curriculum: SportCurriculum; lesson: SportCurriculum['lessons'][number] } | undefined {
  const curriculum = getCurriculumBySlug(slug);
  if (!curriculum) return undefined;
  const lesson = curriculum.lessons.find((l) => l.id === lessonId);
  if (!lesson) return undefined;
  return { curriculum, lesson };
}
