/**
 * σ zinciri uçtan uca testi.
 *
 * Bir önceki turda "teknik cezası bağlandı" denmişti ama zincirin yarısı
 * boştu: `finalizeSession` çarpanı alıyordu, ama onu kimse doldurmuyordu.
 * Bu dosya zincirin **her halkasını** ayrı ayrı ve birlikte zorluyor, ki
 * aynı sessiz kopma tekrar olmasın.
 *
 *   record-test → session.techniqueMultipliers
 *              → sessionToZProfile → σ genişlemesi
 *              → decide → olasılık düşmesi
 */

import { describe, expect, it } from 'vitest';
import { recordJump } from './record-test';
import { finalizeSession } from './finalize-session';
import { sessionToZProfile } from '@/lib/matching/sessionToZ';
import type { Session } from '@/core/domain/session';
import type { JumpAnalysis } from '@/lib/tests/jump';

function baseSession(): Session {
  return {
    child: { name: 'Test', ageYears: 12, sex: 'male', heightCm: 150 },
    injuryWarnings: [],
    completedTests: [],
    startedAt: new Date(0).toISOString(),
  };
}

function jumpAnalysis(): JumpAnalysis & { score: number } {
  return {
    jumpUnits: 0.15,
    jumpHeightCm: 28,
    jumpHeightCmHip: null,
    jumpHeightCmFlight: 28,
    method: 'flight-time',
    consistent: true,
    takeoffY: 0.6,
    apexY: 0.45,
    flightTimeMs: 478,
    jumpHeightSigmaCm: 0.3,
    flightMethod: 'parabolic',
    cmPerUnitFromGravity: 180,
    ballisticFit: 0.99,
    valid: true,
    score: 62,
  };
}

describe('Halka 1 — record-test çarpanı oturuma yazıyor', () => {
  it('kusurlu teknikte çarpan kaydedilir', () => {
    const s = recordJump(baseSession(), jumpAnalysis(), 1.8);
    expect(s.techniqueMultipliers?.jump).toBeCloseTo(1.8, 6);
  });

  it('kusursuz teknikte (1.0) alan hiç yazılmaz — gereksiz veri yok', () => {
    const s = recordJump(baseSession(), jumpAnalysis(), 1);
    expect(s.techniqueMultipliers).toBeUndefined();
  });

  it('çarpan verilmezse alan yazılmaz', () => {
    const s = recordJump(baseSession(), jumpAnalysis());
    expect(s.techniqueMultipliers).toBeUndefined();
  });

  it('aşırı çarpan 3 ile sınırlanır', () => {
    const s = recordJump(baseSession(), jumpAnalysis(), 99);
    expect(s.techniqueMultipliers?.jump).toBe(3);
  });
});

describe('Halka 2 — sessionToZProfile çarpanı σ\'ya uyguluyor', () => {
  it('kusurlu teknikte ilgili boyutun σ\'sı büyür', () => {
    const clean = sessionToZProfile(recordJump(baseSession(), jumpAnalysis(), 1));
    const flawed = sessionToZProfile(
      recordJump(baseSession(), jumpAnalysis(), 2)
    );

    expect(clean.sigma.explosivePower).toBeGreaterThan(0);
    expect(flawed.sigma.explosivePower).toBeCloseTo(
      clean.sigma.explosivePower! * 2,
      6
    );
  });

  it('ölçüm DEĞERİ değişmez — yalnız belirsizlik', () => {
    const clean = sessionToZProfile(recordJump(baseSession(), jumpAnalysis(), 1));
    const flawed = sessionToZProfile(
      recordJump(baseSession(), jumpAnalysis(), 2)
    );
    expect(flawed.z.explosivePower).toBeCloseTo(clean.z.explosivePower!, 10);
  });

  it('cezalanmamış boyutlar etkilenmez', () => {
    const s = recordJump(baseSession(), jumpAnalysis(), 2);
    const z = sessionToZProfile(s);
    // agility ölçülmedi; ceza sızmamalı.
    expect(z.sigma.agility).toBeUndefined();
  });
});

describe('Halka 3 — finalizeSession sonuca yansıtıyor', () => {
  /** Beş boyutu da ölçülmüş, olasılık raporlanabilir bir oturum. */
  function fullSession(jumpMultiplier?: number): Session {
    let s = recordJump(baseSession(), jumpAnalysis(), jumpMultiplier);
    s = {
      ...s,
      broadJump: { jumpDistanceCm: 160, jumpUnits: 0.4, score: 60 },
      lateralHops: {
        hopCount: 20,
        frequencyHz: 1.3,
        score: 65,
        dataQuality: 'good',
      },
      reaction: {
        averageMs: 265,
        bestMs: 240,
        consistencyScore: 70,
        ageNormScore: 60,
      },
      endurance: {
        totalReps: 34,
        decayPercent: 10,
        durationMs: 30_000,
        score: 62,
      },
      completedTests: [
        'jump',
        'broadJump',
        'lateralHops',
        'reaction',
        'endurance',
      ],
    };
    return s;
  }

  it('kusurlu teknik lider sporun olasılığını DÜŞÜRÜR', () => {
    const clean = finalizeSession(fullSession(1));
    const flawed = finalizeSession(fullSession(2.0));

    const cleanTop = clean.recommendations![0];
    const flawedTop = flawed.recommendations![0];

    expect(cleanTop.pTopK).toBeDefined();
    expect(flawedTop.pTopK).toBeDefined();
    // Zincir kopuksa bu iki sayı BİREBİR aynı çıkar — testin asıl amacı bu.
    expect(flawedTop.pTopK).toBeLessThan(cleanTop.pTopK!);
  });

  it('zincir kopuk olsaydı çıktı bayt-bayt aynı olurdu (regresyon kilidi)', () => {
    const clean = JSON.stringify(
      finalizeSession(fullSession(1)).recommendations
    );
    const flawed = JSON.stringify(
      finalizeSession(fullSession(2.0)).recommendations
    );
    expect(flawed).not.toBe(clean);
  });
});
