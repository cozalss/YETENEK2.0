/**
 * Sıçrama (CMJ) testi UI bileşeni — premium 2-sütunlu layout.
 *
 * Akış:
 *   1. IDLE      → editorial talimat sidebar'ı + canlı framing rozeti.
 *   2. COUNTDOWN → 3-2-1-BAŞLA geri sayım overlay'i.
 *   3. CAPTURE   → KAYIT pill + 5sn boyunca kalça Y serisi toplanıyor.
 *   4. ANALYZE   → analyzeJump() çağırılıyor.
 *   5. RESULT    → sonuç paneli (sidebar'da) + retry CTA.
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
  type HipSample,
  type JumpAnalysis,
  analyzeJump,
  calibrateJumpHeight,
  frameToHipSample,
  jumpScore,
} from '@/lib/tests/jump';
import type { PoseFrame } from '@/types';

type Phase = 'idle' | 'countdown' | 'capture' | 'analyze' | 'result';

interface Props {
  childAgeYears?: number;
  childSex?: 'male' | 'female';
  childHeightCm?: number;
  onComplete?: (analysis: JumpAnalysis & { score: number | null }) => void;
}

const COUNTDOWN_SECONDS = 3;
const CAPTURE_SECONDS = 5;

const STEPS = [
  'Telefonu / kamerayı yaklaşık 1.5 m yüksekliğe (sandalye, masa) koy. Yere koyma — kalça ve ayakların net görünsün.',
  'Kameradan 2-3 metre uzakta dik dur; tüm vücudun (baştan ayağa) ekrana sığsın.',
  'Sol-alt rozet "Hazır" yazana kadar pozisyonunu ayarla. Hazır olmadan başlatamazsın.',
  '3-2-1 geri sayımının ardından 5 saniyelik kayıt başlar.',
  '1 saniye dik dur — sonra HIZLICA çömelip patlayıcı şekilde zıpla.',
];

export function JumpTest({
  childAgeYears = 12,
  childSex = 'male',
  childHeightCm,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [captureRemaining, setCaptureRemaining] = useState(CAPTURE_SECONDS);
  const [result, setResult] = useState<JumpAnalysis | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [framing, setFraming] = useState<FramingStatus>({
    ready: false,
    hint: 'Pose tespit ediliyor…',
  });
  const reducedMotion = useReducedMotion();

  const samplesRef = useRef<HipSample[]>([]);
  const calibrationFrameRef = useRef<PoseFrame | null>(null);
  const captureActiveRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const lastFramingRef = useRef<FramingStatus | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

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
    const sample = frameToHipSample(frame);
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

  // Countdown -> capture
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      speak('Zıpla', { interrupt: true });
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
      let analysis = analyzeJump(samplesRef.current);
      if (
        analysis.valid &&
        childHeightCm != null &&
        calibrationFrameRef.current
      ) {
        analysis = calibrateJumpHeight(
          analysis,
          calibrationFrameRef.current,
          childHeightCm
        );
      }
      setResult(analysis);
      const computedScore =
        analysis.valid && analysis.jumpHeightCm != null
          ? jumpScore(analysis.jumpHeightCm, childAgeYears, childSex)
          : null;
      setScore(computedScore);
      setPhase('result');
      onComplete?.({ ...analysis, score: computedScore });
    } catch (err) {
      console.error('[JumpTest] analiz hatası', err);
      setResult({
        jumpUnits: 0,
        jumpHeightCm: null,
        takeoffY: 0,
        apexY: 0,
        flightTimeMs: 0,
        valid: false,
        reason: 'Analiz sırasında beklenmedik bir hata oluştu. Tekrar dene.',
      });
      setScore(null);
      setPhase('result');
    }
  }, [phase, childAgeYears, childSex, childHeightCm, onComplete]);

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
            <CountdownOverlay value={countdown} reducedMotion={reducedMotion} />
          )}

          {phase === 'capture' && (
            <CapturePill
              remaining={captureRemaining}
              reducedMotion={reducedMotion}
            />
          )}

          {phase === 'analyze' && <AnalyzeOverlay />}

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
            eyebrow="Test 01 · Patlayıcı Güç"
            title="Sıçrama (CMJ)"
            meta="~5 sn"
            steps={STEPS}
            helper={!framing.ready ? framing.hint : undefined}
            cta={<StartCTA onStart={start} canStart={framing.ready} />}
            footer={
              <p className="text-center text-xs text-neutral-300">
                Kayıt cihazda işlenir, sunucuya video gitmez.
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

// ─────────────────────────────────────────────────────────────────────────────
// Camera-overlay parçaları

function CountdownOverlay({
  value,
  reducedMotion,
}: {
  value: number;
  reducedMotion: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
      <motion.div
        key={value}
        initial={
          reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }
        }
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.3, ease: 'easeOut' }}
        className="font-display text-[10rem] leading-none font-black text-amber-400 drop-shadow-[0_8px_30px_rgba(251,191,36,0.4)]"
      >
        {value || 'ZIPLA!'}
      </motion.div>
    </div>
  );
}

function CapturePill({
  remaining,
  reducedMotion,
}: {
  remaining: number;
  reducedMotion: boolean;
}) {
  return (
    <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-2xl ring-1 ring-red-400/50">
      <span
        className={`h-2 w-2 rounded-full bg-white ${reducedMotion ? '' : 'animate-pulse'}`}
      />
      KAYIT · {remaining}s
    </div>
  );
}

function AnalyzeOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-full bg-neutral-900/90 px-5 py-3 text-base text-white shadow-2xl ring-1 ring-amber-400/30">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        Analiz ediliyor…
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar parçaları

function PhaseStatusCard({ phase }: { phase: Phase }) {
  const messages: Record<Phase, { eyebrow: string; title: string; body: string }> = {
    idle: { eyebrow: '', title: '', body: '' },
    countdown: {
      eyebrow: 'Sırada',
      title: 'Hazırlanıyorsun',
      body: 'Geri sayım bittiğinde hızlıca patlayıcı bir sıçrama yap. Dik dur, çömel, zıpla.',
    },
    capture: {
      eyebrow: 'Kayıt aktif',
      title: 'Sıçrayışın ölçülüyor',
      body: 'Kalça hareketin saniyede 30 frame ile kaydediliyor. Zıpladıktan sonra yere indikten sonra dik dur.',
    },
    analyze: {
      eyebrow: 'Hesaplanıyor',
      title: 'Sonuç hazırlanıyor',
      body: 'Yaş normu ile karşılaştırılıyor — sıçrama yüksekliği ve patlayıcı güç skoru çıkıyor.',
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
  result: JumpAnalysis;
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
          Geçerli sıçrama algılanamadı
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
        Tamam · 01
      </p>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-2xl font-bold text-white focus-visible:outline-none"
      >
        Sıçrama kaydedildi
      </h3>

      <dl className="mt-5 space-y-3">
        <Stat
          label="Sıçrama yüksekliği"
          value={
            result.jumpHeightCm != null
              ? `${result.jumpHeightCm.toFixed(1)} cm`
              : `${(result.jumpUnits * 100).toFixed(1)} br`
          }
          accent
        />
        <Stat
          label="Hava süresi (yakl.)"
          value={`${result.flightTimeMs.toFixed(0)} ms`}
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
          Çocuk boyu girilmediği için yükseklik yaklaşık. Boy verilirse cm'e
          dönüştürülür.
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
