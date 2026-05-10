/**
 * Keypoint utility functions used across all 3 tests.
 */

import type { Keypoint, PoseFrame } from '@/types';
import { POSE_LANDMARKS } from '@/types';

/**
 * Mid-point between left and right hip — used as the body's vertical reference
 * for jump height (more stable than nose or shoulder during fast motion).
 *
 * Returns null if either hip keypoint is missing — callers must handle this
 * (otherwise undefined.x would throw and kill the rAF loop).
 */
export function getHipCenter(frame: PoseFrame): Keypoint | null {
  const left = frame.landmarks[POSE_LANDMARKS.LEFT_HIP];
  const right = frame.landmarks[POSE_LANDMARKS.RIGHT_HIP];
  if (!left || !right) return null;
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    z: left.z != null && right.z != null ? (left.z + right.z) / 2 : undefined,
    visibility:
      left.visibility != null && right.visibility != null
        ? Math.min(left.visibility, right.visibility)
        : undefined,
  };
}

export function getShoulderCenter(frame: PoseFrame): Keypoint | null {
  const left = frame.landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const right = frame.landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  if (!left || !right) return null;
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    z: left.z != null && right.z != null ? (left.z + right.z) / 2 : undefined,
  };
}

/**
 * Visibility-aware check: a frame is "usable" only when the points we care about
 * are confidently visible. Loose threshold by default (0.5) to keep recall high.
 */
export function hasVisibleLandmarks(
  frame: PoseFrame,
  indices: number[],
  minVisibility = 0.5
): boolean {
  return indices.every((i) => {
    const lm = frame.landmarks[i];
    return lm != null && (lm.visibility ?? 1) >= minVisibility;
  });
}

/**
 * Distance between two keypoints in normalized image coordinates.
 * NOT in pixels or meters — useful for ratios but not absolute measurement.
 */
export function distance2D(a: Keypoint, b: Keypoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Variance of a series of values — used for balance scoring (lower variance = steadier).
 */
export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return sq / values.length;
}

export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

/**
 * Simple moving-average smoother — kills frame-to-frame jitter from MediaPipe.
 * Window of 5 is a reasonable default at 30fps (~165ms latency).
 */
export function smoothSeries(values: number[], window = 5): number[] {
  if (values.length === 0) return [];
  const smoothed: number[] = [];
  const half = Math.floor(window / 2);
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    const slice = values.slice(start, end);
    smoothed.push(slice.reduce((s, v) => s + v, 0) / slice.length);
  }
  return smoothed;
}

/**
 * Estimate the pixel-to-cm scale from body height in the frame.
 * Uses the head-to-ankle distance compared to the child's known height in cm.
 *
 * Returns "cm per normalized unit" — multiply normalized deltas by this to get cm.
 *
 * NOT: Bu sadece worldLandmarks yoksa kullanılır. World landmarks varsa
 * `getCmPerUnitWithCalibration()` veya direkt world delta tercih edilmeli.
 *
 * Caveats: assumes the child stands roughly upright when this is sampled.
 * Best invoked at the start of a test on a calibration frame.
 */
export function estimateScaleCmPerUnit(
  frame: PoseFrame,
  knownHeightCm: number
): number | null {
  const nose = frame.landmarks[POSE_LANDMARKS.NOSE];
  const leftAnkle = frame.landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = frame.landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  if (!nose || !leftAnkle || !rightAnkle) return null;
  const ankleY = Math.max(leftAnkle.y, rightAnkle.y);
  const bodyHeightUnits = Math.abs(ankleY - nose.y);
  if (bodyHeightUnits < 0.1) return null; // Implausibly compressed — likely a bad frame.
  // Top of head is roughly 8-10% above the nose — adjust:
  const adjustedHeightUnits = bodyHeightUnits * 1.1;
  return knownHeightCm / adjustedHeightUnits;
}

/**
 * World landmarks (meter cinsinden) varsa, normalize Y delta'sını cm'e
 * çevirmek için anlık cmPerUnit hesaplar — kullanıcı boyu girmeden bile
 * çalışır.
 *
 * Strateji:
 *   1. World hip-ankle dikey mesafesi (m) → çocuğun fiziksel boy alt-yarısı.
 *   2. Aynı keypoint'lerin normalize Y mesafesi (image space).
 *   3. Oran = world_dist (m) / normalized_dist → m per unit, ×100 = cm/unit.
 *
 * Avantaj: kullanıcı boyu girmemiş bile olsa CMJ ve broad jump cm cinsinden
 * gerçek doğru değer üretiyor (worldLandmarks zaten metrik kalibrasyonlu).
 */
export function getCmPerUnitFromWorld(frame: PoseFrame): number | null {
  if (!frame.worldLandmarks || frame.worldLandmarks.length < 33) return null;
  const wHip = midPoint(
    frame.worldLandmarks[POSE_LANDMARKS.LEFT_HIP],
    frame.worldLandmarks[POSE_LANDMARKS.RIGHT_HIP]
  );
  const wAnkle = midPoint(
    frame.worldLandmarks[POSE_LANDMARKS.LEFT_ANKLE],
    frame.worldLandmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  );
  const nHip = midPoint(
    frame.landmarks[POSE_LANDMARKS.LEFT_HIP],
    frame.landmarks[POSE_LANDMARKS.RIGHT_HIP]
  );
  const nAnkle = midPoint(
    frame.landmarks[POSE_LANDMARKS.LEFT_ANKLE],
    frame.landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  );
  if (!wHip || !wAnkle || !nHip || !nAnkle) return null;
  const worldVerticalMeters = Math.abs(wAnkle.y - wHip.y);
  const normalizedVertical = Math.abs(nAnkle.y - nHip.y);
  if (worldVerticalMeters < 0.2 || normalizedVertical < 0.05) return null;
  return (worldVerticalMeters * 100) / normalizedVertical;
}

function midPoint(a?: Keypoint, b?: Keypoint): Keypoint | null {
  if (!a || !b) return null;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: a.z != null && b.z != null ? (a.z + b.z) / 2 : undefined,
    visibility:
      a.visibility != null && b.visibility != null
        ? Math.min(a.visibility, b.visibility)
        : undefined,
  };
}

/**
 * Adaptif cmPerUnit: önce world landmarks ile dene; yoksa boy bazlı
 * fallback. Test modüllerinin direkt çağırması için tek sade API.
 */
export function getCmPerUnit(
  frame: PoseFrame,
  knownHeightCm: number | null
): number | null {
  const fromWorld = getCmPerUnitFromWorld(frame);
  if (fromWorld != null) return fromWorld;
  if (knownHeightCm == null) return null;
  return estimateScaleCmPerUnit(frame, knownHeightCm);
}
