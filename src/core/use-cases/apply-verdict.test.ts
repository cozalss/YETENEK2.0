/**
 * Deterministik kapı testleri.
 *
 * Bu kapı, hakem kararının ölçüme dönüştüğü tek yer. Buradaki bir hata ya
 * geçerli ölçümleri çöpe atar ya da geçersiz olanları içeri alır — ikisi de
 * sessizce olur. Bu yüzden her dal ayrı ayrı test ediliyor.
 */

import { describe, expect, it } from 'vitest';
import type { TestVerdict } from '@/core/ports/validity-judge';
import { applyVerdict } from './apply-verdict';

function verdict(p: Partial<TestVerdict> = {}): TestVerdict {
  return {
    performed: true,
    protocolViolations: [],
    techniqueScore: 100,
    stanceConfirmed: null,
    compensations: [],
    judgeConfidence: 0.9,
    source: 'rules',
    ...p,
  };
}

describe('applyVerdict — reddetme dalları', () => {
  it('test yapılmamışsa reddeder ve ihlale özgü ipucu verir', () => {
    const r = applyVerdict(
      'balance',
      verdict({ performed: false, protocolViolations: ['both_feet_down'] })
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.reason).toBe('not-performed');
    expect(r.error.retryHint).toContain('tek ayak');
  });

  it('ölümcül ihlalde reddeder (performed true olsa bile)', () => {
    const r = applyVerdict(
      'broadJump',
      verdict({ protocolViolations: ['no_flight_phase'] })
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.reason).toBe('protocol-violation');
    expect(r.error.violations).toEqual(['no_flight_phase']);
  });

  it('evrensel ihlaller her testte ölümcül', () => {
    for (const test of ['jump', 'balance', 'coordination'] as const) {
      const r = applyVerdict(test, verdict({ protocolViolations: ['multiple_people'] }));
      expect(r.ok).toBe(false);
    }
  });

  it('ihlal listesi boşken performed:false ise genel ipucuna düşer', () => {
    const r = applyVerdict('jump', verdict({ performed: false }));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.retryHint).toBeTruthy();
  });
});

describe('applyVerdict — kabul dalı ve σ genişletme', () => {
  it('kusursuz teknikte σ çarpanı 1.0 (belirsizlik değişmez)', () => {
    const r = applyVerdict('jump', verdict({ techniqueScore: 100 }));
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.sigmaMultiplier).toBeCloseTo(1.0, 6);
  });

  it('en kötü teknikte σ iki katına çıkar — üst sınır korunur', () => {
    const r = applyVerdict('jump', verdict({ techniqueScore: 0 }));
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.sigmaMultiplier).toBeCloseTo(2.0, 6);
  });

  it('σ çarpanı teknikle monoton azalır', () => {
    const scores = [0, 25, 50, 75, 100];
    const multipliers = scores.map((s) => {
      const r = applyVerdict('jump', verdict({ techniqueScore: s }));
      if (!r.ok) throw new Error('unreachable');
      return r.value.sigmaMultiplier;
    });
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeLessThan(multipliers[i - 1]);
    }
  });

  it('aralık dışı techniqueScore güvenli biçimde sıkıştırılır', () => {
    for (const s of [-50, 150]) {
      const r = applyVerdict('jump', verdict({ techniqueScore: s }));
      expect(r.ok).toBe(true);
      if (!r.ok) throw new Error('unreachable');
      expect(r.value.sigmaMultiplier).toBeGreaterThanOrEqual(1);
      expect(r.value.sigmaMultiplier).toBeLessThanOrEqual(2);
    }
  });

  it('ölümcül olmayan ihlal ölçümü geçirir ama uyarı olarak taşınır', () => {
    // `foot_touched_down` denge için ölümcül, ama sıçrama için tanımlı değil —
    // yani sıçramada uyarı olarak geçmeli.
    const r = applyVerdict('jump', verdict({ protocolViolations: ['trunk_lean' as never] }));
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.warnings).toHaveLength(1);
  });

  it('ölçüm DEĞERİ hiçbir dalda değiştirilmez — yalnız σ çarpanı döner', () => {
    // Sözleşme kontrolü: kabul çıktısında bir "düzeltilmiş değer" alanı yok.
    const r = applyVerdict('jump', verdict({ techniqueScore: 40 }));
    if (!r.ok) throw new Error('unreachable');
    expect(Object.keys(r.value).sort()).toEqual(
      ['sigmaMultiplier', 'verdict', 'warnings'].sort()
    );
  });
});
