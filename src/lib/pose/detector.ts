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
import { logger } from '@/shared/logger/logger';

const log = logger.child('pose-detector');

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
/** `close()` sonrası detectForVideo çağrılmasın diye canlı referans ayrı tutulur. */
let liveLandmarker: PoseLandmarker | null = null;
let configuredTier: ModelTier | null = null;
let consecutiveErrors = 0;
/** In-flight create'i dispose ile yarıştırmamak için. */
let loadGeneration = 0;
let recoverPromise: Promise<void> | null = null;
/**
 * MediaPipe VIDEO modu zaman damgasının **sürekli artmasını** ister.
 * Kamera her testte yeniden bağlanınca `video.mediaTime` 0'a döner; singleton
 * landmarker ise önceki testin son ts'ini hatırlar. Geriye giden ts grafiği
 * bozar (`StartRun` öncesi paket) ve overlay kaybolur — tam akışta bu,
 * kamerasız reaksiyon/koordinasyondan sonra gelen dayanıklılık testinde
 * ortaya çıkar.
 */
let lastMpTimestamp = -1;

/**
 * MediaPipe'a verilecek monoton ts. `hint` (video mediaTime) geriye giderse
 * bir önceki değerden +1 devam eder — grafiği öldürmemek için.
 */
export function monotonicVideoTimestamp(hintMs: number): number {
  const t = hintMs > lastMpTimestamp ? hintMs : lastMpTimestamp + 1;
  lastMpTimestamp = t;
  return t;
}

const LANDMARKER_OPTIONS = {
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  outputSegmentationMasks: false,
} as const;

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
    const generation = ++loadGeneration;

    landmarkerPromise = (async () => {
      telemetry.hasWebGPU = await detectWebGPU();
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      const created = await createLandmarker(fileset, targetTier, startTime);
      if (generation !== loadGeneration) {
        created.close();
        throw new Error('Landmarker dispose sırasında yüklendi, atıldı.');
      }
      liveLandmarker = created;
      lastMpTimestamp = -1;
      telemetry.lastError = null;
      return created;
    })();

    landmarkerPromise.catch((err) => {
      telemetry.lastError =
        err instanceof Error ? err.message : 'Model yüklenemedi';
      if (generation === loadGeneration) {
        landmarkerPromise = null;
        configuredTier = null;
        liveLandmarker = null;
      }
    });
  }
  return landmarkerPromise;
}

async function createLandmarker(
  fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  tier: ModelTier,
  startTime: number
): Promise<PoseLandmarker> {
  try {
    const landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODELS[tier],
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      ...LANDMARKER_OPTIONS,
    });
    telemetry.delegate = 'GPU';
    telemetry.loadTimeMs = Math.round(performance.now() - startTime);
    return landmarker;
  } catch (err) {
    log.warn('GPU delegate başarısız, CPU\'ya düşülüyor', {
      cause: err instanceof Error ? err.message : String(err),
    });
    const landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODELS[tier],
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      ...LANDMARKER_OPTIONS,
    });
    telemetry.delegate = 'CPU';
    telemetry.loadTimeMs = Math.round(performance.now() - startTime);
    return landmarker;
  }
}

/**
 * Detect pose from a video element at the given timestamp.
 * Returns null on no-pose AND on detection errors (logged to console).
 * Never throws — keeps the rAF loop alive even if MediaPipe trips.
 *
 * Landmarker kapanmışsa (dispose / recovery) sessizce null döner — kapalı
 * grafiğe paket basmak `StartRun` öncesi hata yağmuruna yol açıyordu.
 *
 * Auto-recovery: 3 ardışık hatadan sonra landmarker yeniden yüklenir.
 * Döngü her karede canlı instance'ı okur; kapanmış referansı tutmaz.
 */
export function detectPose(
  video: HTMLVideoElement,
  timestampMs: number
): PoseFrame | null {
  const landmarker = liveLandmarker;
  if (!landmarker) return null;

  const inferenceStart = performance.now();
  const mpTs = monotonicVideoTimestamp(timestampMs);
  let result: PoseLandmarkerResult;
  try {
    result = landmarker.detectForVideo(video, mpTs);
    consecutiveErrors = 0;
  } catch (err) {
    telemetry.errorCount += 1;
    telemetry.lastError = err instanceof Error ? err.message : String(err);
    consecutiveErrors += 1;
    if (consecutiveErrors <= 3) {
      log.error('MediaPipe inference failed', {
        cause: err instanceof Error ? err.message : String(err),
        consecutiveErrors,
      });
    }
    if (consecutiveErrors >= 3) {
      log.warn('3 ardışık hata — auto-recovery tetikleniyor');
      consecutiveErrors = 0;
      void recoverLandmarker();
    }
    return null;
  }

  const inferenceMs = performance.now() - inferenceStart;
  recordTelemetry(inferenceMs, mpTs);

  const landmarks = result.landmarks?.[0];
  if (!landmarks || landmarks.length === 0) return null;

  return {
    // Ölçüm saati video zamanı — MediaPipe'a giden monoton ts değil.
    // Test remount'unda mediaTime 0'a döner; örnek serisi de sıfırdan başlar.
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

function recoverLandmarker(): Promise<void> {
  if (recoverPromise) return recoverPromise;
  recoverPromise = (async () => {
    await disposePoseLandmarker();
    try {
      await getPoseLandmarker();
    } catch (err) {
      log.error('auto-recovery yükleme başarısız', {
        cause: err instanceof Error ? err.message : String(err),
      });
    }
  })().finally(() => {
    recoverPromise = null;
  });
  return recoverPromise;
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
  loadGeneration += 1;
  liveLandmarker = null;
  lastMpTimestamp = -1;
  consecutiveErrors = 0;
  if (!landmarkerPromise) return;
  const cached = landmarkerPromise;
  landmarkerPromise = null;
  configuredTier = null;
  inferenceLatencies.length = 0;
  inferenceTimestamps.length = 0;
  telemetry.avgInferenceMs = 0;
  telemetry.avgFps = 0;
  telemetry.errorCount = 0;
  telemetry.lastError = null;
  try {
    const landmarker = await cached;
    landmarker.close();
  } catch (err) {
    log.debug('dispose: cached landmarker promise reject olmuş', {
      cause: err instanceof Error ? err.message : String(err),
    });
  }
}

export function getDetectorTelemetry(): DetectorTelemetry {
  return { ...telemetry };
}
