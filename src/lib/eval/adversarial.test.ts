/**
 * Düşmanca senaryo kapısı.
 *
 * Bu dosya iki şeyi birden kanıtlar:
 *
 *   1. **Açık gerçekten vardı.** Ölçüm katmanı bu girdileri sessizce kabul
 *      ediyor ve skor üretiyor — testler bunu açıkça gösteriyor.
 *   2. **Hakem açığı kapatıyor.** Aynı girdi geçerlilik hakemine verildiğinde
 *      reddediliyor.
 *
 * Yalnız (2)'yi test etmek yetmez: açığın var olduğunu da kayda geçirmezsek,
 * ileride biri ölçüm katmanını "sadeleştirip" hakemi kaldırdığında test yeşil
 * kalmaya devam eder.
 */

import { describe, expect, it } from 'vitest';
import { analyzeBalance, frameToPostureSample } from '@/lib/tests/balance';
import { analyzeBroadJump, frameToBroadJumpSample } from '@/lib/tests/broadJump';
import { analyzeJump, frameToHipSample } from '@/lib/tests/jump';
import { analyzeLateralHops, frameToLateralHopSample } from '@/lib/tests/lateralHops';
import { analyzeCoordination } from '@/lib/tests/coordination';
import {
  ruleBasedValidityJudge,
  judgeCoordinationTouches,
} from '@/infrastructure/validity/rule-based-judge';
import type { PoseFrame } from '@/types';
import {
  genuineLateralHops,
  genuineSingleLegBalance,
  heelRaiseJump,
  jitterLateralHops,
  restingFingerTouches,
  twoFootedBalance,
  walkingBroadJump,
} from './adversarial';

/** Yardımcı: hakemden kararı al (Result sarmalını aç). */
async function judge(test: Parameters<typeof ruleBasedValidityJudge.judge>[0]['test'], frames: PoseFrame[]) {
  const r = await ruleBasedValidityJudge.judge({ test, frames });
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error('unreachable');
  return r.value;
}

describe('İki ayak üstünde "tek bacak denge"', () => {
  const frames = twoFootedBalance();

  it('ölçüm katmanı bunu YÜKSEK skorla kabul ediyor — açık burada', () => {
    const samples = frames
      .map(frameToPostureSample)
      .filter((s): s is NonNullable<typeof s> => s != null);
    const analysis = analyzeBalance(samples, samples, 11);

    expect(analysis.right.hasEnoughData).toBe(true);
    // İki ayak üstünde salınım az olduğu için skor yüksek çıkıyor.
    expect(analysis.right.score).toBeGreaterThan(70);
  });

  it('hakem reddediyor: both_feet_down', async () => {
    const v = await judge('balance', frames);
    expect(v.performed).toBe(false);
    expect(v.stanceConfirmed).toBe(false);
    expect(v.protocolViolations).toContain('both_feet_down');
  });

  it('dürüst tek bacak duruşunu KABUL ediyor — yanlış negatif yok', async () => {
    const v = await judge('balance', genuineSingleLegBalance());
    expect(v.performed).toBe(true);
    expect(v.stanceConfirmed).toBe(true);
    expect(v.protocolViolations).not.toContain('both_feet_down');
  });
});

describe('Yana yürüyüş "broad jump"', () => {
  const frames = walkingBroadJump();

  it('ölçüm katmanı bunu geçerli mesafe olarak okuyor — açık burada', () => {
    const samples = frames
      .map(frameToBroadJumpSample)
      .filter((s): s is NonNullable<typeof s> => s != null);
    const analysis = analyzeBroadJump(samples);

    expect(analysis.valid).toBe(true);
    expect(analysis.jumpUnits).toBeGreaterThan(0.06);
  });

  it('hakem reddediyor: no_flight_phase + stepped_not_jumped', async () => {
    const v = await judge('broadJump', frames);
    expect(v.performed).toBe(false);
    expect(v.protocolViolations).toContain('no_flight_phase');
    expect(v.protocolViolations).toContain('stepped_not_jumped');
  });
});

describe('Topuk kaldırma "sıçrama"', () => {
  const frames = heelRaiseJump();

  it('fizik doğrulaması eklendikten sonra ölçüm katmanı da reddediyor', () => {
    const samples = frames
      .map(frameToHipSample)
      .filter((s): s is NonNullable<typeof s> => s != null);
    const analysis = analyzeJump(samples);

    // Bu, F0'da eklenen parabol/fizik kapısının doğrudan sonucu: hareket
    // balistik olmadığı için `flight` doğrulanmıyor ve kalça kapıları devreye
    // giriyor.
    expect(analysis.valid).toBe(false);
  });

  it('hakem de bağımsız olarak reddediyor: heel_raise_only', async () => {
    const v = await judge('jump', frames);
    expect(v.performed).toBe(false);
    expect(v.protocolViolations).toContain('heel_raise_only');
  });
});

describe('Orta çizgide titreme "lateral hops"', () => {
  const frames = jitterLateralHops();

  it('ölçüm katmanı titremeyi hop olarak sayıyor — açık burada', () => {
    const samples = frames
      .map(frameToLateralHopSample)
      .filter((s): s is NonNullable<typeof s> => s != null);
    const analysis = analyzeLateralHops(samples, 0.5);

    expect(analysis.valid).toBe(true);
    expect(analysis.hopCount).toBeGreaterThanOrEqual(4);
  });

  it('hakem reddediyor: insufficient_amplitude', async () => {
    const v = await judge('lateralHops', frames);
    expect(v.performed).toBe(false);
    expect(v.protocolViolations).toContain('insufficient_amplitude');
  });

  it('dürüst yanal sıçramayı KABUL ediyor', async () => {
    const v = await judge('lateralHops', genuineLateralHops());
    expect(v.performed).toBe(true);
    expect(v.protocolViolations).toHaveLength(0);
  });
});

describe('Merkeze konmuş parmak "koordinasyon"', () => {
  const touches = restingFingerTouches({});

  it('ölçüm katmanı bunu GEÇERLİ ve 0 puan olarak kaydediyor — açık burada', () => {
    const analysis = analyzeCoordination(touches, 600, 400);

    // Skor doğru biçimde 0 — hata çok büyük olduğu için eğri taban yapıyor.
    // Sorun skorda değil, `valid` alanında: testi hiç yapmamış bir çocuk
    // "geçerli ölçüm, 0 puan" olarak oturuma yazılıyor. Bu, ölçülmemiş bir
    // boyutu "mümkün olan en kötü koordinasyon" diye spor eşleştirmesine
    // sokuyor — eksik veriden daha zararlı, çünkü yanlış veri.
    expect(analysis.coordScore).toBe(0);
    expect(analysis.valid).toBe(true);
  });

  it('hakem reddediyor: finger_resting', () => {
    const v = judgeCoordinationTouches(touches);
    expect(v.performed).toBe(false);
    expect(v.protocolViolations).toContain('finger_resting');
  });
});
