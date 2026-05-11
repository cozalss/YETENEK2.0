/**
 * Standing Long Jump (Broad Jump) — premium 2-sütunlu UI.
 *
 * Mantık aynı: yan görüntüde dik dur, çömel, ileri patlayıcı atla, düş.
 * Ankle X delta cmPerUnit ile cm'e çevriliyor.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CameraStream } from '@/components/camera/CameraStream';
import { checkJumpFraming, type FramingStatus } from '@/lib/pose/framing';
import { cancelSpeech, speak } from '@/lib/a11y/speech';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TestStage } from '@/components/tests/shared/TestStage';
import { FramingBadge } from '@/components/tests/shared/FramingBadge';
import { InstructionsPanel } from '@/components/tests/shared/InstructionsPanel';
import { StartCTA } from '@/components/tests/shared/StartCTA';
import {
  type BroadJumpAnalysis,
  type BroadJumpSample,
  analyzeBroadJump,
  broadJumpScore,
  calibrateBroadJump,
  frameToBroadJumpSample,
} from '@/lib/tests/broadJump';
import type { PoseFrame } from '@/types';
import { logger } from '@/shared/logger/logger';

const log = logger.child('broad-jump-test');

type Phase = 'idle' | 'countdown' | 'capture' | 'analyze' | 'result';

interface Props {
  childAgeYears?: number;
  childSex?: 'male' | 'female';
  childHeightCm?: number;
  onComplete?: (analysis: BroadJumpAnalysis & { score: number }) => void;
}

const COUNTDOWN_SECONDS = 3;
const CAPTURE_SECONDS = 6;

const STEPS = [
  'Kamerayı yana koy — vücudunu profilden görsün.',
  'Çerçevenin sol tarafında dik dur. Sağa boş alan kalsın (atlayacağın yer).',
  '3-2-1 geri sayımının ardından 1 saniye sabit dur, sonra ileri doğru atla.',
  'Düştüğün yerde 1 saniye sabit kal — ölçüm tamamlansın.',
];

export function BroadJumpTest({
  childAgeYears = 12,
  childSex = 'male',
  childHeightCm,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [captureRemaining, setCaptureRemaining] = useState(CAPTURE_SECONDS);
  const [result, setResult] = useState<BroadJumpAnalysis | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [framing, setFraming] = useState<FramingStatus>({
    ready: false,
    hint: 'Pose tespit ediliyor…',
  });
  const reducedMotion = useReducedMotion();

  const samplesRef = useRef<BroadJumpSample[]>([]);
  const calibrationFrameRef = useRef<PoseFrame | null>(null);
  const captureActiveRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const lastFramingRef = useRef<FramingStatus | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // onComplete'i ref'te sabitle (bkz. JumpTest açıklaması).
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => () => cancelSpeech(), []);

  const handleFrame = useCallback((frame: PoseFrame | null) => {
    if (phaseRef.current === 'idle' || phaseRef.current === 'countdown') {
      const next = checkJumpFraming(frame);
      const prev = lastFramingRef.current;
      if (!prev || prev.ready !== next.ready || prev.hint !== next.hint) {
        lastFramingRef.current = next;
        setFraming(next);
      }
    }
    if (!frame) return;
    if (!captureActiveRef.current) return;
    const sample = frameToBroadJumpSample(frame);
    if (!sample) return;
    if (!calibrationFrameRef.current) {
      calibrationFrameRef.current = frame;
    }
    samplesRef.current.push(sample);
  }, []);

  const start = () => {
    samplesRef.current = [];
    calibrationFrameRef.current = null;
    captureActiveRef.current = false;
    setResult(null);
    setScore(null);
    setCountdown(COUNTDOWN_SECONDS);
    setCaptureRemaining(CAPTURE_SECONDS);
    setPhase('countdown');
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      speak('Atla', { interrupt: true });
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
    if (captureRemaining <= 0) {
      captureActiveRef.current = false;
      setPhase('analyze');
      return;
    }
    const t = setTimeout(() => setCaptureRemaining((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, captureRemaining]);

  useEffect(() => {
    if (phase !== 'analyze') return;
    try {
      let analysis = analyzeBroadJump(samplesRef.current);
      if (
        analysis.valid &&
        childHeightCm != null &&
        calibrationFrameRef.current
      ) {
        analysis = calibrateBroadJump(
          analysis,
          calibrationFrameRef.current,
          childHeightCm
        );
      }
      setResult(analysis);
      const computedScore =
        analysis.valid && analysis.jumpDistanceCm != null
          ? broadJumpScore(analysis.jumpDistanceCm, childAgeYears, childSex)
          : null;
      setScore(computedScore);
      setPhase('result');
      if (analysis.valid && computedScore != null) {
        onCompleteRef.current?.({ ...analysis, score: computedScore });
      }
    } catch (err) {
      log.error('analiz hatası', {
        cause: err instanceof Error ? err.message : String(err),
      });
      setResult({
        jumpUnits: 0,
        jumpDistanceCm: null,
        startX: 0,
        endX: 0,
        valid: false,
        reason: 'Analiz sırasında beklenmedik bir hata oluştu. Tekrar dene.',
      });
      setScore(null);
      setPhase('result');
    }
    // onComplete kasten dışarıda — inline arrow ile çift kayıt olmasın.
  }, [phase, childAgeYears, childSex, childHeightCm]);

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
                {countdown || 'ATLA!'}
              </motion.div>
            </div>
          )}

          {phase === 'capture' && (
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-2xl ring-1 ring-red-400/50">
              <span
                className={`h-2 w-2 rounded-full bg-white ${reducedMotion ? '' : 'animate-pulse'}`}
              />
              KAYIT · {captureRemaining}s
            </div>
          )}

          {phase === 'analyze' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-full bg-neutral-900/90 px-5 py-3 text-base text-white ring-1 ring-amber-400/30">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Analiz ediliyor…
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
            score={score}
            onRetry={start}
            hasCalibration={childHeightCm != null}
            headingRef={resultHeadingRef}
          />
        ) : phase === 'idle' ? (
          <InstructionsPanel
            eyebrow="Test 02 · Yatay Patlayıcı"
            title="Uzun Atlama"
            meta="~6 sn"
            steps={STEPS}
            helper={!framing.ready ? framing.hint : undefined}
            cta={<StartCTA onStart={start} canStart={framing.ready} />}
            footer={
              <p className="text-center text-xs text-neutral-300">
                Sprint, futbol, judo gibi sporlar için kritik boyut.
              </p>
            }
          />
        ) : (
          <PhaseStatusCard phase={phase} />
        )
      }
    />
  );
}

function PhaseStatusCard({ phase }: { phase: Phase }) {
  const messages: Record<Phase, { eyebrow: string; title: string; body: string }> = {
    idle: { eyebrow: '', title: '', body: '' },
    countdown: {
      eyebrow: 'Sırada',
      title: 'Hazırlanıyorsun',
      body: 'Geri sayım bittiğinde ileri doğru patlayıcı şekilde atla.',
    },
    capture: {
      eyebrow: 'Kayıt aktif',
      title: 'Atlayışın ölçülüyor',
      body: 'Düştüğün noktada 1 saniye sabit dur — mesafe ankle X delta ile hesaplanıyor.',
    },
    analyze: {
      eyebrow: 'Hesaplanıyor',
      title: 'Sonuç hazırlanıyor',
      body: 'Yaş normu ile karşılaştırılıyor — yatay patlayıcı güç skoru çıkıyor.',
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
  score,
  onRetry,
  hasCalibration,
  headingRef,
}: {
  result: BroadJumpAnalysis;
  score: number | null;
  onRetry: () => void;
  hasCalibration: boolean;
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
          Geçerli atlama algılanamadı
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
        Tamam · 02
      </p>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-2xl font-bold text-white focus-visible:outline-none"
      >
        Atlama kaydedildi
      </h3>
      <dl className="mt-5 space-y-3">
        <Stat
          label="Atlama mesafesi"
          value={
            result.jumpDistanceCm != null
              ? `${result.jumpDistanceCm.toFixed(0)} cm`
              : `${(result.jumpUnits * 100).toFixed(1)} br`
          }
          accent
        />
        {score != null && (
          <Stat
            label="Yaş norm skoru"
            value={`${score.toFixed(0)} / 100`}
            accent
          />
        )}
      </dl>
      {!hasCalibration && (
        <p className="mt-5 text-xs leading-relaxed text-emerald-100/80">
          Çocuk boyu girilmediği için mesafe yaklaşık.
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
