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
        name: 'Triple Threat',
        description: 'Hücum öncesi üçlü tehdit pozisyonu — alt vücut sabit 3 sn, dengeli ve hazır.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinde.',
          'Dizler hafif bükülü, vücut hafif öne eğik.',
          'Eller göğüs hizasında — top elinde gibi.',
          'Alt vücudu sallanmadan 3 saniye sabit tut.',
        ],
        validator: { type: 'staticPose', holdMs: 3000, subject: 'lowerBody' },
      },
      {
        id: 'basketbol-2',
        sportSlug: 'basketbol',
        order: 2,
        name: 'Şut Sıçraması',
        description: 'Pas sonrası şut için patlayıcı dikey sıçrama — 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Triple threat pozisyonunda başla.',
          'Çömel ve hızla yukarı sıçra (şut yükselişi).',
          'Havada düz dur, yumuşak in.',
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
        name: 'Split Step',
        description: 'Topa tepki anı mini sıçraması — ayaklar yerden ~5 cm, 3 tekrar.',
        difficulty: 'beginner',
        instructions: [
          'Ready pozisyonunda başla; ayaklar omuz genişliğinde.',
          'Topa tepki verir gibi her iki ayağı birlikte küçük bir sıçramayla yerden kaldır.',
          'Yumuşak iniş, dengeyi bul.',
          'Toplam 3 split step.',
        ],
        validator: {
          type: 'verticalRep',
          pattern: 'jumpUp',
          reps: 3,
          minDelta: 0.05,
        },
      },
      {
        id: 'tenis-2',
        sportSlug: 'tenis',
        order: 2,
        name: 'Forehand',
        description: 'Sağ bilek sağa uzansın — top karşılama vuruşu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Ready pozisyonunda başla.',
          'Sağ kolu sağa doğru hızla uzat (vuruş).',
          'Bileği geri çek, ready pozisyonuna dön.',
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
        name: 'Streamline',
        description: 'Yüzme öncesi gergin hidrodinamik duruş — kollar yukarı birleşik, üst vücut 2 sn sabit.',
        difficulty: 'beginner',
        instructions: [
          'Dik dur, ayaklar bitişik.',
          'Kolları başının üstüne uzat, ellerini birleştir.',
          'Kulaklarını kollarına yapıştır, sırtın düz.',
          'Üst vücudunu sallanmadan 2 saniye sabit tut.',
        ],
        validator: { type: 'staticPose', holdMs: 2000, subject: 'upperBody' },
      },
      {
        id: 'yuzme-2',
        sportSlug: 'yuzme',
        order: 2,
        name: 'Kuru Kulaç',
        description: 'Sağ bilek yukarı uzansın — serbest stil kulaç simülasyonu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, kollar yanda.',
          'Sağ bileği yukarı/ileri uzat (çekiş fazı).',
          'Yana indir (itme fazı).',
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
        name: 'Pas',
        description: 'Sağ ayağın iç yanı ile yana pas — 3 tekrarlı temel pas hareketi.',
        difficulty: 'beginner',
        instructions: [
          'Hazır duruşta başla, ağırlık sol ayakta.',
          'Sağ ayağın iç yanını sağa doğru uzat (pas vermek gibi).',
          'Ayağı geri çek, başlangıca dön.',
          'Toplam 3 pas.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightAnkle',
          direction: 'right',
          threshold: 0.18,
          reps: 3,
        },
      },
      {
        id: 'futbol-2',
        sportSlug: 'futbol',
        order: 2,
        // Şut için knee drive (back swing prep) — futbol biomekanik: bacak
        // önce dizden yukarı çekilir (~0.15 normalize Y delta), sonra ayak
        // ileri savrulur. Diz kaldırma reach validator için robust trigger;
        // ankle UP yanlış sinyaller verir (şutta ankle önce GERİ gider).
        name: 'Diz Çek',
        description: 'Sağ dizi bel hizasına kaldır — şut/sprint biyomekaniğinin başlangıç fazı, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Sol ayak yere basılı, sağ ayak hazır.',
          'Sağ dizini bel hizasına yukarı çek.',
          'İndir, başlangıca dön.',
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
        name: 'Squat',
        description: 'Kontrollü çömel-kalk — cimnastik bacak gücünün temeli, 3 tekrar.',
        difficulty: 'beginner',
        instructions: [
          'Dik dur, ayaklar omuz genişliğinde.',
          'Kalçayı geri ittirerek dizleri 90°\'ye kadar bük.',
          'Patlayıcı şekilde başlangıca kalk.',
          'Toplam 3 squat.',
        ],
        validator: { type: 'verticalRep', pattern: 'squatDown', reps: 3 },
      },
      {
        id: 'cimnastik-2',
        sportSlug: 'cimnastik',
        order: 2,
        name: 'Tuck Jump',
        description: 'Patlayıcı sıçrama, havada dizleri göğüse çek — 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, ayaklar omuz genişliğinde.',
          'Hızla çömel ve patlayıcı sıçra.',
          'Havada dizleri göğse doğru çek (tuck).',
          'Yumuşak iniş — toplam 3 tuck jump.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 3 },
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
