/**
 * Boyut bazlı antrenman programları — sonuç ekranında zayıf boyutlu
 * çocuklara somut egzersiz önerisi sunmak için.
 *
 * İçerik kaynağı: Bompa "Total Training for Young Champions" + ACSM
 * Youth Fitness Guidelines + GSB Yetenek Kılavuzu (2019). 8-15 yaş için
 * uyarlanmış set/rep/frekans değerleri.
 *
 * Disclaimer: Bu programlar "ön-uzman doğrulaması bekliyor" — gerçek
 * çocukla uygulamadan önce çocuk doktoru veya antrenör onayı alınmalı.
 */

import type { DimensionKey } from '@/lib/matching/sportProfiles';

export interface TrainingExercise {
  name: string;
  /** "3 set × 8-10 tekrar · 2 dk dinlenme" gibi */
  prescription: string;
  description: string;
  /** Görsel olarak yardımcı emoji (opsiyonel) */
  emoji?: string;
}

export interface TrainingProgram {
  dimension: DimensionKey;
  title: string;
  /** Eyebrow tag */
  tagline: string;
  /** Hedef bio-motor yeti açıklaması */
  description: string;
  /** Haftalık önerilen frekans (8-15 yaş) */
  frequency: string;
  /** Toplam program süresi */
  duration: string;
  /** Hangi sporlar için fayda sağlar */
  benefitsFor: string[];
  exercises: TrainingExercise[];
  /** Önemli güvenlik notu */
  safetyNote: string;
}

export const TRAINING_PROGRAMS: Record<DimensionKey, TrainingProgram> = {
  explosivePower: {
    dimension: 'explosivePower',
    title: 'Dikey Patlayıcı Güç',
    tagline: 'Sıçrama · Plyometric',
    description:
      'Hızlı kas-tendon esnemesi (stretch-shortening cycle) ile alt ekstremite patlayıcı kuvvetini geliştirir. Voleybol, basketbol, atlama branşları için belirleyici.',
    frequency: 'Haftada 2 gün, en az 48 saat dinlenme',
    duration: '6-8 hafta',
    benefitsFor: ['Voleybol', 'Basketbol', 'Atletizm-Atlama', 'Cimnastik'],
    exercises: [
      {
        emoji: '📦',
        name: 'Box Jump (kutu sıçrama)',
        prescription: '3 set × 5-8 tekrar · 90 sn dinlenme',
        description:
          '30-40 cm kutuya sıçra, ininde sessiz/yumuşak. Çömelme amortisörü kullan; sırt düz kalsın.',
      },
      {
        emoji: '⬇️',
        name: 'Depth Jump',
        prescription: '3 set × 4-6 tekrar · 2 dk dinlenme',
        description:
          'Düşük (20-30 cm) kutudan in, yere değer değmez maksimum sıçra. SSC için altın standart.',
      },
      {
        emoji: '🦵',
        name: 'Pliyometrik Squat',
        prescription: '3 set × 10 tekrar · 60 sn dinlenme',
        description:
          'Çömel, patlayıcı şekilde dikey sıçra. Kollarını yukarı savur. Yere yumuşak in.',
      },
      {
        emoji: '🚶',
        name: 'Bulgarian Split Squat',
        prescription: '3 set × 8 tekrar (her bacak) · 60 sn dinlenme',
        description:
          'Arka ayak sandalyede, ön bacakta yarı çömel. Tek-bacak gücü + denge geliştirir.',
      },
      {
        emoji: '🏃',
        name: 'Skipping Hops',
        prescription: '3 set × 15 m · 60 sn dinlenme',
        description:
          'Yüksek diz kalkışı ile yerden hızlı temas, "yere yapışma" hissi. Aşil tendonu için ısınma kritik.',
      },
    ],
    safetyNote:
      'Pliyometrik egzersizler genç sporcularda 8 yaşından itibaren önerilir; haftada en az 1 gün tam dinlenme şart.',
  },
  horizontalPower: {
    dimension: 'horizontalPower',
    title: 'Yatay Patlayıcı Güç',
    tagline: 'Sprint · Broad jump',
    description:
      'Yere yatay kuvvet uygulayarak hızlı ileri-itme kapasitesini geliştirir. Sprint, futbol, hentbol, judo için kritik.',
    frequency: 'Haftada 2-3 gün',
    duration: '4-6 hafta',
    benefitsFor: ['Atletizm-Sprint', 'Futbol', 'Hentbol', 'Judo'],
    exercises: [
      {
        emoji: '🏃‍♂️',
        name: 'Standing Long Jump',
        prescription: '3 set × 5 tekrar · 90 sn dinlenme',
        description:
          'Çift ayak ileri uzun atlama. Her tekrarda mesafe ölç → progresif hedef koyar.',
      },
      {
        emoji: '⏱️',
        name: '20 m Sprint Start',
        prescription: '5 tekrar · 2 dk dinlenme',
        description:
          'Crouch start veya falling start ile 20 metre maksimum hız. Kollarını agresif kullan.',
      },
      {
        emoji: '🪜',
        name: 'Agility Ladder Forward',
        prescription: '3 set × 4 geçiş · 45 sn dinlenme',
        description:
          'Merdivende ayak frekansı (high-knees, in-out, lateral). Hız + koordinasyon birleşir.',
      },
      {
        emoji: '🎒',
        name: 'Sled / Resistance Drag',
        prescription: '4 set × 15 m · 90 sn dinlenme',
        description:
          'Hafif direnç ile koşu. Yük: vücut ağırlığının %5-10\'u. İtme kuvveti hissi geliştirir.',
      },
      {
        emoji: '🦘',
        name: 'Bound (single-leg hop)',
        prescription: '3 set × 6 atlayış (her bacak)',
        description:
          'Tek bacakta uzun-mesafe sıçrama. Ileri-yan koordinasyon + stabilite.',
      },
    ],
    safetyNote:
      'Sprint öncesi 8-10 dk dinamik ısınma. Hamstring esnetme + bacak savurma rutini eklenmeli.',
  },
  balance: {
    dimension: 'balance',
    title: 'Denge & Postüral Kontrol',
    tagline: 'Tek-bacak · Kor stabilite',
    description:
      'Postüral salınım kontrolü, tek-bacak duruş süresi ve sol-sağ simetri. Asimetri sakatlanma riskini artırdığı için tüm sporlarda kritik.',
    frequency: 'Haftada 3-4 gün, kısa seanslar',
    duration: 'Sürekli (sporun parçası)',
    benefitsFor: ['Cimnastik', 'Tenis', 'Judo', 'Yüzme', 'Tüm sporlar'],
    exercises: [
      {
        emoji: '🦩',
        name: 'Tek Bacak Duruş',
        prescription: '3 set × 30 sn (her bacak) · 30 sn dinlenme',
        description:
          'Gözler açık → kapalı → kafayı sağa-sola çevir. Zorluk progresif artar.',
      },
      {
        emoji: '🏋️',
        name: 'Single-Leg Deadlift',
        prescription: '3 set × 8 tekrar (her bacak)',
        description:
          'Hafif ağırlık veya boş çubuk. Kalçayı geri it, hamstring ger, dengede kal. Posterior chain.',
      },
      {
        emoji: '⭐',
        name: 'Y-Balance Reach',
        prescription: '3 set × 5 yön (her bacak)',
        description:
          'Tek bacakta dur, diğer ayağı 3 yöne (öne, arka-iç, arka-dış) uzat. Reach + stabilizasyon.',
      },
      {
        emoji: '🪵',
        name: 'BOSU/Yastık Squat',
        prescription: '3 set × 10 tekrar',
        description:
          'Yumuşak yüzeyde squat. Düz çift ayak başlar; sonra tek ayağa geçilir.',
      },
      {
        emoji: '🌉',
        name: 'Side Plank (yan plank)',
        prescription: '3 set × 30-45 sn (her taraf)',
        description:
          'Lateral kor stabilite. Asimetri varsa zayıf taraf için 1-2 set ekstra.',
      },
    ],
    safetyNote:
      'Asimetri %15\'i geçen çocuklar için fizyoterapist veya spor hekimi konsültasyonu önerilir. Bu egzersizler tedavi yerine geçmez.',
  },
  reaction: {
    dimension: 'reaction',
    title: 'Reaksiyon Süresi',
    tagline: 'Bilişsel hız · Refleks',
    description:
      'Görsel/işitsel uyaranlara hızlı motor cevap. Raket sporları, masa tenisi, boks, takım sporları için temel yetenek.',
    frequency: 'Haftada 3-5 gün, kısa seanslar (10-15 dk)',
    duration: '4-8 hafta belirgin gelişim',
    benefitsFor: ['Tenis', 'Masa Tenisi', 'Badminton', 'Boks', 'Taekwondo'],
    exercises: [
      {
        emoji: '🎾',
        name: 'Tennis Ball Drop',
        prescription: '5 set × 8 yakalama',
        description:
          'Antrenör/aile düşürür, çocuk omuz yüksekliğinden yere değmeden yakalar. Mesafe progresif kısalır.',
      },
      {
        emoji: '👋',
        name: 'Partner Clap Reaction',
        prescription: '3 set × 30 sn',
        description:
          'Karşılıklı durulur, biri rastgele alkışlar. Diğeri alkış sesinde squat\'a girer veya jumping jack yapar.',
      },
      {
        emoji: '🎨',
        name: 'Renk Tepkisi (3 renk)',
        prescription: '3 set × 20 tekrar',
        description:
          '3 farklı renk kart. Her renk farklı hareket (kırmızı: çömel, mavi: zıpla, sarı: dön).',
      },
      {
        emoji: '🥎',
        name: 'Sallanan Top',
        prescription: '3 set × 20 yakalama',
        description:
          'Tavandan iple sarkıtılan tenis topu, 3-4 m mesafeden çocuğa rastgele yön verilir; çocuk yakalar.',
      },
      {
        emoji: '📱',
        name: 'Yetenek 2.0 Reaksiyon Testi',
        prescription: '5 deneme × 3 set haftada',
        description:
          'Uygulamamızdaki reaksiyon testini düzenli yap; ortalaması ms cinsinden takip edilir.',
      },
    ],
    safetyNote:
      'Reaksiyon antrenmanı yorucu değildir, ancak günde 15 dk\'yı geçmemelidir; üzerinde dikkat dağılır.',
  },
  agility: {
    dimension: 'agility',
    title: 'Çeviklik · COD',
    tagline: 'Yön değişimi · Lateral hareket',
    description:
      'Hızlı yön değiştirme + ivmelenme/yavaşlama yeteneği. Futbol, basketbol, badminton, tenis için belirleyici.',
    frequency: 'Haftada 2-3 gün',
    duration: '4-6 hafta',
    benefitsFor: ['Futbol', 'Basketbol', 'Badminton', 'Tenis', 'Taekwondo'],
    exercises: [
      {
        emoji: '🔁',
        name: '5-10-5 Shuttle',
        prescription: '4 set · 90 sn dinlenme',
        description:
          'Orta noktadan 5m sağa, 10m sola, 5m sağa. Klasik COD testi + antrenman.',
      },
      {
        emoji: '🎯',
        name: 'T-Drill',
        prescription: '4 set · 90 sn dinlenme',
        description:
          'T şeklinde 4 koni. İlerle, sola yana git, dön, sağa yana git, dön, geri.',
      },
      {
        emoji: '↔️',
        name: 'Lateral Cone Hop',
        prescription: '3 set × 30 sn',
        description:
          'İki koni arasında çift ayak yan sıçrama. Mümkün olduğunca hızlı.',
      },
      {
        emoji: '🪜',
        name: 'Agility Ladder Lateral',
        prescription: '3 set × 4 geçiş',
        description:
          'Yan in-in-out-out, ali-shuffle, icky-shuffle gibi kalıplar. Ayak frekansı + koordinasyon.',
      },
      {
        emoji: '👁️',
        name: 'Reactive Mirror Drill',
        prescription: '3 set × 30 sn',
        description:
          'Karşılıklı durur, biri lider rastgele yön değiştirir, diğeri ayna olarak takip eder.',
      },
    ],
    safetyNote:
      'Soğuk başlatma sakatlanma riski yaratır. Mutlaka 8-10 dk dinamik ısınma + bacak savurma + ankle mobility.',
  },
  coordination: {
    dimension: 'coordination',
    title: 'Koordinasyon · Göz-El',
    tagline: 'İnce motor · Tracking',
    description:
      'Görsel-motor uyumu, ince motor kontrol, ritmik hareket. Raket sporları, masa tenisi, dövüş sporlarının temeli.',
    frequency: 'Haftada 4-5 gün, 15 dk',
    duration: 'Sürekli',
    benefitsFor: ['Masa Tenisi', 'Badminton', 'Tenis', 'Cimnastik', 'Boks'],
    exercises: [
      {
        emoji: '🤹',
        name: 'Ball Juggling',
        prescription: '3 set × 1 dk',
        description:
          '2 top ile başla, 3 topa geç. El-göz koordinasyonu için klasik. Aynı anda saymak ekstra zorluk.',
      },
      {
        emoji: '🎾',
        name: 'Wall Toss & Catch',
        prescription: '3 set × 30 sn',
        description:
          'Duvara hızlı top fırlat-yakala. Tek el → çift el geçişleri ekle. Zorluk: 2 top alternatif.',
      },
      {
        emoji: '🎨',
        name: 'Cross-Body Pattern',
        prescription: '3 set × 30 sn',
        description:
          'Sağ el sol dize, sol el sağ omuza vb. çapraz kalıplar. Her seferinde hızlanır.',
      },
      {
        emoji: '🏓',
        name: 'Mini Paddle Bounce',
        prescription: '3 set × 30 saniye',
        description:
          'Masa tenis raketinde topu zıplatma. 20\'yi geçince havada zıplatma egzersizi başlar.',
      },
      {
        emoji: '👀',
        name: 'Pursuit Gaze Drill',
        prescription: '3 set × 30 sn',
        description:
          'Hareket eden bir hedefi (sallanan top, drone, lazer noktası) gözle takip et. Boyun sabit kalır.',
      },
    ],
    safetyNote:
      'Koordinasyon antrenmanı yorucu değildir; günlük rutinin parçası olabilir.',
  },
  endurance: {
    dimension: 'endurance',
    title: 'Aerobik & Anaerobik Dayanıklılık',
    tagline: 'Kardiyo kapasitesi',
    description:
      'Uzun süre yüksek tempo sürdürme + tekrarlı sprint kapasitesi. Yüzme, mesafe koşusu, futbol, basketbol için kritik.',
    frequency: 'Haftada 3-4 gün',
    duration: '6-8 hafta',
    benefitsFor: ['Yüzme', 'Atletizm-Mesafe', 'Futbol', 'Basketbol', 'Hentbol'],
    exercises: [
      {
        emoji: '🤸',
        name: 'Jumping Jack Intervals',
        prescription: '6 set × 30 sn iş / 30 sn dinlenme',
        description:
          'Klasik jumping jack 30 sn maksimum tempo, 30 sn yürüme. Kalp atışı hızla yükselir.',
      },
      {
        emoji: '🧗',
        name: 'Mountain Climbers',
        prescription: '4 set × 30 sn · 30 sn dinlenme',
        description:
          'Yüksek plank duruşunda dizleri sıra ile göğüse çek. Kor + kardiyo birleşir.',
      },
      {
        emoji: '💥',
        name: 'Burpee 30s AMRAP',
        prescription: '3 set × 30 sn · 60 sn dinlenme',
        description:
          'Squat + plank + zıpla. 30 sn içinde mümkün olduğunca çok tekrar (As Many Reps As Possible).',
      },
      {
        emoji: '🏃‍♀️',
        name: 'Beep Test / Yo-Yo',
        prescription: 'Haftada 1 kez · ilerleyici',
        description:
          '20m mekik koşu, sinyal hızı kademeli artar. Aerobik kapasite testi + antrenman.',
      },
      {
        emoji: '🚴',
        name: 'Tabata Bisiklet',
        prescription: '8 tekrar × 20sn maks / 10sn dinlenme',
        description:
          '4 dakikada anaerobik HIIT. Bisiklet veya koşu bandı. Kalp atışı 90% maksimuma.',
      },
    ],
    safetyNote:
      'Yüksek yoğunluklu seanslar haftada en fazla 2 gün üst üste olmamalı. Yüklenme öncesi 10 dk ısınma şart.',
  },
};

export const PROGRAM_LIST = Object.values(TRAINING_PROGRAMS);
