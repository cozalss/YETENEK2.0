/**
 * Güvenilirlik istatistikleri testleri.
 *
 * Pilot günü bu fonksiyonların doğruluğunu tartışacak vakit olmayacak; şimdi
 * bilinen referans değerlerle sabitleniyorlar.
 */

import { describe, expect, it } from 'vitest';
import { agreement, cohensKappa, icc21 } from './reliability';

describe('icc21', () => {
  it('mükemmel tekrarlanabilirlikte ICC ≈ 1', () => {
    const data = [
      [10, 10],
      [20, 20],
      [30, 30],
      [40, 40],
    ];
    expect(icc21(data)!.icc).toBeCloseTo(1, 6);
    expect(icc21(data)!.interpretation).toBe('excellent');
  });

  it('tamamen gürültüde ICC düşük', () => {
    const data = [
      [10, 40],
      [40, 10],
      [20, 30],
      [30, 20],
    ];
    expect(icc21(data)!.icc).toBeLessThan(0.5);
    expect(icc21(data)!.interpretation).toBe('poor');
  });

  it('sistematik kayma (öğrenme etkisi) güvenilirliği DÜŞÜRÜR', () => {
    // Mutlak uyum varyantının asıl sebebi bu: ikinci oturumda herkes +10
    // yapıyorsa sıralama korunsa bile ölçüm tekrarlanabilir değildir.
    const noShift = [
      [10, 10],
      [20, 20],
      [30, 30],
      [40, 40],
    ];
    const withShift = [
      [10, 20],
      [20, 30],
      [30, 40],
      [40, 50],
    ];
    expect(icc21(withShift)!.icc).toBeLessThan(icc21(noShift)!.icc);
  });

  it('yorum bantları Koo & Li 2016 ile uyumlu', () => {
    // Bantların sınırlarını doğrudan sınamak için ICC'yi kaba kuvvetle
    // aramak yerine dönen etiketin tutarlılığını kontrol ediyoruz.
    const r = icc21([
      [10, 11],
      [20, 22],
      [30, 28],
      [40, 41],
      [50, 52],
    ])!;
    expect(r.icc).toBeGreaterThan(0.9);
    expect(r.interpretation).toBe('excellent');
  });

  it('yetersiz veride null döner — sayı uydurmaz', () => {
    expect(icc21([])).toBeNull();
    expect(icc21([[1, 2]])).toBeNull();
    expect(icc21([[1], [2]])).toBeNull();
  });

  it('düzensiz satır uzunluğunda null döner', () => {
    expect(icc21([[1, 2], [3]])).toBeNull();
  });

  it('NaN içeren veride null döner', () => {
    expect(
      icc21([
        [1, 2],
        [Number.NaN, 4],
      ])
    ).toBeNull();
  });

  it('hiç varyans yoksa null döner (bölme sıfıra)', () => {
    expect(
      icc21([
        [5, 5],
        [5, 5],
      ])
    ).toBeNull();
  });

  it('denek ve oturum sayısını raporlar', () => {
    const r = icc21([
      [1, 2, 3],
      [4, 5, 6],
    ])!;
    expect(r.subjects).toBe(2);
    expect(r.sessions).toBe(3);
  });
});

describe('cohensKappa', () => {
  it('tam uyumda κ = 1', () => {
    const r = cohensKappa([true, false, true, false], [true, false, true, false])!;
    expect(r.kappa).toBeCloseTo(1, 10);
  });

  it('şans düzeyinde uyumda κ ≈ 0', () => {
    const a = [true, true, false, false];
    const b = [true, false, true, false];
    expect(cohensKappa(a, b)!.kappa).toBeCloseTo(0, 6);
  });

  it('baskın sınıfta yüksek ham uyumu şişirmez — κ\'nın varlık sebebi', () => {
    // 10 denemenin 9'u geçerli. Her şeye "geçerli" diyen hakem %90 ham uyum
    // alır ama hiçbir şey ayırt etmiyordur.
    const truth = [true, true, true, true, true, true, true, true, true, false];
    const lazy = new Array(10).fill(true);
    const r = cohensKappa(truth, lazy)!;
    expect(r.observedAgreement).toBeCloseTo(0.9, 6);
    expect(r.kappa).toBeLessThan(0.1);
  });

  it('çok sınıflı etiketlerle çalışır', () => {
    const a = ['valid', 'invalid', 'valid', 'retry'];
    const b = ['valid', 'invalid', 'retry', 'retry'];
    const r = cohensKappa(a, b)!;
    expect(r.kappa).toBeGreaterThan(0);
    expect(r.kappa).toBeLessThan(1);
  });

  it('boş veya uyumsuz uzunlukta null döner', () => {
    expect(cohensKappa([], [])).toBeNull();
    expect(cohensKappa([true], [true, false])).toBeNull();
  });
});

describe('agreement (Bland-Altman)', () => {
  it('sistematik sapmayı rastgele hatadan ayırır', () => {
    // Her ölçüm referanstan tam +2 sapıyor: bias 2, rastgele hata 0.
    const measured = [12, 22, 32, 42];
    const reference = [10, 20, 30, 40];
    const r = agreement(measured, reference)!;
    expect(r.bias).toBeCloseTo(2, 10);
    expect(r.mae).toBeCloseTo(2, 10);
    expect(r.limitsOfAgreement[0]).toBeCloseTo(2, 10);
    expect(r.limitsOfAgreement[1]).toBeCloseTo(2, 10);
  });

  it('sapmasız ama gürültülü ölçümde bias ≈ 0, MAE > 0', () => {
    const measured = [11, 19, 31, 39];
    const reference = [10, 20, 30, 40];
    const r = agreement(measured, reference)!;
    expect(r.bias).toBeCloseTo(0, 10);
    expect(r.mae).toBeGreaterThan(0);
    // Uyum sınırları sıfırın iki yanına açılmalı.
    expect(r.limitsOfAgreement[0]).toBeLessThan(0);
    expect(r.limitsOfAgreement[1]).toBeGreaterThan(0);
  });

  it('uyumsuz uzunlukta null döner', () => {
    expect(agreement([1, 2], [1])).toBeNull();
  });
});
