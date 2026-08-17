/**
 * MediaPipe VIDEO timestamp monotonluğu.
 *
 * Kamera remount'unda mediaTime 0'a döner; singleton landmarker geriye
 * giden ts kabul etmez. Bu dosya detectPose'un kullandığı saati kilitler.
 */

import { describe, expect, it } from 'vitest';
import {
  disposePoseLandmarker,
  monotonicVideoTimestamp,
} from './detector';

describe('monotonicVideoTimestamp', () => {
  it('geriye giden mediaTime grafiği kırmaz — ts artmaya devam eder', async () => {
    await disposePoseLandmarker();
    const a = monotonicVideoTimestamp(12_000);
    const b = monotonicVideoTimestamp(0);
    const c = monotonicVideoTimestamp(33);
    expect(a).toBe(12_000);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});
