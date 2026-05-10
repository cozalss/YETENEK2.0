/**
 * Reaksiyon analiz testleri.
 */

import { describe, expect, it } from 'vitest';
import { analyzeReaction, type ReactionTrial } from './reaction';

function trials(reactionMs: number[]): ReactionTrial[] {
  return reactionMs.map((ms, index) => ({
    index,
    reactionMs: ms,
    falseStart: false,
  }));
}

describe('analyzeReaction', () => {
  it('boş trial listesi → 0 skor', () => {
    const r = analyzeReaction([], 12);
    expect(r.averageMs).toBe(0);
    expect(r.ageNormScore).toBe(0);
  });

  it('false start filtrelenir', () => {
    const t: ReactionTrial[] = [
      { index: 0, reactionMs: 50, falseStart: true },
      { index: 1, reactionMs: 280, falseStart: false },
      { index: 2, reactionMs: 290, falseStart: false },
    ];
    const r = analyzeReaction(t, 12);
    expect(r.averageMs).toBeCloseTo(285, 0);
    expect(r.bestMs).toBe(280);
  });

  it('norm değeri ortalama → 50 puan civarı', () => {
    // 12 yaş norm = 280ms
    const r = analyzeReaction(trials([280, 280, 280]), 12);
    expect(r.ageNormScore).toBeGreaterThan(45);
    expect(r.ageNormScore).toBeLessThan(55);
  });

  it('hızlı reaksiyon → yüksek skor', () => {
    const r = analyzeReaction(trials([200, 210, 220]), 12);
    expect(r.ageNormScore).toBeGreaterThan(70);
  });

  it('yavaş reaksiyon → düşük skor', () => {
    const r = analyzeReaction(trials([400, 420, 410]), 12);
    expect(r.ageNormScore).toBeLessThan(40);
  });

  it('tutarlılık skoru: dağınık denemeler düşürür', () => {
    const tight = analyzeReaction(trials([280, 282, 281]), 12);
    const loose = analyzeReaction(trials([200, 350, 280]), 12);
    expect(tight.consistencyScore).toBeGreaterThan(loose.consistencyScore);
  });

  it('best/worst doğru hesaplanır', () => {
    const r = analyzeReaction(trials([320, 250, 290, 310]), 12);
    expect(r.bestMs).toBe(250);
    expect(r.worstMs).toBe(320);
  });
});
