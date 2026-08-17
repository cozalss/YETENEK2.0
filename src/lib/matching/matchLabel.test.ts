import { describe, expect, it } from 'vitest';
import { describeMatchConfidence, formatMatchConfidenceText } from './matchLabel';

describe('describeMatchConfidence', () => {
  it('pTopK doluysa "ilk 3\'te olma ihtimali" olarak etiketler', () => {
    const label = describeMatchConfidence({
      confidencePercent: 78,
      pTopK: 0.78,
    });
    expect(label).toEqual({ percent: 78, caption: "ilk 3'te olma ihtimali" });
  });

  it('probabilityWithheldReason varsa sayı gösterilmez', () => {
    const label = describeMatchConfidence({
      confidencePercent: 61,
      pTopK: undefined,
      probabilityWithheldReason: 'Bu spor için gereken ölçümlerin yalnız %61i yapılabiliyor.',
    });
    expect(label.percent).toBeNull();
    expect(label.caption).toBe('bu spor için yeterli ölçüm yok');
  });

  it('ikisi de yoksa (eski recommendSports yolu) "profil yakınlığı" der — olasılık iddia etmez', () => {
    const label = describeMatchConfidence({ confidencePercent: 82 });
    expect(label).toEqual({ percent: 82, caption: 'profil yakınlığı' });
  });

  it('probabilityWithheldReason pTopK\'tan önceliklidir', () => {
    // decide.ts'te bu ikisi asla birlikte dolu olmaz ama tüketici tarafında
    // savunmacı davranış: withheld varsa sayı asla gösterilmemeli.
    const label = describeMatchConfidence({
      confidencePercent: 90,
      pTopK: 0.9,
      probabilityWithheldReason: 'sebep',
    });
    expect(label.percent).toBeNull();
  });
});

describe('formatMatchConfidenceText', () => {
  it('sayı varsa "%X (caption)" formatlar', () => {
    expect(
      formatMatchConfidenceText({ confidencePercent: 78, pTopK: 0.78 })
    ).toBe("%78 (ilk 3'te olma ihtimali)");
  });

  it('sayı yoksa sadece caption döner', () => {
    expect(
      formatMatchConfidenceText({
        confidencePercent: 61,
        probabilityWithheldReason: 'sebep',
      })
    ).toBe('bu spor için yeterli ölçüm yok');
  });
});
