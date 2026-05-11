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
  }, []);

  const start = () => {
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
    try {
      const analysis = analyzeLateralHops(
        samplesRef.current,
        calibrationXRef.current
      );
      const score = analysis.valid
        ? lateralHopsScore(analysis.hopCount, childAgeYears, childSex)
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
    // onComplete kasten dışarıda — inline arrow ile çift kayıt olmasın.
  }, [phase, childAgeYears, childSex]);

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
              <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-2xl ring-1 ring-red-400/50">
                <span
                  className={`h-2 w-2 rounded-full bg-white ${reducedMotion ? '' : 'animate-pulse'}`}
                />
                {(captureRemainingMs / 1000).toFixed(1)}s
              </div>
              <div className="absolute left-4 top-4 flex items-center gap-3 rounded-full bg-amber-400 px-5 py-2.5 text-base font-bold text-neutral-950 shadow-2xl ring-1 ring-amber-300/40">
                <span className="font-mono text-xl">{liveHopCount}</span>
                <span className="text-xs uppercase tracking-widest opacity-70">
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
        phase === 'result' && result ? (
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
            cta={<StartCTA onStart={start} canStart={framing.ready} />}
            footer={
              <p className="text-center text-xs text-neutral-300">
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
      <div className="rounded-3xl border border-amber-700/40 bg-amber-950/15 p-7 backdrop-blur-sm">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">
          Kayıt aktif
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">Sıçrayışın sayılıyor</h2>
        <div className="mt-6 rounded-2xl bg-neutral-950/60 p-6 text-center">
          <div className="font-display text-7xl leading-none font-black text-amber-300">
            {liveHopCount}
          </div>
          <div className="mt-1 text-xs uppercase tracking-widest text-amber-200/80">
            Toplam hop
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-neutral-200">
          15 saniye boyunca olabildiğince çok sıçra. Tempodan düşme — son saniyelerde
          de devam et.
        </p>
      </div>
    );
  }

  const messages: Record<Phase, { eyebrow: string; title: string; body: string }> = {
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
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-7 backdrop-blur-sm">
      <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">{title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-neutral-200">{body}</p>
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
      <div className="rounded-3xl border border-red-800/70 bg-red-950/30 p-7 backdrop-blur-sm">
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-bold text-red-200 focus-visible:outline-none"
        >
          Yeterli sıçrama algılanamadı
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-red-100">
          {result.reason}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 h-11 rounded-full bg-amber-400 px-6 font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-emerald-700/60 bg-emerald-950/25 p-7 backdrop-blur-sm">
      <p className="text-xs font-semibold tracking-[0.2em] text-emerald-300 uppercase">
        Tamam · 04
      </p>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-2xl font-bold text-white focus-visible:outline-none"
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
        <p className="mt-5 text-xs leading-relaxed text-amber-200">
          Frame eksikliği yüksek — daha iyi aydınlatma ile tekrar deneyebilirsin.
        </p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 h-11 w-full rounded-full bg-amber-400 font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
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
    <div className="flex items-baseline justify-between border-b border-emerald-800/60 pb-3 last:border-0 last:pb-0">
      <dt className="text-xs uppercase tracking-wider text-emerald-200/80">
        {label}
      </dt>
      <dd
        className={`font-mono text-base font-semibold ${
          accent ? 'text-amber-300' : 'text-white'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
