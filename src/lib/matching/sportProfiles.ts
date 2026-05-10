/**
 * Spor profilleri v2 — 14 spor × 7 boyutlu bio-motor vektör + ağırlık matrisi
 * + antropometrik avantaj göstergeleri.
 *
 * Boyutlar (0-1 normalize):
 *   explosivePower   → CMJ (dikey patlayıcı güç)
 *   horizontalPower  → broad jump (yatay patlayıcı güç)
 *   balance          → tek bacak postüral kontrol
 *   reaction         → simple visual reaction time
 *   agility          → lateral hops (çeviklik / COD)
 *   coordination     → görsel takip (göz-el koordinasyonu)
 *   endurance        → 30sn jumping jacks (anaerobik kapasite proxy)
 *
 * Vektör = sporun "ideal yetenek profili" (literatür ortalamaları).
 * Weights = bu sporda her boyutun göreceli önemi (yüksek ağırlık →
 *           o boyutta uyumsuzluk daha sert cezalandırılır).
 *
 * Anthropometric favor:
 *   heightAdvantage  — uzun boyun avantaj kattığı sporlar (basketbol, voleybol)
 *   leanAdvantage    — düşük BMI/lean profilin avantaj kattığı sporlar
 *                      (cimnastik, mesafe koşusu)
 *
 * Kalibrasyon kaynakları:
 *  - Bompa & Buzzichelli 2019 (Periodization, 6e)
 *  - Williams & Reilly 2000 J Sports Sci 18:657 (futbol)
 *  - Mancha-Triguero 2023 PMC10686286 (basketbol meta-analiz)
 *  - Pion 2015 J Strength Cond Res 29:1480 (voleybol)
 *  - Sands 2003 (cimnastik bilimi)
 *  - Franchini 2011 Sports Med 41:147 (judo)
 *  - Bridge 2014 Sports Med 44:713 (taekwondo)
 *  - Chaabène 2015 Sports Med 45:337 (boks)
 *  - Kovacs 2007 Sports Med 37:189 (tenis)
 *  - Phomsoupha & Laffaye 2015 Sports Med 45:473 (badminton)
 *  - Kondrič 2013 J Sports Sci Med 12:362 (masa tenisi)
 *  - Lidor 2005 Eur J Sport Sci (hentbol)
 *  - Price 2024 PMC10797935 (yüzme)
 *  - Norton & Olds 2001 Anthropometrica (antropometrik avantajlar)
 *  - Carter & Heath 1990 Somatotyping
 */

export interface SportVector {
  explosivePower: number;
  horizontalPower: number;
  balance: number;
  reaction: number;
  agility: number;
  coordination: number;
  endurance: number;
}

export type DimensionKey = keyof SportVector;

export const DIMENSION_KEYS: DimensionKey[] = [
  'explosivePower',
  'horizontalPower',
  'balance',
  'reaction',
  'agility',
  'coordination',
  'endurance',
];

export const DIMENSION_LABELS_TR: Record<DimensionKey, string> = {
  explosivePower: 'Dikey Patlayıcı Güç',
  horizontalPower: 'Yatay Patlayıcı Güç',
  balance: 'Denge',
  reaction: 'Reaksiyon',
  agility: 'Çeviklik',
  coordination: 'Koordinasyon',
  endurance: 'Dayanıklılık',
};

export interface AnthroFavor {
  /** 0-1: uzun boyun ne kadar avantaj kattığı */
  heightAdvantage: number;
  /** 0-1: düşük BMI / lean profilin ne kadar avantaj kattığı */
  leanAdvantage: number;
}

export interface SportProfile {
  sport: string;
  description: string;
  vector: SportVector;
  /** Per-boyut önem ağırlıkları (weighted Euclidean için) */
  weights: SportVector;
  anthroFavor: AnthroFavor;
  reasonTemplate: string;
}

export const SPORT_PROFILES: SportProfile[] = [
  {
    sport: 'Voleybol',
    description: 'Yüksek sıçrama, takım sporu, blok ve smaç',
    vector: {
      explosivePower: 0.95,
      horizontalPower: 0.55,
      balance: 0.55,
      reaction: 0.7,
      agility: 0.75,
      coordination: 0.8,
      endurance: 0.55,
    },
    weights: {
      explosivePower: 1.0,
      horizontalPower: 0.55,
      balance: 0.5,
      reaction: 0.65,
      agility: 0.7,
      coordination: 0.75,
      endurance: 0.5,
    },
    anthroFavor: { heightAdvantage: 0.85, leanAdvantage: 0.3 },
    reasonTemplate:
      'Dikey patlayıcı gücün ve koordinasyonun voleybolun blok ve smaç gereksinimleri için ideal.',
  },
  {
    sport: 'Basketbol',
    description: 'Sıçrama, çeviklik, koordinasyon, kondisyon',
    vector: {
      explosivePower: 0.9,
      horizontalPower: 0.65,
      balance: 0.55,
      reaction: 0.65,
      agility: 0.85,
      coordination: 0.75,
      endurance: 0.75,
    },
    weights: {
      explosivePower: 0.9,
      horizontalPower: 0.6,
      balance: 0.5,
      reaction: 0.6,
      agility: 0.85,
      coordination: 0.7,
      endurance: 0.7,
    },
    anthroFavor: { heightAdvantage: 0.9, leanAdvantage: 0.3 },
    reasonTemplate:
      'Dikey gücün, çevikliğin ve dayanıklılığın basketbolun pota altı ve hızlı transition oyunu için güçlü.',
  },
  {
    sport: 'Tenis',
    description: 'Refleks, çeviklik, koordinasyon, denge',
    vector: {
      explosivePower: 0.65,
      horizontalPower: 0.6,
      balance: 0.65,
      reaction: 0.85,
      agility: 0.9,
      coordination: 0.85,
      endurance: 0.7,
    },
    weights: {
      explosivePower: 0.55,
      horizontalPower: 0.55,
      balance: 0.55,
      reaction: 0.85,
      agility: 0.9,
      coordination: 0.8,
      endurance: 0.65,
    },
    anthroFavor: { heightAdvantage: 0.2, leanAdvantage: 0.4 },
    reasonTemplate:
      'Reaksiyonun, çevikliğin ve göz-el koordinasyonun tenisin anlık vuruş ve baseline oyununa ideal.',
  },
  {
    sport: 'Yüzme',
    description: 'Dayanıklılık, koordinasyon, denge',
    vector: {
      explosivePower: 0.55,
      horizontalPower: 0.5,
      balance: 0.45,
      reaction: 0.5,
      agility: 0.45,
      coordination: 0.65,
      endurance: 0.95,
    },
    weights: {
      explosivePower: 0.5,
      horizontalPower: 0.45,
      balance: 0.4,
      reaction: 0.45,
      agility: 0.4,
      coordination: 0.6,
      endurance: 1.0,
    },
    anthroFavor: { heightAdvantage: 0.5, leanAdvantage: 0.5 },
    reasonTemplate:
      'Aerobik dayanıklılığın ve koordinasyonun yüzmenin ritimli stroke yapısına çok uygun.',
  },
  {
    sport: 'Futbol',
    description: 'Çeviklik, dayanıklılık, koşu, koordinasyon',
    vector: {
      explosivePower: 0.7,
      horizontalPower: 0.75,
      balance: 0.55,
      reaction: 0.65,
      agility: 0.85,
      coordination: 0.7,
      endurance: 0.9,
    },
    weights: {
      explosivePower: 0.65,
      horizontalPower: 0.7,
      balance: 0.5,
      reaction: 0.6,
      agility: 0.85,
      coordination: 0.65,
      endurance: 0.85,
    },
    anthroFavor: { heightAdvantage: 0.1, leanAdvantage: 0.4 },
    reasonTemplate:
      'Çevikliğin ve dayanıklılığın futbolun değişken yön becerileri ve süreklilik gereksinimi için ideal.',
  },
  {
    sport: 'Atletizm — Sprint',
    description: 'Patlayıcı sürat, ivme, reaksiyon',
    vector: {
      explosivePower: 0.85,
      horizontalPower: 0.95,
      balance: 0.45,
      reaction: 0.85,
      agility: 0.55,
      coordination: 0.55,
      endurance: 0.4,
    },
    weights: {
      explosivePower: 0.8,
      horizontalPower: 1.0,
      balance: 0.4,
      reaction: 0.85,
      agility: 0.55,
      coordination: 0.5,
      endurance: 0.35,
    },
    anthroFavor: { heightAdvantage: 0.3, leanAdvantage: 0.7 },
    reasonTemplate:
      'Yatay patlayıcı gücün ve reaksiyonun 100m/200m sprint için kritik düzeyde güçlü.',
  },
  {
    sport: 'Atletizm — Mesafe',
    description: 'Aerobik dayanıklılık, ekonomi, lean profil',
    vector: {
      explosivePower: 0.45,
      horizontalPower: 0.55,
      balance: 0.4,
      reaction: 0.35,
      agility: 0.3,
      coordination: 0.45,
      endurance: 1.0,
    },
    weights: {
      explosivePower: 0.4,
      horizontalPower: 0.5,
      balance: 0.35,
      reaction: 0.3,
      agility: 0.3,
      coordination: 0.4,
      endurance: 1.0,
    },
    anthroFavor: { heightAdvantage: 0.2, leanAdvantage: 0.8 },
    reasonTemplate:
      'Dayanıklılık kapasiten orta-uzun mesafe koşu için ideal; lean yapı uzun vadede avantaj.',
  },
  {
    sport: 'Cimnastik',
    description: 'Denge, koordinasyon, patlayıcı, lean',
    vector: {
      explosivePower: 0.9,
      horizontalPower: 0.65,
      balance: 1.0,
      reaction: 0.55,
      agility: 0.55,
      coordination: 1.0,
      endurance: 0.55,
    },
    weights: {
      explosivePower: 0.85,
      horizontalPower: 0.6,
      balance: 1.0,
      reaction: 0.55,
      agility: 0.55,
      coordination: 0.95,
      endurance: 0.55,
    },
    anthroFavor: { heightAdvantage: 0.0, leanAdvantage: 0.9 },
    reasonTemplate:
      'Dengenin, koordinasyonun ve patlayıcı gücünün cimnastik için olağanüstü uygun bir kombinasyon.',
  },
  {
    sport: 'Judo',
    description: 'Denge, kavrama, patlayıcı, çoklu yetenek',
    vector: {
      explosivePower: 0.7,
      horizontalPower: 0.75,
      balance: 0.85,
      reaction: 0.8,
      agility: 0.75,
      coordination: 0.75,
      endurance: 0.75,
    },
    weights: {
      explosivePower: 0.65,
      horizontalPower: 0.7,
      balance: 0.8,
      reaction: 0.75,
      agility: 0.7,
      coordination: 0.7,
      endurance: 0.7,
    },
    anthroFavor: { heightAdvantage: 0.3, leanAdvantage: 0.0 },
    reasonTemplate:
      'Dengen ve patlayıcı gücün judo için ideal; kavrama mücadelesinde reaksiyon ve dayanıklılık önemli.',
  },
  {
    sport: 'Taekwondo',
    description: 'Reaksiyon, çeviklik, yüksek tekme, hız',
    vector: {
      explosivePower: 0.85,
      horizontalPower: 0.55,
      balance: 0.75,
      reaction: 0.9,
      agility: 0.85,
      coordination: 0.7,
      endurance: 0.65,
    },
    weights: {
      explosivePower: 0.8,
      horizontalPower: 0.55,
      balance: 0.7,
      reaction: 0.9,
      agility: 0.85,
      coordination: 0.65,
      endurance: 0.6,
    },
    anthroFavor: { heightAdvantage: 0.4, leanAdvantage: 0.5 },
    reasonTemplate:
      'Reaksiyonun ve çevikliğin taekwondonun anlık tekme ve geri çekilme oyununa ideal.',
  },
  {
    sport: 'Boks',
    description: 'Reaksiyon, koordinasyon, dayanıklılık',
    vector: {
      explosivePower: 0.65,
      horizontalPower: 0.65,
      balance: 0.65,
      reaction: 0.95,
      agility: 0.8,
      coordination: 0.8,
      endurance: 0.8,
    },
    weights: {
      explosivePower: 0.6,
      horizontalPower: 0.6,
      balance: 0.6,
      reaction: 0.95,
      agility: 0.75,
      coordination: 0.75,
      endurance: 0.75,
    },
    anthroFavor: { heightAdvantage: 0.2, leanAdvantage: 0.4 },
    reasonTemplate:
      'Reaksiyonun ve dayanıklılığın boksun yumruk-savunma rotasyonuna çok uygun.',
  },
  {
    sport: 'Masa Tenisi',
    description: 'Reaksiyon, koordinasyon, ince motor',
    vector: {
      explosivePower: 0.4,
      horizontalPower: 0.35,
      balance: 0.55,
      reaction: 0.95,
      agility: 0.75,
      coordination: 0.95,
      endurance: 0.45,
    },
    weights: {
      explosivePower: 0.35,
      horizontalPower: 0.3,
      balance: 0.5,
      reaction: 0.95,
      agility: 0.7,
      coordination: 0.95,
      endurance: 0.4,
    },
    anthroFavor: { heightAdvantage: 0.0, leanAdvantage: 0.2 },
    reasonTemplate:
      'Reaksiyonun ve koordinasyonun masa tenisinin saliseyle ölçülen vuruşları için olağanüstü.',
  },
  {
    sport: 'Badminton',
    description: 'Reaksiyon, çeviklik, raket koordinasyonu',
    vector: {
      explosivePower: 0.7,
      horizontalPower: 0.55,
      balance: 0.65,
      reaction: 0.95,
      agility: 0.9,
      coordination: 0.95,
      endurance: 0.65,
    },
    weights: {
      explosivePower: 0.65,
      horizontalPower: 0.5,
      balance: 0.6,
      reaction: 0.95,
      agility: 0.9,
      coordination: 0.95,
      endurance: 0.6,
    },
    anthroFavor: { heightAdvantage: 0.2, leanAdvantage: 0.5 },
    reasonTemplate:
      'Reaksiyonun, çevikliğin ve koordinasyonun birleşimi badmintonun smaç-defans rotasyonu için ideal.',
  },
  {
    sport: 'Hentbol',
    description: 'Patlayıcı atış + dayanıklılık + çeviklik',
    vector: {
      explosivePower: 0.8,
      horizontalPower: 0.75,
      balance: 0.55,
      reaction: 0.7,
      agility: 0.8,
      coordination: 0.7,
      endurance: 0.75,
    },
    weights: {
      explosivePower: 0.75,
      horizontalPower: 0.7,
      balance: 0.55,
      reaction: 0.65,
      agility: 0.75,
      coordination: 0.65,
      endurance: 0.7,
    },
    anthroFavor: { heightAdvantage: 0.6, leanAdvantage: 0.2 },
    reasonTemplate:
      'Patlayıcı atışın, çevikliğin ve dayanıklılığın hentbolun fiziksel mücadele oyunu için ideal.',
  },
];
