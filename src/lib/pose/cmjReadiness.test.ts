/**
 * CMJ başlatma kapıları — sensörsüz ortamda sessiz atlama.
 */

import { describe, expect, it } from 'vitest';
import { checkCmjReadiness } from '@/lib/pose/cmjReadiness';
import { POSE_LANDMARKS, type Keypoint, type PoseFrame } from '@/types';

function readyFrame(): PoseFrame {
  const landmarks: Keypoint[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.95,
  }));
  const put = (i: number, x: number, y: number) => {
    landmarks[i] = { x, y, visibility: 0.95 };
  };
  put(POSE_LANDMARKS.LEFT_SHOULDER, 0.42, 0.22);
  put(POSE_LANDMARKS.RIGHT_SHOULDER, 0.58, 0.22);
  put(POSE_LANDMARKS.LEFT_HIP, 0.45, 0.52);
  put(POSE_LANDMARKS.RIGHT_HIP, 0.55, 0.52);
  put(POSE_LANDMARKS.LEFT_KNEE, 0.46, 0.72);
  put(POSE_LANDMARKS.RIGHT_KNEE, 0.54, 0.72);
  put(POSE_LANDMARKS.LEFT_ANKLE, 0.46, 0.9);
  put(POSE_LANDMARKS.RIGHT_ANKLE, 0.54, 0.9);
  put(POSE_LANDMARKS.LEFT_WRIST, 0.4, 0.52);
  put(POSE_LANDMARKS.RIGHT_WRIST, 0.6, 0.52);
  return { timestamp: 0, landmarks };
}

describe('checkCmjReadiness', () => {
  it('kare yokken hazır değil — throw yok', () => {
    const s = checkCmjReadiness(null, { tiltOk: null, scene: null });
    expect(s.ready).toBe(false);
  });

  it('eğim/ışık yokken (CI) kapı atlanır, duruş yeterse hazır', () => {
    const s = checkCmjReadiness(readyFrame(), { tiltOk: null, scene: null });
    expect(s.ready).toBe(true);
  });

  it('eller belde değilse başlatmayı kilitler', () => {
    const f = readyFrame();
    f.landmarks[POSE_LANDMARKS.LEFT_WRIST] = { x: 0.4, y: 0.2, visibility: 0.95 };
    f.landmarks[POSE_LANDMARKS.RIGHT_WRIST] = { x: 0.6, y: 0.2, visibility: 0.95 };
    const s = checkCmjReadiness(f, { tiltOk: null, scene: null });
    expect(s.ready).toBe(false);
    expect(s.hint.toLowerCase()).toMatch(/el/);
  });

  it('eğim kapısı false ise kilitler; skipped (null) ise kilitlemez', () => {
    expect(checkCmjReadiness(readyFrame(), { tiltOk: false, scene: null }).ready).toBe(
      false
    );
    expect(checkCmjReadiness(readyFrame(), { tiltOk: null, scene: null }).ready).toBe(
      true
    );
  });
});
