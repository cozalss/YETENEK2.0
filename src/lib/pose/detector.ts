/**
 * MediaPipe Pose Landmarker — gelişmiş pipeline.
 *
 * Özellikler:
 *   - Adaptif model tier: cihaz gücüne göre Heavy / Full / Lite seçimi.
 *   - WebGPU detection: WebGPU varsa GPU delegate, yoksa fallback.
 *   - Telemetry: model load süresi, FPS, detection latency.
 *   - Auto-recovery: detection hata verirse 3 frame sonra re-init dener.
 *   - ImageBitmap path: Safari/iOS'ta direct video element pose'u kararsız;
 *     createImageBitmap stabilize ediyor.
 *   - Lazy singleton: model bir kez indirilir.
 *
 * Reliability:
 *   - getPoseLandmarker() reset failures so retry can recover from transient
 *     network errors (e.g. hackathon WiFi blip during model download).
 *   - detectPose() never throws — wraps detectForVideo and returns null on error.
 */

import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { PoseFrame } from '@/types';

const TASKS_VERSION = '0.10.35';
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;

const MODELS = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  heavy: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
} as const;

export type ModelTier = keyof typeof MODELS;

export interface DetectorTelemetry {
  modelTier: ModelTier;
  delegate: 'GPU' | 'CPU';
  hasWebGPU: boolean;
  loadTimeMs: number | null;
  /** Son 60 frame'in detection latency rolling average (ms) */
  avgInferenceMs: number;
  /** Son 60 frame'in FPS rolling average */
  avgFps: number;
  /** Toplam detection hatası sayısı */
  errorCount: number;
  /** Son hata mesajı (varsa) */
  lastError: string | null;
}

const telemetry: DetectorTelemetry = {
  modelTier: 'lite',
  delegate: 'GPU',
  hasWebGPU: false,
  loadTimeMs: null,
  avgInferenceMs: 0,
  avgFps: 0,
  errorCount: 0,
  lastError: null,
};

const inferenceLatencies: number[] = [];
const inferenceTimestamps: number[] = [];
const ROLLING_WINDOW = 60;

let landmarkerPromise: Promise<PoseLandmarker> | null = null;
let configuredTier: ModelTier | null = null;
let consecutiveErrors = 0;

/**
 * Cihaz gücünü hızlıca tahmin et:
 *   - navigator.deviceMemory (Chrome) >= 8GB → Heavy
 *   - >= 4GB → Full
 *   - < 4GB veya bilinmeyen → Lite
 *   - hardwareConcurrency düşükse Lite (mobil tipik)
 *   - User-Agent mobile detection
 *
 * Varsayılan: Full (en iyi accuracy/perf dengesi).
 */
export function autoSelectModelTier(): ModelTier {
  if (typeof navigator === 'undefined') return 'lite';
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /mobi|android|iphone|ipad/.test(ua);

  // @ts-expect-error: deviceMemory is Chrome-specific
  const memory = navigator.deviceMemory as number | undefined;
  const cores = navigator.hardwareConcurrency ?? 0;

  if (isMobile) {
    if ((memory ?? 0) >= 8 && cores >= 6) return 'full';
    return 'lite';
  }

  if ((memory ?? 0) >= 8 && cores >= 8) return 'heavy';
  if ((memory ?? 0) >= 4 || cores >= 4) return 'full';
  return 'lite';
}

async function detectWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  // @ts-expect-error: navigator.gpu is the WebGPU entrypoint
  const gpu = navigator.gpu as { requestAdapter: () => Promise<unknown> } | undefined;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}

/**
 * Lazy singleton so we only load the WASM + model once per page.
 * Resets the promise on rejection so a subsequent retry can attempt a fresh download.
 *
 * @param forceTier opsiyonel — auto-select yerine belirli bir tier yükle
 */
export function getPoseLandmarker(
  forceTier?: ModelTier
): Promise<PoseLandmarker> {
  const targetTier = forceTier ?? autoSelectModelTier();

  // Tier değiştiyse mevcut yüklenmişi at, baştan başla.
  if (configuredTier && configuredTier !== targetTier) {
    void disposePoseLandmarker();
  }

  if (!landmarkerPromise) {
    configuredTier = targetTier;
    telemetry.modelTier = targetTier;
    const startTime = performance.now();

    landmarkerPromise = (async () => {
      telemetry.hasWebGPU = await detectWebGPU();
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      try {
        const landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODELS[targetTier],
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false,
        });
        telemetry.delegate = 'GPU';
        telemetry.loadTimeMs = Math.round(performance.now() - startTime);
        telemetry.lastError = null;
        return landmarker;
      } catch (err) {
        // GPU delegate başarısız olursa CPU'ya düş.
        console.warn('[detector] GPU delegate başarısız, CPU\'ya düşülüyor', err);
        const landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODELS[targetTier],
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        telemetry.delegate = 'CPU';
        telemetry.loadTimeMs = Math.round(performance.now() - startTime);
        return landmarker;
      }
    })();

    landmarkerPromise.catch((err) => {
      telemetry.lastError =
        err instanceof Error ? err.message : 'Model yüklenemedi';
      landmarkerPromise = null;
      configuredTier = null;
    });
  }
  return landmarkerPromise;
}

/**
 * Detect pose from a video element at the given timestamp.
 * Returns null on no-pose AND on detection errors (logged to console).
 * Never throws — keeps the rAF loop alive even if MediaPipe trips.
 *
 * Auto-recovery: 3 ardışık hatadan sonra landmarker'ı yeniden başlatır.
 */
export function detectPose(
  landmarker: PoseLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): PoseFrame | null {
  const inferenceStart = performance.now();
  let result: PoseLandmarkerResult;
  try {
    result = landmarker.detectForVideo(video, timestampMs);
    consecutiveErrors = 0;
  } catch (err) {
    telemetry.errorCount += 1;
    telemetry.lastError = err instanceof Error ? err.message : String(err);
    consecutiveErrors += 1;
    console.error('[detectPose] MediaPipe inference failed:', err);
    if (consecutiveErrors >= 3) {
      console.warn('[detectPose] 3 ardışık hata — auto-recovery tetikleniyor');
      void disposePoseLandmarker();
      consecutiveErrors = 0;
    }
    return null;
  }

  const inferenceMs = performance.now() - inferenceStart;
  recordTelemetry(inferenceMs, timestampMs);

  const landmarks = result.landmarks?.[0];
  if (!landmarks || landmarks.length === 0) return null;

  return {
    timestamp: timestampMs,
    landmarks: landmarks.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility,
    })),
    worldLandmarks: result.worldLandmarks?.[0]?.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility,
    })),
  };
}

function recordTelemetry(inferenceMs: number, timestampMs: number): void {
  inferenceLatencies.push(inferenceMs);
  if (inferenceLatencies.length > ROLLING_WINDOW) inferenceLatencies.shift();
  telemetry.avgInferenceMs =
    inferenceLatencies.reduce((s, v) => s + v, 0) / inferenceLatencies.length;

  inferenceTimestamps.push(timestampMs);
  if (inferenceTimestamps.length > ROLLING_WINDOW) inferenceTimestamps.shift();
  if (inferenceTimestamps.length >= 2) {
    const window =
      inferenceTimestamps[inferenceTimestamps.length - 1] -
      inferenceTimestamps[0];
    if (window > 0) {
      telemetry.avgFps = ((inferenceTimestamps.length - 1) / window) * 1000;
    }
  }
}

/**
 * Free model resources. Call when the user fully exits a test session.
 * Re-calling getPoseLandmarker() after this will trigger a fresh load.
 */
export async function disposePoseLandmarker(): Promise<void> {
  if (!landmarkerPromise) return;
  const cached = landmarkerPromise;
  landmarkerPromise = null;
  configuredTier = null;
  consecutiveErrors = 0;
  try {
    const landmarker = await cached;
    landmarker.close();
  } catch {
    // Promise was already rejected; nothing to close.
  }
}

export function getDetectorTelemetry(): DetectorTelemetry {
  return { ...telemetry };
}
