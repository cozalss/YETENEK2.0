/**
 * Reaksiyon analiz testleri.
 *
 * Touch hardware latency offset (25ms) uygulanır. Yaş normu laboratuvar
 * basit-RT + 400ms görsel-dokunuş ofsetidir (12 yaş: 280+400=680ms).
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeReaction,
  MIN_VALID_TRIALS,
  reactionZ,
  type ReactionTrial,
} from './reaction';

function trials(reactionMs: number[]): ReactionTrial[] {
  return reactionMs.map((ms, index) => ({
    index,
    reactionMs: ms,
    falseStart: false,
  }));
}

/** 6 ms değeri (en az MIN_VALID_TRIALS) üretmek için kısaltma. */
function rep6(values: number[]): number[] {
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

  it('web-norm değeri (705ms raw → 680ms corrected = 12 yaş) → 50 puan civarı', () => {
    const r = analyzeReaction(trials(rep6([705])), 12);
    expect(r.ageNormScore).toBeGreaterThan(45);
    expect(r.ageNormScore).toBeLessThan(55);
  });

  it('hızlı reaksiyon → yüksek skor', () => {
    // Raw ~505ms → corrected ~480ms (12 yaş web-norm 680'den hızlı)
    const r = analyzeReaction(trials(rep6([505, 515, 525])), 12);
    expect(r.ageNormScore).toBeGreaterThan(70);
  });

  it('yavaş reaksiyon → düşük skor', () => {
    const r = analyzeReaction(trials(rep6([905, 925, 915])), 12);
    expect(r.ageNormScore).toBeLessThan(40);
  });

  it('14 yaş ~703ms ham tarayıcı RT 0/100 basmaz', () => {
    const r = analyzeReaction(
      trials([637, 759, 627, 604, 828, 766]),
      14
    );
    expect(r.valid).toBe(true);
    expect(r.ageNormScore).toBeGreaterThan(30);
    expect(r.ageNormScore).toBeLessThan(70);
    expect(reactionZ(r.averageMs, 14)).not.toBeNull();
    expect(reactionZ(r.averageMs, 14) as number).toBeGreaterThan(-2);
  });

  it('tutarlılık skoru: dağınık denemeler düşürür', () => {
    const tight = analyzeReaction(trials(rep6([705, 707, 706])), 12);
    const loose = analyzeReaction(trials(rep6([505, 905, 705])), 12);
    expect(tight.consistencyScore).toBeGreaterThan(loose.consistencyScore);
  });

  it('best/worst latency offset sonrası doğru', () => {
    // Raw [345, 275, 315, 335, 305, 295] → corrected [320, 250, 290, 310, 280, 270]
    const r = analyzeReaction(trials([345, 275, 315, 335, 305, 295]), 12);
    expect(r.bestMs).toBe(250);
    expect(r.worstMs).toBe(320);
  });
});
