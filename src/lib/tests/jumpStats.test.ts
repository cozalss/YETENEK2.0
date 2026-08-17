import { describe, expect, it } from 'vitest';
import { needsOutlierRetry, needsReplacementAttempt } from '@/lib/tests/jumpStats';

describe('needsOutlierRetry', () => {
  it('üç tutarlı denemede ekstra istemez', () => {
    expect(
      needsOutlierRetry([
        { accepted: true, analysis: { jumpHeightCm: 28, jumpHeightSigmaCm: 2 } },
        { accepted: true, analysis: { jumpHeightCm: 29, jumpHeightSigmaCm: 2 } },
        { accepted: true, analysis: { jumpHeightCm: 27, jumpHeightSigmaCm: 2 } },
      ])
    ).toBe(false);
  });

  it('medyandan belirgin sapan denemede 4. ister', () => {
    expect(
      needsOutlierRetry([
        { accepted: true, analysis: { jumpHeightCm: 20, jumpHeightSigmaCm: 1.5 } },
        { accepted: true, analysis: { jumpHeightCm: 21, jumpHeightSigmaCm: 1.5 } },
        { accepted: true, analysis: { jumpHeightCm: 40, jumpHeightSigmaCm: 1.5 } },
      ])
    ).toBe(true);
  });

  it('üçten az kabulde istemez', () => {
    expect(
      needsOutlierRetry([
        { accepted: true, analysis: { jumpHeightCm: 20, jumpHeightSigmaCm: 1 } },
        { accepted: false, analysis: { jumpHeightCm: null, jumpHeightSigmaCm: null } },
      ])
    ).toBe(false);
  });
});

describe('needsReplacementAttempt', () => {
  it('2 geçerli + 1 sayılmadı → bir deneme daha', () => {
    expect(
      needsReplacementAttempt(
        [
          { accepted: true, analysis: { jumpHeightCm: 28 } },
          { accepted: false, analysis: { jumpHeightCm: null } },
          { accepted: true, analysis: { jumpHeightCm: 31 } },
        ],
        3,
        5
      )
    ).toBe(true);
  });

  it('3 geçerli denemede ekstra istemez', () => {
    expect(
      needsReplacementAttempt(
        [
          { accepted: true, analysis: { jumpHeightCm: 28 } },
          { accepted: true, analysis: { jumpHeightCm: 29 } },
          { accepted: true, analysis: { jumpHeightCm: 27 } },
        ],
        3,
        5
      )
    ).toBe(false);
  });

  it('tavan dolunca istemez', () => {
    expect(
      needsReplacementAttempt(
        [
          { accepted: false, analysis: { jumpHeightCm: null } },
          { accepted: false, analysis: { jumpHeightCm: null } },
          { accepted: true, analysis: { jumpHeightCm: 24 } },
          { accepted: false, analysis: { jumpHeightCm: null } },
          { accepted: false, analysis: { jumpHeightCm: null } },
        ],
        3,
        5
      )
    ).toBe(false);
  });
});
