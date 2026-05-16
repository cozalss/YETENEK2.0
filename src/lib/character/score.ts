/**
 * Takım uyumu skorlama — 14 Likert cevabını 0-100 `teamAffinity` skoruna
 * dönüştürür ve özet metin üretir.
 *
 * Algoritma:
 *   - Forward kodlu maddeler: cevap aynen (1-5)
 *   - Ters kodlu maddeler (11, 13): 6 - cevap (5→1, 1→5)
 *   - Ortalama (1-5) → ((avg - 1) / 4) × 100 lineer ölçek
 *   - Eksik cevap = nötr (3) varsayılır
 *
 * Bantlar:
 *   0-39   → "Bireysel" — bireysel/dövüş sporları boost
 *   40-69  → "Dengeli"  — boost yok
 *   70-100 → "Takım"    — takım sporları boost
 */

import {
  CHARACTER_QUESTIONS,
  type CharacterAnswers,
  type LikertValue,
} from './questions';

export interface CharacterAnalysis {
  teamAffinity: number;
  averageScore: number;
  answeredCount: number;
  complete: boolean;
  band: 'individual' | 'balanced' | 'team';
  summary: string;
}

const TEAM_THRESHOLD = 70;
const INDIVIDUAL_THRESHOLD = 40;

export function scoreCharacter(answers: CharacterAnswers): CharacterAnalysis {
  let sum = 0;
  let answered = 0;

  for (const q of CHARACTER_QUESTIONS) {
    const raw = answers[q.id];
    if (raw == null) continue;
    answered++;
    const value: LikertValue = q.reverseScored
      ? ((6 - raw) as LikertValue)
      : raw;
    sum += value;
  }

  const missing = CHARACTER_QUESTIONS.length - answered;
  sum += missing * 3;
  const averageScore = sum / CHARACTER_QUESTIONS.length;
  const teamAffinity = Math.round(((averageScore - 1) / 4) * 100);

  let band: CharacterAnalysis['band'] = 'balanced';
  let summary =
    'Dengeli bir profil. Hem takım hem bireysel sporlarda rahat edebilirsin.';
  if (teamAffinity >= TEAM_THRESHOLD) {
    band = 'team';
    summary =
      'Takım odaklı bir profil. Takım sporları (futbol, basketbol, voleybol) önerilerde öne çıkar.';
  } else if (teamAffinity < INDIVIDUAL_THRESHOLD) {
    band = 'individual';
    summary =
      'Bireysel/odaklı bir profil. Tenis, yüzme, atletizm gibi bireysel sporlar öne çıkar.';
  }

  return {
    teamAffinity,
    averageScore,
    answeredCount: answered,
    complete: answered === CHARACTER_QUESTIONS.length,
    band,
    summary,
  };
}
