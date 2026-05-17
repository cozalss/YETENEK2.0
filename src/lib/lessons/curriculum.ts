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
        description:
          'Taekwondo seansının başlangıç duruşu — odaklan, dengeli dur.',
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
        description:
          'Diz yukarı çek, ayağı öne savur — 3 tekrarlı ön tekme dizisi.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Sağ dizini bel hizasına kaldır.',
          'Ayağı düz öne uzat ve indir.',
          'Toplam 3 tekme yap.',
        ],
        // Ankle UP yerine knee UP — 2D pose'da ön tekme bileği önce ÖNE
        // (z-axis, görünmez) savurur; dikey trigger için diz kaldırma
        // daha güvenilir (futbol-2 ile aynı pattern).
        validator: {
          type: 'reach',
          landmark: 'rightKnee',
          direction: 'up',
          threshold: 0.15,
          reps: 3,
        },
      },
      {
        id: 'taekwondo-3',
        sportSlug: 'taekwondo',
        order: 3,
        name: 'Sol Ön Tekme (Ap Chagi)',
        description:
          'Sol diz yukarı çek, ayağı öne savur — 3 tekrarlı sol bacak tekme dizisi.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla, ağırlık sağ ayakta.',
          'Sol dizini bel hizasına kaldır.',
          'Ayağı düz öne uzat ve indir.',
          'Toplam 3 tekme yap.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftKnee',
          direction: 'up',
          threshold: 0.15,
          reps: 3,
        },
      },
      {
        id: 'taekwondo-4',
        sportSlug: 'taekwondo',
        order: 4,
        name: 'Yüksek Blok (Olgul Makgi)',
        description:
          'İki bilek baş üstünde — gelen darbeyi savuşturma duruşu, 2 sn sabit.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'İki yumruğu da başının üstüne kaldır.',
          'Bilekler omuz hizasının üzerinde.',
          '2 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 2000,
          subject: 'upperBody',
          posture: 'wristsAboveShoulders',
        },
      },
      {
        id: 'taekwondo-5',
        sportSlug: 'taekwondo',
        order: 5,
        name: 'Yan Tekme Sıçraması',
        description:
          'Yan tekme öncesi patlayıcı dikey sıçrama — 4 tekrarlı kombinasyon.',
        difficulty: 'advanced',
        instructions: [
          'Hazır duruşta başla.',
          'Hızla çömel ve patlayıcı sıçra.',
          'Havada bacak yan tekme pozisyonu alır.',
          'Toplam 4 sıçrama.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 4 },
      },
      {
        id: 'taekwondo-6',
        sportSlug: 'taekwondo',
        order: 6,
        name: 'Arka Tekme (Twit Chagi)',
        description:
          'Sağ ayak geriye uzansın — gövdeyi döndürerek arka tekme, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla, sırt rakibe dönük.',
          'Gövdeni hafif öne eğ.',
          'Sağ ayağı geriye doğru patlayıcı uzat.',
          'Ayağı topla, başlangıca dön. Toplam 3 tekme.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightAnkle',
          direction: 'right',
          threshold: 0.2,
          reps: 3,
        },
      },
      {
        id: 'taekwondo-7',
        sportSlug: 'taekwondo',
        order: 7,
        name: '360° Sıçramalı Tekme',
        description:
          'Havada dönerek tekme — maksimum patlayıcı güç kombinasyonu, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Hazır duruşta başla, dizler bükülü.',
          'Hızla derin çömel.',
          'Patlayıcı sıçra, havada vücut döner.',
          'Yumuşak iniş. Toplam 4 sıçrama.',
        ],
        validator: {
          type: 'verticalRep',
          pattern: 'jumpUp',
          reps: 4,
          minDelta: 0.12,
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
        validator: {
          type: 'staticPose',
          holdMs: 3000,
          subject: 'upperBody',
          posture: 'wristsAtFaceLevel',
        },
      },
      {
        id: 'boks-2',
        sportSlug: 'boks',
        order: 2,
        name: 'Direkt Yumruk (Jab)',
        description: 'Sol bileği öne ve hafif yukarı uzat — 3 tekrarlı jab.',
        difficulty: 'intermediate',
        instructions: [
          'Guard pozisyonunda başla.',
          'Sol yumruğu öne ve hafif yukarı doğru hızla uzat.',
          "Yumruğu geri çek, guard'a dön.",
          'Toplam 3 jab at.',
        ],
        // 2D pose'da "öne uzanma" z-axis (görünmez); jab atılırken bilek
        // hafif yukarı bileşen üretir. Threshold düşük tutulur (0.10) ki
        // demo'da kameraya yandan duran çocuğun da sayımı tutsun.
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'up',
          threshold: 0.1,
          reps: 3,
        },
      },
      {
        id: 'boks-3',
        sportSlug: 'boks',
        order: 3,
        name: 'Çapraz Yumruk (Cross)',
        description:
          'Sağ bilek öne ve hafif yukarı uzansın — 3 tekrarlı cross.',
        difficulty: 'intermediate',
        instructions: [
          'Guard pozisyonunda başla.',
          'Sağ yumruğu hızla öne uzat (arka el).',
          "Yumruğu geri çek, guard'a dön.",
          'Toplam 3 cross at.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'up',
          threshold: 0.1,
          reps: 3,
        },
      },
      {
        id: 'boks-4',
        sportSlug: 'boks',
        order: 4,
        name: 'Kapanma Çömeli (Slip)',
        description:
          'Gelen yumruktan kaçmak için hızlı alçalma — 3 tekrarlı squat.',
        difficulty: 'intermediate',
        instructions: [
          'Guard pozisyonunda başla.',
          'Hızla çömel (yumruğun altından geç).',
          'Geri kalk, guard pozisyonuna dön.',
          'Toplam 3 slip.',
        ],
        validator: { type: 'verticalRep', pattern: 'squatDown', reps: 3 },
      },
      {
        id: 'boks-5',
        sportSlug: 'boks',
        order: 5,
        name: 'Uppercut',
        description:
          'Sol bilek aşağıdan yukarı patlayıcı — 4 tekrarlı çene vuruşu.',
        difficulty: 'advanced',
        instructions: [
          'Guard pozisyonunda başla, dizler hafif bükülü.',
          'Sol yumruğu bel hizasından çene hizasına patlat.',
          "Yumruğu geri çek, guard'a dön.",
          'Toplam 4 uppercut at.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'up',
          threshold: 0.2,
          reps: 4,
        },
      },
      {
        id: 'boks-6',
        sportSlug: 'boks',
        order: 6,
        name: 'Sol Kroşe (Hook)',
        description:
          'Sol bilek yana savrulsun — yandan kavisli yumruk, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Guard pozisyonunda başla.',
          'Sol dirseği omuz hizasında bük.',
          'Sol yumruğu sağa doğru yandan savur (hook).',
          "Yumruğu geri çek, guard'a dön. Toplam 3 hook.",
        ],
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'right',
          threshold: 0.18,
          reps: 3,
        },
      },
      {
        id: 'boks-7',
        sportSlug: 'boks',
        order: 7,
        name: 'Shuffle Çömeli Kombo',
        description:
          'Hızlı slip kombosu — savunma ayak hareketi ile kısa çömeller, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Guard pozisyonunda başla.',
          'Hızla çömel (slip).',
          'Patlayıcı geri kalk, kısa duraklama.',
          'Toplam 4 ardışık slip.',
        ],
        validator: { type: 'verticalRep', pattern: 'squatDown', reps: 4 },
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
        description:
          'Servis karşılama pozisyonu — bacaklar bükülü, eller önde.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinde, hafif öne eğil.',
          'Dizler hafif bükülü.',
          'Eller önde, parmak uçları birleşik.',
          '3 saniye sabit dur.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 3000,
          subject: 'fullBody',
          posture: 'kneesBent',
        },
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
      {
        id: 'voleybol-3',
        sportSlug: 'voleybol',
        order: 3,
        name: 'Parmak Pas',
        description:
          'İki bilek baş üstünde — parmak pas hazırlık duruşu, 2 sn sabit.',
        difficulty: 'intermediate',
        instructions: [
          'Hafif çömel pozisyonunda başla.',
          'İki eli alın hizasının üstüne kaldır.',
          'Parmak uçları yukarıyı işaret etsin.',
          '2 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 2000,
          subject: 'upperBody',
          posture: 'wristsAboveShoulders',
        },
      },
      {
        id: 'voleybol-4',
        sportSlug: 'voleybol',
        order: 4,
        name: 'Manşet Hazırlık',
        description: 'Topu kollarla karşılamak için hızlı alçalma — 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, kollar yanda.',
          'Hızla çömel (top karşılama pozisyonu).',
          'Kalk, başlangıca dön.',
          'Toplam 3 tekrar.',
        ],
        validator: { type: 'verticalRep', pattern: 'squatDown', reps: 3 },
      },
      {
        id: 'voleybol-5',
        sportSlug: 'voleybol',
        order: 5,
        name: 'Servis Sıçraması',
        description:
          'Tenis servis vuruşu için patlayıcı dikey sıçrama — 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Dik dur, ayaklar omuz genişliğinde.',
          'Hızla çömel.',
          'Patlayıcı yukarı sıçra, sağ kol vuruş için yükselir.',
          'Toplam 4 sıçrama.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 4 },
      },
      {
        id: 'voleybol-6',
        sportSlug: 'voleybol',
        order: 6,
        name: 'Blok Sıçraması',
        description:
          'İki kol yukarıda — file üstünden blok için patlayıcı sıçrama, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'File önünde dik dur, ayaklar omuz genişliğinde.',
          'Hızla hafif çömel.',
          'Patlayıcı sıçra, iki kolu yukarı uzat (blok).',
          'Yumuşak iniş. Toplam 3 blok.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'up',
          threshold: 0.22,
          reps: 3,
        },
      },
      {
        id: 'voleybol-7',
        sportSlug: 'voleybol',
        order: 7,
        name: 'Çukur Dalış Hazırlık',
        description:
          'Defansif dalış için derin çömelme — savunma yere yakın iniş, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Hafif çömel pozisyonunda başla.',
          'Hızla çok derin çömel (yere doğru uzan).',
          'Patlayıcı geri kalk.',
          'Toplam 4 derin dalış hazırlığı.',
        ],
        validator: {
          type: 'verticalRep',
          pattern: 'squatDown',
          reps: 4,
          minDelta: 0.12,
        },
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
        description:
          'Hücum öncesi üçlü tehdit pozisyonu — alt vücut sabit 3 sn, dengeli ve hazır.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinde.',
          'Dizler hafif bükülü, vücut hafif öne eğik.',
          'Eller göğüs hizasında — top elinde gibi.',
          'Alt vücudu sallanmadan 3 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 3000,
          subject: 'lowerBody',
          posture: 'kneesBent',
        },
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
      {
        id: 'basketbol-3',
        sportSlug: 'basketbol',
        order: 3,
        name: 'Defansif Slide',
        description:
          'Sol ayak yana — defansif kayma için bacak uzatma, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Triple threat pozisyonunda başla.',
          'Sol ayağı yana doğru uzat (defansif kayma).',
          'Geri çek, başlangıca dön.',
          'Toplam 3 slide.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftAnkle',
          direction: 'left',
          threshold: 0.18,
          reps: 3,
        },
      },
      {
        id: 'basketbol-4',
        sportSlug: 'basketbol',
        order: 4,
        name: 'Layup Diz Çekme',
        description:
          'Sağ diz yukarı — layup atışında diz yukarı çekme fazı, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, ağırlık sol ayakta.',
          'Sağ dizini bel hizasına yukarı çek (layup yükselişi).',
          'İndir, başlangıca dön.',
          'Toplam 3 layup.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightKnee',
          direction: 'up',
          threshold: 0.15,
          reps: 3,
        },
      },
      {
        id: 'basketbol-5',
        sportSlug: 'basketbol',
        order: 5,
        name: 'Crossover Sıçraması',
        description:
          'Çift yönlü patlayıcı sıçrama — crossover ile dribling kombinasyonu, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Triple threat pozisyonunda başla.',
          'Hızla çömel.',
          'Patlayıcı yukarı sıçra, havada vücut yön değiştirir.',
          'Toplam 4 sıçrama.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 4 },
      },
      {
        id: 'basketbol-6',
        sportSlug: 'basketbol',
        order: 6,
        name: 'Closeout (Hızlı Çıkış)',
        description:
          'Sağ ayak öne uzansın — şutöre hızlı kapanma adımı, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Triple threat pozisyonunda başla.',
          'Sağ ayağı öne doğru hızla uzat (kapanma adımı).',
          'Eller yukarı havaya kalksın.',
          'Geri çek, başlangıca dön. Toplam 3 closeout.',
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
        id: 'basketbol-7',
        sportSlug: 'basketbol',
        order: 7,
        name: 'Rebound Sıçraması',
        description:
          'İki kol yukarı patlayıcı sıçrama — rebound kapma kombinasyonu, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Triple threat pozisyonunda başla.',
          'Hızla derin çömel.',
          'Patlayıcı yukarı sıçra, iki kol başın üstüne uzansın.',
          'Toplam 4 rebound sıçraması.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'up',
          threshold: 0.25,
          reps: 4,
        },
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
        description:
          'Topa tepki anı mini sıçraması — ayaklar yerden ~5 cm, 3 tekrar.',
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
      {
        id: 'tenis-3',
        sportSlug: 'tenis',
        order: 3,
        name: 'Backhand',
        description:
          'Sol bilek sola uzansın — çift el backhand vuruşu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Ready pozisyonunda başla.',
          'Sol kolu sola doğru hızla uzat (backhand).',
          'Bileği geri çek, ready pozisyonuna dön.',
          'Toplam 3 backhand.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'left',
          threshold: 0.2,
          reps: 3,
        },
      },
      {
        id: 'tenis-4',
        sportSlug: 'tenis',
        order: 4,
        name: 'Volley Hazırlık',
        description: 'İki bilek yüz hizasında — file önü volley duruşu, 2 sn.',
        difficulty: 'intermediate',
        instructions: [
          'Hafif çömel pozisyonunda başla.',
          'İki bileği yüz hizasında raket tutar gibi öne uzat.',
          'Dirsekler hafif bükülü, gözler ileride.',
          '2 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 2000,
          subject: 'upperBody',
          posture: 'wristsAtFaceLevel',
        },
      },
      {
        id: 'tenis-5',
        sportSlug: 'tenis',
        order: 5,
        name: 'Servis Atışı',
        description:
          'Sağ kol baş üstüne patlayıcı — servis vuruşu zirvesi, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Dik dur, ayaklar omuz genişliğinde.',
          'Sağ kolu hızla başının üstüne kaldır (vuruş).',
          'İndir, başlangıca dön.',
          'Toplam 4 servis.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'up',
          threshold: 0.25,
          reps: 4,
        },
      },
      {
        id: 'tenis-6',
        sportSlug: 'tenis',
        order: 6,
        name: 'Drop Shot Hazırlık',
        description:
          'Hafif çömel, raket önde — file önü yumuşak vuruş duruşu, 2 sn sabit.',
        difficulty: 'intermediate',
        instructions: [
          'Hafif çömel pozisyonunda başla.',
          'Sağ kolu öne uzat, dirsek hafif bükülü.',
          'Vücut hafif öne eğik, dizler bükülü.',
          '2 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 2000,
          subject: 'fullBody',
          posture: 'kneesBent',
        },
      },
      {
        id: 'tenis-7',
        sportSlug: 'tenis',
        order: 7,
        name: 'Tweener Simülasyon',
        description:
          'Bacaklar arası vuruş için derin çömelme — akrobatik vuruş hazırlık, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Dik dur, sırt file rakibine dönük.',
          'Hızla derin çömel (bacaklar arası vuruş hazırlığı).',
          'Patlayıcı kalk.',
          'Toplam 4 tweener.',
        ],
        validator: {
          type: 'verticalRep',
          pattern: 'squatDown',
          reps: 4,
          minDelta: 0.12,
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
        description:
          'Yüzme öncesi gergin hidrodinamik duruş — kollar yukarı birleşik, üst vücut 2 sn sabit.',
        difficulty: 'beginner',
        instructions: [
          'Dik dur, ayaklar bitişik.',
          'Kolları başının üstüne uzat, ellerini birleştir.',
          'Kulaklarını kollarına yapıştır, sırtın düz.',
          'Üst vücudunu sallanmadan 2 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 2000,
          subject: 'upperBody',
          posture: 'wristsAboveShoulders',
        },
      },
      {
        id: 'yuzme-2',
        sportSlug: 'yuzme',
        order: 2,
        name: 'Kuru Kulaç',
        description:
          'Sağ bilek yukarı uzansın — serbest stil kulaç simülasyonu, 3 tekrar.',
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
      {
        id: 'yuzme-3',
        sportSlug: 'yuzme',
        order: 3,
        name: 'Sol Kol Kulaç',
        description:
          'Sol bilek yukarı uzansın — serbest stil sol kol kulaç simülasyonu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, kollar yanda.',
          'Sol bileği yukarı/ileri uzat (çekiş fazı).',
          'Yana indir (itme fazı).',
          'Toplam 3 kulaç.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'up',
          threshold: 0.25,
          reps: 3,
        },
      },
      {
        id: 'yuzme-4',
        sportSlug: 'yuzme',
        order: 4,
        name: 'Bacak Vuruşu Hazırlık',
        description:
          'Sağ ayak yukarı — kelebek/serbest stil tekme prep, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, ağırlık sol ayakta.',
          'Sağ ayağı düz şekilde yukarı/öne uzat (tekme).',
          'İndir, başlangıca dön.',
          'Toplam 3 tekme.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightAnkle',
          direction: 'up',
          threshold: 0.15,
          reps: 3,
        },
      },
      {
        id: 'yuzme-5',
        sportSlug: 'yuzme',
        order: 5,
        name: 'Dolfin Dalga',
        description:
          'Tüm vücut dalga hareketi — kelebek stil patlayıcı çömel, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Dik dur, kollar başının üstünde birleşik.',
          'Hızla çömel (dalga inişi).',
          'Patlayıcı kalk.',
          'Toplam 4 dalga.',
        ],
        validator: { type: 'verticalRep', pattern: 'squatDown', reps: 4 },
      },
      {
        id: 'yuzme-6',
        sportSlug: 'yuzme',
        order: 6,
        name: 'Kelebek Kol Stroku',
        description:
          'İki bilek aynı anda yukarı — kelebek stil çift kol simülasyonu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, kollar yanda.',
          'İki bileği aynı anda başın üstüne uzat (kelebek kulaç).',
          'Yanlardan indir (itme fazı).',
          'Toplam 3 kelebek kulaç.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'up',
          threshold: 0.22,
          reps: 3,
        },
      },
      {
        id: 'yuzme-7',
        sportSlug: 'yuzme',
        order: 7,
        name: 'Sırtüstü Pozisyonu',
        description:
          'Üst vücut geriye yatık — sırtüstü streamline duruşu, 3 sn sabit.',
        difficulty: 'advanced',
        instructions: [
          'Dik dur, ayaklar bitişik.',
          'Kolları başının üstüne uzat, ellerini birleştir.',
          'Vücudunu geriye doğru hafif yatık tut (sırtüstü pozisyonu).',
          '3 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 3000,
          subject: 'fullBody',
          posture: 'wristsAboveShoulders',
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
        description:
          'Sağ ayağın iç yanı ile yana pas — 3 tekrarlı temel pas hareketi.',
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
        description:
          'Sağ dizi bel hizasına kaldır — şut/sprint biyomekaniğinin başlangıç fazı, 3 tekrar.',
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
      {
        id: 'futbol-3',
        sportSlug: 'futbol',
        order: 3,
        name: 'Sol Ayak Pas',
        description:
          'Sol ayağın iç yanı ile yana pas — zayıf ayak gelişimi, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla, ağırlık sağ ayakta.',
          'Sol ayağın iç yanını sola doğru uzat (pas vermek gibi).',
          'Ayağı geri çek, başlangıca dön.',
          'Toplam 3 pas.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftAnkle',
          direction: 'left',
          threshold: 0.18,
          reps: 3,
        },
      },
      {
        id: 'futbol-4',
        sportSlug: 'futbol',
        order: 4,
        name: 'Kaleci Duruşu',
        description:
          'İki yumruk yüz hizasında — kaleci hazır pozisyonu, 2 sn sabit.',
        difficulty: 'intermediate',
        instructions: [
          'Hafif çömel, ayaklar omuz genişliğinde.',
          'İki bileği yüz hizasına kaldır, dirsekler bükülü.',
          'Vücut hafif öne eğik, gözler ileride.',
          '2 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 2000,
          subject: 'upperBody',
          posture: 'wristsAtFaceLevel',
        },
      },
      {
        id: 'futbol-5',
        sportSlug: 'futbol',
        order: 5,
        name: 'Volley Sıçraması',
        description:
          'Havadan gelen topa vuruş — patlayıcı dikey sıçrama, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Hazır duruşta başla.',
          'Hızla çömel.',
          'Patlayıcı yukarı sıçra (havada volley vuruşu).',
          'Toplam 4 sıçrama.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 4 },
      },
      {
        id: 'futbol-6',
        sportSlug: 'futbol',
        order: 6,
        name: 'Taç Atışı Hazırlık',
        description:
          'İki bilek baş üstüne — taç atışı için gövde arkaya yaylanma, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, ayaklar omuz genişliğinde.',
          'İki bileği başının üstüne kaldır (top tutar gibi).',
          'Hafif geriye yaylan, sonra öne savur (taç atışı).',
          'Toplam 3 taç atışı.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'up',
          threshold: 0.22,
          reps: 3,
        },
      },
      {
        id: 'futbol-7',
        sportSlug: 'futbol',
        order: 7,
        name: 'Kaleci Dive Simülasyon',
        description:
          'Yana doğru patlayıcı dalış — kalecilerin uçma hareketi, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Hafif çömel kaleci pozisyonunda başla.',
          'Sol ayağı patlayıcı yana doğru uzat.',
          'Gövde sola yatar (dive simülasyonu).',
          'Toparlan, başlangıca dön. Toplam 4 dive.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftAnkle',
          direction: 'left',
          threshold: 0.22,
          reps: 4,
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
        validator: {
          type: 'staticPose',
          holdMs: 3000,
          subject: 'fullBody',
          posture: 'asymmetricStance',
        },
      },
      {
        id: 'atletizm-2',
        sportSlug: 'atletizm',
        order: 2,
        name: 'Diz Çekme',
        description:
          'Sprint diz çekme drili — sağ dizi bel hizasına 3 kez çek.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur.',
          'Sağ dizini bel hizasına yukarı çek.',
          'İndir, başlangıca dön.',
          'Toplam 3 sağ diz çekme.',
        ],
        // Validator tek bacaklı (rightKnee); "sol dize geç" talimatı
        // çift sayım/kafa karışıklığı yaratır — sağ tarafa kilitlendi.
        validator: {
          type: 'reach',
          landmark: 'rightKnee',
          direction: 'up',
          threshold: 0.15,
          reps: 3,
        },
      },
      {
        id: 'atletizm-3',
        sportSlug: 'atletizm',
        order: 3,
        name: 'Sol Diz Çekme',
        description:
          'Sprint sol diz çekme drili — sol dizi bel hizasına 3 kez çek.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur.',
          'Sol dizini bel hizasına yukarı çek.',
          'İndir, başlangıca dön.',
          'Toplam 3 sol diz çekme.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftKnee',
          direction: 'up',
          threshold: 0.15,
          reps: 3,
        },
      },
      {
        id: 'atletizm-4',
        sportSlug: 'atletizm',
        order: 4,
        name: 'Maraton Duruş',
        description:
          'Uzun mesafe koşu hazır duruşu — dengeli, gevşek, 2 sn sabit.',
        difficulty: 'intermediate',
        instructions: [
          'Ayaklar omuz genişliğinde, paralel.',
          'Dizler hafif bükülü, omuzlar gevşek.',
          'Kollar yanda doğal asılı.',
          '2 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 2000,
          subject: 'fullBody',
          posture: 'kneesBent',
        },
      },
      {
        id: 'atletizm-5',
        sportSlug: 'atletizm',
        order: 5,
        name: 'Yüksek Sıçrama',
        description:
          'Patlayıcı dikey sıçrama — yüksek atlama / üçadım simülasyonu, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Dik dur, ayaklar omuz genişliğinde.',
          'Hızla çömel.',
          'Patlayıcı yukarı sıçra, dizleri havada çek.',
          'Toplam 4 sıçrama.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 4 },
      },
      {
        id: 'atletizm-6',
        sportSlug: 'atletizm',
        order: 6,
        name: 'Cirit Atma Hazırlık',
        description:
          'Sağ kol baş üstüne — cirit fırlatma öncesi back swing duruşu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Sol ayak önde, sağ ayak arkada.',
          'Sağ kolu başının arkasına/üstüne kaldır (cirit tutar gibi).',
          'İndir, başlangıca dön.',
          'Toplam 3 cirit hazırlık.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'up',
          threshold: 0.25,
          reps: 3,
        },
      },
      {
        id: 'atletizm-7',
        sportSlug: 'atletizm',
        order: 7,
        name: 'Engel Adımı',
        description:
          'Sol diz çok yukarı — yüksek engel aşma simülasyonu, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Dik dur.',
          'Sol dizini göğüs hizasına patlayıcı yukarı çek (engel aşma).',
          'İndir, başlangıca dön.',
          'Toplam 4 engel adımı.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftKnee',
          direction: 'up',
          threshold: 0.22,
          reps: 4,
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
        description:
          'Kontrollü çömel-kalk — cimnastik bacak gücünün temeli, 3 tekrar.',
        difficulty: 'beginner',
        instructions: [
          'Dik dur, ayaklar omuz genişliğinde.',
          "Kalçayı geri ittirerek dizleri 90°'ye kadar bük.",
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
      {
        id: 'cimnastik-3',
        sportSlug: 'cimnastik',
        order: 3,
        name: 'Y Duruş',
        description:
          'İki kol baş üstünde V şeklinde — denge ve esneklik duruşu, 3 sn sabit.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, ayaklar bitişik.',
          'İki kolu da yukarı V şeklinde aç.',
          'Bilekler omuz hizasının üzerinde.',
          '3 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 3000,
          subject: 'upperBody',
          posture: 'wristsAboveShoulders',
        },
      },
      {
        id: 'cimnastik-4',
        sportSlug: 'cimnastik',
        order: 4,
        name: 'Köprü Hazırlık',
        description:
          'Sol bilek yukarı uzansın — köprü hareketi için kol açma, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, kollar yanda.',
          'Sol bileği başının üstüne yukarı uzat.',
          'İndir, başlangıca dön.',
          'Toplam 3 tekrar.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'up',
          threshold: 0.25,
          reps: 3,
        },
      },
      {
        id: 'cimnastik-5',
        sportSlug: 'cimnastik',
        order: 5,
        name: 'Pike Jump',
        description:
          'Patlayıcı sıçrama, havada bacaklar düz öne — 4 tekrarlı pike.',
        difficulty: 'advanced',
        instructions: [
          'Dik dur, ayaklar omuz genişliğinde.',
          'Hızla çömel.',
          'Patlayıcı sıçra, havada bacaklar düz öne uzansın (pike).',
          'Toplam 4 pike jump.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 4 },
      },
      {
        id: 'cimnastik-6',
        sportSlug: 'cimnastik',
        order: 6,
        name: 'Handstand Hazırlık',
        description:
          'Sağ ayak yukarı patlayıcı — el üstünde durma için bacak savurma, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Dik dur, kollar yukarıda.',
          'Sağ ayağı patlayıcı yukarı/öne savur (handstand kickup).',
          'İndir, başlangıca dön.',
          'Toplam 3 bacak savurma.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightAnkle',
          direction: 'up',
          threshold: 0.22,
          reps: 3,
        },
      },
      {
        id: 'cimnastik-7',
        sportSlug: 'cimnastik',
        order: 7,
        name: 'Splits Hazırlık',
        description:
          'Sol ayak öne uzansın — uzun yarık (split) öncesi bacak uzatma, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Dik dur.',
          'Sol ayağı öne doğru çok uzağa uzat (split başlangıcı).',
          'Geri çek, başlangıca dön.',
          'Toplam 4 split hazırlık.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftAnkle',
          direction: 'left',
          threshold: 0.22,
          reps: 4,
        },
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
      {
        id: 'judo-3',
        sportSlug: 'judo',
        order: 3,
        name: 'Tai Sabaki (Yan Adım)',
        description:
          'Sağ ayak yana uzansın — rakibin etrafında dönme adımı, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Sağ ayağı yana doğru uzat (yan adım).',
          'Geri çek, başlangıca dön.',
          'Toplam 3 yan adım.',
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
        id: 'judo-4',
        sportSlug: 'judo',
        order: 4,
        name: 'Kuzushi (Denge Bozma)',
        description:
          'İki bilek yüz hizasında — rakibi tutma ve dengesini bozma, 2 sn.',
        difficulty: 'intermediate',
        instructions: [
          'Hafif çömel pozisyonunda başla.',
          'İki bileği yüz hizasına kaldır (gi tutma simülasyonu).',
          'Dirsekler bükülü, gözler ileride.',
          '2 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 2000,
          subject: 'upperBody',
          posture: 'wristsAtFaceLevel',
        },
      },
      {
        id: 'judo-5',
        sportSlug: 'judo',
        order: 5,
        name: 'Uchi Komi Sıçrama',
        description:
          'Atış öncesi patlayıcı yukarı kaldırma — 4 tekrarlı sıçrama.',
        difficulty: 'advanced',
        instructions: [
          'Hazır duruşta başla, dizler hafif bükülü.',
          'Hızla çömel.',
          'Patlayıcı yukarı sıçra (rakibi havalandırma simülasyonu).',
          'Toplam 4 sıçrama.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 4 },
      },
      {
        id: 'judo-6',
        sportSlug: 'judo',
        order: 6,
        name: 'Sol Tai Sabaki',
        description:
          'Sol ayak yana uzansın — rakibin sol tarafına dönme adımı, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Sol ayağı yana doğru patlayıcı uzat (sol yan adım).',
          'Gövde sola dönsün.',
          'Geri çek. Toplam 3 sol yan adım.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftAnkle',
          direction: 'left',
          threshold: 0.18,
          reps: 3,
        },
      },
      {
        id: 'judo-7',
        sportSlug: 'judo',
        order: 7,
        name: 'Atma Sonrası Kontrol',
        description:
          'Geniş ayak, derin çömel — yere indirme sonrası kontrol duruşu, 3 sn sabit.',
        difficulty: 'advanced',
        instructions: [
          'Ayakları omuz genişliğinden geniş aç.',
          'Derin çömel pozisyonuna geç.',
          'Eller önde rakibi tutar gibi (yüz hizasında).',
          '3 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 3000,
          subject: 'fullBody',
          posture: 'kneesBent',
        },
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
        validator: {
          type: 'staticPose',
          holdMs: 3000,
          subject: 'fullBody',
          posture: 'kneesBent',
        },
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
      {
        id: 'masa-tenisi-3',
        sportSlug: 'masa-tenisi',
        order: 3,
        name: 'Backhand Vuruş',
        description: 'Sol kol sola, hızlı backhand simülasyonu — 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Sol kolu sola hızla uzat (backhand).',
          'Geri çek.',
          'Toplam 3 vuruş.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'left',
          threshold: 0.15,
          reps: 3,
        },
      },
      {
        id: 'masa-tenisi-4',
        sportSlug: 'masa-tenisi',
        order: 4,
        name: 'Servis Hazırlık',
        description:
          'Hafif çömel ve raket aşağıda — masa tenisi servis duruşu, 2 sn.',
        difficulty: 'intermediate',
        instructions: [
          'Ayaklar omuz genişliğinde.',
          'Dizler bükülü, vücut hafif öne eğik.',
          'Sağ kol bel hizasında raket tutar gibi.',
          '2 saniye sabit tut.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 2000,
          subject: 'fullBody',
          posture: 'kneesBent',
        },
      },
      {
        id: 'masa-tenisi-5',
        sportSlug: 'masa-tenisi',
        order: 5,
        name: 'Smash',
        description:
          'Sağ kol baş üstüne patlayıcı — yüksek topa smash vuruşu, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Hazır duruşta başla.',
          'Sağ kolu hızla başının üstüne kaldır (smash).',
          'İndir, başlangıca dön.',
          'Toplam 4 smash.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'up',
          threshold: 0.25,
          reps: 4,
        },
      },
      {
        id: 'masa-tenisi-6',
        sportSlug: 'masa-tenisi',
        order: 6,
        name: 'Defansif Lob',
        description:
          'Sağ bilek yukarı yumuşak uzansın — geriden atılan savunma lobu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Geriden hafif çömel pozisyonunda başla.',
          'Sağ kolu yumuşak şekilde başın üstüne uzat (lob).',
          'Geri çek, başlangıca dön.',
          'Toplam 3 lob.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'up',
          threshold: 0.18,
          reps: 3,
        },
      },
      {
        id: 'masa-tenisi-7',
        sportSlug: 'masa-tenisi',
        order: 7,
        name: 'Çoklu Adım Kombo',
        description:
          'Hızlı yan-yan adım — masa boyu çevre kapsama, 4 tekrarlı squat.',
        difficulty: 'advanced',
        instructions: [
          'Hazır duruşta başla.',
          'Hızla çömel (yana adım hazırlık).',
          'Patlayıcı geri kalk.',
          'Toplam 4 hızlı çömel.',
        ],
        validator: { type: 'verticalRep', pattern: 'squatDown', reps: 4 },
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
        description:
          'Servis karşılama — dengeli, yüksek bir reaksiyon pozisyonu.',
        difficulty: 'beginner',
        instructions: [
          'Ayaklar omuz genişliğinde.',
          'Dizler hafif bükülü.',
          'Raket önde, gözler ileride.',
          '3 saniye sabit dur.',
        ],
        validator: {
          type: 'staticPose',
          holdMs: 3000,
          subject: 'fullBody',
          posture: 'kneesBent',
        },
      },
      {
        id: 'badminton-2',
        sportSlug: 'badminton',
        order: 2,
        name: 'Smaç Vuruşu',
        description:
          'Sağ kol yukarı hızla uzansın — smaç simülasyonu, 3 tekrar.',
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
      {
        id: 'badminton-3',
        sportSlug: 'badminton',
        order: 3,
        name: 'Clear Vuruşu',
        description:
          'Sol bilek baş üstüne — backhand clear ile arka kort vuruşu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Sol kolu başının üstüne hızla kaldır (clear).',
          'İndir, başlangıca dön.',
          'Toplam 3 clear.',
        ],
        validator: {
          type: 'reach',
          landmark: 'leftWrist',
          direction: 'up',
          threshold: 0.25,
          reps: 3,
        },
      },
      {
        id: 'badminton-4',
        sportSlug: 'badminton',
        order: 4,
        name: 'Drop Shot',
        description:
          'Sağ bilek sağa yumuşak uzansın — file önü drop vuruşu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Sağ kolu sağa doğru hafif uzat (drop shot).',
          'Geri çek.',
          'Toplam 3 drop.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'right',
          threshold: 0.15,
          reps: 3,
        },
      },
      {
        id: 'badminton-5',
        sportSlug: 'badminton',
        order: 5,
        name: 'Lunge Hamlesi',
        description:
          'Patlayıcı çömel — file önüne lunge ile uzanma, 4 tekrarlı squat.',
        difficulty: 'advanced',
        instructions: [
          'Hazır duruşta başla.',
          'Hızla çömel (öne uzanan lunge).',
          'Geri kalk, başlangıca dön.',
          'Toplam 4 lunge.',
        ],
        validator: { type: 'verticalRep', pattern: 'squatDown', reps: 4 },
      },
      {
        id: 'badminton-6',
        sportSlug: 'badminton',
        order: 6,
        name: 'Jump Smash',
        description:
          'Patlayıcı sıçra, sağ kol baş üstüne — havadan smash kombinasyonu, 3 tekrar.',
        difficulty: 'intermediate',
        instructions: [
          'Hazır duruşta başla.',
          'Hızla hafif çömel.',
          'Patlayıcı yukarı sıçra, sağ kolu başın üstüne uzat (smash).',
          'Yumuşak iniş. Toplam 3 jump smash.',
        ],
        validator: { type: 'verticalRep', pattern: 'jumpUp', reps: 3 },
      },
      {
        id: 'badminton-7',
        sportSlug: 'badminton',
        order: 7,
        name: 'Net Kill',
        description:
          'Sağ bilek öne ve aşağı patlayıcı — file önü hızlı bitirme vuruşu, 4 tekrar.',
        difficulty: 'advanced',
        instructions: [
          'Hafif çömel pozisyonunda başla, raket önde.',
          'Sağ bileği yüz hizasından öne ve aşağı patlat (net kill).',
          'Geri çek, başlangıca dön.',
          'Toplam 4 net kill.',
        ],
        validator: {
          type: 'reach',
          landmark: 'rightWrist',
          direction: 'down',
          threshold: 0.2,
          reps: 4,
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
  lessonId: string
):
  | { curriculum: SportCurriculum; lesson: SportCurriculum['lessons'][number] }
  | undefined {
  const curriculum = getCurriculumBySlug(slug);
  if (!curriculum) return undefined;
  const lesson = curriculum.lessons.find((l) => l.id === lessonId);
  if (!lesson) return undefined;
  return { curriculum, lesson };
}
