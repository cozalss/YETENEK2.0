/**
 * Kamera pozu testleri.
 *
 * Bilinen açılı bir kameradan A4 köşeleri projekte edilir, homografi kurulur ve
 * `poseFromHomography` özgün eğim/yatıklığı geri kazanmalı. Intrinsics testte
 * kamerayla birebir verildiği için geri kazanım kesin — gerçek dünyada FoV
 * tahmini yüzünden birkaç derece kayar, ama drift (baseline'a göre değişim)
 * yine doğru ölçülür; bu testler o değişimin de tutarlılığını doğrular.
 */

import { describe, expect, it } from 'vitest';
import {
  A4_CORNERS_MM,
  applyHomography,
  homographyFromCorrespondences,
  type Correspondence,
  type Mat3,
} from './homography';
import {
  driftFromBaseline,
  driftToSigmaMultiplier,
  poseFromHomography,
  tiltSigmaMultiplier,
  TILT_SIGMA_FREE_DEG,
  type CameraPose,
  type Intrinsics,
} from './cameraPose';

function rotZYX(yawDeg: number, pitchDeg: number, rollDeg: number): Mat3 {
  const d = Math.PI / 180;
  const cy = Math.cos(yawDeg * d),
    sy = Math.sin(yawDeg * d);
  const cp = Math.cos(pitchDeg * d),
    sp = Math.sin(pitchDeg * d);
  const cr = Math.cos(rollDeg * d),
    sr = Math.sin(rollDeg * d);
  return [
    cy * cp,
    cy * sp * sr - sy * cr,
    cy * sp * cr + sy * sr,
    sy * cp,
    sy * sp * sr + cy * cr,
    sy * sp * cr - cy * sr,
    -sp,
    cp * sr,
    cp * cr,
  ];
}

function mul(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      out[r * 3 + c] =
        a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return out as unknown as Mat3;
}

const INTR: Intrinsics = { fx: 900, fy: 900, cx: 640, cy: 360 };
const K: Mat3 = [INTR.fx, 0, INTR.cx, 0, INTR.fy, INTR.cy, 0, 0, 1];

/** Verilen açıdan A4 köşelerini projekte edip homografiyi geri kurar. */
function homographyFor(yaw: number, pitch: number, roll: number): Mat3 {
  const R = rotZYX(yaw, pitch, roll);
  const M: Mat3 = [R[0], R[1], -105, R[3], R[4], -148, R[6], R[7], 2200];
  const Hgt = mul(K, M);
  const norm = Hgt.map((v) => v / Hgt[8]) as unknown as Mat3;
  const pts: Correspondence[] = A4_CORNERS_MM.map((floor) => ({
    floor,
    image: applyHomography(norm, floor),
  }));
  return homographyFromCorrespondences(pts) as Mat3;
}

describe('poseFromHomography', () => {
  it('düz bakan kamerada açılar ~0', () => {
    const pose = poseFromHomography(homographyFor(0, 0, 0), INTR) as CameraPose;
    expect(pose).not.toBeNull();
    expect(pose.pitchDeg).toBeCloseTo(0, 1);
    expect(pose.rollDeg).toBeCloseTo(0, 1);
    expect(pose.confidence).toBeGreaterThan(0.9);
  });

  it('eğimi (pitch) geri kazanır', () => {
    const pose = poseFromHomography(
      homographyFor(0, 15, 0),
      INTR
    ) as CameraPose;
    expect(pose.pitchDeg).toBeCloseTo(15, 0);
  });

  it('yatıklığı (roll) geri kazanır', () => {
    const pose = poseFromHomography(homographyFor(0, 0, 8), INTR) as CameraPose;
    expect(pose.rollDeg).toBeCloseTo(8, 0);
  });
});

describe('driftFromBaseline', () => {
  const base: CameraPose = {
    pitchDeg: 12,
    rollDeg: 2,
    yawDeg: 0,
    confidence: 1,
  };

  it('sapma yoksa severity ok', () => {
    const d = driftFromBaseline({ ...base }, base);
    expect(d.magnitudeDeg).toBeCloseTo(0, 5);
    expect(d.severity).toBe('ok');
  });

  it('küçük sapma (eşikler arası) minor', () => {
    const d = driftFromBaseline({ ...base, pitchDeg: 17 }, base); // +5°
    expect(d.severity).toBe('minor');
  });

  it('büyük sapma (ekran aç/kapa) major', () => {
    const d = driftFromBaseline({ ...base, pitchDeg: 24 }, base); // +12°
    expect(d.severity).toBe('major');
  });
});

describe('driftToSigmaMultiplier', () => {
  const base: CameraPose = {
    pitchDeg: 0,
    rollDeg: 0,
    yawDeg: 0,
    confidence: 1,
  };

  it('minor eşiğin altında σ çarpanı 1', () => {
    const d = driftFromBaseline({ ...base, pitchDeg: 2 }, base);
    expect(driftToSigmaMultiplier(d)).toBe(1);
  });

  it('sapma büyüdükçe σ çarpanı monoton artar', () => {
    const small = driftToSigmaMultiplier(
      driftFromBaseline({ ...base, pitchDeg: 4 }, base)
    );
    const big = driftToSigmaMultiplier(
      driftFromBaseline({ ...base, pitchDeg: 7 }, base)
    );
    expect(big).toBeGreaterThan(small);
    expect(small).toBeGreaterThan(1);
  });
});

describe('tiltSigmaMultiplier', () => {
  it('serbest bölgede (küçük eğim) ceza yok', () => {
    expect(tiltSigmaMultiplier(0)).toBe(1);
    expect(tiltSigmaMultiplier(TILT_SIGMA_FREE_DEG)).toBe(1);
    expect(tiltSigmaMultiplier(-TILT_SIGMA_FREE_DEG)).toBe(1);
  });

  it('eğim arttıkça σ çarpanı monoton büyür ve tavanla sınırlı', () => {
    const mid = tiltSigmaMultiplier(25);
    const high = tiltSigmaMultiplier(40);
    expect(mid).toBeGreaterThan(1);
    expect(high).toBeGreaterThan(mid);
    expect(tiltSigmaMultiplier(90)).toBeLessThanOrEqual(1.5);
  });
});
