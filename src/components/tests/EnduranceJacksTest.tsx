/**
 * Endurance Jumping Jacks — premium 2-sütunlu UI.
 *
 * Akış: IDLE → COUNTDOWN → CAPTURE (30sn) → REST (kullanıcı kontrol) →
 * ANALYZE → RESULT.
 *
 * REST screen kullanıcının nefesini topladığı focus-trapped dialog.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CameraStream } from '@/components/camera/CameraStream';
import { checkBalanceFraming, type FramingStatus } from '@/lib/pose/framing';
import { cancelSpeech, speak } from '@/lib/a11y/speech';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TestStage } from '@/components/tests/shared/TestStage';
import { FramingBadge } from '@/components/tests/shared/FramingBadge';
import { InstructionsPanel } from '@/components/tests/shared/InstructionsPanel';
import { StartCTA } from '@/components/tests/shared/StartCTA';
import {
  type EnduranceJacksAnalysis,
  type JackSample,
  ENDURANCE_DURATION_MS,
  analyzeEnduranceJacks,
  enduranceScore,
  frameToJackSample,
} from '@/lib/tests/enduranceJacks';
import type { PoseFrame } from '@/types';
import { useValidityGate } from '@/hooks/use-validity-gate';
import { RejectionPanel } from '@/components/tests/shared/RejectionPanel';
import { logger } from '@/shared/logger/logger';

const log = logger.child('endurance-test');

type Phase = 'idle' | 'countdown' | 'capture' | 'rest' | 'analyze' | 'result';

interface Props {
  childAgeYears?: number;
  childSex?: 'male' | 'female';
  onComplete?: (
    analysis: EnduranceJacksAnalysis & {
      score: number;
      techniqueMultiplier?: number;
      judgeInjuryWarnings?: readonly string[];
    }
  ) => void;
}

const COUNTDOWN_SECONDS = 3;

const STEPS = [
  'Kameradan 2.5-3 metre uzakta dur — kollar başın üstündeyken bile çerçeveye sığsın.',
  '30 saniye boyunca jumping jack yap (kolları yukarıda birleştir + ayakları aç).',
  'Tempolu yap. Yoruluyorsan yavaşla — sayım devam ediyor.',
  'Test bitince nefesini topla, sonra "Devam et" butonuna bas.',
];

export function EnduranceJacksTest({
  childAgeYears = 12,
  childSex = 'male',
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [captureRemainingMs, setCaptureRemainingMs] = useState(
    ENDURANCE_DURATION_MS
  );
  const [liveReps, setLiveReps] = useState(0);
  const [framing, setFraming] = useState<FramingStatus>({
    ready: false,
    hint: 'Pose tespit ediliyor…',
  });
  const [result, setResult] = useState<
    (EnduranceJacksAnalysis & { score: number }) | null
  >(null);
  const reducedMotion = useReducedMotion();

  const samplesRef = useRef<JackSample[]>([]);
  const captureActiveRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const liveStateRef = useRef({
    inJack: false,
    count: 0,
    lastJackT: -Infinity,
  });
  const lastFramingRef = useRef<FramingStatus | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // onComplete'i ref'te sabitle — analyze effect re-fire ile çift kayıt
  // olmasın.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => () => cancelSpeech(), []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const gate = useValidityGate({ test: 'endurance' });
  const gateCollect = gate.collect;
  const gateEvaluate = gate.evaluate;

  const handleFrame = useCallback((frame: PoseFrame | null) => {
    if (phaseRef.current === 'idle' || phaseRef.current === 'countdown') {
      const next = checkBalanceFraming(frame);
      const prev = lastFramingRef.current;
      if (!prev || prev.ready !== next.ready || prev.hint !== next.hint) {
        lastFramingRef.current = next;
        setFraming(next);
      }
    }
    if (!frame) return;
    if (!captureActiveRef.current) return;
    const sample = frameToJackSample(frame);
    if (!sample) return;
    // Kural hakemi dayanıklılığı değerlendirmiyor (fizik/geometri ile
    // yarım tekrar ayırt edilemiyor); kareler görsel hakemin kısmi hareket
    // açıklığı denetimi için toplanıyor.
    gateCollect(frame);
    samplesRef.current.push(sample);

    const fullJack = sample.armsUp && sample.legsApart;
    const ls = liveStateRef.current;
    if (fullJack && !ls.inJack && sample.t - ls.lastJackT > 400) {
      ls.count += 1;
      ls.lastJackT = sample.t;
      setLiveReps(ls.count);
    }
    ls.inJack = fullJack;
  }, [gateCollect]);

  const start = () => {
    gate.reset();
    samplesRef.current = [];
    captureActiveRef.current = false;
    liveStateRef.current = { inJack: false, count: 0, lastJackT: -Infinity };
    setLiveReps(0);
    setResult(null);
    setCountdown(COUNTDOWN_SECONDS);
    setCaptureRemainingMs(ENDURANCE_DURATION_MS);
    setPhase('countdown');
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      speak('Başla', { interrupt: true });
      captureActiveRef.current = true;
      setPhase('capture');
      return;
    }
    speak(String(countdown), { interrupt: true });
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'capture') return;
    if (captureRemainingMs <= 0) {
      captureActiveRef.current = false;
      setPhase('rest');
      return;
    }
    const t = setTimeout(
      () => setCaptureRemainingMs((c) => Math.max(0, c - 250)),
      250
    );
    return () => clearTimeout(t);
  }, [phase, captureRemainingMs]);

  useEffect(() => {
    if (phase === 'result' && resultHeadingRef.current) {
      resultHeadingRef.current.focus();
    }
    if (phase === 'rest') {
      speak('Bitti. Nefesini topla.', { interrupt: true });
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'analyze') return;
    let cancelled = false;

    void (async () => {
      const claimAnalysis = analyzeEnduranceJacks(samplesRef.current);
      const outcome = await gateEvaluate({
        valid: claimAnalysis.valid,
        primaryValue: claimAnalysis.totalReps,
        unit: 'count',
      });
      if (cancelled) return;
      if (!outcome.allowed) {
        setPhase('result');
        return;
      }
      runAnalysis(outcome.sigmaMultiplier, outcome.injuryWarnings);
    })();

    return () => {
      cancelled = true;
    };

    function runAnalysis(
      techniqueMultiplier: number,
      judgeInjuryWarnings: readonly string[]
    ) {
    try {
      const analysis = analyzeEnduranceJacks(samplesRef.current);
      const score = analysis.valid
        ? enduranceScore(
            analysis.totalReps,
            analysis.durationMs,
            childAgeYears,
            childSex
          )
        : 0;
      const final = { ...analysis, score };
      setResult(final);
      setPhase('result');
      if (analysis.valid) {
        onCompleteRef.current?.({
          ...final,
          techniqueMultiplier,
          judgeInjuryWarnings,
        });
      }
    } catch (err) {
      log.error('analiz hatası', {
        cause: err instanceof Error ? err.message : String(err),
      });
      setResult({
        totalReps: 0,
        first5sReps: 0,
        last5sReps: 0,
        decayPercent: 0,
        durationMs: 0,
        valid: false,
        reason: 'Analiz sırasında bir hata oluştu. Tekrar dene.',
        score: 0,
      });
      setPhase('result');
    }
    }
    // onComplete kasten dışarıda — inline arrow ile çift kayıt olmasın.
  }, [phase, childAgeYears, childSex, gateEvaluate]);

  return (
    <TestStage
      cameraSlot={
        <>
          <CameraStream onFrame={handleFrame} width={640} height={480} />

          {phase === 'countdown' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
              <motion.div
                key={countdown}
                initial={
                  reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }
                }
                animate={
                  reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
                }
                transition={{ duration: reducedMotion ? 0.15 : 0.3 }}
                className="font-display text-[10rem] leading-none font-black text-amber-400 drop-shadow-[0_8px_30px_rgba(251,191,36,0.4)]"
              >
                {countdown || 'BAŞLA!'}
              </motion.div>
            </div>
          )}

          {phase === 'capture' && (
            <>
              <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-2xl ring-1 ring-red-400/50">
                <span
                  className={`h-2 w-2 rounded-full bg-white ${reducedMotion ? '' : 'animate-pulse'}`}
                />
                {(captureRemainingMs / 1000).toFixed(0)}s
              </div>
              <div className="absolute top-4 left-4 flex items-center gap-3 rounded-full bg-amber-400 px-5 py-2.5 text-base font-bold text-neutral-950 shadow-2xl ring-1 ring-amber-300/40">
                <span className="font-mono text-xl">{liveReps}</span>
                <span className="text-xs tracking-widest uppercase opacity-70">
                  Tekrar
                </span>
              </div>
            </>
          )}

          {phase === 'analyze' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-full bg-neutral-900/90 px-5 py-3 text-base text-white ring-1 ring-amber-400/30">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Sayılıyor…
              </div>
            </div>
          )}

          {(phase === 'idle' || phase === 'countdown') && (
            <FramingBadge status={framing} />
          )}
        </>
      }
      sidebar={
        phase === 'rest' ? (
          <RestPanel reps={liveReps} onContinue={() => setPhase('analyze')} />
        ) : phase === 'result' && gate.rejection ? (
          <RejectionPanel rejection={gate.rejection} onRetry={start} />
        ) : phase === 'result' && result ? (
          <ResultCard
            result={result}
            onRetry={start}
            headingRef={resultHeadingRef}
          />
        ) : phase === 'idle' ? (
          <InstructionsPanel
            eyebrow="Test 07 · Dayanıklılık"
            title="Jumping Jacks"
            meta="30 sn"
            steps={STEPS}
            helper={!framing.ready ? framing.hint : undefined}
            cta={<StartCTA onStart={start} canStart={framing.ready} compact />}
            footer={
              <p
                className="text-center text-xs"
                style={{ color: 'var(--color-ink-3)' }}
              >
                Yüzme, mesafe koşusu, futbol için kritik boyut.
              </p>
            }
          />
        ) : (
          <PhaseStatusCard phase={phase} liveReps={liveReps} />
        )
      }
    />
  );
}

function PhaseStatusCard({
  phase,
  liveReps,
}: {
  phase: Phase;
  liveReps: number;
}) {
  if (phase === 'capture') {
    return (
      <div
        className="rounded-3xl border-2 p-7"
        style={{
          background: 'rgba(242, 201, 76, 0.16)',
          borderColor: 'var(--track-mustard)',
        }}
      >
        <p
          className="text-xs font-bold tracking-[0.25em] uppercase"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Kayıt aktif
        </p>
        <h2
          className="mt-2 text-2xl font-black"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Tekrarlar sayılıyor
        </h2>
        <div
          className="mt-6 rounded-2xl p-6 text-center"
          style={{
            background: 'var(--color-surface-elevated)',
            border: '2px solid var(--color-line)',
          }}
        >
          <div
            className="font-display text-7xl leading-none font-black"
            style={{ color: 'var(--form-navy)' }}
          >
            {liveReps}
          </div>
          <div
            className="mt-1 text-xs tracking-widest uppercase"
            style={{
              color: 'var(--color-ink-3)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Toplam tekrar
          </div>
        </div>
        <p
          className="mt-5 text-sm leading-relaxed"
          style={{ color: 'var(--color-ink-2)' }}
        >
          Yorulma normal — tempodan düşmen anaerobik kapasitenin bir parçası
          olarak ölçülüyor.
        </p>
      </div>
    );
  }

  const messages: Record<
    Phase,
    { eyebrow: string; title: string; body: string }
  > = {
    idle: { eyebrow: '', title: '', body: '' },
    countdown: {
      eyebrow: 'Sırada',
      title: 'Hazırlanıyorsun',
      body: 'Geri sayım bittiğinde jumping jack hareketine başla.',
    },
    capture: { eyebrow: '', title: '', body: '' },
    rest: { eyebrow: '', title: '', body: '' },
    analyze: {
      eyebrow: 'Hesaplanıyor',
      title: 'Sonuç hazırlanıyor',
      body: 'Yaş normuna göre dayanıklılık skorun çıkıyor.',
    },
    result: { eyebrow: '', title: '', body: '' },
  };
  const { eyebrow, title, body } = messages[phase];
  if (!title) return null;
  return (
    <div
      className="rounded-3xl border-2 p-7"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(44, 62, 107, 0.18)',
      }}
    >
      <p
        className="text-xs font-bold tracking-[0.25em] uppercase"
        style={{
          color: 'var(--color-ink-3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {eyebrow}
      </p>
      <h2
        className="mt-2 text-2xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {title}
      </h2>
      <p
        className="mt-4 text-sm leading-relaxed"
        style={{ color: 'var(--color-ink-2)' }}
      >
        {body}
      </p>
    </div>
  );
}

function RestPanel({
  reps,
  onContinue,
}: {
  reps: number;
  onContinue: () => void;
}) {
  const continueRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    continueRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        continueRef.current?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onContinue();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onContinue]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rest-heading"
      aria-describedby="rest-body"
      className="rounded-3xl border-2 p-7 text-center"
      style={{
        background: 'rgba(242, 201, 76, 0.18)',
        borderColor: 'var(--track-mustard)',
      }}
    >
      <p
        className="text-xs font-bold tracking-[0.25em] uppercase"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Mola
      </p>
      <h3
        id="rest-heading"
        className="mt-2 text-3xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Nefesini topla
      </h3>
      <p
        id="rest-body"
        className="mt-4 text-base"
        style={{ color: 'var(--color-ink-2)' }}
      >
        30 saniyede{' '}
        <span
          className="font-mono font-black"
          style={{ color: 'var(--form-navy)' }}
        >
          {reps}
        </span>{' '}
        tekrar yaptın. Acelen yok — hazır olduğunda devam et.
      </p>
      <button
        ref={continueRef}
        type="button"
        onClick={onContinue}
        className="mt-6 h-12 rounded-full px-8 text-base font-black tracking-wide transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        style={{
          background: 'var(--form-navy)',
          color: 'var(--whistle-cream)',
          fontFamily: 'var(--font-display)',
          boxShadow: '0 4px 0 var(--deep-navy)',
        }}
      >
        Devam et
      </button>
    </div>
  );
}

function ResultCard({
  result,
  onRetry,
  headingRef,
}: {
  result: EnduranceJacksAnalysis & { score: number };
  onRetry: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  if (!result.valid) {
    return (
      <div
        className="rounded-3xl border-2 p-7"
        style={{
          background: 'rgba(244, 182, 194, 0.22)',
          borderColor: 'var(--mindar-pink)',
        }}
      >
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-black focus-visible:outline-none"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Yeterli tekrar algılanamadı
        </h3>
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: 'var(--color-ink-2)' }}
        >
          {result.reason}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 h-11 rounded-full px-6 text-sm font-black tracking-wide transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{
            background: 'var(--track-mustard)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
            boxShadow: '0 4px 0 rgba(44, 62, 107, 0.18)',
          }}
        >
          Tekrar Dene
        </button>
      </div>
    );
  }
  return (
    <div
      className="rounded-3xl border-2 p-7"
      style={{
        background: 'rgba(168, 213, 186, 0.22)',
        borderColor: 'var(--field-mint)',
      }}
    >
      <p
        className="text-xs font-bold tracking-[0.25em] uppercase"
        style={{
          color: 'var(--form-navy)',
          opacity: 0.7,
          fontFamily: 'var(--font-display)',
        }}
      >
        Tamam · 07
      </p>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-2xl font-black focus-visible:outline-none"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Dayanıklılık kaydedildi
      </h3>
      <dl className="mt-5 space-y-3">
        <Stat label="Toplam tekrar" value={`${result.totalReps}`} accent />
        <Stat label="İlk 5 sn" value={`${result.first5sReps}`} />
        <Stat
          label="Son 5 sn"
          value={`${result.last5sReps} (% ${result.decayPercent} düşüş)`}
        />
        <Stat
          label="Yaş norm skoru"
          value={`${result.score.toFixed(0)} / 100`}
          accent
        />
      </dl>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 h-11 w-full rounded-full text-base font-black tracking-wide transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        style={{
          background: 'var(--track-mustard)',
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
          boxShadow:
            '0 6px 0 rgba(44, 62, 107, 0.18), 0 18px 36px -12px rgba(242, 201, 76, 0.45)',
        }}
      >
        Tekrar Dene
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between border-b pb-3 last:border-0 last:pb-0"
      style={{ borderColor: 'rgba(44, 62, 107, 0.18)' }}
    >
      <dt
        className="text-[10px] font-bold tracking-[0.2em] uppercase"
        style={{
          color: 'var(--color-ink-3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {label}
      </dt>
      <dd
        className="font-mono text-base font-bold"
        style={{
          color: accent ? 'var(--form-navy)' : 'var(--color-ink-2)',
        }}
      >
        {value}
      </dd>
    </div>
  );
}
