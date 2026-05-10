/**
 * Endurance jumping jacks analiz testleri.
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeEnduranceJacks,
  type JackSample,
} from './enduranceJacks';

/**
 * Saniyede `repsPerSec` tekrarda 30sn'lik jack serisi sentezler.
 * Her döngü = 1 frame jack açık + 1 frame jack kapalı (basit).
 */
function jackSeries(opts: {
  durationMs?: number;
  cycleMs?: number;
  /** Sonlara doğru azalma faktörü (1 = sabit, 0.5 = yarıya düşer) */
  decay?: number;
}): JackSample[] {
  const durationMs = opts.durationMs ?? 30_000;
  const cycleMs = opts.cycleMs ?? 1000;
  const decay = opts.decay ?? 1;
  const out: JackSample[] = [];
  let cycleStart = 0;
  while (cycleStart < durationMs) {
    // Yorgunlukla cycle uzar
    const ratio = cycleStart / durationMs;
    const adjustedCycle = cycleMs * (1 + (1 - decay) * ratio);
    const halfCycle = adjustedCycle / 2;

    // Açık state (jack)
    out.push({ t: cycleStart, armsUp: true, legsApart: true });
    out.push({ t: cycleStart + 33, armsUp: true, legsApart: true });

    // Kapalı state
    out.push({
      t: cycleStart + halfCycle,
      armsUp: false,
      legsApart: false,
    });
    out.push({
      t: cycleStart + halfCycle + 33,
      armsUp: false,
      legsApart: false,
    });

    cycleStart += adjustedCycle;
  }
  return out;
}

describe('analyzeEnduranceJacks', () => {
  it('60 frame altı invalid', () => {
    const r = analyzeEnduranceJacks([]);
    expect(r.valid).toBe(false);
    expect(r.totalReps).toBe(0);
  });

  it('hareketsiz seri (hep kapalı) → 0 rep', () => {
    const samples: JackSample[] = [];
    for (let t = 0; t < 30_000; t += 33) {
      samples.push({ t, armsUp: false, legsApart: false });
    }
    const r = analyzeEnduranceJacks(samples);
    expect(r.totalReps).toBe(0);
    expect(r.valid).toBe(false);
  });

  it('1 sn cycle → 30sn de ~30 tekrar', () => {
    const r = analyzeEnduranceJacks(jackSeries({ cycleMs: 1000 }));
    expect(r.valid).toBe(true);
    expect(r.totalReps).toBeGreaterThan(25);
    expect(r.totalReps).toBeLessThan(35);
  });

  it('decay 0.5 → last5s reps belirgin düşer', () => {
    const r = analyzeEnduranceJacks(jackSeries({ cycleMs: 1000, decay: 0.5 }));
    expect(r.valid).toBe(true);
    expect(r.first5sReps).toBeGreaterThan(0);
    expect(r.decayPercent).toBeGreaterThan(0);
  });

  it('totalReps 3\'ten az ise valid=false', () => {
    // 2 jack: aç-kapa-aç-kapa
    const samples: JackSample[] = [
      { t: 0, armsUp: false, legsApart: false },
      { t: 100, armsUp: true, legsApart: true },
      { t: 200, armsUp: false, legsApart: false },
      { t: 300, armsUp: true, legsApart: true },
      { t: 400, armsUp: false, legsApart: false },
    ];
    // Pad with closed frames to reach 60+ samples
    for (let t = 500; t < 5000; t += 50) {
      samples.push({ t, armsUp: false, legsApart: false });
    }
    const r = analyzeEnduranceJacks(samples);
    expect(r.valid).toBe(false);
    expect(r.totalReps).toBeLessThan(3);
  });

  it('rep saymak için armsUp + legsApart ikisi de true olmalı', () => {
    const samples: JackSample[] = [];
    for (let t = 0; t < 5000; t += 100) {
      // Sadece armsUp aktif, legsApart hep false
      samples.push({ t, armsUp: t % 1000 < 500, legsApart: false });
    }
    const r = analyzeEnduranceJacks(samples);
    expect(r.totalReps).toBe(0);
  });
});
