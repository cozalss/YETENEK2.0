'use client';

/**
 * Kamera kalibrasyon hook'u — A4'ten canlı açı okuması + drift takibi.
 *
 * ## Ne yapar
 *
 *   1. Video karesini düşük hızda (~3 Hz) küçültüp detektöre verir. Tespit
 *      pahalı; her karede değil, aralıklarla — idle/tekrar aralarında yeter.
 *   2. A4 bulununca homografi + kamera pozunu (`homography`/`cameraPose`)
 *      hesaplar → canlı `pose` (eğim/yatıklık). Laptop'ta jiroskop olmadığı
 *      için "kamera açısını gösteren algoritma" budur.
 *   3. `lock()` ile o anki pozu **baseline** olarak kilitler. Sonrasında her
 *      okuma baseline'a göre **drift** üretir — ekran aç/kapa anında yakalanır.
 *
 * ## Neden hook
 *
 * Poz matematiği saf ve test edilmiş; tespit adapter'da izole. Hook yalnız
 * ikisini React yaşam döngüsüne bağlar: video örnekleme, interval, state.
 * Karar (hibrit: σ mı, geçersiz mi) burada verilmez — drift'i dışarı verir,
 * tüketici (validity-gate / test bileşeni) politikayı uygular.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CalibrationBaseline,
  CameraReferenceDetector,
  ReferenceQuad,
} from '@/core/ports/camera-reference';
import {
  applyHomography,
  homographyFromCorrespondences,
  invertMat3,
  A4_CORNERS_MM,
  type Correspondence,
} from '@/lib/pose/homography';
import {
  driftFromBaseline,
  intrinsicsFromFov,
  poseFromHomography,
  type CameraPose,
  type DriftReading,
} from '@/lib/pose/cameraPose';
import { logger } from '@/shared/logger/logger';

const log = logger.child('camera-calibration');

/** Tespit örnekleme aralığı (ms). ~3 Hz — pahalı işlemi kısıtlar. */
const SAMPLE_INTERVAL_MS = 320;
/** Tespit için küçültülmüş genişlik (px). Hız/doğruluk dengesi. */
const SAMPLE_WIDTH = 480;
/** Bu güvenin altındaki tespitler yok sayılır (gürültü). */
const MIN_QUAD_CONFIDENCE = 0.15;

export interface CameraCalibrationState {
  /** Son tespit edilen A4 dörtgeni (overlay için). */
  readonly quad: ReferenceQuad | null;
  /** Canlı kamera pozu (kurulum HUD'u için). */
  readonly pose: CameraPose | null;
  /** Kilitli baseline — testler ölçeği/drift referansını buradan alır. */
  readonly baseline: CalibrationBaseline | null;
  /** Baseline'a göre canlı sapma (kilit sonrası). */
  readonly drift: DriftReading | null;
  /** A4 şu an kadrajda ve güvenilir mi. */
  readonly detected: boolean;
}

export interface UseCameraCalibrationOptions {
  /** Anlık video elemanını verir (CameraStream'in ref'i). */
  readonly getVideo: () => HTMLVideoElement | null;
  /** Örnekleme açık mı. Kapalıyken interval durur. */
  readonly active: boolean;
  readonly detector: CameraReferenceDetector;
  /** Kilitliyken drift üretilsin mi (idle fazında true, ölçüm sırasında da). */
  readonly trackDrift?: boolean;
  /**
   * Batarya öncesi kurulumda kilitlenmiş baseline. Verilirse `lock()` çağrısı
   * gerekmeden drift bu referansa göre hesaplanır — testler kalibrasyonu
   * kurulum adımından devralır.
   */
  readonly initialBaseline?: CalibrationBaseline | null;
}

export interface CameraCalibration extends CameraCalibrationState {
  /** O anki pozu baseline olarak kilitler. Poz yoksa null döner. */
  readonly lock: () => CalibrationBaseline | null;
  readonly clearBaseline: () => void;
}

/** Video karesini küçültülmüş RGBA ImageData'ya çevirir. */
function grabImageData(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): ImageData | null {
  if (video.readyState < 2 || video.videoWidth === 0) return null;
  const scale = SAMPLE_WIDTH / video.videoWidth;
  const w = SAMPLE_WIDTH;
  const h = Math.round(video.videoHeight * scale);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

export function useCameraCalibration(
  opts: UseCameraCalibrationOptions
): CameraCalibration {
  const {
    getVideo,
    active,
    detector,
    trackDrift = true,
    initialBaseline,
  } = opts;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const busyRef = useRef(false);
  const baselineRef = useRef<CalibrationBaseline | null>(
    initialBaseline ?? null
  );
  const poseRef = useRef<CameraPose | null>(null);

  const [state, setState] = useState<CameraCalibrationState>({
    quad: null,
    pose: null,
    baseline: initialBaseline ?? null,
    drift: null,
    detected: false,
  });

  // Dışarıdan gelen baseline değişirse (kurulum adımı yeniden kilitlerse) yansıt.
  useEffect(() => {
    if (initialBaseline !== undefined) {
      baselineRef.current = initialBaseline;
      setState((s) => ({ ...s, baseline: initialBaseline }));
    }
  }, [initialBaseline]);

  const lock = useCallback((): CalibrationBaseline | null => {
    const pose = poseRef.current;
    const quad = state.quad;
    if (!pose || !quad) return null;
    const corr: Correspondence[] = A4_CORNERS_MM.map((floor, i) => ({
      floor,
      image: quad.corners[i],
    }));
    const H = homographyFromCorrespondences(corr);
    if (!H) return null;
    const baseline: CalibrationBaseline = {
      pose,
      homography: H,
      intrinsics: intrinsicsFromFov(quad.imageWidth, quad.imageHeight),
      imageWidth: quad.imageWidth,
      imageHeight: quad.imageHeight,
      capturedAt: performance.now(),
      referenceKind: detector.kind,
    };
    baselineRef.current = baseline;
    setState((s) => ({ ...s, baseline, drift: null }));
    log.info('kalibrasyon kilitlendi', {
      pitchDeg: Math.round(pose.pitchDeg),
      rollDeg: Math.round(pose.rollDeg),
    });
    return baseline;
  }, [state.quad, detector.kind]);

  const clearBaseline = useCallback(() => {
    baselineRef.current = null;
    setState((s) => ({ ...s, baseline: null, drift: null }));
  }, []);

  useEffect(() => {
    if (!active) return;
    if (!canvasRef.current)
      canvasRef.current = document.createElement('canvas');

    let cancelled = false;

    const tick = async () => {
      if (cancelled || busyRef.current) return;
      const video = getVideo();
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const image = grabImageData(video, canvas);
      if (!image) return;

      busyRef.current = true;
      try {
        const res = await detector.detect({
          data: image.data,
          width: image.width,
          height: image.height,
        });
        if (cancelled || !res.ok) return;
        const quad = res.value;

        if (!quad || quad.confidence < MIN_QUAD_CONFIDENCE) {
          poseRef.current = null;
          setState((s) => ({ ...s, quad: null, pose: null, detected: false }));
          return;
        }

        const corr: Correspondence[] = A4_CORNERS_MM.map((floor, i) => ({
          floor,
          image: quad.corners[i],
        }));
        const H = homographyFromCorrespondences(corr);
        const pose = H
          ? poseFromHomography(
              H,
              intrinsicsFromFov(quad.imageWidth, quad.imageHeight)
            )
          : null;
        poseRef.current = pose;

        const baseline = baselineRef.current;
        const drift =
          trackDrift && baseline && pose
            ? driftFromBaseline(pose, baseline.pose)
            : null;

        setState((s) => ({ ...s, quad, pose, detected: true, drift }));
      } catch (cause) {
        log.info('kalibrasyon örneklemesi hata', {
          cause: cause instanceof Error ? cause.name : String(cause),
        });
      } finally {
        busyRef.current = false;
      }
    };

    const id = window.setInterval(tick, SAMPLE_INTERVAL_MS);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, getVideo, detector, trackDrift]);

  return {
    ...state,
    lock,
    clearBaseline,
  };
}

/** Baseline'dan zemin metrik ölçeği (mm/px) — merkez civarında. Broad jump için. */
export function baselineMmPerPx(baseline: CalibrationBaseline): number | null {
  const Hinv = invertMat3(baseline.homography);
  if (!Hinv) return null;
  const cx = baseline.imageWidth / 2;
  const cy = baseline.imageHeight / 2;
  // Merkezde 1px yatay kaymanın zemindeki mm karşılığı.
  const a = applyHomography(Hinv, [cx, cy]);
  const b = applyHomography(Hinv, [cx + 1, cy]);
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
