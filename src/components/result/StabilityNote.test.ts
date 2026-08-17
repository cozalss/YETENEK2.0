/**
 * Kararlılık uyarısı — metnin dürüstlük sözleşmesi.
 *
 * Bu metin ürünün en zayıf iddiasını kullanıcıya söylüyor. Sessizce
 * yumuşatılması veya sayının kaynağının gizlenmesi, uyarının varlık sebebini
 * yok eder — o yüzden sözleşme test altında.
 */

import { describe, expect, it } from 'vitest';
import { TOP1_STABILITY } from './StabilityNote';

describe('TOP1_STABILITY sabiti', () => {
  it('ölçülen değerle uyumlu (%74.7 → 0.75)', () => {
    expect(TOP1_STABILITY).toBeCloseTo(0.75, 2);
  });

  it('makul aralıkta — 1.0 yapılırsa uyarı anlamsızlaşır', () => {
    expect(TOP1_STABILITY).toBeGreaterThan(0.5);
    expect(TOP1_STABILITY).toBeLessThan(1);
  });
});
