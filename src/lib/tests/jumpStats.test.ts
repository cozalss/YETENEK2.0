import { describe, expect, it } from 'vitest';
import { needsOutlierRetry } from '@/lib/tests/jumpStats';

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
