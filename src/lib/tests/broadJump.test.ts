/**
 * broadJump persentil ve analiz testleri.
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeBroadJump,
  broadJumpPercentile,
  broadJumpScore,
  calibrateBroadJump,
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

describe('calibrateBroadJump — mesafe SADECE worldLandmarks üzerinden', () => {
  function jumpWithWorld(opts: {
    startX: number;
    endX: number;
    worldStartX: number;
    worldEndX: number;
  }): BroadJumpSample[] {
    return jump({ startX: opts.startX, endX: opts.endX }).map((s, i, arr) => ({
      ...s,
      // İlk yarı başlangıç penceresinde, ikinci yarı iniş penceresinde —
      // `jump()` yardımcısı zaten anlık geçişli iki blok üretiyor.
      worldAnkleX:
        s.ankleX === arr[0].ankleX ? opts.worldStartX : opts.worldEndX,
    }));
  }

  it('worldLandmarks mevcutsa mesafe dünya-X farkından hesaplanır (dikey oran YOK)', () => {
    const samples = jumpWithWorld({
      startX: 0.3,
      endX: 0.55,
      worldStartX: 0.1,
      worldEndX: 0.52, // 0.42m fark → 42cm
    });
    const analysis = calibrateBroadJump(analyzeBroadJump(samples));
    expect(analysis.valid).toBe(true);
    expect(analysis.jumpDistanceCm).not.toBeNull();
    expect(analysis.jumpDistanceCm).toBeCloseTo(42, 0);
  });

  it('worldLandmarks yoksa mesafe null kalır — yaklaşık sayı uydurulmaz', () => {
    // `jump()` düz kullanımı worldAnkleX taşımıyor.
    const samples = jump({ startX: 0.3, endX: 0.55 });
    const analysis = calibrateBroadJump(analyzeBroadJump(samples));
    expect(analysis.valid).toBe(true);
    expect(analysis.jumpDistanceCm).toBeNull();
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

describe('iniş tespiti — inişten sonra hareket ölçümü bozmamalı', () => {
  /**
   * 6 sn yakalama: 1 sn hazırlık, ~0.5 sn uçuş, iniş, sonra çocuğun
   * doğal davranışı. `endX` eskiden yakalamanın SON 15 karesiydi; bu
   * senaryolarda gerçek atlamalar "yatay hareket yok" diye reddediliyordu.
   */
  function capture(opts: {
    startX: number;
    landX: number;
    /** İnişten sonra çocuğun gittiği yer (geri yürüme / ekstra adım). */
    afterX?: number;
  }): BroadJumpSample[] {
    const out: BroadJumpSample[] = [];
    const step = 33;
    let t = 0;
    const push = (x: number) => {
      out.push({ t, ankleX: x });
      t += step;
    };

    for (let i = 0; i < 30; i++) push(opts.startX); // 1 sn hazır
    for (let i = 0; i < 15; i++) {
      push(opts.startX + ((opts.landX - opts.startX) * (i + 1)) / 15); // uçuş
    }
    for (let i = 0; i < 45; i++) push(opts.landX); // 1.5 sn inişte dur

    if (opts.afterX != null) {
      for (let i = 0; i < 20; i++) {
        push(opts.landX + ((opts.afterX - opts.landX) * (i + 1)) / 20);
      }
      for (let i = 0; i < 70; i++) push(opts.afterX); // kalan süre orada
    } else {
      for (let i = 0; i < 90; i++) push(opts.landX);
    }
    return out;
  }

  it('inişte kalırsa mesafe ölçülür', () => {
    const a = analyzeBroadJump(capture({ startX: 0.25, landX: 0.7 }));
    expect(a.valid).toBe(true);
    expect(a.jumpUnits).toBeCloseTo(0.45, 2);
  });

  it('çocuk başlangıca geri yürürse atlama YİNE geçerli sayılır', () => {
    // Eski davranış: endX ≈ startX → jumpUnits ≈ 0 → "hareket algılanmadı".
    const a = analyzeBroadJump(
      capture({ startX: 0.25, landX: 0.7, afterX: 0.26 })
    );
    expect(a.valid).toBe(true);
    expect(a.jumpUnits).toBeCloseTo(0.45, 2);
  });

  it('inişten sonra bir adım daha atarsa mesafe şişmez', () => {
    const a = analyzeBroadJump(
      capture({ startX: 0.25, landX: 0.7, afterX: 0.85 })
    );
    expect(a.valid).toBe(true);
    // İniş 0.45'te; fazladan adım ölçüme karışmamalı.
    expect(a.jumpUnits).toBeLessThan(0.55);
  });

  it('hiç atlamayan çocuk hâlâ reddedilir', () => {
    const a = analyzeBroadJump(capture({ startX: 0.5, landX: 0.51 }));
    expect(a.valid).toBe(false);
  });
});
