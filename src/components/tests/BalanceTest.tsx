/**
 * Tek Bacak Denge testi UI bileşeni.
 *
 * Akış:
 *   1. IDLE          → talimat + framing kontrol.
 *   2. RIGHT_READY   → sağ bacakta dur, hazır olunca otomatik kayıt.
 *   3. RIGHT_CAPTURE → 15sn boyunca sağ bacak postür örnekleri.
 *   4. SWITCH        → 3sn dinlenme, sol bacağa geç.
 *   5. LEFT_READY    → sol bacakta dur.
 *   6. LEFT_CAPTURE  → 15sn boyunca sol bacak.
 *   7. ANALYZE       → analyzeBalance() çağır.
 *   8. RESULT        → sağ/sol skor + asimetri uyarısı.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraStream } from '@/components/camera/CameraStream';
import { checkBalanceFraming, type FramingStatus } from '@/lib/pose/framing';
import {
  type BalanceAnalysis,
  type PostureSample,
  analyzeBalance,
  frameToPostureSample,
} from '@/lib/tests/balance';
import type { PoseFrame } from '@/types';
import { logger } from '@/shared/logger/logger';

const log = logger.child('balance-test');

type Phase =
  | 'idle'
  | 'rightCountdown'
  | 'rightCapture'
  | 'switch'
  | 'leftCountdown'
  | 'leftCapture'
  | 'analyze'
  | 'result';

interface Props {
  onComplete?: (analysis: BalanceAnalysis) => void;
  /** Asimetri uyarı eşiği yaşa göre uyarlanır (Hewett 2005). */
  childAgeYears?: number;
}

const COUNTDOWN_SECONDS = 3;
const CAPTURE_SECONDS = 15;
const SWITCH_SECONDS = 3;

export function BalanceTest({ onComplete, childAgeYears }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [captureRemaining, setCaptureRemaining] = useState(CAPTURE_SECONDS);
  const [switchRemaining, setSwitchRemaining] = useState(SWITCH_SECONDS);
  const [framing, setFraming] = useState<FramingStatus>({
    ready: false,
    hint: 'Pose tespit ediliyor…',
  });
  const [result, setResult] = useState<BalanceAnalysis | null>(null);

  const rightSamplesRef = useRef<PostureSample[]>([]);
  const leftSamplesRef = useRef<PostureSample[]>([]);
  const phaseRef = useRef<Phase>('idle');
  // Framing diff-guard — diğer test bileşenlerinde olduğu gibi, her
  // frame'de setFraming çağrısı yapılmasın. Statik framing 30 fps'de
  // re-render flood'una neden oluyordu.
  const lastFramingRef = useRef<FramingStatus | null>(null);

  // onComplete'i ref'te sabitle — inline arrow parent'tan geldiğinde
  // analyze effect re-fire ile sonuç çift kayıt olmasın.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const handleFrame = useCallback((frame: PoseFrame | null) => {
    const p = phaseRef.current;

    if (
      p === 'idle' ||
      p === 'rightCountdown' ||
      p === 'leftCountdown' ||
      p === 'switch'
    ) {
      const next = checkBalanceFraming(frame);
      const prev = lastFramingRef.current;
      if (!prev || prev.ready !== next.ready || prev.hint !== next.hint) {
        lastFramingRef.current = next;
        setFraming(next);
      }
    }

    if (!frame) return;
    const sample = frameToPostureSample(frame);
    if (!sample) return;

    if (p === 'rightCapture') rightSamplesRef.current.push(sample);
    else if (p === 'leftCapture') leftSamplesRef.current.push(sample);
  }, []);

  const start = () => {
    rightSamplesRef.current = [];
    leftSamplesRef.current = [];
    setResult(null);
    setCountdown(COUNTDOWN_SECONDS);
    setCaptureRemaining(CAPTURE_SECONDS);
    setSwitchRemaining(SWITCH_SECONDS);
    setPhase('rightCountdown');
  };

  // Right countdown -> right capture
  useEffect(() => {
    if (phase !== 'rightCountdown') return;
    if (countdown <= 0) {
      setCaptureRemaining(CAPTURE_SECONDS);
      setPhase('rightCapture');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Right capture -> switch
  useEffect(() => {
    if (phase !== 'rightCapture') return;
    if (captureRemaining <= 0) {
      setSwitchRemaining(SWITCH_SECONDS);
      setPhase('switch');
      return;
    }
    const t = setTimeout(() => setCaptureRemaining((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, captureRemaining]);

  // Switch -> left countdown
  useEffect(() => {
    if (phase !== 'switch') return;
    if (switchRemaining <= 0) {
      setCountdown(COUNTDOWN_SECONDS);
      setPhase('leftCountdown');
      return;
    }
    const t = setTimeout(() => setSwitchRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, switchRemaining]);

  // Left countdown -> left capture
  useEffect(() => {
    if (phase !== 'leftCountdown') return;
    if (countdown <= 0) {
      setCaptureRemaining(CAPTURE_SECONDS);
      setPhase('leftCapture');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Left capture -> analyze
  useEffect(() => {
    if (phase !== 'leftCapture') return;
    if (captureRemaining <= 0) {
      setPhase('analyze');
      return;
    }
    const t = setTimeout(() => setCaptureRemaining((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, captureRemaining]);

  // Analyze
  useEffect(() => {
    if (phase !== 'analyze') return;
    try {
      const analysis = analyzeBalance(
        rightSamplesRef.current,
        leftSamplesRef.current,
        childAgeYears
      );
      setResult(analysis);
      setPhase('result');
      onCompleteRef.current?.(analysis);
    } catch (err) {
      log.error('analiz hatası', {
        cause: err instanceof Error ? err.message : String(err),
      });
      setResult({
        right: {
          score: 0,
          hipSwayX: 0,
          shoulderSwayX: 0,
          swayPathHip: 0,
          validFrames: 0,
          hasEnoughData: false,
        },
        left: {
          score: 0,
          hipSwayX: 0,
          shoulderSwayX: 0,
          swayPathHip: 0,
          validFrames: 0,
          hasEnoughData: false,
        },
        asymmetryRatio: 0,
        asymmetryWarning: false,
        weakerSide: null,
        summary: 'Analiz sırasında beklenmedik bir hata oluştu. Tekrar dene.',
      });
      setPhase('result');
    }
    // onComplete kasten dışarıda — bkz. JumpTest.tsx açıklaması.
  }, [childAgeYears, phase]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <CameraStream onFrame={handleFrame} width={640} height={480} />

        {(phase === 'rightCountdown' || phase === 'leftCountdown') && (
          <CountdownOverlay
            countdown={countdown}
            label={phase === 'rightCountdown' ? 'Sağ Bacak' : 'Sol Bacak'}
          />
        )}

        {phase === 'rightCapture' && (
          <CaptureBadge
            label="SAĞ BACAK"
            remaining={captureRemaining}
            color="emerald"
          />
        )}

        {phase === 'leftCapture' && (
          <CaptureBadge
            label="SOL BACAK"
            remaining={captureRemaining}
            color="sky"
          />
        )}

        {phase === 'switch' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/70 text-white">
            <div className="text-2xl">Sol bacağa geç</div>
            <div className="mt-3 text-6xl font-bold text-amber-400">
              {switchRemaining}
            </div>
          </div>
        )}

        {phase === 'analyze' && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
            <div className="text-2xl text-white">Analiz ediliyor…</div>
          </div>
        )}

        {(phase === 'idle' ||
          phase === 'rightCountdown' ||
          phase === 'leftCountdown' ||
          phase === 'switch') && <FramingBadge framing={framing} />}
      </div>

      {phase === 'idle' && (
        <Instructions
          onStart={start}
          canStart={framing.ready}
          framing={framing}
        />
      )}

      {phase === 'result' && result && (
        <ResultPanel result={result} onRetry={start} />
      )}
    </div>
  );
}

function FramingBadge({ framing }: { framing: FramingStatus }) {
  return (
    <div
      className={`absolute left-4 top-4 max-w-xs rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
        framing.ready
          ? 'bg-emerald-500/90 text-white'
          : 'bg-amber-500/90 text-neutral-950'
      }`}
    >
      {framing.ready ? '✓ Hazır' : framing.hint}
    </div>
  );
}

function CountdownOverlay({
  countdown,
  label,
}: {
  countdown: number;
  label: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/40">
      <div className="mb-2 text-2xl text-white">{label}</div>
      <div className="text-9xl font-bold text-amber-400 drop-shadow-2xl">
        {countdown || 'BAŞLA'}
      </div>
    </div>
  );
}

function CaptureBadge({
  label,
  remaining,
  color,
}: {
  label: string;
  remaining: number;
  color: 'emerald' | 'sky';
}) {
  const bg = color === 'emerald' ? 'bg-emerald-500/90' : 'bg-sky-500/90';
  return (
    <div
      className={`absolute right-4 top-4 flex items-center gap-2 rounded-full ${bg} px-4 py-2 text-sm font-semibold text-white shadow-lg`}
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
      {label} · {remaining}s
    </div>
  );
}

function Instructions({
  onStart,
  canStart,
  framing,
}: {
  onStart: () => void;
  canStart: boolean;
  framing: FramingStatus;
}) {
  return (
    <div
      className="space-y-4 rounded-2xl border-2 p-6"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(44, 62, 107, 0.18)',
      }}
    >
      <h2
        className="text-xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Tek Bacak Denge Testi
      </h2>
      <ol
        className="list-inside list-decimal space-y-2 text-sm leading-relaxed"
        style={{ color: 'var(--color-ink-2)' }}
      >
        <li>Kamerayı 1.5m yüksekliğe koy, baştan ayağa görünmelisin.</li>
        <li>İlk olarak SAĞ bacakta 15 saniye dur, sol ayak yerden 10cm yukarda.</li>
        <li>3 saniye dinlenme, sonra SOL bacakta 15 saniye.</li>
        <li>Kollar yanda veya kalçada olabilir, başını öne eğme.</li>
      </ol>
      {!canStart && (
        <div
          className="rounded-lg border-2 p-3 text-sm font-medium"
          style={{
            background: 'rgba(242, 201, 76, 0.18)',
            borderColor: 'var(--track-mustard)',
            color: 'var(--form-navy)',
          }}
        >
          {framing.hint}
        </div>
      )}
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className="h-12 w-full rounded-full text-base font-black tracking-wide transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={
          canStart
            ? {
                background: 'var(--track-mustard)',
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
                boxShadow:
                  '0 6px 0 rgba(44, 62, 107, 0.18), 0 18px 36px -12px rgba(242, 201, 76, 0.45)',
              }
            : {
                background: 'rgba(44, 62, 107, 0.08)',
                color: 'rgba(44, 62, 107, 0.55)',
                cursor: 'not-allowed',
                fontFamily: 'var(--font-display)',
              }
        }
      >
        {canStart ? 'Hazırım, Başla' : 'Vücudun tam görünmüyor'}
      </button>
    </div>
  );
}

function ResultPanel({
  result,
  onRetry,
}: {
  result: BalanceAnalysis;
  onRetry: () => void;
}) {
  const warn = result.asymmetryWarning;
  return (
    <div
      className="space-y-4 rounded-2xl border-2 p-6"
      style={{
        background: warn
          ? 'rgba(244, 182, 194, 0.22)'
          : 'rgba(168, 213, 186, 0.22)',
        borderColor: warn ? 'var(--mindar-pink)' : 'var(--field-mint)',
      }}
    >
      <h3
        className="text-lg font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Test Tamamlandı
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric
          label="Sağ Bacak Skoru"
          value={`${result.right.score.toFixed(0)} / 100`}
          accent={result.weakerSide === 'right'}
        />
        <Metric
          label="Sol Bacak Skoru"
          value={`${result.left.score.toFixed(0)} / 100`}
          accent={result.weakerSide === 'left'}
        />
        <Metric
          label="Asimetri"
          value={`${(result.asymmetryRatio * 100).toFixed(0)}%`}
          accent={result.asymmetryWarning}
        />
      </div>

      <div
        className="rounded-lg border-2 p-4 text-sm leading-relaxed"
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          borderColor: warn
            ? 'rgba(244, 182, 194, 0.55)'
            : 'rgba(168, 213, 186, 0.55)',
          color: 'var(--form-navy)',
        }}
      >
        {warn && (
          <span className="mb-2 block font-bold">
            ⚠ Sakatlanma riski uyarısı
          </span>
        )}
        {result.summary}
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="h-11 rounded-full px-5 text-sm font-black tracking-wide transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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

function Metric({
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
      className="rounded-xl border-2 p-3"
      style={{
        background: 'var(--color-surface-elevated)',
        borderColor: accent ? 'var(--track-mustard)' : 'var(--color-line)',
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{
          color: 'var(--color-ink-3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
