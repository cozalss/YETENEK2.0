/**
 * Lesson validator testleri — pure runtime davranışı.
 *
 * Test stratejisi: synthetic PoseFrame stream üretip her validator'ın
 * doğru state geçişlerini yaptığını doğrula.
 */

import { describe, expect, it } from 'vitest';
import { POSE_LANDMARKS } from '@/types';
import type { Keypoint, PoseFrame } from '@/types';
import { createValidator } from './validators';
import type { ValidatorConfig } from './types';

/** 33 landmark default — visibility 1, sabit poz. */
function buildFrame(
  timestamp: number,
  overrides: Partial<Record<number, Partial<Keypoint>>> = {},
): PoseFrame {
  const landmarks: Keypoint[] = Array.from({ length: 33 }, (_, i) => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
    ...overrides[i],
  }));
  return { timestamp, landmarks };
}

/** Hip merkezini (LEFT_HIP, RIGHT_HIP) verilen Y'ye yerleştirir. */
function frameWithHipY(timestamp: number, y: number): PoseFrame {
  return buildFrame(timestamp, {
    [POSE_LANDMARKS.LEFT_HIP]: { y, x: 0.45 },
    [POSE_LANDMARKS.RIGHT_HIP]: { y, x: 0.55 },
  });
}

describe('staticPose validator', () => {
  it('sabit frame stream\'i → 3 sn sonra completed', () => {
    const config: ValidatorConfig = {
      type: 'staticPose',
      holdMs: 3000,
      subject: 'fullBody',
    };
    const v = createValidator(config);

    // 100 frame × 33ms ≈ 3300ms. Hepsi sabit hip pozisyonunda.
    let lastState = v.state();
    for (let i = 0; i < 110; i++) {
      lastState = v.observe(frameWithHipY(i * 33, 0.5));
    }
    expect(lastState.status).toBe('completed');
    expect(lastState.progress).toBe(1);
  });

  it('hareket varsa → in_progress kalır, completed olmaz', () => {
    const config: ValidatorConfig = {
      type: 'staticPose',
      holdMs: 3000,
      subject: 'fullBody',
    };
    const v = createValidator(config);

    let lastState = v.state();
    for (let i = 0; i < 110; i++) {
      // Hip her frame'de farklı yerde → büyük varyans, asla stabil sayılmaz.
      const y = 0.4 + (i % 5) * 0.05;
      lastState = v.observe(frameWithHipY(i * 33, y));
    }
    expect(lastState.status).not.toBe('completed');
  });

  it('reset() state\'i sıfırlar', () => {
    const v = createValidator({
      type: 'staticPose',
      holdMs: 3000,
      subject: 'fullBody',
    });
    for (let i = 0; i < 110; i++) v.observe(frameWithHipY(i * 33, 0.5));
    expect(v.state().status).toBe('completed');
    v.reset();
    expect(v.state().status).toBe('pending');
    expect(v.state().progress).toBe(0);
  });
});

describe('verticalRep validator', () => {
  it('3 jump deltası → 3 rep tamamlanır', () => {
    const config: ValidatorConfig = {
      type: 'verticalRep',
      pattern: 'jumpUp',
      reps: 3,
    };
    const v = createValidator(config);

    let lastState = v.state();
    let t = 0;

    // 15 frame kalibrasyon (hip Y = 0.5 — baseline)
    for (let i = 0; i < 15; i++, t += 33) lastState = v.observe(frameWithHipY(t, 0.5));

    // 3 tekrarlı sıçrama: aşağı (yukarı sıçra: hip Y küçülür) → yukarı geri.
    for (let rep = 0; rep < 3; rep++) {
      // 5 frame yukarıda (extreme — hip Y küçük, yani sıçrama yüksek)
      for (let i = 0; i < 5; i++, t += 33) lastState = v.observe(frameWithHipY(t, 0.38));
      // 5 frame baseline'a dön
      for (let i = 0; i < 5; i++, t += 33) lastState = v.observe(frameWithHipY(t, 0.5));
    }
    expect(lastState.status).toBe('completed');
    expect(lastState.reps).toBe(3);
  });
});

describe('reach validator', () => {
  it('rightAnkle yukarı 3 tekrar → completed', () => {
    const config: ValidatorConfig = {
      type: 'reach',
      landmark: 'rightAnkle',
      direction: 'up',
      threshold: 0.15,
      reps: 3,
    };
    const v = createValidator(config);

    let lastState = v.state();
    let t = 0;

    // Kalibrasyon: rightAnkle baseline y=0.9 (ayak yerde)
    for (let i = 0; i < 15; i++, t += 33) {
      lastState = v.observe(
        buildFrame(t, {
          [POSE_LANDMARKS.RIGHT_ANKLE]: { y: 0.9, x: 0.6 },
        }),
      );
    }

    // 3 tekrar: ayak yukarı kalkar (y küçülür) → tekrar yere iner.
    for (let rep = 0; rep < 3; rep++) {
      // Tekme (up: baseline.y - point.y > threshold; baseline.y=0.9, point.y=0.7 → 0.2 > 0.15 ✓)
      lastState = v.observe(
        buildFrame(t, {
          [POSE_LANDMARKS.RIGHT_ANKLE]: { y: 0.7, x: 0.6 },
        }),
      );
      t += 33;
      // Geri in (baseline'a yakın)
      lastState = v.observe(
        buildFrame(t, {
          [POSE_LANDMARKS.RIGHT_ANKLE]: { y: 0.88, x: 0.6 },
        }),
      );
      t += 33;
    }

    expect(lastState.status).toBe('completed');
    expect(lastState.reps).toBe(3);
  });
});

describe('demo validator', () => {
  it('N ms geçince completed', () => {
    const v = createValidator({ type: 'demo', durationMs: 1000 });
    expect(v.observe(buildFrame(0)).status).toBe('in_progress');
    expect(v.observe(buildFrame(500)).status).toBe('in_progress');
    expect(v.observe(buildFrame(1200)).status).toBe('completed');
  });
});
