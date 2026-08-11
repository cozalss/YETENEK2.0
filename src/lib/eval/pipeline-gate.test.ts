/**
 * Uçtan uca kapı testi — hakem gerçekten devrede mi?
 *
 * `adversarial.test.ts` hakemin doğru kararı verdiğini kanıtlıyor.
 * Bu dosya bir adım ötesini kanıtlıyor: hakem kararı **deterministik kapıdan
 * geçirildiğinde** ölçüm gerçekten reddediliyor ve çocuğa somut bir düzeltme
 * ipucu dönüyor.
 *
 * Bu ayrım önemli: doğru karar veren ama hiçbir yere bağlanmamış bir hakem,
 * hiç olmayan bir hakemden farksızdır.
 */

import { describe, expect, it } from 'vitest';
import { applyVerdict } from '@/core/use-cases/apply-verdict';
import { ruleBasedValidityJudge } from '@/infrastructure/validity/rule-based-judge';
import type { PoseFrame, TestType } from '@/types';
import {
  genuineLateralHops,
  genuineSingleLegBalance,
  heelRaiseJump,
  jitterLateralHops,
  twoFootedBalance,
  walkingBroadJump,
} from './adversarial';

/** Ölçüm hattının uçtan uca kapısı: hakem → deterministik kapı. */
async function gate(test: TestType, frames: PoseFrame[]) {
  const judged = await ruleBasedValidityJudge.judge({ test, frames });
  expect(judged.ok).toBe(true);
  if (!judged.ok) throw new Error('unreachable');
  return applyVerdict(test, judged.value);
}

describe('Kapı — düşmanca girdiler reddedilir ve düzeltme ipucu döner', () => {
  it.each([
    {
      name: 'iki ayak üstünde denge',
      test: 'balance' as const,
      frames: twoFootedBalance(),
      hintContains: 'tek ayak',
    },
    {
      name: 'yana yürüyüş broad jump',
      test: 'broadJump' as const,
      frames: walkingBroadJump(),
      hintContains: 'yerden hiç kesilmedi',
    },
    {
      name: 'topuk kaldırma sıçrama',
      test: 'jump' as const,
      frames: heelRaiseJump(),
      hintContains: 'topuk',
    },
    {
      name: 'titreme lateral hops',
      test: 'lateralHops' as const,
      frames: jitterLateralHops(),
      hintContains: 'Yana yeterince',
    },
  ])('$name → reddedilir', async ({ test, frames, hintContains }) => {
    const r = await gate(test, frames);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    // Genel "tekrar dene" değil, ihlale özgü somut düzeltme.
    expect(r.error.retryHint).toContain(hintContains);
    expect(r.error.violations.length).toBeGreaterThan(0);
  });
});

describe('Kapı — dürüst girdiler geçer', () => {
  it.each([
    { name: 'gerçek tek bacak denge', test: 'balance' as const, frames: genuineSingleLegBalance() },
    { name: 'gerçek yanal sıçrama', test: 'lateralHops' as const, frames: genuineLateralHops() },
  ])('$name → kabul edilir', async ({ test, frames }) => {
    const r = await gate(test, frames);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    // Temiz teknikte belirsizlik genişletilmemeli.
    expect(r.value.sigmaMultiplier).toBeLessThanOrEqual(1.35);
  });
});

describe('Kapı — kapsam dışı testler ölçümü engellemez', () => {
  it.each(['reaction', 'coordination', 'endurance'] as const)(
    '%s kural hakemi kapsamında değil ama ölçümü bloklamıyor',
    async (test) => {
      const r = await gate(test, genuineSingleLegBalance());
      expect(r.ok).toBe(true);
    }
  );
});
