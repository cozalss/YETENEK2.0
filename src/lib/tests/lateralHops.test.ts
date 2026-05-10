/**
 * lateralHops persentil testleri.
 */

import { describe, expect, it } from 'vitest';
import { lateralHopsPercentile, lateralHopsScore } from './lateralHops';

describe('lateralHopsPercentile', () => {
  it('mean ~50. persentil', () => {
    // 12 yaş erkek mean=18
    const p = lateralHopsPercentile(18, 12, 'male');
    expect(p).toBeGreaterThan(45);
    expect(p).toBeLessThan(55);
  });

  it('+1 SD ~84. persentil', () => {
    // 12 yaş erkek mean=18, sd=3.8 → 21.8
    const p = lateralHopsPercentile(21.8, 12, 'male');
    expect(p).toBeGreaterThan(80);
    expect(p).toBeLessThan(88);
  });

  it('lateralHopsScore == percentile (backward-compat)', () => {
    expect(lateralHopsScore(18, 12, 'male')).toBe(
      lateralHopsPercentile(18, 12, 'male')
    );
  });

  it('1..99 clamp', () => {
    expect(lateralHopsPercentile(0, 12, 'male')).toBeGreaterThanOrEqual(1);
    expect(lateralHopsPercentile(100, 12, 'male')).toBeLessThanOrEqual(99);
  });
});
