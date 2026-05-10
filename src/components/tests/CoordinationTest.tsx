/**
 * Coordination Test UI bileşeni — pure JS, MediaPipe yok.
 *
 * Canvas üzerinde Lissajous yörüngesinde hareket eden bir hedef noktası
 * var; kullanıcı parmak/cursor ile takip ediyor. 25 saniye boyunca her
 * dokunma kaydediliyor; sonunda ortalama hata + ortalama gap → coord skor.
 *
 * A11y: bu test inherently visual. Görme zorluğu olan kullanıcı için
 * "Atla" butonu net şekilde sunuluyor — fake adapte edilmiyor.
 */

'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cancelSpeech, speak } from '@/lib/a11y/speech';
import {
  COORDINATION_DURATION_MS,
  type CoordinationAnalysis,
  type LissajousParams,
  type TrackingTouch,
  analyzeCoordination,
  computeDotPosition,
  defaultLissajous,
} from '@/lib/tests/coordination';

type Phase = 'idle' | 'countdown' | 'capture' | 'analyze' | 'result';

interface Props {
  onComplete?: (analysis: CoordinationAnalysis) => void;
  onSkip?: () => void;
}

const COUNTDOWN_SECONDS = 3;
const CANVAS_W = 600;
const CANVAS_H = 400;
const DOT_RADIUS = 28;

export function CoordinationTest({ onComplete, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [captureRemainingMs, setCaptureRemainingMs] = useState(
    COORDINATION_DURATION_MS
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [result, setResult] = useState<CoordinationAnalysis | null>(null);
  // Live counter for the badge (read during render). State, not ref.
  const [liveTouchCount, setLiveTouchCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const touchesRef = useRef<TrackingTouch[]>([]);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  // Pointer move'lar 60fps'a kadar tetiklenebilir — 80ms gate ile
  // re-render flood'u önlüyoruz (touch frequency ≥ 12Hz yeterli analiz için).
  const lastMoveAtRef = useRef(0);
  // Buffer cap: 25sn boyunca tek session'da 1000+ touch tutmaya gerek yok.
  const MAX_TOUCHES = 1000;

  useEffect(() => () => cancelSpeech(), []);

  const lissajous: LissajousParams = useMemo(
    () => defaultLissajous(CANVAS_W, CANVAS_H),
    []
  );

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Dot position helper — reduced-motion ise basit yatay sallanma
  const getDotAt = useCallback(
    (elapsedMs: number) => {
      if (reducedMotion) {
        const t = elapsedMs / 1000;
        const speed = 120; // px/s
        const range = CANVAS_W * 0.7;
        const offset = ((t * speed) % (range * 2)) - range;
        const x =
          CANVAS_W / 2 + (offset > 0 ? range - offset : range + offset);
        return { x, y: CANVAS_H / 2 };
      }
      return computeDotPosition(lissajous, elapsedMs);
    },
    [lissajous, reducedMotion]
  );

  // Render loop
  useEffect(() => {
    if (phase !== 'capture') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true; // unmount sonrası 1-frame leak'i önler
    const draw = () => {
      if (!active) return;
      const elapsed = performance.now() - startTimeRef.current;
      const { x, y } = getDotAt(elapsed);
      // fillRect tüm canvas'ı kapsıyor → clearRect gereksiz, atlandı.
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // Dot outer ring (kontrast için)
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS + 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      // Inner amber
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, getDotAt]);

  const handlePointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phaseRef.current !== 'capture') return;
      // pointermove flood guard: 80ms = ~12Hz örnekleme, analiz için yeterli.
      if (e.type === 'pointermove') {
        const now = performance.now();
        if (now - lastMoveAtRef.current < 80) return;
        lastMoveAtRef.current = now;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (touchesRef.current.length >= MAX_TOUCHES) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const touchX = (e.clientX - rect.left) * scaleX;
      const touchY = (e.clientY - rect.top) * scaleY;
      const elapsed = performance.now() - startTimeRef.current;
      const { x: dotX, y: dotY } = getDotAt(elapsed);
      touchesRef.current.push({ t: elapsed, dotX, dotY, touchX, touchY });
      setLiveTouchCount(touchesRef.current.length);
    },
    [getDotAt]
  );

  const start = () => {
    touchesRef.current = [];
    setLiveTouchCount(0);
    setResult(null);
    setCountdown(COUNTDOWN_SECONDS);
    setCaptureRemainingMs(COORDINATION_DURATION_MS);
    setPhase('countdown');
  };

  // Countdown -> capture
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      speak('Başla', { interrupt: true });
      startTimeRef.current = performance.now();
      setPhase('capture');
      return;
    }
    speak(String(countdown), { interrupt: true });
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Result fazına geçince başlığa odak ver.
  useEffect(() => {
    if (phase === 'result' && resultHeadingRef.current) {
      resultHeadingRef.current.focus();
    }
  }, [phase]);

  // Capture timer (250ms tick — enough for live time display)
  useEffect(() => {
    if (phase !== 'capture') return;
    if (captureRemainingMs <= 0) {
      setPhase('analyze');
      return;
    }
    const t = setTimeout(
      () => setCaptureRemainingMs((c) => Math.max(0, c - 250)),
      250
    );
    return () => clearTimeout(t);
  }, [phase, captureRemainingMs]);

  // Analyze
  useEffect(() => {
    if (phase !== 'analyze') return;
    try {
      const analysis = analyzeCoordination(touchesRef.current);
      setResult(analysis);
      setPhase('result');
      if (analysis.valid) {
        onComplete?.(analysis);
      }
    } catch (err) {
      console.error('[CoordinationTest] analiz hatası', err);
      setResult({
        trackingEvents: 0,
        avgErrorPx: 0,
        bestErrorPx: 0,
        avgGapMs: 0,
        coordScore: 0,
        valid: false,
        reason: 'Analiz sırasında bir hata oluştu. Tekrar dene.',
      });
      setPhase('result');
    }
  }, [phase, onComplete]);

  return (
    <div className="space-y-6">
      <div className="relative mx-auto w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={handlePointer}
          onPointerMove={handlePointer}
          className="w-full touch-none rounded-xl"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
          aria-label="Hareket takibi alanı — noktayı parmağınla takip et"
        />

        {phase === 'countdown' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/55">
            <div className="text-9xl font-bold text-amber-400 drop-shadow-2xl">
              {countdown || 'BAŞLA!'}
            </div>
          </div>
        )}

        {phase === 'capture' && (
          <>
            <div className="pointer-events-none absolute right-5 top-5 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
              {(captureRemainingMs / 1000).toFixed(1)}s · {liveTouchCount} dokunma
            </div>
            {onSkip && (
              <button
                type="button"
                onClick={() => {
                  setPhase('idle');
                  onSkip();
                }}
                className="absolute left-5 top-5 rounded-full bg-neutral-900/85 px-4 py-2 text-xs font-semibold text-amber-300 shadow-lg transition-colors hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
              >
                Atla
              </button>
            )}
          </>
        )}

        {phase === 'analyze' && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
            <div className="text-2xl text-white">Hesaplanıyor…</div>
          </div>
        )}
      </div>

      {phase === 'idle' && <Instructions onStart={start} onSkip={onSkip} />}

      {phase === 'result' && result && (
        <ResultPanel
          result={result}
          onRetry={start}
          headingRef={resultHeadingRef}
        />
      )}
    </div>
  );
}

function Instructions({
  onStart,
  onSkip,
}: {
  onStart: () => void;
  onSkip?: () => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 p-6">
      <h2 className="text-xl font-bold">Koordinasyon Testi</h2>
      <ol className="list-inside list-decimal space-y-2 text-sm text-neutral-200">
        <li>Ekrandaki sarı nokta hareket etmeye başlayacak.</li>
        <li>Parmağınla noktayı takip et. Dokun, kaydır, dokun.</li>
        <li>25 saniye boyunca devam et. Acelen yok — sadece doğru takip et.</li>
      </ol>

      <p className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 text-xs text-neutral-300">
        Bu test gözle takip gerektirir. Görme zorluğun varsa atlayabilirsin —
        raporda bu boyut "ölçülmedi" olarak işaretlenecek, başka becerilerine
        bakılacak.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onStart}
          className="h-12 flex-1 rounded-full bg-amber-400 font-bold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
        >
          Başla
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="h-12 rounded-full border border-neutral-700 px-6 text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-500 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
          >
            Bu testi atla
          </button>
        )}
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  onRetry,
  headingRef,
}: {
  result: CoordinationAnalysis;
  onRetry: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  if (!result.valid) {
    return (
      <div className="space-y-3 rounded-2xl border border-red-800 bg-red-950/30 p-6">
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-bold text-red-300 focus-visible:outline-none"
        >
          Yeterli takip kaydedilemedi
        </h3>
        <p className="text-sm text-red-200">{result.reason}</p>
        <button
          type="button"
          onClick={onRetry}
          className="h-11 rounded-full bg-amber-400 px-5 font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-bold text-emerald-300 focus-visible:outline-none"
      >
        Test Tamamlandı
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Dokunma" value={`${result.trackingEvents}`} />
        <Metric
          label="Ort. Hata"
          value={`${result.avgErrorPx.toFixed(0)} px`}
        />
        <Metric
          label="En İyi Hata"
          value={`${result.bestErrorPx.toFixed(0)} px`}
        />
        <Metric
          label="Skor"
          value={`${result.coordScore.toFixed(0)} / 100`}
          accent
        />
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="h-11 rounded-full bg-amber-400 px-5 font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
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
    <div className="rounded-xl border border-neutral-800 p-3">
      <div className="text-xs uppercase tracking-wider text-neutral-300">
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-bold ${
          accent ? 'text-amber-400' : 'text-white'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
