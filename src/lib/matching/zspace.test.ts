/**
 * z-uzayı testleri.
 *
 * Burası spor sıralamasının dayandığı matematik. Sessizce bozulursa çocuğa
 * yanlış spor önerilir ve hiçbir şey uyarmaz — o yüzden yalnızca "çalışıyor mu"
 * değil, **doğru davranıyor mu** sınanıyor: kalibresiz eksen gerçekten dışarıda
 * mı, mesafe simetrik mi, benzerlik monoton mu.
 */

import { describe, expect, it } from 'vitest';
import { SPORT_PROFILES, type SportVector } from './sportProfiles';
import {
  DIMENSION_NORMS,
  EXCLUDED_DIMENSIONS,
  SCORED_DIMENSIONS,
  SIMILARITY_TAU,
  buildZProfile,
  profileValueToZ,
  sigmaForDimension,
  similarityFromZDistance,
  zDistance,
} from './zspace';

const flat = (v: number): SportVector => ({
  explosivePower: v,
  horizontalPower: v,
  balance: v,
  reaction: v,
  agility: v,
  coordination: v,
  endurance: v,
});

describe('Norm kayıt defteri — dürüstlük sözleşmesi', () => {
  it('kalibresiz eksenler mesafeden ÇIKARILMIŞ', () => {
    expect(EXCLUDED_DIMENSIONS).toContain('balance');
    expect(EXCLUDED_DIMENSIONS).toContain('coordination');
    expect(SCORED_DIMENSIONS).not.toContain('balance');
    expect(SCORED_DIMENSIONS).not.toContain('coordination');
  });

  it('yalnız 3 eksen tam kalibre — geri kalanı olduğundan iyi göstermiyoruz', () => {
    const calibrated = SCORED_DIMENSIONS.filter(
      (d) => DIMENSION_NORMS[d].confidence === 'calibrated'
    );
    expect(calibrated).toEqual([
      'explosivePower',
      'horizontalPower',
      'agility',
    ]);
  });

  it('SD tahmini olan eksenler belirsizliklerini şişiriyor', () => {
    // Aynı z değerinde partial eksen calibrated'dan daha belirsiz olmalı.
    const cal = sigmaForDimension('explosivePower', 1.5);
    const par = sigmaForDimension('reaction', 1.5);
    expect(par).toBeGreaterThan(cal);
  });

  it('partial eksende belirsizlik |z| ile büyür, calibrated eksende sabit', () => {
    expect(sigmaForDimension('reaction', 2)).toBeGreaterThan(
      sigmaForDimension('reaction', 0)
    );
    expect(sigmaForDimension('explosivePower', 2)).toBeCloseTo(
      sigmaForDimension('explosivePower', 0),
      10
    );
  });

  it('her boyutun kaynağı belgeli — sessiz varsayım yok', () => {
    for (const norm of Object.values(DIMENSION_NORMS)) {
      expect(norm.source.length).toBeGreaterThan(10);
    }
  });
});

describe('profileValueToZ', () => {
  it('0.5 → z = 0 (medyan)', () => {
    expect(profileValueToZ(0.5)).toBeCloseTo(0, 8);
  });

  it('monoton artan', () => {
    let prev = -Infinity;
    for (let v = 0; v <= 1; v += 0.05) {
      const z = profileValueToZ(v);
      expect(z).toBeGreaterThan(prev);
      prev = z;
    }
  });

  it('uçlar sonsuza gitmiyor — norm çözünürlüğüyle sınırlı', () => {
    expect(Number.isFinite(profileValueToZ(0))).toBe(true);
    expect(Number.isFinite(profileValueToZ(1))).toBe(true);
    expect(Math.abs(profileValueToZ(1))).toBeLessThan(3);
  });

  it('aralık dışı girdi güvenle sıkıştırılır', () => {
    expect(profileValueToZ(-5)).toBe(profileValueToZ(0));
    expect(profileValueToZ(9)).toBe(profileValueToZ(1));
  });
});

describe('buildZProfile', () => {
  it('kalibresiz eksen verilse bile profile GİRMEZ', () => {
    const p = buildZProfile({ balance: 2.0, coordination: 1.5, agility: 0.5 });
    expect(p.z.balance).toBeUndefined();
    expect(p.z.coordination).toBeUndefined();
    expect(p.z.agility).toBeCloseTo(0.5, 8);
  });

  it('ölçülmemiş boyut missingMeasurement içinde raporlanır', () => {
    const p = buildZProfile({ agility: 0.5 });
    expect(p.missingMeasurement).toContain('explosivePower');
    expect(p.missingMeasurement).not.toContain('agility');
  });

  it('norm çözünürlüğü dışına taşan z sıkıştırılır', () => {
    const p = buildZProfile({ explosivePower: 10 });
    expect(p.z.explosivePower).toBeCloseTo(2.58, 2);
  });

  it('null ve NaN eksik sayılır, 0 gibi davranmaz', () => {
    const p = buildZProfile({
      explosivePower: null,
      horizontalPower: Number.NaN,
    });
    expect(p.z.explosivePower).toBeUndefined();
    expect(p.z.horizontalPower).toBeUndefined();
    expect(p.missingMeasurement).toContain('explosivePower');
    expect(p.missingMeasurement).toContain('horizontalPower');
  });

  it('her ölçülen boyut için σ üretilir', () => {
    const p = buildZProfile({ explosivePower: 1, reaction: -1 });
    expect(p.sigma.explosivePower).toBeGreaterThan(0);
    expect(p.sigma.reaction).toBeGreaterThan(0);
  });
});

describe('zDistance', () => {
  const w = flat(1);

  it('hedefe tam oturan çocukta mesafe 0', () => {
    // Profil 0.5 → z 0; çocuk z 0 → mesafe 0.
    const child = buildZProfile({
      explosivePower: 0,
      horizontalPower: 0,
      agility: 0,
      reaction: 0,
      endurance: 0,
    });
    expect(zDistance(child, flat(0.5), w)).toBeCloseTo(0, 8);
  });

  it('sapma büyüdükçe mesafe büyür', () => {
    const near = buildZProfile({ explosivePower: 0.2, agility: 0.2 });
    const far = buildZProfile({ explosivePower: 2.0, agility: 2.0 });
    const d1 = zDistance(near, flat(0.5), w)!;
    const d2 = zDistance(far, flat(0.5), w)!;
    expect(d2).toBeGreaterThan(d1);
  });

  it('kalibresiz boyutlar mesafeyi ETKİLEMEZ', () => {
    const a = buildZProfile({ agility: 1 });
    const b = buildZProfile({ agility: 1, balance: 2.5, coordination: -2.5 });
    expect(zDistance(a, flat(0.5), w)).toBeCloseTo(
      zDistance(b, flat(0.5), w)!,
      10
    );
  });

  it('hiç ortak boyut yoksa null döner — sıfır uydurmaz', () => {
    const empty = buildZProfile({});
    expect(zDistance(empty, flat(0.5), w)).toBeNull();
  });

  it('ağırlık normalizasyonu ölçekten bağımsız', () => {
    const child = buildZProfile({ explosivePower: 1, agility: -1 });
    const d1 = zDistance(child, flat(0.5), flat(1))!;
    const d2 = zDistance(child, flat(0.5), flat(7))!;
    expect(d1).toBeCloseTo(d2, 10);
  });

  it('eksik boyutun ağırlığı kalanlara dağılır', () => {
    // Tek boyut ölçülmüşse mesafe o boyutun mutlak sapmasına eşit olmalı.
    const child = buildZProfile({ explosivePower: 1.5 });
    const d = zDistance(child, flat(0.5), w)!;
    expect(d).toBeCloseTo(1.5, 8);
  });
});

describe('similarityFromZDistance', () => {
  it('mesafe 0 → benzerlik 1', () => {
    expect(similarityFromZDistance(0)).toBeCloseTo(1, 10);
  });

  it('monoton azalan ve daima (0,1] aralığında', () => {
    let prev = 2;
    for (let d = 0; d <= 6; d += 0.25) {
      const s = similarityFromZDistance(d);
      expect(s).toBeLessThan(prev);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(1);
      prev = s;
    }
  });

  it('τ ölçeğinde beklenen değerleri verir', () => {
    expect(similarityFromZDistance(SIMILARITY_TAU)).toBeCloseTo(
      Math.exp(-0.5),
      8
    );
  });

  it('eski metrikten daha geniş ayrıştırma sağlar', () => {
    // Eski: 1 − d, d∈[0,1] → medyan çocukta hepsi 0.55-0.75'e sıkışıyordu.
    // Yeni: 1σ ile 2σ sapma arasında en az 2 kat fark olmalı.
    const s1 = similarityFromZDistance(1);
    const s2 = similarityFromZDistance(2);
    expect(s1 / s2).toBeGreaterThan(2);
  });
});

describe('Gerçek spor profilleriyle davranış', () => {
  it('patlayıcı güç yüksek çocuk voleybolu masa tenisine tercih eder', () => {
    const child = buildZProfile({
      explosivePower: 2.0,
      horizontalPower: 0.5,
      agility: 0.5,
      reaction: 0,
      endurance: 0,
    });
    const voleybol = SPORT_PROFILES.find((s) => s.sport === 'Voleybol')!;
    const masaTenisi = SPORT_PROFILES.find((s) => s.sport === 'Masa Tenisi')!;

    const dV = zDistance(child, voleybol.vector, voleybol.weights)!;
    const dM = zDistance(child, masaTenisi.vector, masaTenisi.weights)!;
    expect(dV).toBeLessThan(dM);
  });

  it('reaksiyonu güçlü çocuk masa tenisini voleybola tercih eder', () => {
    const child = buildZProfile({
      explosivePower: -0.5,
      horizontalPower: -0.5,
      agility: 0.3,
      reaction: 2.2,
      endurance: -0.3,
    });
    const voleybol = SPORT_PROFILES.find((s) => s.sport === 'Voleybol')!;
    const masaTenisi = SPORT_PROFILES.find((s) => s.sport === 'Masa Tenisi')!;

    const dV = zDistance(child, voleybol.vector, voleybol.weights)!;
    const dM = zDistance(child, masaTenisi.vector, masaTenisi.weights)!;
    expect(dM).toBeLessThan(dV);
  });

  it('dayanıklılığı yüksek çocuk yüzmeyi atletizme tercih eder', () => {
    const child = buildZProfile({
      explosivePower: -0.3,
      horizontalPower: -0.8,
      agility: -0.8,
      reaction: -0.5,
      endurance: 2.2,
    });
    const yuzme = SPORT_PROFILES.find((s) => s.sport === 'Yüzme')!;
    const atletizm = SPORT_PROFILES.find((s) => s.sport === 'Atletizm')!;

    const dY = zDistance(child, yuzme.vector, yuzme.weights)!;
    const dA = zDistance(child, atletizm.vector, atletizm.weights)!;
    expect(dY).toBeLessThan(dA);
  });

  it('12 sporun hepsi için mesafe hesaplanabiliyor', () => {
    const child = buildZProfile({
      explosivePower: 0.5,
      horizontalPower: 0.2,
      agility: 0.8,
      reaction: 0.1,
      endurance: -0.2,
    });
    for (const p of SPORT_PROFILES) {
      const d = zDistance(child, p.vector, p.weights);
      expect(d).not.toBeNull();
      expect(Number.isFinite(d!)).toBe(true);
    }
  });
});
