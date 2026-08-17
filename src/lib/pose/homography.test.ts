/**
 * Homografi çekirdek testleri.
 *
 * Zemindeki A4'ten kurulan homografi tüm metrik ölçümün ve açı çıkarımının
 * temeli. Sessizce kırılırsa "kamera açısı" ve broad-jump mesafesi yanlış olur
 * ve hiçbir şey uyarmaz. Bu yüzden bilinen bir kameradan A4 köşeleri projekte
 * edilir, homografi geri kurulur ve hem köşe tur-round'u hem A4 kenar uzunlukları
 * (210/297 mm) geri kazanılır.
 */

import { describe, expect, it } from 'vitest';
import {
  A4_CORNERS_MM,
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  applyHomography,
  homographyFromCorrespondences,
  invertMat3,
  metricDistanceOnFloor,
  type Correspondence,
  type Mat3,
  type Vec2,
} from './homography';

/** Z-Y-X dönüş matrisi (satır-öncelikli). */
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

/** H = K · [r1 r2 t], h33'e normalize. */
function buildHomography(
  K: Mat3,
  R: Mat3,
  t: readonly [number, number, number]
): Mat3 {
  const M: Mat3 = [R[0], R[1], t[0], R[3], R[4], t[1], R[6], R[7], t[2]];
  const H = mul(K, M);
  return H.map((v) => v / H[8]) as unknown as Mat3;
}

const K: Mat3 = [900, 0, 640, 0, 900, 360, 0, 0, 1];

function projectCorners(H: Mat3): Correspondence[] {
  return A4_CORNERS_MM.map((floor) => ({
    floor,
    image: applyHomography(H, floor),
  }));
}

describe('homographyFromCorrespondences', () => {
  it('düz bakan kamerada köşeleri tam geri kazanır', () => {
    const R = rotZYX(0, 0, 0);
    const Hgt = buildHomography(K, R, [-105, -148, 2000]);
    const pts = projectCorners(Hgt);
    const H = homographyFromCorrespondences(pts);
    expect(H).not.toBeNull();
    for (const { floor, image } of pts) {
      const [x, y] = applyHomography(H as Mat3, floor);
      expect(x).toBeCloseTo(image[0], 3);
      expect(y).toBeCloseTo(image[1], 3);
    }
  });

  it('eğik kamerada A4 kenar uzunluklarını (210/297 mm) geri verir', () => {
    const R = rotZYX(4, 18, 3);
    const Hgt = buildHomography(K, R, [-140, -160, 2400]);
    const pts = projectCorners(Hgt);
    const H = homographyFromCorrespondences(pts) as Mat3;
    const Hinv = invertMat3(H) as Mat3;
    expect(Hinv).not.toBeNull();

    const [tl, tr, br, bl] = pts.map((p) => p.image) as [
      Vec2,
      Vec2,
      Vec2,
      Vec2,
    ];
    expect(metricDistanceOnFloor(Hinv, tl, tr)).toBeCloseTo(A4_WIDTH_MM, 1);
    expect(metricDistanceOnFloor(Hinv, tr, br)).toBeCloseTo(A4_HEIGHT_MM, 1);
    expect(metricDistanceOnFloor(Hinv, br, bl)).toBeCloseTo(A4_WIDTH_MM, 1);
  });

  it('4 noktadan az verilirse null döner', () => {
    expect(homographyFromCorrespondences([])).toBeNull();
    expect(
      homographyFromCorrespondences([{ floor: [0, 0], image: [0, 0] }])
    ).toBeNull();
  });

  it('kolineer zemin köşelerinde (dejenere) null döner', () => {
    // Dört zemin noktası tek doğru üzerinde → DLT sistemi tekil.
    const pts: Correspondence[] = [
      { floor: [0, 0], image: [10, 10] },
      { floor: [100, 0], image: [120, 40] },
      { floor: [200, 0], image: [230, 70] },
      { floor: [300, 0], image: [340, 100] },
    ];
    expect(homographyFromCorrespondences(pts)).toBeNull();
  });
});

describe('invertMat3', () => {
  it('tekil matriste null döner', () => {
    expect(invertMat3([1, 2, 3, 2, 4, 6, 3, 6, 9])).toBeNull();
  });
});
