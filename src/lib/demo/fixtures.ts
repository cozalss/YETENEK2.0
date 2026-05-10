/**
 * Örnek profil fixture'ları — kamera olmadan sonuç ekranını incelemek için
 * hazır SessionSummary'ler.
 *
 * 3 persona: birbirinden ayrışan profiller (volleyball-leaning,
 * football-leaning, gymnastics-leaning) → matching engine'in farklı
 * sporlara nasıl yöneldiğini karşılaştırmak için.
 */

import {
  estimateBmiPercentile,
  estimateHeightPercentile,
  recommendSports,
  testScoresToVector,
} from '@/lib/matching/recommend';
import type { SessionSummary } from '@/lib/session/store';

export interface DemoPersona {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  buildSession: () => SessionSummary;
}

function buildSession({
  child,
  scores,
  warnings = [],
  durationMin = 12,
}: {
  child: SessionSummary['child'];
  scores: Parameters<typeof testScoresToVector>[0];
  warnings?: string[];
  durationMin?: number;
}): SessionSummary {
  const vector = testScoresToVector(scores);
  const heightPercentile =
    child.heightCm != null
      ? estimateHeightPercentile(child.heightCm, child.ageYears, child.sex)
      : 50;
  const bmiPercentile =
    child.heightCm != null && child.weightKg != null
      ? estimateBmiPercentile(
          child.heightCm,
          child.weightKg,
          child.ageYears,
          child.sex
        )
      : 50;
  const recs = recommendSports(
    vector,
    { heightPercentile, bmiPercentile },
    5
  );

  const startedAt = new Date(
    Date.now() - durationMin * 60_000
  ).toISOString();
  const completedAt = new Date().toISOString();

  return {
    child,
    jump: {
      jumpHeightCm: (scores.jumpScore ?? 50) * 0.45,
      jumpUnits: (scores.jumpScore ?? 50) * 0.0035,
      flightTimeMs: 350 + (scores.jumpScore ?? 50) * 2,
      score: scores.jumpScore ?? 50,
    },
    broadJump: {
      jumpDistanceCm: 100 + (scores.broadJumpScore ?? 50) * 1.4,
      jumpUnits: 0.1 + (scores.broadJumpScore ?? 50) * 0.002,
      score: scores.broadJumpScore ?? 50,
    },
    balance: {
      rightScore: scores.balanceScore ?? 50,
      leftScore: Math.max(0, (scores.balanceScore ?? 50) - 12),
      asymmetryPercent: 12,
      asymmetryWarning: false,
      weakerSide: 'left',
      averageScore: scores.balanceScore ?? 50,
    },
    reaction: {
      averageMs: 450 - (scores.reactionScore ?? 50) * 2.2,
      bestMs: 380 - (scores.reactionScore ?? 50) * 1.9,
      consistencyScore: Math.min(100, (scores.reactionScore ?? 50) + 5),
      ageNormScore: scores.reactionScore ?? 50,
    },
    lateralHops: {
      hopCount: Math.round(8 + (scores.agilityScore ?? 50) * 0.18),
      frequencyHz: 0.8 + (scores.agilityScore ?? 50) * 0.012,
      score: scores.agilityScore ?? 50,
      dataQuality: 'good',
    },
    coordination: {
      trackingEvents: Math.round(60 + (scores.coordScore ?? 50) * 0.4),
      avgErrorPx: Math.max(8, 100 - (scores.coordScore ?? 50)),
      bestErrorPx: 6,
      avgGapMs: 280,
      score: scores.coordScore ?? 50,
    },
    endurance: {
      totalReps: Math.round(20 + (scores.enduranceScore ?? 50) * 0.32),
      decayPercent: Math.max(0, 30 - (scores.enduranceScore ?? 50) * 0.25),
      durationMs: 30_000,
      score: scores.enduranceScore ?? 50,
    },
    recommendations: recs,
    injuryWarnings: warnings,
    completedTests: [
      'jump',
      'broadJump',
      'balance',
      'reaction',
      'lateralHops',
      'coordination',
      'endurance',
    ],
    startedAt,
    completedAt,
  };
}

export const PERSONAS: DemoPersona[] = [
  {
    id: 'zeynep',
    name: 'Zeynep',
    blurb: 'Voleybol/Basketbol profili — yüksek dikey patlayıcı + reaksiyon',
    emoji: '🏐',
    buildSession: () =>
      buildSession({
        child: {
          name: 'Zeynep',
          ageYears: 11,
          sex: 'female',
          heightCm: 152,
          weightKg: 38,
        },
        scores: {
          jumpScore: 86,
          broadJumpScore: 71,
          balanceScore: 78,
          reactionScore: 84,
          agilityScore: 75,
          coordScore: 81,
          enduranceScore: 72,
        },
      }),
  },
  {
    id: 'emir',
    name: 'Emir',
    blurb: 'Sprint/Futbol profili — yatay patlayıcı + çeviklik + dayanıklılık',
    emoji: '⚽',
    buildSession: () =>
      buildSession({
        child: {
          name: 'Emir',
          ageYears: 13,
          sex: 'male',
          heightCm: 158,
          weightKg: 47,
        },
        scores: {
          jumpScore: 74,
          broadJumpScore: 91,
          balanceScore: 65,
          reactionScore: 80,
          agilityScore: 89,
          coordScore: 68,
          enduranceScore: 86,
        },
        warnings: [
          'Sol bacak dengesinde hafif asimetri var (%11). Tek bacak güçlendirme egzersizleri önerilir.',
        ],
      }),
  },
  {
    id: 'ayse',
    name: 'Ayşe',
    blurb: 'Cimnastik/Tenis profili — denge + koordinasyon + lean',
    emoji: '🤸',
    buildSession: () =>
      buildSession({
        child: {
          name: 'Ayşe',
          ageYears: 9,
          sex: 'female',
          heightCm: 130,
          weightKg: 26,
        },
        scores: {
          jumpScore: 73,
          broadJumpScore: 64,
          balanceScore: 92,
          reactionScore: 78,
          agilityScore: 70,
          coordScore: 88,
          enduranceScore: 65,
        },
      }),
  },
];

export function getPersona(id: string): DemoPersona | null {
  return PERSONAS.find((p) => p.id === id) ?? null;
}
