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

describe('mergeVerdicts — sahne fail-closed (Vision veto)', () => {
  it('Vision wrong_exercise + yüksek güven → ret', () => {
    const m = mergeVerdicts(
      verdict({ performed: true }),
      verdict({
        performed: false,
        protocolViolations: ['wrong_exercise'],
        judgeConfidence: 0.9,
        source: 'vision',
      })
    );
    expect(m.verdict.performed).toBe(false);
    expect(m.verdict.protocolViolations).toContain('wrong_exercise');
    expect(m.droppedFromVision).toEqual([]);
  });

  it('Vision wrong_exercise + düşük güven → veto yok', () => {
    const m = mergeVerdicts(
      verdict({ performed: true }),
      verdict({
        performed: false,
        protocolViolations: ['wrong_exercise'],
        judgeConfidence: 0.4,
        source: 'vision',
      })
    );
    expect(m.verdict.performed).toBe(true);
    expect(m.verdict.protocolViolations).not.toContain('wrong_exercise');
    expect(m.droppedFromVision).toContain('wrong_exercise');
  });

  it('Vision performed:false ama etiket yok → veto yok', () => {
    const m = mergeVerdicts(
      verdict({ performed: true }),
      verdict({ performed: false, judgeConfidence: 0.9, source: 'vision' })
    );
    expect(m.verdict.performed).toBe(true);
  });

  it('kural hakemi "yapılmadı" derse sonuç da yapılmadı', () => {
    const m = mergeVerdicts(
      verdict({ performed: false, protocolViolations: ['both_feet_down'] }),
      verdict({ performed: true, source: 'vision' })
    );
    expect(m.verdict.performed).toBe(false);
    expect(m.verdict.protocolViolations).toContain('both_feet_down');
  });

  it('ikisi de kabul ederse sonuç kabul', () => {
    expect(mergeVerdicts(verdict(), verdict()).verdict.performed).toBe(true);
  });
});

describe('mergeVerdicts — temas etiketleri Vision\'dan düşer', () => {
  it('Vision yalnız heel_raise_only + kural kabul → kabul, etiket düşer, skor tabanı', () => {
    const m = mergeVerdicts(
      verdict({ performed: true, techniqueScore: 100 }),
      verdict({
        performed: false,
        protocolViolations: ['heel_raise_only'],
        techniqueScore: 0,
        judgeConfidence: 0.95,
        source: 'vision',
      })
    );
    expect(m.verdict.performed).toBe(true);
    expect(m.verdict.protocolViolations).not.toContain('heel_raise_only');
    expect(m.droppedFromVision).toEqual(['heel_raise_only']);
    expect(m.verdict.techniqueScore).toBeGreaterThanOrEqual(50);
  });

  it('Vision no_flight_phase düşer', () => {
    const m = mergeVerdicts(
      verdict(),
      verdict({
        protocolViolations: ['no_flight_phase'],
        judgeConfidence: 0.9,
        source: 'vision',
      })
    );
    expect(m.verdict.performed).toBe(true);
    expect(m.droppedFromVision).toContain('no_flight_phase');
  });

  it('Vision arm_swing düşer — veto kural hakemine ait', () => {
    const m = mergeVerdicts(
      verdict(),
      verdict({
        protocolViolations: ['arm_swing'],
        judgeConfidence: 0.95,
        source: 'vision',
      })
    );
    expect(m.verdict.performed).toBe(true);
    expect(m.verdict.protocolViolations).not.toContain('arm_swing');
    expect(m.droppedFromVision).toContain('arm_swing');
  });
});

describe('mergeVerdicts — denge duruşu istisnası', () => {
  it('stanceConfirmed null iken Vision both_feet_down veto eder', () => {
    const m = mergeVerdicts(
      verdict({ stanceConfirmed: null, performed: true }),
      verdict({
        protocolViolations: ['both_feet_down'],
        judgeConfidence: 0.9,
        source: 'vision',
      })
    );
    expect(m.verdict.performed).toBe(false);
    expect(m.verdict.protocolViolations).toContain('both_feet_down');
  });

  it('stanceConfirmed true iken Vision both_feet_down düşer', () => {
    const m = mergeVerdicts(
      verdict({ stanceConfirmed: true, performed: true }),
      verdict({
        protocolViolations: ['both_feet_down'],
        judgeConfidence: 0.9,
        source: 'vision',
      })
    );
    expect(m.verdict.performed).toBe(true);
    expect(m.droppedFromVision).toContain('both_feet_down');
  });
});

describe('mergeVerdicts — alan birleştirme', () => {
  it('kural out_of_frame kalır, Vision out_of_frame düşer, camera_moved veto', () => {
    const m = mergeVerdicts(
      verdict({ protocolViolations: ['out_of_frame'] }),
      verdict({
        protocolViolations: ['out_of_frame', 'camera_moved'],
        judgeConfidence: 0.9,
        source: 'vision',
      })
    );
    expect(m.verdict.protocolViolations).toContain('out_of_frame');
    expect(m.verdict.protocolViolations).toContain('camera_moved');
    expect(m.droppedFromVision).toContain('out_of_frame');
    expect(m.verdict.performed).toBe(false);
  });

  it('teknik skorda kötümser olan kazanır', () => {
    const m = mergeVerdicts(
      verdict({ techniqueScore: 90 }),
      verdict({ techniqueScore: 40, source: 'vision' })
    );
    expect(m.verdict.techniqueScore).toBe(40);
  });

  it('duruş kararında kural hakemi öncelikli (geometri bilgisi onda)', () => {
    const m = mergeVerdicts(
      verdict({ stanceConfirmed: true }),
      verdict({ stanceConfirmed: false, source: 'vision' })
    );
    expect(m.verdict.stanceConfirmed).toBe(true);
  });

  it('kural hakemi duruşu değerlendiremediyse görsel karar geçerli', () => {
    const m = mergeVerdicts(
      verdict({ stanceConfirmed: null }),
      verdict({ stanceConfirmed: false, source: 'vision' })
    );
    expect(m.verdict.stanceConfirmed).toBe(false);
  });

  it('sakatlanma sinyalleri görsel hakemden taşınır', () => {
    const m = mergeVerdicts(
      verdict({ compensations: [] }),
      verdict({ compensations: ['knee_valgus'], source: 'vision' })
    );
    expect(m.verdict.compensations).toContain('knee_valgus');
  });

  it('güven iki hakemin yükseği', () => {
    const m = mergeVerdicts(
      verdict({ judgeConfidence: 0.3 }),
      verdict({ judgeConfidence: 0.9, source: 'vision' })
    );
    expect(m.verdict.judgeConfidence).toBeCloseTo(0.9, 6);
  });

  it('notlar birleşir', () => {
    const m = mergeVerdicts(
      verdict({ notes: 'Kural notu.' }),
      verdict({ notes: 'Görsel notu.', source: 'vision' })
    );
    expect(m.verdict.notes).toContain('Kural notu.');
    expect(m.verdict.notes).toContain('Görsel notu.');
  });

  it('kaynak her zaman composite — izlenebilirlik', () => {
    expect(mergeVerdicts(verdict(), verdict()).verdict.source).toBe('composite');
  });
});
