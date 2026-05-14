/**
 * Reaksiyon analiz testleri.
 *
 * NOT: analyzeReaction MIN_VALID_TRIALS = 6 ister; ayrıca touch hardware
 * latency offset (25ms) uygulanır → raw 280ms → corrected 255ms.
 */

import { describe, expect, it } from 'vitest';
import { analyzeReaction, MIN_VALID_TRIALS, type ReactionTrial } from './reaction';

function trials(reactionMs: number[]): ReactionTrial[] {
  return reactionMs.map((ms, index) => ({
    index,
    reactionMs: ms,
    falseStart: false,
  }));
}

/** 6 ms değeri (en az MIN_VALID_TRIALS) üretmek için kısaltma. */
function rep6(values: number[]): number[] {
  // Verilen değerlerden döngülü olarak en az 6 trial üret.
  const out: number[] = [];
  for (let i = 0; i < MIN_VALID_TRIALS; i++) out.push(values[i % values.length]);
  return out;
}

describe('analyzeReaction', () => {
  it('boş trial listesi → 0 skor', () => {
    const r = analyzeReaction([], 12);
    expect(r.averageMs).toBe(0);
    expect(r.ageNormScore).toBe(0);
  });

  it('yetersiz trial (< MIN_VALID_TRIALS) → 0 skor', () => {
    const r = analyzeReaction(trials([280, 290, 285]), 12);
    expect(r.ageNormScore).toBe(0);
  });

  it('false start filtrelenir', () => {
    const t: ReactionTrial[] = [
      { index: 0, reactionMs: 50, falseStart: true },
      ...trials([305, 310, 305, 310, 305, 310]),
    ];
    const r = analyzeReaction(t, 12);
    // Corrected: 305→280, 310→285. 6 trial avg = (280+285)*3 / 6 = 282.5
    expect(r.averageMs).toBeCloseTo(282.5, 0);
    expect(r.bestMs).toBe(280);
  });

  it('norm değeri (305ms raw → 280ms corrected = 12 yaş norm) → 50 puan civarı', () => {
    // Raw 305ms × 6 trial; corrected 280ms = 12 yaş norm
    const r = analyzeReaction(trials(rep6([305])), 12);
    expect(r.ageNormScore).toBeGreaterThan(45);
    expect(r.ageNormScore).toBeLessThan(55);
  });

  it('hızlı reaksiyon → yüksek skor', () => {
    // Raw 225ms × 6 → corrected 200ms (12 yaş normdan hızlı)
    const r = analyzeReaction(trials(rep6([225, 235, 245])), 12);
    expect(r.ageNormScore).toBeGreaterThan(70);
  });

  it('yavaş reaksiyon → düşük skor', () => {
    // Raw 425ms × 6 → corrected 400ms (12 yaş normdan yavaş)
    const r = analyzeReaction(trials(rep6([425, 445, 435])), 12);
    expect(r.ageNormScore).toBeLessThan(40);
  });

  it('tutarlılık skoru: dağınık denemeler düşürür', () => {
    const tight = analyzeReaction(trials(rep6([305, 307, 306])), 12);
    const loose = analyzeReaction(trials(rep6([225, 375, 305])), 12);
    expect(tight.consistencyScore).toBeGreaterThan(loose.consistencyScore);
  });

  it('best/worst latency offset sonrası doğru', () => {
    // Raw [345, 275, 315, 335, 305, 295] → corrected [320, 250, 290, 310, 280, 270]
    const r = analyzeReaction(trials([345, 275, 315, 335, 305, 295]), 12);
    expect(r.bestMs).toBe(250);
    expect(r.worstMs).toBe(320);
  });
});
