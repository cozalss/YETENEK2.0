/**
 * Yetenek 2.0 rozet sistemi.
 *
 * Rozet türleri:
 *   - performance  : Test bazında üstün skor (sıçrama, denge, reaksiyon)
 *   - profile      : Spor matching'de üst sıralama (voleybol, tenis vb)
 *   - general      : Diğer (mükemmel skor, simetri, ilk test)
 *   - streak       : Tekrarlı kullanım (haftalık, aylık)
 *
 * Bir oturum biter bitmez `computeBadgesForSession()` çalıştırılır,
 * dönen rozetler `gamificationStore.unlock()` ile kullanıcının cüzdanına
 * eklenir.
 *
 * Rozet kriterleri demo'yu eğlenceli kılmaya optimize edildi (ilk testte
 * neredeyse herkes 1-2 rozet kazanır), gerçek pazara çıkıldığında
 * rebalance edilebilir.
 */

import type { SessionSummary } from '@/lib/session/store';

export type BadgeCategory = 'performance' | 'profile' | 'general' | 'streak';

export interface Badge {
  id: string;
  category: BadgeCategory;
  emoji: string;
  name: string;
  description: string;
  /** Kullanıcı bu rozeti nasıl kazanır — sade bir cümle */
  earnedFor: string;
}

export const BADGES: Record<string, Badge> = {
  // Performans rozetleri
  rocketBack: {
    id: 'rocketBack',
    category: 'performance',
    emoji: '🚀',
    name: 'Roketsırtı',
    description: 'Sıçrama gücün yaş ortalamasının çok üstünde.',
    earnedFor: 'Sıçrama testinde 80+ skor',
  },
  acrobat: {
    id: 'acrobat',
    category: 'performance',
    emoji: '🤸',
    name: 'Akrobat',
    description: 'Postüral kontrolün ileri düzeyde.',
    earnedFor: 'Denge testinde 80+ skor (her iki bacak)',
  },
  lightning: {
    id: 'lightning',
    category: 'performance',
    emoji: '⚡',
    name: 'Şimşek',
    description: 'Refleslerin yaş grubunun üst diliminde.',
    earnedFor: 'Reaksiyon yaş norm skoru 80+',
  },
  longJumper: {
    id: 'longJumper',
    category: 'performance',
    emoji: '💨',
    name: 'Yatay Roket',
    description: 'Yatay patlayıcı gücün yaş ortalamasının çok üstünde.',
    earnedFor: 'Uzun atlama testinde 80+ skor',
  },
  ninja: {
    id: 'ninja',
    category: 'performance',
    emoji: '🥷',
    name: 'Ninja',
    description: 'Yön değiştirme hızın olağanüstü.',
    earnedFor: 'Çeviklik testinde 80+ skor',
  },
  sharpEye: {
    id: 'sharpEye',
    category: 'performance',
    emoji: '🎯',
    name: 'Keskin Göz',
    description: 'Göz-el koordinasyonun ileri seviyede.',
    earnedFor: 'Koordinasyon testinde 80+ skor',
  },
  marathoner: {
    id: 'marathoner',
    category: 'performance',
    emoji: '🔥',
    name: 'Maraton Yüreği',
    description: 'Dayanıklılığın yaşıtlarından üstün.',
    earnedFor: 'Dayanıklılık testinde 80+ skor',
  },

  // Profil rozetleri (spor matching'e göre)
  volleyballStar: {
    id: 'volleyballStar',
    category: 'profile',
    emoji: '🏐',
    name: 'Voleybol Yıldızı',
    description: 'Profilin voleybol için ideal eşleşiyor.',
    earnedFor: 'Voleybol önerisi 80%+ eşleşme',
  },
  tennisHeart: {
    id: 'tennisHeart',
    category: 'profile',
    emoji: '🎾',
    name: 'Tenis Tutkunu',
    description: 'Reaksiyon ve dengen tenis için ideal.',
    earnedFor: 'Tenis önerisi 80%+ eşleşme',
  },
  footballPotential: {
    id: 'footballPotential',
    category: 'profile',
    emoji: '⚽',
    name: 'Futbol Yeteneği',
    description: 'Dengeli profilin futbol için uygun.',
    earnedFor: 'Futbol önerisi 80%+ eşleşme',
  },
  basketballPotential: {
    id: 'basketballPotential',
    category: 'profile',
    emoji: '🏀',
    name: 'Basketbol Yeteneği',
    description: 'Sıçrama ve koordinasyonun basketbol için ideal.',
    earnedFor: 'Basketbol önerisi 80%+ eşleşme',
  },
  swimmer: {
    id: 'swimmer',
    category: 'profile',
    emoji: '🏊',
    name: 'Yüzücü',
    description: 'Profilin yüzme için uygun.',
    earnedFor: 'Yüzme önerisi 80%+ eşleşme',
  },
  sprinter: {
    id: 'sprinter',
    category: 'profile',
    emoji: '🏃',
    name: 'Atletizm Yeteneği',
    description: 'Yatay patlayıcı gücün ve reaksiyonun atletizm sprint için ideal.',
    earnedFor: 'Atletizm önerisi 80%+ eşleşme',
  },
  gymnast: {
    id: 'gymnast',
    category: 'profile',
    emoji: '🤾',
    name: 'Cimnastikçi',
    description: 'Denge ve koordinasyon profilin cimnastik için harika.',
    earnedFor: 'Cimnastik önerisi 80%+ eşleşme',
  },
  judoka: {
    id: 'judoka',
    category: 'profile',
    emoji: '🥋',
    name: 'Judo Yeteneği',
    description: 'Denge ve patlayıcı gücün judo için uygun.',
    earnedFor: 'Judo önerisi 80%+ eşleşme',
  },
  taekwon: {
    id: 'taekwon',
    category: 'profile',
    emoji: '🦵',
    name: 'Taekwondo Yeteneği',
    description: 'Reaksiyon ve çevikliğin taekwondo için ideal.',
    earnedFor: 'Taekwondo önerisi 80%+ eşleşme',
  },
  boxer: {
    id: 'boxer',
    category: 'profile',
    emoji: '🥊',
    name: 'Boksör',
    description: 'Reaksiyon ve dayanıklılık profilin bokstur.',
    earnedFor: 'Boks önerisi 80%+ eşleşme',
  },
  paddler: {
    id: 'paddler',
    category: 'profile',
    emoji: '🏓',
    name: 'Masa Tenisçi',
    description: 'Reaksiyon ve koordinasyonun masa tenisi için harika.',
    earnedFor: 'Masa Tenisi önerisi 80%+ eşleşme',
  },
  shuttler: {
    id: 'shuttler',
    category: 'profile',
    emoji: '🏸',
    name: 'Badmintoncu',
    description: 'Reaksiyon, çeviklik, koordinasyon — badminton için ideal.',
    earnedFor: 'Badminton önerisi 80%+ eşleşme',
  },

  // Genel rozetleri
  firstStep: {
    id: 'firstStep',
    category: 'general',
    emoji: '🌱',
    name: 'İlk Adım',
    description: 'Yetenek 2.0 yolculuğun başladı.',
    earnedFor: 'İlk testini tamamladın',
  },
  perfectScore: {
    id: 'perfectScore',
    category: 'general',
    emoji: '💯',
    name: 'Mükemmel Skor',
    description: 'Bir testte neredeyse mükemmel skor aldın.',
    earnedFor: 'Bir testte 95+ skor',
  },
  symmetric: {
    id: 'symmetric',
    category: 'general',
    emoji: '⚖️',
    name: 'Dengeli Sporcu',
    description: 'Sol-sağ vücut dengen kusursuz.',
    earnedFor: 'Asimetri %5 altında',
  },
  fullScreening: {
    id: 'fullScreening',
    category: 'general',
    emoji: '🏆',
    name: 'Tam Tarama',
    description: 'Tüm 7 testi tamamladın, profilin eksiksiz çıkarıldı.',
    earnedFor: '7 testin tamamı yapıldı',
  },
  quickCheck: {
    id: 'quickCheck',
    category: 'general',
    emoji: '✅',
    name: 'Hızlı Tarama',
    description: 'Çekirdek testleri tamamladın.',
    earnedFor: '3 çekirdek test (sıçrama + denge + reaksiyon) tamamlandı',
  },
  sevenWonders: {
    id: 'sevenWonders',
    category: 'general',
    emoji: '🌟',
    name: 'Yedi Yıldız',
    description: 'Yedi boyutta da yaş ortalamasının üstündesin.',
    earnedFor: 'Tüm 7 testte 60+ skor',
  },
};

/**
 * Bir test oturumundan kazanılan rozetleri hesapla.
 * Önceki oturumlarda kazanılmış olabilecek rozetleri filtrelemek arayanın işi.
 */
export function computeBadgesForSession(
  session: SessionSummary
): Badge[] {
  const earned: Badge[] = [];

  // Genel: ilk adım (her zaman verilir, store ilk kez verilenleri ayıklar)
  earned.push(BADGES.firstStep);

  // Quick check: çekirdek 3 test tamamlandı
  if (session.jump && session.balance && session.reaction) {
    earned.push(BADGES.quickCheck);
  }

  // Tam tarama: tüm 7 test tamamlandı
  if (
    session.jump &&
    session.balance &&
    session.reaction &&
    session.broadJump &&
    session.lateralHops &&
    session.coordination &&
    session.endurance
  ) {
    earned.push(BADGES.fullScreening);
  }

  // Performans rozetleri
  if (session.jump && session.jump.score >= 80) {
    earned.push(BADGES.rocketBack);
  }
  if (
    session.balance &&
    session.balance.rightScore >= 80 &&
    session.balance.leftScore >= 80
  ) {
    earned.push(BADGES.acrobat);
  }
  if (session.reaction && session.reaction.ageNormScore >= 80) {
    earned.push(BADGES.lightning);
  }
  if (session.broadJump && session.broadJump.score >= 80) {
    earned.push(BADGES.longJumper);
  }
  if (session.lateralHops && session.lateralHops.score >= 80) {
    earned.push(BADGES.ninja);
  }
  if (session.coordination && session.coordination.score >= 80) {
    earned.push(BADGES.sharpEye);
  }
  if (session.endurance && session.endurance.score >= 80) {
    earned.push(BADGES.marathoner);
  }

  // Mükemmel skor (95+ herhangi bir testte)
  const allScores = [
    session.jump?.score ?? 0,
    session.balance?.rightScore ?? 0,
    session.balance?.leftScore ?? 0,
    session.reaction?.ageNormScore ?? 0,
    session.broadJump?.score ?? 0,
    session.lateralHops?.score ?? 0,
    session.coordination?.score ?? 0,
    session.endurance?.score ?? 0,
  ];
  if (Math.max(...allScores) >= 95) {
    earned.push(BADGES.perfectScore);
  }

  // 7 yıldız: tüm 7 boyutta 60+ skor (sadece tüm testler tamamlandıysa)
  const minOf7 =
    session.jump &&
    session.balance &&
    session.reaction &&
    session.broadJump &&
    session.lateralHops &&
    session.coordination &&
    session.endurance
      ? Math.min(
          session.jump.score,
          (session.balance.rightScore + session.balance.leftScore) / 2,
          session.reaction.ageNormScore,
          session.broadJump.score,
          session.lateralHops.score,
          session.coordination.score,
          session.endurance.score
        )
      : 0;
  if (minOf7 >= 60) {
    earned.push(BADGES.sevenWonders);
  }

  // Simetrik (asimetri <%5)
  if (session.balance && session.balance.asymmetryPercent < 5) {
    earned.push(BADGES.symmetric);
  }

  // Profil rozetleri (top önerilerde bu spor varsa ve confidence 80+)
  const sportToBadge: Record<string, string> = {
    Voleybol: 'volleyballStar',
    Tenis: 'tennisHeart',
    Futbol: 'footballPotential',
    Basketbol: 'basketballPotential',
    Yüzme: 'swimmer',
    Atletizm: 'sprinter',
    Cimnastik: 'gymnast',
    Judo: 'judoka',
    Taekwondo: 'taekwon',
    Boks: 'boxer',
    'Masa Tenisi': 'paddler',
    Badminton: 'shuttler',
  };

  for (const rec of session.recommendations ?? []) {
    if (rec.confidencePercent < 80) continue;
    const badgeId = sportToBadge[rec.sport];
    if (badgeId && BADGES[badgeId]) {
      earned.push(BADGES[badgeId]);
    }
  }

  // Tekrarsızlaştır (aynı rozetin iki kez girmesini engelle)
  const seen = new Set<string>();
  return earned.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
}

export function getBadgesByCategory(badges: Badge[]): Record<BadgeCategory, Badge[]> {
  const groups: Record<BadgeCategory, Badge[]> = {
    performance: [],
    profile: [],
    general: [],
    streak: [],
  };
  for (const badge of badges) {
    groups[badge.category].push(badge);
  }
  return groups;
}
