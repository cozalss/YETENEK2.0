/**
 * Karar birleştirme testleri.
 *
 * Eskiden `CompositeValidityJudge` içindeydi. O sınıf kaldırıldı: sunucuda
 * kural hakemini yeniden koşturuyordu ve eksik kare setinde görsel çağrıyı
 * kısa devre ettiriyordu. Birleştirme mantığı korundu ve saf bir modüle
 * taşındı — istemci hook'u onu kullanıyor.
 */

import { describe, expect, it } from 'vitest';
import type { TestVerdict } from '@/core/ports/validity-judge';
import { mergeVerdicts } from './merge-verdicts';

function verdict(p: Partial<TestVerdict> = {}): TestVerdict {
  return {
    performed: true,
    protocolViolations: [],
    techniqueScore: 100,
    stanceConfirmed: null,
    compensations: [],
    judgeConfidence: 0.5,
    source: 'rules',
    ...p,
  };
}

describe('mergeVerdicts — fail-closed', () => {
  it('görsel hakem "yapılmadı" derse sonuç da yapılmadı', () => {
    const m = mergeVerdicts(
      verdict({ performed: true }),
      verdict({ performed: false, protocolViolations: ['wrong_exercise'] })
    );
    expect(m.performed).toBe(false);
    expect(m.protocolViolations).toContain('wrong_exercise');
  });

  it('kural hakemi "yapılmadı" derse sonuç da yapılmadı', () => {
    const m = mergeVerdicts(
      verdict({ performed: false, protocolViolations: ['both_feet_down'] }),
      verdict({ performed: true })
    );
    expect(m.performed).toBe(false);
  });

  it('ikisi de kabul ederse sonuç kabul', () => {
    expect(mergeVerdicts(verdict(), verdict()).performed).toBe(true);
  });
});

describe('mergeVerdicts — alan birleştirme', () => {
  it('ihlaller birleşir, tekrarlar teke iner', () => {
    const m = mergeVerdicts(
      verdict({ protocolViolations: ['out_of_frame'] }),
      verdict({ protocolViolations: ['out_of_frame', 'camera_moved'] })
    );
    expect(m.protocolViolations).toHaveLength(2);
    expect(new Set(m.protocolViolations).size).toBe(m.protocolViolations.length);
  });

  it('teknik skorda kötümser olan kazanır', () => {
    const m = mergeVerdicts(
      verdict({ techniqueScore: 90 }),
      verdict({ techniqueScore: 40 })
    );
    expect(m.techniqueScore).toBe(40);
  });

  it('duruş kararında kural hakemi öncelikli (geometri bilgisi onda)', () => {
    const m = mergeVerdicts(
      verdict({ stanceConfirmed: true }),
      verdict({ stanceConfirmed: false })
    );
    expect(m.stanceConfirmed).toBe(true);
  });

  it('kural hakemi duruşu değerlendiremediyse görsel karar geçerli', () => {
    const m = mergeVerdicts(
      verdict({ stanceConfirmed: null }),
      verdict({ stanceConfirmed: false })
    );
    expect(m.stanceConfirmed).toBe(false);
  });

  it('sakatlanma sinyalleri görsel hakemden taşınır', () => {
    const m = mergeVerdicts(
      verdict({ compensations: [] }),
      verdict({ compensations: ['knee_valgus'] })
    );
    expect(m.compensations).toContain('knee_valgus');
  });

  it('güven iki hakemin yükseği', () => {
    const m = mergeVerdicts(
      verdict({ judgeConfidence: 0.3 }),
      verdict({ judgeConfidence: 0.9 })
    );
    expect(m.judgeConfidence).toBeCloseTo(0.9, 6);
  });

  it('notlar birleşir', () => {
    const m = mergeVerdicts(
      verdict({ notes: 'Kural notu.' }),
      verdict({ notes: 'Görsel notu.' })
    );
    expect(m.notes).toContain('Kural notu.');
    expect(m.notes).toContain('Görsel notu.');
  });

  it('kaynak her zaman composite — izlenebilirlik', () => {
    expect(mergeVerdicts(verdict(), verdict()).source).toBe('composite');
  });
});
