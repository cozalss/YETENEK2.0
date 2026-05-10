/**
 * Camera + MediaPipe pose detection loop.
 *
 * Renders the user's webcam feed mirrored, runs pose detection in a
 * requestAnimationFrame loop, and forwards each PoseFrame to the parent.
 *
 * StrictMode safety:
 * In React 18/19 dev, effects fire twice (mount → unmount → mount). A naive
 * `getUserMedia` in the effect body races: first call holds the camera, second
 * fails with NotReadableError because the OS hasn't released it yet. We solve
 * this with a module-level lock so only one stream exists at a time, plus a
 * grace period after cleanup before the next attempt.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

interface Props {
  onFrame?: (frame: PoseFrame | null) => void;
  /**
   * Per-frame pose kalite değişiminde tetiklenir. UI badge için kullanılır.
   * Polite — sadece category değişimi yansımalı (caller debounce edebilir).
   */
  onQuality?: (q: QualitySnapshot) => void;
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
      hint: 'Tarayıcı adres çubuğundaki kamera ikonundan izin ver, sayfayı yenile.',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      title: 'Kamera bulunamadı',
      hint: 'Bilgisayara bağlı kamera olduğundan emin ol.',
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
    try {
      // Try 1: with facingMode hint (best for phones).
      return await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: 'user',
        },
        audio: false,
      });
    } catch (err) {
      // Many Windows webcams don't expose facingMode; retry without it.
      if (err instanceof Error && err.name === 'OverconstrainedError') {
        return await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: width }, height: { ideal: height } },
          audio: false,
        });
      }
      throw err;
    }
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

export function CameraStream({
  onFrame,
  onQuality,
  width = 640,
  height = 480,
  showOverlay = true,
  filterPreset = 'sport',
  showTelemetry = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [latestFrame, setLatestFrame] = useState<PoseFrame | null>(null);
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

    async function start() {
      try {
        const stream = await openStream(width, height);

        if (cancelled) return;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const landmarker = await getPoseLandmarker();
        if (cancelled) return;

        setReady(true);

        let lastTimestamp = -1;
        let lastTelemetrySecond = -1;
        const loop = () => {
          if (cancelled || !video) return;
          // MediaPipe rejects equal/decreasing timestamps in VIDEO mode.
          const ts = performance.now();
          if (ts === lastTimestamp) {
            rafId = requestAnimationFrame(loop);
            return;
          }
          lastTimestamp = ts;

          if (video.readyState >= 2 /* HAVE_CURRENT_DATA */) {
            const rawFrame = detectPose(landmarker, video, ts);
            // One-Euro filter ile jitter smoothing — sport tracking std.
            const frame = rawFrame
              ? filterRef.current!.apply(rawFrame)
              : null;
            // Quality monitor — visibility + stability + persistence rolling.
            const quality = qualityRef.current!.observe(frame);
            setLatestFrame(frame);
            onFrame?.(frame);
            onQuality?.(quality);
          }
          // Telemetri (FPS, latency) saniyede bir yakala (re-render minimum).
          const second = Math.floor(ts / 1000);
          if (second !== lastTelemetrySecond) {
            lastTelemetrySecond = second;
            setTelemetry(getDetectorTelemetry());
          }
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        setError(translateError(err));
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      // We do NOT release the module-level activeStream here — StrictMode
      // would tear down the only stream we just created. The stream lives
      // until the component fully unmounts (page nav) or retry() is called.
    };
    // onFrame is intentionally excluded — parent must memoize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, attempt]);

  // True page-leave cleanup: release on actual unmount via beforeunload too.
  useEffect(() => {
    const handler = () => releaseStream();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
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
        className="h-full w-full scale-x-[-1] object-cover"
        style={{ width, height }}
      />
      {showOverlay && (
        <PoseOverlay frame={latestFrame} width={width} height={height} />
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
          <div className="text-base font-semibold text-red-300">
            {error.title}
          </div>
          <div className="max-w-xs text-sm leading-relaxed text-neutral-300">
            {error.hint}
          </div>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
          >
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );
}

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
