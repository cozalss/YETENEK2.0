/**
 * `finalizeSession` — kapsam beyanı testleri (`matchExcludedDimensions`/
 * `matchMissingDimensions`). `decide()` bu iki alanı hep hesaplıyordu ama
 * eskiden hiçbir yere yazılmıyordu; bu test o kablonun koptuğunu bir daha
 * fark etmeden bırakmamak için var (bkz. `MatchScopeNote`).
 */

import { describe, expect, it } from 'vitest';
import { finalizeSession } from './finalize-session';
import { emptySession, type Session } from '@/core/domain/session';

function sessionWithOnlyJump(ageYears = 11): Session {
  const base = emptySession({ name: 'Test', ageYears, sex: 'male' });
  return {
    ...base,
    jump: {
      jumpHeightCm: 30,
      jumpUnits: 0.12,
      flightTimeMs: 450,
      score: 70,
    },
    completedTests: ['jump'],
  };
}

describe('finalizeSession — matchExcludedDimensions', () => {
  it('denge ve koordinasyon her zaman hariç — norm tablosu yok', () => {
    const result = finalizeSession(sessionWithOnlyJump());
    expect([...(result.matchExcludedDimensions ?? [])].sort()).toEqual([
      'balance',
      'coordination',
    ]);
  });

  it('ölçülmeyen boyutlar matchMissingDimensions\'a düşer, denge/koordinasyon değil', () => {
    const result = finalizeSession(sessionWithOnlyJump());
    const missing = [...(result.matchMissingDimensions ?? [])].sort();
    // explosivePower ölçüldü (jump) → missing'de OLMAMALI.
    expect(missing).not.toContain('explosivePower');
    // balance/coordination zaten excludedByNorm'da — missing'de tekrar
    // etmemeli (iki liste ayrık olmalı).
    expect(missing).not.toContain('balance');
    expect(missing).not.toContain('coordination');
    // Ölçülmeyen diğer 4 boyut missing'de olmalı.
    expect(missing).toEqual(
      ['agility', 'endurance', 'horizontalPower', 'reaction'].sort()
    );
  });

  it('hiç test yoksa session dokunulmamış döner — matchExcludedDimensions da yazılmaz', () => {
    const empty = emptySession({ name: 'Test', ageYears: 11, sex: 'male' });
    const result = finalizeSession(empty);
    expect(result.matchExcludedDimensions).toBeUndefined();
    expect(result.completedAt).toBeUndefined();
  });
});
