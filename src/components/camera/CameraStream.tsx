/**
 * Camera + MediaPipe pose detection loop.
 *
 * Renders the user's webcam feed mirrored, runs pose detection in a
 * requestVideoFrameCallback loop (rAF fallback), and forwards each PoseFrame.
 *
 * StrictMode safety:
 * In React 18/19 dev, effects fire twice (mount → unmount → mount). A naive
 * `getUserMedia` in the effect body races: first call holds the camera, second
 * fails with NotReadableError because the OS hasn't released it yet. We solve
 * this with a module-level lock so only one stream exists at a time, plus a
 * grace period after cleanup before the next attempt.
 */

'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  detectPose,
  getDetectorTelemetry,
  getPoseLandmarker,
  type DetectorTelemetry,
} from '@/lib/pose/detector';
import {
  ONE_EURO_PRESETS,
  PoseLandmarkFilter,
} from '@/lib/pose/oneEuroFilter';
import {
  PoseQualityMonitor,
  type QualitySnapshot,
} from '@/lib/pose/quality';
import type { PoseFrame } from '@/types';
import { PoseOverlay } from './PoseOverlay';
import { sampleScene, type SceneSample } from '@/lib/pose/cmjReadiness';

interface Props {
  /**
   * Her karede çağrılır.
   *
   * @param frame One-Euro'dan geçmiş kare — **gösterim** için. Jitter'ı
   *   bastırır ama balistik bir olayın tepesini de bastırır.
   * @param raw   Filtresiz kare — **ölçüm** için. Serbest düşüş fit'i buna
   *   bakmalı: One-Euro 30 fps'te ~155 ms zaman sabitli bir alçak geçiren
   *   ve 400 ms'lik bir uçuşun tepesini yuvarlıyor. Dahası fit artığı
   *   (`residualStd`) filtrelenmiş seride yapay olarak küçülüyor, yani
   *   raporlanan σ gerçek belirsizliği değil filtrenin düzgünlüğünü ölçüyor.
   *   Varyans ölçen testler (denge, hops) filtreli seriyi kullanmaya devam
   *   edebilir — orada yumuşatma bir kazanç.
   */
  onFrame?: (frame: PoseFrame | null, raw: PoseFrame | null) => void;
  /**
   * Per-frame pose kalite değişiminde tetiklenir. UI badge için kullanılır.
   * Polite — sadece category değişimi yansımalı (caller debounce edebilir).
   */
  onQuality?: (q: QualitySnapshot) => void;
  /**
   * Idle sahne kalitesi (parlaklık + kare farkı). Saniyede bir.
   * Test öncesi ışık/titreme kapısı bunu okur.
   */
  onScene?: (s: SceneSample | null) => void;
  width?: number;
  height?: number;
  showOverlay?: boolean;
  /**
   * One-Euro filter preset. Test türüne göre seçilebilir:
   *   - 'sport' (default) — dengeli
   *   - 'posture' — denge testi (agresif smoothing)
   *   - 'responsive' — sıçrama / refleks (lag minimum)
   */
  filterPreset?: keyof typeof ONE_EURO_PRESETS;
  /**
   * Geliştirici telemetri overlay'ini göster (FPS, model tier, latency).
   */
  showTelemetry?: boolean;
}

interface CameraError {
  title: string;
  hint: string;
  /** Hata kalıcı (izin reddi, cihaz yok) — demo'ya yönlendirme öneriliyor. */
  fatal?: boolean;
}

// Module-level lock: ensures only one MediaStream lives across StrictMode double-invokes.
let activeStream: MediaStream | null = null;
let pendingRequest: Promise<MediaStream> | null = null;

function translateError(err: unknown): CameraError {
  const name = err instanceof Error ? err.name : '';
  const message = err instanceof Error ? err.message : String(err);

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      title: 'Kamera izni verilmedi',
      hint: 'Tarayıcı adres çubuğundaki kamera ikonundan izin ver ve sayfayı yenile. İzin vermeden örnek bir profili incelemek istersen aşağıdaki bağlantıyı kullan.',
      fatal: true,
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      title: 'Kamera bulunamadı',
      hint: 'Cihazda kamera bulunamadı. Telefonundan tekrar dene ya da örnek profilleri incele.',
      fatal: true,
    };
  }
  if (
    name === 'NotReadableError' ||
    name === 'TrackStartError' ||
    /could not start video source/i.test(message)
  ) {
    return {
      title: 'Kamera başka yerde kullanımda',
      hint: 'Diğer tarayıcı sekmelerini, Zoom/Teams/Discord/OBS gibi uygulamaları kapat. Tüm tarayıcı pencerelerini kapatıp tek bir pencere açman en garantili çözüm.',
    };
  }
  if (
    name === 'OverconstrainedError' ||
    name === 'ConstraintNotSatisfiedError'
  ) {
    return {
      title: 'Kamera ayarları desteklenmiyor',
      hint: 'Kamera istenen çözünürlüğü desteklemiyor. Tekrar dene, daha düşük çözünürlük denenecek.',
    };
  }
  return {
    title: 'Kamera başlatılamadı',
    hint:
      message || 'Bilinmeyen hata. Sayfayı yenile veya tarayıcıyı değiştir.',
  };
}

async function openStream(width: number, height: number): Promise<MediaStream> {
  // Reuse in-flight request — protects against StrictMode double-mount.
  if (pendingRequest) return pendingRequest;
  if (activeStream && activeStream.active) return activeStream;

  pendingRequest = (async () => {
    const attempts: MediaStreamConstraints[] = [
      {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: 'user',
          frameRate: { ideal: 60 },
        },
        audio: false,
      },
      {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: 60 },
        },
        audio: false,
      },
      {
        video: { width: { ideal: width }, height: { ideal: height } },
        audio: false,
      },
    ];
    let lastErr: unknown;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastErr = err;
        const name = err instanceof Error ? err.name : '';
        if (name !== 'OverconstrainedError' && name !== 'ConstraintNotSatisfiedError') {
          throw err;
        }
      }
    }
    throw lastErr;
  })();

  try {
    const stream = await pendingRequest;
    activeStream = stream;
    return stream;
  } finally {
    pendingRequest = null;
  }
}

function releaseStream(): void {
  if (activeStream) {
    activeStream.getTracks().forEach((t) => t.stop());
    activeStream = null;
  }
}

function CameraStreamInner({
  onFrame,
  onQuality,
  onScene,
  width = 640,
  height = 480,
  showOverlay = true,
  filterPreset = 'sport',
  showTelemetry = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // En kritik perf kararı: pose frame'i State yerine Ref'te tut. State olsa
  // her MediaPipe inference'da (30-60 fps) React tree re-render olurdu →
  // butona basınca yavaşlık. Ref + canvas'a imperative çizim = 0 re-render.
  const latestFrameRef = useRef<PoseFrame | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [telemetry, setTelemetry] = useState<DetectorTelemetry | null>(null);

  // One-Euro filter + quality monitor: stateful, frame'ler arası persist.
  // React lazy-init pattern: ref.current === null kontrolü.
  const filterRef = useRef<PoseLandmarkFilter | null>(null);
  const qualityRef = useRef<PoseQualityMonitor | null>(null);
  if (filterRef.current === null) {
    filterRef.current = new PoseLandmarkFilter(ONE_EURO_PRESETS[filterPreset]);
  }
  if (qualityRef.current === null) {
    qualityRef.current = new PoseQualityMonitor();
  }

  const retry = useCallback(() => {
    releaseStream();
    setError(null);
    setReady(false);
    // Yeni session için filter + quality state'lerini sıfırla.
    filterRef.current?.reset();
    qualityRef.current?.reset();
    // Brief delay to let the OS release the camera before re-requesting.
    setTimeout(() => setAttempt((a) => a + 1), 300);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let rafId: number | null = null;
    let rvfcId: number | null = null;
    let videoEl: HTMLVideoElement | null = null;

    async function start() {
      try {
        const stream = await openStream(width, height);

        if (cancelled) return;

        const video = videoRef.current;
        if (!video) return;
        videoEl = video;
        video.srcObject = stream;
        await video.play();

        await getPoseLandmarker();
        if (cancelled) return;

        setReady(true);

        let lastTimestamp = -1;
        let lastTelemetrySecond = -1;
        let lastSceneAt = 0;
        let prevScenePixels: Uint8ClampedArray | null = null;

        const hasRvfc =
          typeof video.requestVideoFrameCallback === 'function';

        const process = (ts: number) => {
          if (cancelled || !video) return;
          if (ts === lastTimestamp) {
            schedule();
            return;
          }
          lastTimestamp = ts;

          if (video.readyState >= 2 /* HAVE_CURRENT_DATA */) {
            const rawFrame = detectPose(video, ts);
            const filter = filterRef.current;
            const monitor = qualityRef.current;
            if (!filter || !monitor) {
              schedule();
              return;
            }
            const frame = rawFrame ? filter.apply(rawFrame) : null;
            const quality = monitor.observe(frame);
            latestFrameRef.current = frame;
            onFrame?.(frame, rawFrame);
            onQuality?.(quality);

            if (ts - lastSceneAt >= 1000) {
              lastSceneAt = ts;
              const sampled = sampleScene(video, prevScenePixels);
              if (sampled) {
                prevScenePixels = sampled.pixels;
                onScene?.(sampled.sample);
              }
            }
          }
          const second = Math.floor(ts / 1000);
          if (second !== lastTelemetrySecond) {
            lastTelemetrySecond = second;
            setTelemetry(getDetectorTelemetry());
          }
          schedule();
        };

        const schedule = () => {
          if (cancelled || !video) return;
          if (hasRvfc) {
            rvfcId = video.requestVideoFrameCallback((_now, meta) => {
              process(meta.mediaTime * 1000);
            });
          } else {
            rafId = requestAnimationFrame(() => process(performance.now()));
          }
        };

        schedule();
      } catch (err) {
        if (cancelled) return;
        setError(translateError(err));
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      if (
        rvfcId != null &&
        videoEl &&
        typeof videoEl.cancelVideoFrameCallback === 'function'
      ) {
        videoEl.cancelVideoFrameCallback(rvfcId);
      }
    };
    // onFrame is intentionally excluded — parent must memoize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, attempt]);

  // Page leave cleanup: 3 yol kapatılır
  //  1. `beforeunload` — hard reload / kapatma
  //  2. `pagehide` — iOS Safari + SPA bfcache; beforeunload tetiklemez
  //  3. unmount stabilize sonrası — Next.js client-side route değişikliği
  //
  // StrictMode dev mode'da unmount → remount 2x ateşler. İlk teardown'da
  // stream'i hemen kapatırsak ikinci mount yeni stream isteyecek ve OS
  // henüz release etmediği için NotReadableError düşer. Bu yüzden unmount
  // release'i bir microtask gecikme + `mountedRef` kontrol ile yapıyoruz:
  // gerçek unmount (route change) ise release, StrictMode double-mount ise
  // release atlanır.
  useEffect(() => {
    const handler = () => releaseStream();
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, []);

  // Gerçek unmount tespiti: cleanup planlanır, bir sonraki paint'e kadar
  // remount olmadıysa stream serbest bırakılır. StrictMode remount ~aynı
  // tick içinde olur — setTimeout(0) ile sonraki tick'e ertelenir.
  useEffect(() => {
    return () => {
      const timeoutId = setTimeout(() => {
        // Eğer bu component remount olmadıysa (StrictMode değil, gerçek
        // unmount), aktivasyon yok demektir → kamera serbest bırakılır.
        if (!document.querySelector('video[data-camera-stream="true"]')) {
          releaseStream();
        }
      }, 50);
      // Cleanup eski timeout'u temizle — peş peşe unmount fire ederse.
      void timeoutId;
    };
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-black shadow-xl"
      style={{ width, height }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        data-camera-stream="true"
        className="h-full w-full scale-x-[-1] object-cover"
        style={{ width, height }}
      />
      {showOverlay && (
        <PoseOverlay frameRef={latestFrameRef} width={width} height={height} />
      )}
      {showTelemetry && telemetry && (
        <TelemetryOverlay telemetry={telemetry} />
      )}
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white/80">
          <div className="text-sm">Kamera ve model yükleniyor…</div>
        </div>
      )}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center"
        >
          <div className="text-base font-semibold text-red-300">
            {error.title}
          </div>
          <div className="max-w-xs text-sm leading-relaxed text-neutral-300">
            {error.hint}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={retry}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
            >
              Tekrar Dene
            </button>
            {error.fatal && (
              <Link
                href="/demo"
                className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
              >
                Örnek profili incele
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Parent test component'lerinin her framing/phase state değişikliğinde
 * CameraStream'in re-render olmaması için memo ile sarılıyor. Props
 * referans-sabit kalırsa diff iş yapmaz.
 */
export const CameraStream = memo(CameraStreamInner);

function TelemetryOverlay({ telemetry }: { telemetry: DetectorTelemetry }) {
  return (
    <div className="pointer-events-none absolute right-3 bottom-3 rounded-lg bg-black/70 px-3 py-2 font-mono text-[10px] leading-tight text-emerald-300 shadow-lg backdrop-blur-sm">
      <div className="text-amber-300 uppercase tracking-widest">
        {telemetry.modelTier} · {telemetry.delegate}
        {telemetry.hasWebGPU ? ' · WebGPU' : ''}
      </div>
      <div className="mt-0.5">
        {telemetry.avgFps.toFixed(1)} fps · {telemetry.avgInferenceMs.toFixed(1)} ms
      </div>
      {telemetry.errorCount > 0 && (
        <div className="mt-0.5 text-red-300">
          {telemetry.errorCount} err
        </div>
      )}
    </div>
  );
}
