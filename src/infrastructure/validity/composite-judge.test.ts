/**
 * Bileşik hakem testleri.
 *
 * Kritik davranış: görsel hakem düştüğünde sistem çalışmaya devam etmeli.
 * Bu testler tam olarak o dayanıklılığı zorluyor — anahtar yok, ağ hatası,
 * zaman aşımı, bozuk yanıt.
 */

import { describe, expect, it } from 'vitest';
import type {
  JudgeRequest,
  TestVerdict,
  ValidityJudge,
} from '@/core/ports/validity-judge';
import { err, ok, type Result } from '@/core/types/result';
import { twoFootedBalance, genuineSingleLegBalance } from '@/lib/eval/adversarial';
import { CompositeValidityJudge } from './composite-judge';

function verdict(p: Partial<TestVerdict> = {}): TestVerdict {
  return {
    performed: true,
    protocolViolations: [],
    techniqueScore: 100,
    stanceConfirmed: null,
    compensations: [],
    judgeConfidence: 0.5,
    source: 'vision',
    ...p,
  };
}

/** Sabit karar döndüren sahte hakem. */
function stubJudge(result: Result<TestVerdict>): ValidityJudge {
  return { judge: async () => result };
}

/** Çağrıldığını kaydeden sahte hakem. */
function spyJudge(result: Result<TestVerdict>) {
  const calls: JudgeRequest[] = [];
  return {
    calls,
    judge: {
      judge: async (req: JudgeRequest) => {
        calls.push(req);
        return result;
      },
    } as ValidityJudge,
  };
}

const balanceReq = (frames = genuineSingleLegBalance()): JudgeRequest => ({
  test: 'balance',
  frames,
});

describe('CompositeValidityJudge — dayanıklılık', () => {
  it('görsel hakem yapılandırılmamışsa kural hakemiyle çalışmaya devam eder', async () => {
    const spy = spyJudge(ok(verdict()));
    const composite = new CompositeValidityJudge(
      undefined,
      spy.judge,
      () => false // anahtar yok
    );

    const r = await composite.judge(balanceReq());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.stanceConfirmed).toBe(true);
    // Görsel hakem hiç çağrılmamalı.
    expect(spy.calls).toHaveLength(0);
  });

  it('görsel hakem hata verirse sistem çökmez, kural kararı korunur', async () => {
    const composite = new CompositeValidityJudge(
      undefined,
      stubJudge(err({ code: 'llm.timeout' })),
      () => true
    );

    const r = await composite.judge(balanceReq());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.stanceConfirmed).toBe(true);
    expect(r.value.notes).toContain('Görsel denetim yapılamadı');
  });

  it('kota hatasında da (429) çalışmaya devam eder', async () => {
    const composite = new CompositeValidityJudge(
      undefined,
      stubJudge(err({ code: 'llm.rate-limit' })),
      () => true
    );
    const r = await composite.judge(balanceReq());
    expect(r.ok).toBe(true);
  });
});

describe('CompositeValidityJudge — birleştirme kuralı', () => {
  it('kural hakemi kesin reddettiğinde görsel hakemi hiç çağırmaz (maliyet)', async () => {
    const spy = spyJudge(ok(verdict()));
    const composite = new CompositeValidityJudge(undefined, spy.judge, () => true);

    const r = await composite.judge(balanceReq(twoFootedBalance()));
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.performed).toBe(false);
    expect(r.value.protocolViolations).toContain('both_feet_down');
    expect(spy.calls).toHaveLength(0);
  });

  it('fail-closed: görsel hakem "yapılmadı" derse sonuç da yapılmadı', async () => {
    const composite = new CompositeValidityJudge(
      undefined,
      stubJudge(
        ok(verdict({ performed: false, protocolViolations: ['wrong_exercise'] }))
      ),
      () => true
    );

    // Kural hakemi bu duruşu kabul ediyor (gerçek tek bacak), görsel hakem
    // yanlış egzersiz diyor → sonuç reddedilmeli.
    const r = await composite.judge(balanceReq());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.performed).toBe(false);
    expect(r.value.protocolViolations).toContain('wrong_exercise');
  });

  it('ihlaller birleşir, tekrarlananlar teke iner', async () => {
    const composite = new CompositeValidityJudge(
      undefined,
      stubJudge(
        ok(verdict({ protocolViolations: ['trunk_lean' as never, 'camera_moved'] }))
      ),
      () => true
    );
    const r = await composite.judge(balanceReq());
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.protocolViolations).toContain('camera_moved');
    expect(new Set(r.value.protocolViolations).size).toBe(
      r.value.protocolViolations.length
    );
  });

  it('teknik skorda kötümser olan kazanır', async () => {
    const composite = new CompositeValidityJudge(
      undefined,
      stubJudge(ok(verdict({ techniqueScore: 40 }))),
      () => true
    );
    const r = await composite.judge(balanceReq());
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.techniqueScore).toBeLessThanOrEqual(40);
  });

  it('sakatlanma sinyalleri görsel hakemden taşınır', async () => {
    const composite = new CompositeValidityJudge(
      undefined,
      stubJudge(ok(verdict({ compensations: ['knee_valgus'] }))),
      () => true
    );
    const r = await composite.judge(balanceReq());
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.compensations).toContain('knee_valgus');
  });

  it('kaynak her zaman composite olarak işaretlenir — izlenebilirlik', async () => {
    const composite = new CompositeValidityJudge(
      undefined,
      stubJudge(ok(verdict())),
      () => true
    );
    const r = await composite.judge(balanceReq());
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.source).toBe('composite');
  });
});
