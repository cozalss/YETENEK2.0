/**
 * Takım uyumu skorlama v2 — 14 Likert cevabını 4 alt faktör (cooperation,
 * encouragement, persistence, fairPlay) + tek `teamAffinity` skoruna
 * dönüştürür ve özet metin üretir.
 *
 * NOT: bu dosyanın ürettiği anketin kendisi (`CharacterTest` bileşeni) test
 * bataryasından kaldırıldı — bkz. `src/app/test/full/page.tsx` doküman notu.
 * `scoreCharacter()` artık hiçbir UI'dan çağrılmıyor; `CharacterAnalysis`/
 * `CharacterFactors` tipleri yalnız `Session.character` (geçmiş kayıtlar) ve
 * `recommend.ts`'in opsiyonel karakter-boost'u için duruyor.
 *
 * Algoritma:
 *   - Forward kodlu maddeler: cevap aynen (1-5)
 *   - Ters kodlu maddeler (11, 13): 6 - cevap (5→1, 1→5)
 *   - Her faktör için: o faktöre ait maddelerin ortalaması (1-5)
 *     → ((avg - 1) / 4) × 100 → 0-100 normalize
 *   - teamAffinity = 4 faktörün eşit-ağırlıklı ortalaması (backward compat)
 *   - Eksik cevap = nötr (3) varsayılır
 *
 * Bantlar (overall teamAffinity için, kullanıcıya bant kategorisi):
 *   0-39   → "Bireysel" — bireysel/dövüş sporları boost
 *   40-69  → "Dengeli"  — boost yok
 *   70-100 → "Takım"    — takım sporları boost
 */

import {
  CHARACTER_FACTOR_KEYS,
  CHARACTER_QUESTIONS,
  type CharacterAnswers,
  type CharacterFactor,
  type LikertValue,
} from './questions';

export type CharacterFactors = Record<CharacterFactor, number>;

export interface CharacterAnalysis {
  /** 0-100 ağırlıklı genel takım uyumu skoru. */
  teamAffinity: number;
  /** Faktör başına 0-100 alt skorlar — recommend.ts spor benzerliği için
   *  bu vektörü kullanır; UI faktör radar'ı için aynı vektörü gösterir. */
  factors: CharacterFactors;
  /** Ham ortalama (1-5 Likert). */
  averageScore: number;
  answeredCount: number;
  complete: boolean;
  band: 'individual' | 'balanced' | 'team';
  summary: string;
  /** Faktör başına en güçlü 1 / en zayıf 1 — özet için. */
  topFactor: CharacterFactor;
  bottomFactor: CharacterFactor;
}

const TEAM_THRESHOLD = 70;
const INDIVIDUAL_THRESHOLD = 40;

const FACTOR_LABEL_TR: Record<CharacterFactor, string> = {
  cooperation: 'işbirliği',
  encouragement: 'arkadaşını destekleme',
  persistence: 'azim',
  fairPlay: 'fair play',
};

/**
 * Bir faktörün ortalamasını hesaplar — o faktöre ait soruların reverse-coded
 * cevap ortalaması (1-5). Eksik cevap nötr (3) sayılır.
 */
function factorAverage(
  answers: CharacterAnswers,
  factor: CharacterFactor
): number {
  const items = CHARACTER_QUESTIONS.filter((q) => q.factor === factor);
  if (items.length === 0) return 3;
  let sum = 0;
  for (const q of items) {
    const raw = answers[q.id];
    if (raw == null) {
      sum += 3; // nötr varsayım
      continue;
    }
    const value: LikertValue = q.reverseScored
      ? ((6 - raw) as LikertValue)
      : raw;
    sum += value;
  }
  return sum / items.length;
}

/** 1-5 ortalama → 0-100 lineer */
function avgToPercent(avg: number): number {
  return Math.round(((avg - 1) / 4) * 100);
}

export function scoreCharacter(answers: CharacterAnswers): CharacterAnalysis {
  // Cevap sayımı
  let answered = 0;
  for (const q of CHARACTER_QUESTIONS) {
    if (answers[q.id] != null) answered++;
  }

  // Her faktörü ayrı ayrı hesapla
  const factorAvgs: Record<CharacterFactor, number> = {
    cooperation: factorAverage(answers, 'cooperation'),
    encouragement: factorAverage(answers, 'encouragement'),
    persistence: factorAverage(answers, 'persistence'),
    fairPlay: factorAverage(answers, 'fairPlay'),
  };

  const factors: CharacterFactors = {
    cooperation: avgToPercent(factorAvgs.cooperation),
    encouragement: avgToPercent(factorAvgs.encouragement),
    persistence: avgToPercent(factorAvgs.persistence),
    fairPlay: avgToPercent(factorAvgs.fairPlay),
  };

  // Overall: 4 faktörün eşit ortalaması (her faktör eşit ağırlıkta)
  const overallAvg =
    (factorAvgs.cooperation +
      factorAvgs.encouragement +
      factorAvgs.persistence +
      factorAvgs.fairPlay) /
    4;
  const teamAffinity = avgToPercent(overallAvg);

  // Top / bottom faktör
  let topFactor: CharacterFactor = 'cooperation';
  let bottomFactor: CharacterFactor = 'cooperation';
  for (const f of CHARACTER_FACTOR_KEYS) {
    if (factors[f] > factors[topFactor]) topFactor = f;
    if (factors[f] < factors[bottomFactor]) bottomFactor = f;
  }

  // Bant + summary
  let band: CharacterAnalysis['band'] = 'balanced';
  let bandText =
    'Dengeli bir profil — hem takım hem bireysel sporlarda rahat edebilirsin.';
  if (teamAffinity >= TEAM_THRESHOLD) {
    band = 'team';
    bandText =
      'Takım odaklı bir profil. Takım sporları (futbol, basketbol, voleybol) öne çıkar.';
  } else if (teamAffinity < INDIVIDUAL_THRESHOLD) {
    band = 'individual';
    bandText =
      'Bireysel/odaklı bir profil. Tenis, yüzme, atletizm gibi bireysel sporlar öne çıkar.';
  }

  const summary =
    factors[topFactor] - factors[bottomFactor] >= 15
      ? `${bandText} En güçlü yönün ${FACTOR_LABEL_TR[topFactor]}, en gelişmeye açık yönün ${FACTOR_LABEL_TR[bottomFactor]}.`
      : bandText;

  return {
    teamAffinity,
    factors,
    averageScore: overallAvg,
    answeredCount: answered,
    complete: answered === CHARACTER_QUESTIONS.length,
    band,
    summary,
    topFactor,
    bottomFactor,
  };
}
