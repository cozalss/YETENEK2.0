/**
 * broadJump persentil ve analiz testleri.
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeBroadJump,
  broadJumpPercentile,
  broadJumpScore,
  type BroadJumpSample,
} from './broadJump';

function flat(durationMs: number, ankleX: number): BroadJumpSample[] {
  const out: BroadJumpSample[] = [];
  for (let t = 0; t < durationMs; t += 33) out.push({ t, ankleX });
  return out;
}

function jump(opts: {
  preMs?: number;
  startX: number;
  endX: number;
  postMs?: number;
}): BroadJumpSample[] {
  const preMs = opts.preMs ?? 1200;
  const postMs = opts.postMs ?? 1200;
  const out: BroadJumpSample[] = [];
  let t = 0;
  for (; t < preMs; t += 33) out.push({ t, ankleX: opts.startX });
  // Anlık geçiş — gerçek atış sonrası ankle yeni konumda stabilize olur
  for (let p = 0; p < postMs; p += 33) {
    out.push({ t: t + p, ankleX: opts.endX });
  }
  return out;
}

describe('analyzeBroadJump', () => {
  it('60 frame altı invalid', () => {
    expect(analyzeBroadJump(flat(1500, 0.4)).valid).toBe(false);
  });

  it('düz hareketsiz seri invalid', () => {
    const r = analyzeBroadJump(flat(3000, 0.4));
    expect(r.valid).toBe(false);
    expect(r.jumpUnits).toBeLessThan(0.01);
  });

  it('belirgin ileri hareket valid', () => {
    const r = analyzeBroadJump(jump({ startX: 0.3, endX: 0.55 }));
    expect(r.valid).toBe(true);
    expect(r.jumpUnits).toBeGreaterThan(0.2);
    expect(r.startX).toBeCloseTo(0.3, 1);
    expect(r.endX).toBeCloseTo(0.55, 1);
  });
});

describe('broadJumpPercentile', () => {
  it('mean değer ~50. persentil', () => {
    // 12 yaş erkek mean=162cm
    const p = broadJumpPercentile(162, 12, 'male');
    expect(p).toBeGreaterThan(45);
    expect(p).toBeLessThan(55);
  });

  it('+1 SD ~84. persentil', () => {
    // 12 yaş erkek mean=162, sd=24 → 186cm
    const p = broadJumpPercentile(186, 12, 'male');
    expect(p).toBeGreaterThan(80);
    expect(p).toBeLessThan(88);
  });

  it('-1 SD ~16. persentil', () => {
    const p = broadJumpPercentile(138, 12, 'male');
    expect(p).toBeGreaterThan(13);
    expect(p).toBeLessThan(20);
  });

  it('1..99 aralığında clamp', () => {
    expect(broadJumpPercentile(10, 12, 'male')).toBeGreaterThanOrEqual(1);
    expect(broadJumpPercentile(500, 12, 'male')).toBeLessThanOrEqual(99);
  });

  it('broadJumpScore == broadJumpPercentile (backward-compat)', () => {
    expect(broadJumpScore(162, 12, 'male')).toBe(
      broadJumpPercentile(162, 12, 'male')
    );
  });
});
