/**
 * Sonuç ekranı demo sayfası — editorial hero + mock 7-test verisi + canlı AI rapor.
 */

import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import {
  recommendSports,
  testScoresToVector,
  estimateHeightPercentile,
  estimateBmiPercentile,
} from '@/lib/matching/recommend';
import type { SessionSummary } from '@/lib/session/store';
import { ResultScreen } from '@/components/result/ResultScreen';

const MOCK_SESSION: SessionSummary = (() => {
  const child = {
    name: 'Zeynep',
    ageYears: 9,
    sex: 'female' as const,
    heightCm: 138,
    weightKg: 32,
  };
  const jump = {
    jumpHeightCm: 24.3,
    jumpUnits: 0.108,
    flightTimeMs: 442,
    score: 78,
  };
  const broadJump = {
    jumpDistanceCm: 142,
    jumpUnits: 0.18,
    score: 71,
  };
  const balance = {
    rightScore: 87,
    leftScore: 71,
    asymmetryPercent: 18.4,
    asymmetryWarning: true,
    weakerSide: 'left' as const,
    averageScore: 79,
  };
  const reaction = {
    averageMs: 282,
    bestMs: 248,
    consistencyScore: 81,
    ageNormScore: 84,
  };
  const lateralHops = {
    hopCount: 16,
    frequencyHz: 1.07,
    score: 72,
    dataQuality: 'good' as const,
  };
  const coordination = {
    trackingEvents: 78,
    avgErrorPx: 38,
    bestErrorPx: 9,
    avgGapMs: 320,
    score: 76,
  };
  const endurance = {
    totalReps: 27,
    decayPercent: 12,
    durationMs: 30_000,
    score: 80,
  };

  const vector = testScoresToVector({
    jumpScore: jump.score,
    broadJumpScore: broadJump.score,
    balanceScore: balance.averageScore,
    reactionScore: reaction.ageNormScore,
    agilityScore: lateralHops.score,
    coordScore: coordination.score,
    enduranceScore: endurance.score,
  });
  const heightPercentile = estimateHeightPercentile(
    child.heightCm,
    child.ageYears,
    child.sex
  );
  const bmiPercentile = estimateBmiPercentile(
    child.heightCm,
    child.weightKg,
    child.ageYears,
    child.sex
  );

  return {
    child,
    jump,
    broadJump,
    balance,
    reaction,
    lateralHops,
    coordination,
    endurance,
    recommendations: recommendSports(
      vector,
      { heightPercentile, bmiPercentile },
      5
    ),
    injuryWarnings: [
      'Sol bacak dengesinde belirgin asimetri var (%18). Uzun vadede sakatlanma riskini artırabilir; tek bacak güçlendirme egzersizleri önerilir.',
    ],
    completedTests: [
      'jump',
      'broadJump',
      'balance',
      'reaction',
      'lateralHops',
      'coordination',
      'endurance',
    ],
    startedAt: '2026-05-09T19:42:00.000Z',
    completedAt: '2026-05-09T19:54:00.000Z',
  };
})();

export default function ResultDemoPage() {
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <DemoHeader />
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-8 md:px-12">
        <ResultScreen session={MOCK_SESSION} />
      </div>
    </main>
  );
}

function DemoHeader() {
  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-canvas)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfaya dön
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-signal)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-signal)]">
          <Sparkles className="h-3 w-3" />
          Demo · 7 test + canlı AI pipeline
        </span>
      </div>
    </header>
  );
}
