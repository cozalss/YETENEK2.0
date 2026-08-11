/**
 * Probit testleri.
 *
 * Bu fonksiyon z-uzayı birleştirmesinin temeli: sessizce yanlış olursa
 * spor sıralaması bozulur ve hiçbir şey uyarmaz. Bilinen tablo değerleri +
 * `normalCdf` ile gidiş-dönüş tutarlılığı ile sınanıyor.
 */

import { describe, expect, it } from 'vitest';
import { normalCdf } from './normalCdf';
import { percentileToZ, probit, zToPercentile } from './probit';

describe('probit — bilinen tablo değerleri', () => {
  it.each([
    { p: 0.5, z: 0 },
    { p: 0.8413447461, z: 1 },
    { p: 0.1586552539, z: -1 },
    { p: 0.9772498681, z: 2 },
    { p: 0.0227501319, z: -2 },
    { p: 0.9986501020, z: 3 },
    { p: 0.975, z: 1.959964 },
    { p: 0.95, z: 1.644854 },
    { p: 0.99, z: 2.326348 },
  ])('Φ⁻¹($p) ≈ $z', ({ p, z }) => {
    expect(probit(p)).toBeCloseTo(z, 5);
  });
});

// Gidiş-dönüş testlerinin hassasiyetini `probit` DEĞİL, `normalCdf` belirliyor:
// Φ implementasyonumuz (A&S 26.2.17) ±7.5e-8 hatalı, Acklam ise 1.15e-9.
// Kuyruğa gidildikçe Φ'nin hatası z'ye 1/φ(z) ile büyüyerek yansır
// (z=3'te ×226, z=4'te ×7460), o yüzden tolerans z ile gevşetiliyor.
// Bu bir zayıflık değil, yığının gerçek çözünürlüğünün dürüst kaydı.
describe('probit — normalCdf ile gidiş-dönüş', () => {
  it('Φ(Φ⁻¹(p)) = p, tüm aralıkta (Φ hata bütçesi içinde)', () => {
    for (let i = 1; i < 1000; i++) {
      const p = i / 1000;
      expect(normalCdf(probit(p))).toBeCloseTo(p, 6);
    }
  });

  it('Φ⁻¹(Φ(z)) = z, ±3σ aralığında', () => {
    for (let z = -3; z <= 3; z += 0.05) {
      expect(probit(normalCdf(z))).toBeCloseTo(z, 4);
    }
  });

  it('±4σ kuyruğunda da 1e-3 içinde kalır', () => {
    for (const z of [-4, -3.5, 3.5, 4]) {
      expect(probit(normalCdf(z))).toBeCloseTo(z, 3);
    }
  });

  it('uç kuyruklarda da makul kalır', () => {
    expect(probit(1e-6)).toBeCloseTo(-4.7534, 3);
    expect(probit(1 - 1e-6)).toBeCloseTo(4.7534, 3);
  });
});

describe('probit — sınır ve bozuk girdi', () => {
  it('p ≤ 0 ve p ≥ 1 sonsuz yerine sınırlı değer verir', () => {
    expect(probit(0)).toBe(-8.3);
    expect(probit(1)).toBe(8.3);
    expect(probit(-5)).toBe(-8.3);
    expect(probit(42)).toBe(8.3);
  });

  it('NaN girdide 0 döner (medyan) — hesabı çökertmez', () => {
    expect(probit(Number.NaN)).toBe(0);
    expect(probit(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('monoton artan', () => {
    let prev = -Infinity;
    for (let i = 1; i < 200; i++) {
      const z = probit(i / 200);
      expect(z).toBeGreaterThan(prev);
      prev = z;
    }
  });
});

describe('percentileToZ / zToPercentile', () => {
  it('50. persentil → z = 0', () => {
    expect(percentileToZ(50)).toBeCloseTo(0, 8);
  });

  it('84. persentil → z ≈ +1', () => {
    expect(percentileToZ(84.1344746)).toBeCloseTo(1, 5);
  });

  it('uç persentiller ±2.58σ ile sınırlanır — norm çözünürlüğü ötesi yok', () => {
    expect(percentileToZ(0)).toBeCloseTo(-2.5758, 3);
    expect(percentileToZ(100)).toBeCloseTo(2.5758, 3);
    // Kod içindeki clamp [1,99] zaten bu aralıkta kalıyor.
    expect(percentileToZ(1)).toBeGreaterThan(-2.5758);
    expect(percentileToZ(99)).toBeLessThan(2.5758);
  });

  it('zToPercentile tersini verir', () => {
    for (const p of [5, 25, 50, 75, 95]) {
      // Persentil ölçeğinde Φ'nin 7.5e-8 hatası ×100 → ~1e-5.
      expect(zToPercentile(percentileToZ(p))).toBeCloseTo(p, 4);
    }
  });
});
