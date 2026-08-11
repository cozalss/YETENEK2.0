/**
 * Lateral Hops testi UI — premium 2-sütunlu layout, 15sn yan sıçrama sayacı.
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
  type LateralHopSample,
  type LateralHopsAnalysis,
  LATERAL_HOPS_DURATION_MS,
  analyzeLateralHops,
  frameToLateralHopSample,
  lateralHopsScore,
} from '@/lib/tests/lateralHops';
import type { PoseFrame } from '@/types';
import { useValidityGate } from '@/hooks/use-validity-gate';
import { RejectionPanel } from '@/components/tests/shared/RejectionPanel';
import { logger } from '@/shared/logger/logger';

const log = logger.child('lateral-hops-test');

type Phase =
  | 'idle'
  | 'calibrate'
  | 'countdown'
  | 'capture'
  | 'analyze'
  | 'result';

interface Props {
  childAgeYears?: number;
  childSex?: 'male' | 'female';
  onComplete?: (analysis: LateralHopsAnalysis & { score: number }) => void;
}

const COUNTDOWN_SECONDS = 3;
const CALIBRATE_MS = 1500;

const STEPS = [
  'Kameraya tam dön, dik dur. Vücudun tamamı çerçevede olmalı.',
  '15 saniye boyunca sağa-sola hızlıca sıçra (mekik gibi).',
  'Tempolu, kontrollü ama hızlı — yorulduğunda bile yavaşlama.',
];

export function LateralHopsTest({
  childAgeYears = 12,
  childSex = 'male',
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [captureRemainingMs, setCaptureRemainingMs] = useState(
    LATERAL_HOPS_DURATION_MS
  );
  const [liveHopCount, setLiveHopCount] = useState(0);
  const [framing, setFraming] = useState<FramingStatus>({
    ready: false,
    hint: 'Pose tespit ediliyor…',
  });
  const [result, setResult] = useState<
    (LateralHopsAnalysis & { score: number }) | null
  >(null);
  const reducedMotion = useReducedMotion();

  const samplesRef = useRef<LateralHopSample[]>([]);
  const calibrationXRef = useRef<number | null>(null);
  const captureActiveRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const lastFramingRef = useRef<FramingStatus | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const liveStateRef = useRef<{
    lastSide: 'left' | 'right' | null;
    lastHopT: number;
    count: number;
  }>({
    lastSide: null,
    lastHopT: -Infinity,
    count: 0,
  });

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // onComplete'i ref'te sabitle (analyze effect re-fire önlenir).
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => () => cancelSpeech(), []);

  const gate = useValidityGate({ test: 'lateralHops' });
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

    if (phaseRef.current === 'calibrate') {
      const sample = frameToLateralHopSample(frame);
      if (sample && calibrationXRef.current == null) {
        calibrationXRef.current = sample.ankleX;
      }
      return;
    }

    if (!captureActiveRef.current) return;
    const sample = frameToLateralHopSample(frame);
    if (!sample) return;
    // Hakem ham iskelete bakıyor; indirgenmiş örnek uçuş fazını taşımıyor.
    gateCollect(frame);
    samplesRef.current.push(sample);

    const mid = calibrationXRef.current ?? sample.ankleX;
    const side: 'left' | 'right' = sample.ankleX < mid ? 'left' : 'right';
    const ls = liveStateRef.current;
    if (
      ls.lastSide !== null &&
      side !== ls.lastSide &&
      sample.t - ls.lastHopT > 250
    ) {
      ls.count += 1;
      ls.lastHopT = sample.t;
      setLiveHopCount(ls.count);
    }
    ls.lastSide = side;
  }, [gateCollect]);

  const start = () => {
    gate.reset();
    samplesRef.current = [];
    calibrationXRef.current = null;
    captureActiveRef.current = false;
    liveStateRef.current = {
      lastSide: null,
      lastHopT: -Infinity,
      count: 0,
    };
    setLiveHopCount(0);
    setResult(null);
    setCountdown(COUNTDOWN_SECONDS);
    setCaptureRemainingMs(LATERAL_HOPS_DURATION_MS);
    setPhase('calibrate');
  };

  useEffect(() => {
    if (phase !== 'calibrate') return;
    const t = setTimeout(() => setPhase('countdown'), CALIBRATE_MS);
    return () => clearTimeout(t);
  }, [phase]);

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

  // Tek interval: 200ms tick'le elapsed delta üzerinden remaining hesaplanır.
  // Eski versiyon her 100ms'de setState çağırıyordu — 150 re-render boyunca
  // MediaPipe rAF loop'unu thrash ediyor, mobilde frame drop yaratıyordu.
  // 200ms tick + Date.now okuma 5 update/s = display için yeterli, GPU
  // pipeline'a nefes aldırır.
  const captureStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== 'capture') {
      captureStartRef.current = null;
      return;
    }
    captureStartRef.current = Date.now();
    const id = setInterval(() => {
      const start = captureStartRef.current;
      if (start == null) return;
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, LATERAL_HOPS_DURATION_MS - elapsed);
      setCaptureRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        captureActiveRef.current = false;
        setPhase('analyze');
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'analyze') return;
    let cancelled = false;

    void (async () => {
      // Geçerlilik kapısı analizden ÖNCE: geçersiz yakalama hiç ölçülmemeli.
      const allowed = await gateEvaluate();
      if (cancelled) return;
      if (!allowed) {
        setPhase('result');
        return;
      }
      runAnalysis();
    })();

    return () => {
      cancelled = true;
    };

    function runAnalysis() {
    try {
      const analysis = analyzeLateralHops(
        samplesRef.current,
        calibrationXRef.current
      );
      const score = analysis.valid
        ? lateralHopsScore(
            analysis.hopCount,
            childAgeYears,
            childSex,
            analysis.durationMs
          )
        : 0;
      const final = { ...analysis, score };
      setResult(final);
      setPhase('result');
      if (analysis.valid) {
        onCompleteRef.current?.(final);
      }
    } catch (err) {
      log.error('analiz hatası', {
        cause: err instanceof Error ? err.message : String(err),
      });
      setResult({
        hopCount: 0,
        frequencyHz: 0,
        durationMs: 0,
        dataQuality: 'low',
        valid: false,
        reason: 'Analiz sırasında bir hata oluştu. Tekrar dene.',
        score: 0,
      });
      setPhase('result');
    }
    }
    // onComplete kasten dışarıda — inline arrow ile çift kayıt olmasın.
  }, [phase, childAgeYears, childSex, gateEvaluate]);

  useEffect(() => {
    if (phase === 'result' && resultHeadingRef.current) {
      resultHeadingRef.current.focus();
    }
  }, [phase]);

  return (
    <TestStage
      cameraSlot={
        <>
          <CameraStream onFrame={handleFrame} width={640} height={480} />

          {phase === 'calibrate' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
              <p className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-neutral-950 shadow-2xl">
                Bir saniye dik dur, hizan ölçülüyor…
              </p>
            </div>
          )}

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
                {(captureRemainingMs / 1000).toFixed(1)}s
              </div>
              <div className="absolute top-4 left-4 flex items-center gap-3 rounded-full bg-amber-400 px-5 py-2.5 text-base font-bold text-neutral-950 shadow-2xl ring-1 ring-amber-300/40">
                <span className="font-mono text-xl">{liveHopCount}</span>
                <span className="text-xs tracking-widest uppercase opacity-70">
                  Hop
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
        phase === 'result' && gate.rejection ? (
          <RejectionPanel rejection={gate.rejection} onRetry={start} />
        ) : phase === 'result' && result ? (
          <ResultCard
            result={result}
            onRetry={start}
            headingRef={resultHeadingRef}
          />
        ) : phase === 'idle' ? (
          <InstructionsPanel
            eyebrow="Test 04 · Çeviklik"
            title="Yan Sıçrama"
            meta="15 sn"
            steps={STEPS}
            helper={!framing.ready ? framing.hint : undefined}
            cta={<StartCTA onStart={start} canStart={framing.ready} compact />}
            footer={
              <p
                className="text-center text-xs"
                style={{ color: 'var(--color-ink-3)' }}
              >
                Futbol, badminton, taekwondo için kritik boyut.
              </p>
            }
          />
        ) : (
          <PhaseStatusCard phase={phase} liveHopCount={liveHopCount} />
        )
      }
    />
  );
}

function PhaseStatusCard({
  phase,
  liveHopCount,
}: {
  phase: Phase;
  liveHopCount: number;
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
          Sıçrayışın sayılıyor
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
            {liveHopCount}
          </div>
          <div
            className="mt-1 text-xs tracking-widest uppercase"
            style={{
              color: 'var(--color-ink-3)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Toplam hop
          </div>
        </div>
        <p
          className="mt-5 text-sm leading-relaxed"
          style={{ color: 'var(--color-ink-2)' }}
        >
          15 saniye boyunca olabildiğince çok sıçra. Tempodan düşme — son
          saniyelerde de devam et.
        </p>
      </div>
    );
  }

  const messages: Record<
    Phase,
    { eyebrow: string; title: string; body: string }
  > = {
    idle: { eyebrow: '', title: '', body: '' },
    calibrate: {
      eyebrow: 'Hazırlık',
      title: 'Hizan ölçülüyor',
      body: 'Bir saniye dik dur. Bu nokta sıçramanın orta hattı olarak kullanılacak.',
    },
    countdown: {
      eyebrow: 'Sırada',
      title: 'Hazırlanıyorsun',
      body: 'Geri sayım bittiğinde sağa-sola sıçramaya başla.',
    },
    capture: { eyebrow: '', title: '', body: '' },
    analyze: {
      eyebrow: 'Hesaplanıyor',
      title: 'Sonuç hazırlanıyor',
      body: 'Yaş normuna göre çeviklik skorun çıkıyor.',
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

function ResultCard({
  result,
  onRetry,
  headingRef,
}: {
  result: LateralHopsAnalysis & { score: number };
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
          Yeterli sıçrama algılanamadı
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
        Tamam · 04
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
        Çeviklik kaydedildi
      </h3>
      <dl className="mt-5 space-y-3">
        <Stat label="Toplam hop" value={`${result.hopCount}`} accent />
        <Stat label="Frekans" value={`${result.frequencyHz.toFixed(2)} Hz`} />
        <Stat
          label="Yaş norm skoru"
          value={`${result.score.toFixed(0)} / 100`}
          accent
        />
      </dl>
      {result.dataQuality === 'low' && (
        <p
          className="mt-5 text-xs leading-relaxed"
          style={{ color: 'var(--color-ink-2)' }}
        >
          Frame eksikliği yüksek — daha iyi aydınlatma ile tekrar
          deneyebilirsin.
        </p>
      )}
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
