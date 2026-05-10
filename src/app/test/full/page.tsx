/**
 * Tam test akışı v2: profil → 7 test → sonuç.
 *
 * Akış orkestrasyonu (Full mode):
 *   1. profile        → ProfileForm
 *   2. cmj            → JumpTest (dikey patlayıcı)
 *   3. broadJump      → BroadJumpTest (yatay patlayıcı)
 *   4. balance        → BalanceTest (denge + asimetri)
 *   5. lateralHops    → LateralHopsTest (çeviklik)
 *   6. reaction       → ReactionTest (refleks)
 *   7. coordination   → CoordinationTest (göz-el)
 *   8. endurance      → EnduranceJacksTest (anaerobik)
 *   9. result         → ResultScreen
 *
 * Quick mode (?mode=quick): 3 çekirdek test (cmj + balance + reaction).
 * Eksik boyutlar finalize'da popülasyon medyanı (50) ile doldurulur.
 */

'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { JumpTest } from '@/components/tests/JumpTest';
import { BroadJumpTest } from '@/components/tests/BroadJumpTest';
import { BalanceTest } from '@/components/tests/BalanceTest';
import { LateralHopsTest } from '@/components/tests/LateralHopsTest';
import { ReactionTest } from '@/components/tests/ReactionTest';
import { CoordinationTest } from '@/components/tests/CoordinationTest';
import { EnduranceJacksTest } from '@/components/tests/EnduranceJacksTest';
import { ProfileForm } from '@/components/flow/ProfileForm';
import {
  PhaseHeader,
  FULL_FLOW_STEP_LABELS,
  QUICK_FLOW_STEP_LABELS,
} from '@/components/flow/PhaseHeader';
import { ResultScreen } from '@/components/result/ResultScreen';
import {
  sessionStore,
  type ChildIdentity,
  type SessionSummary,
} from '@/lib/session/store';
import { historyStore } from '@/lib/history/store';
import type { JumpAnalysis } from '@/lib/tests/jump';
import type { BroadJumpAnalysis } from '@/lib/tests/broadJump';
import type { BalanceAnalysis } from '@/lib/tests/balance';
import type { LateralHopsAnalysis } from '@/lib/tests/lateralHops';
import type { ReactionAnalysis } from '@/lib/tests/reaction';
import type { CoordinationAnalysis } from '@/lib/tests/coordination';
import type { EnduranceJacksAnalysis } from '@/lib/tests/enduranceJacks';

type Phase =
  | 'profile'
  | 'cmj'
  | 'broadJump'
  | 'balance'
  | 'lateralHops'
  | 'reaction'
  | 'coordination'
  | 'endurance'
  | 'result';

type Mode = 'full' | 'quick';

const FULL_PHASE_ORDER: Phase[] = [
  'cmj',
  'broadJump',
  'balance',
  'lateralHops',
  'reaction',
  'coordination',
  'endurance',
];

const QUICK_PHASE_ORDER: Phase[] = ['cmj', 'balance', 'reaction'];

interface DoneFlags {
  cmj: boolean;
  broadJump: boolean;
  balance: boolean;
  lateralHops: boolean;
  reaction: boolean;
  coordination: boolean;
  endurance: boolean;
}

const EMPTY_DONE: DoneFlags = {
  cmj: false,
  broadJump: false,
  balance: false,
  lateralHops: false,
  reaction: false,
  coordination: false,
  endurance: false,
};

export default function FullFlowPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-950 p-4 text-white">
          <div className="mx-auto max-w-5xl pt-12 text-center text-neutral-300">
            Yükleniyor…
          </div>
        </main>
      }
    >
      <FullFlowInner />
    </Suspense>
  );
}

function FullFlowInner() {
  const searchParams = useSearchParams();
  const mode: Mode = searchParams.get('mode') === 'quick' ? 'quick' : 'full';

  const [phase, setPhase] = useState<Phase>('profile');
  const [child, setChild] = useState<ChildIdentity | null>(null);
  const [done, setDone] = useState<DoneFlags>(EMPTY_DONE);
  const [finalSession, setFinalSession] = useState<SessionSummary | null>(
    null
  );

  const phaseOrder = mode === 'quick' ? QUICK_PHASE_ORDER : FULL_PHASE_ORDER;
  const stepLabels =
    mode === 'quick' ? QUICK_FLOW_STEP_LABELS : FULL_FLOW_STEP_LABELS;

  const currentStepIndex = useMemo(() => {
    if (phase === 'profile' || phase === 'result') return -1;
    return phaseOrder.indexOf(phase);
  }, [phase, phaseOrder]);

  // Result fazı: finalize çağır + sessionStore.current()'i state'e al
  // + history'ye arşivle (tamamlanmış session).
  useEffect(() => {
    if (phase !== 'result') return;
    const final = sessionStore.finalize();
    if (final) {
      setFinalSession(final);
      if (final.completedAt) {
        historyStore.add(final);
      }
    }
  }, [phase]);

  const handleProfileSubmit = (c: ChildIdentity) => {
    sessionStore.start(c);
    setChild(c);
    setPhase(phaseOrder[0]);
  };

  const advanceFrom = (key: keyof DoneFlags) => {
    setDone((d) => ({ ...d, [key]: false }));
    const idx = phaseOrder.indexOf(key as Phase);
    const next = phaseOrder[idx + 1];
    setPhase(next ?? 'result');
  };

  const skipCurrent = () => {
    if (phase === 'profile' || phase === 'result') return;
    const idx = phaseOrder.indexOf(phase);
    const next = phaseOrder[idx + 1];
    setPhase(next ?? 'result');
  };

  const restart = () => {
    sessionStore.clear();
    setChild(null);
    setDone(EMPTY_DONE);
    setFinalSession(null);
    setPhase('profile');
  };

  const stepNumber = currentStepIndex + 1;

  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-white sm:p-6 md:p-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <BrandHeader mode={mode} />

        {phase === 'profile' && (
          <ProfileForm onSubmit={handleProfileSubmit} />
        )}

        {phase === 'cmj' && child && (
          <PhaseShell
            childName={child.name}
            done={done.cmj}
            onAdvance={() => advanceFrom('cmj')}
            stepNumber={stepNumber}
            stepLabels={stepLabels}
            onSkip={skipCurrent}
            advanceLabel={
              phaseOrder.length === stepNumber
                ? 'Sonuçları Gör'
                : 'Sonraki Teste Geç'
            }
          >
            <JumpTest
              childAgeYears={child.ageYears}
              childSex={child.sex}
              childHeightCm={child.heightCm}
              onComplete={(analysis) => {
                if (!analysis.valid) return;
                sessionStore.recordJump(
                  analysis as JumpAnalysis & { score: number | null }
                );
                setDone((d) => ({ ...d, cmj: true }));
              }}
            />
          </PhaseShell>
        )}

        {phase === 'broadJump' && child && (
          <PhaseShell
            childName={child.name}
            done={done.broadJump}
            onAdvance={() => advanceFrom('broadJump')}
            stepNumber={stepNumber}
            stepLabels={stepLabels}
            onSkip={skipCurrent}
          >
            <BroadJumpTest
              childAgeYears={child.ageYears}
              childSex={child.sex}
              childHeightCm={child.heightCm}
              onComplete={(analysis) => {
                if (!analysis.valid) return;
                sessionStore.recordBroadJump(
                  analysis as BroadJumpAnalysis & { score: number }
                );
                setDone((d) => ({ ...d, broadJump: true }));
              }}
            />
          </PhaseShell>
        )}

        {phase === 'balance' && child && (
          <PhaseShell
            childName={child.name}
            done={done.balance}
            onAdvance={() => advanceFrom('balance')}
            stepNumber={stepNumber}
            stepLabels={stepLabels}
            onSkip={skipCurrent}
          >
            <BalanceTest
              childAgeYears={child.ageYears}
              onComplete={(analysis) => {
                sessionStore.recordBalance(analysis as BalanceAnalysis);
                if (
                  analysis.right.hasEnoughData &&
                  analysis.left.hasEnoughData
                ) {
                  setDone((d) => ({ ...d, balance: true }));
                }
              }}
            />
          </PhaseShell>
        )}

        {phase === 'lateralHops' && child && (
          <PhaseShell
            childName={child.name}
            done={done.lateralHops}
            onAdvance={() => advanceFrom('lateralHops')}
            stepNumber={stepNumber}
            stepLabels={stepLabels}
            onSkip={skipCurrent}
          >
            <LateralHopsTest
              childAgeYears={child.ageYears}
              childSex={child.sex}
              onComplete={(analysis) => {
                if (!analysis.valid) return;
                sessionStore.recordLateralHops(
                  analysis as LateralHopsAnalysis & { score: number }
                );
                setDone((d) => ({ ...d, lateralHops: true }));
              }}
            />
          </PhaseShell>
        )}

        {phase === 'reaction' && child && (
          <PhaseShell
            childName={child.name}
            done={done.reaction}
            onAdvance={() => advanceFrom('reaction')}
            stepNumber={stepNumber}
            stepLabels={stepLabels}
            onSkip={skipCurrent}
          >
            <ReactionTest
              childAgeYears={child.ageYears}
              onComplete={(analysis) => {
                sessionStore.recordReaction(analysis as ReactionAnalysis);
                setDone((d) => ({ ...d, reaction: true }));
              }}
            />
          </PhaseShell>
        )}

        {phase === 'coordination' && child && (
          <PhaseShell
            childName={child.name}
            done={done.coordination}
            onAdvance={() => advanceFrom('coordination')}
            stepNumber={stepNumber}
            stepLabels={stepLabels}
            onSkip={skipCurrent}
          >
            <CoordinationTest
              onComplete={(analysis) => {
                if (!analysis.valid) return;
                sessionStore.recordCoordination(
                  analysis as CoordinationAnalysis
                );
                setDone((d) => ({ ...d, coordination: true }));
              }}
              onSkip={skipCurrent}
            />
          </PhaseShell>
        )}

        {phase === 'endurance' && child && (
          <PhaseShell
            childName={child.name}
            done={done.endurance}
            onAdvance={() => advanceFrom('endurance')}
            stepNumber={stepNumber}
            stepLabels={stepLabels}
            onSkip={skipCurrent}
            advanceLabel="Sonuçları Gör"
          >
            <EnduranceJacksTest
              childAgeYears={child.ageYears}
              childSex={child.sex}
              onComplete={(analysis) => {
                if (!analysis.valid) return;
                sessionStore.recordEndurance(
                  analysis as EnduranceJacksAnalysis & { score: number }
                );
                setDone((d) => ({ ...d, endurance: true }));
              }}
            />
          </PhaseShell>
        )}

        {phase === 'result' &&
          (finalSession ? (
            <ResultStage session={finalSession} onRestart={restart} />
          ) : (
            <FinalizingStage />
          ))}
      </div>
    </main>
  );
}

function BrandHeader({ mode }: { mode: Mode }) {
  return (
    <header className="flex items-baseline justify-between border-b border-[var(--color-line)] pb-6">
      <Link
        href="/"
        className="font-display text-xl font-bold tracking-tight"
      >
        Yetenek<span className="text-[var(--color-signal)]">.</span>
      </Link>
      <div className="flex items-center gap-3 text-xs">
        <Link
          href={mode === 'quick' ? '/test/full' : '/test/full?mode=quick'}
          className="rounded-full border border-neutral-700 px-3 py-1 font-medium text-neutral-300 transition-colors hover:border-neutral-500"
        >
          {mode === 'quick' ? '7 testlik tam akış' : 'Hızlı 3 testlik akış'}
        </Link>
        <span className="font-mono tracking-widest text-[var(--color-ink-3)] uppercase">
          {mode === 'quick' ? 'Hızlı Akış' : 'Tam Akış'}
        </span>
      </div>
    </header>
  );
}

interface PhaseShellProps {
  childName: string;
  done: boolean;
  onAdvance: () => void;
  onSkip?: () => void;
  advanceLabel?: string;
  stepNumber: number;
  stepLabels: string[];
  children: React.ReactNode;
}

function PhaseShell({
  childName,
  done,
  onAdvance,
  onSkip,
  advanceLabel = 'Sonraki Teste Geç',
  stepNumber,
  stepLabels,
  children,
}: PhaseShellProps) {
  // NOT: Eskiden burada ekstra bir Countdown + VoiceCoach vardı; her test
  // componentinin kendi inline countdown'u (TestStage içinde, 3-2-1-ZIPLA!)
  // ve sesli rehberliği (speak()) zaten olduğu için **çift sayım** yaratıyordu.
  // Kaldırıldı — testlerin kendi countdown'u tek doğruluk-kaynağı.
  return (
    <div className="space-y-6">
      <PhaseHeader
        current={stepNumber}
        labels={stepLabels}
        childName={childName}
      />

      {children}
      {done && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-700/60 bg-emerald-950/20 p-5">
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              ✓ Test sonuçları kaydedildi
            </p>
            <p className="mt-0.5 text-xs text-emerald-200/80">
              Hazır olduğunda devam et. Daha iyi yapabileceğini düşünüyorsan
              testi tekrar deneyebilirsin.
            </p>
          </div>
          <button
            type="button"
            onClick={onAdvance}
            className="h-11 shrink-0 rounded-full bg-amber-400 px-5 font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
          >
            {advanceLabel} →
          </button>
        </div>
      )}
      {!done && onSkip && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-500 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
          >
            Bu testi atla
          </button>
        </div>
      )}
    </div>
  );
}

function FinalizingStage() {
  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-12 text-center">
      <div className="text-2xl font-semibold text-white">
        Sonuçlar hazırlanıyor…
      </div>
      <div className="mt-2 text-sm text-neutral-300">
        AI tüm test verilerini birleştiriyor.
      </div>
    </div>
  );
}

function ResultStage({
  session,
  onRestart,
}: {
  session: SessionSummary;
  onRestart: () => void;
}) {
  const ageDescription = useMemo(
    () => `${session.child.name} · ${session.child.ageYears} yaş`,
    [session.child]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-300">{ageDescription}</p>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-500 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
        >
          Yeni Test
        </button>
      </div>
      <ResultScreen session={session} />
    </div>
  );
}
