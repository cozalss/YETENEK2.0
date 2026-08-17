/**
 * Anahtar kare seçimi testleri.
 *
 * SVG render testleri kaldırıldı — o render artık yok (OpenAI SVG kabul
 * etmiyor). Gizlilik sözleşmesi testleri `skeleton-png.test.ts` içinde,
 * yani gerçekten gönderilen biçimin üzerinde.
 */

import { describe, expect, it } from 'vitest';
import { POSE_LANDMARKS, type Keypoint, type PoseFrame } from '@/types';
import { selectKeyframes } from './skeleton-render';

function frame(overrides: Record<number, Partial<Keypoint>> = {}): PoseFrame {
  const landmarks: Keypoint[] = Array.from({ length: 33 }, (_, i) => ({
    x: 0.5,
    y: 0.3 + (i / 33) * 0.6,
    z: 0,
    visibility: 0.9,
  }));
  for (const [k, v] of Object.entries(overrides)) {
    landmarks[Number(k)] = { ...landmarks[Number(k)], ...v };
  }
  return { timestamp: 0, landmarks };
}

describe('selectKeyframes', () => {
  const frames = Array.from({ length: 120 }, (_, i) => {
    // Kalça Y: ortada tepe yapan bir yay (apex ~60. kare).
    const y = 0.6 - 0.15 * Math.sin((i / 120) * Math.PI);
    return frame({
      [POSE_LANDMARKS.LEFT_HIP]: { y },
      [POSE_LANDMARKS.RIGHT_HIP]: { y },
    });
  });

  it('varsayılan olarak 6 kare seçer', () => {
    expect(selectKeyframes(frames)).toHaveLength(6);
  });

  it('kare sayısı 8 ile sınırlı — maliyet kontrolü', () => {
    expect(selectKeyframes(frames, 50).length).toBeLessThanOrEqual(8);
  });

  it('zaman sırasını korur', () => {
    const idx = selectKeyframes(frames).map((k) => k.index);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('apex fazını işaretler', () => {
    const phases = selectKeyframes(frames).map((k) => k.phase);
    expect(phases).toContain('apex');
    expect(phases).toContain('setup');
    expect(phases).toContain('end');
  });

  it('girdi kısa ise hepsini döndürür', () => {
    expect(selectKeyframes(frames.slice(0, 3))).toHaveLength(3);
  });

  it('boş girdide boş döner', () => {
    expect(selectKeyframes([])).toHaveLength(0);
  });
});
