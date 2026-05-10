/**
 * Sport recommendation + anthropometric percentile testleri.
 *
 * "14 spor profili arasında matching" mantığı kırılırsa yanlış spor önerilir.
 * Test koruyucu güvenlik.
 */

import { describe, expect, it } from 'vitest';
import {
  estimateBmiPercentile,
  estimateHeightPercentile,
  recommendSports,
  testScoresToVector,
} from './recommend';
import { SPORT_PROFILES } from './sportProfiles';

describe('SPORT_PROFILES — canonical liste', () => {
  it('14 spor profili (CLAUDE.md ve UI ile tutarlı)', () => {
    expect(SPORT_PROFILES).toHaveLength(14);
  });

  it('her sporun gereken alanları var', () => {
    for (const p of SPORT_PROFILES) {
      expect(p.sport).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.vector).toBeTypeOf('object');
      expect(p.weights).toBeTypeOf('object');
      expect(p.anthroFavor).toBeTypeOf('object');
    }
  });
});

describe('testScoresToVector', () => {
  it('tüm 0-100 skorları 0-1 vector\'a çevirir', () => {
    const v = testScoresToVector({
      jumpScore: 80,
      broadJumpScore: 50,
      balanceScore: 100,
      reactionScore: 0,
      agilityScore: 75,
      coordScore: 25,
      enduranceScore: 60,
    });
    expect(v.explosivePower).toBeCloseTo(0.8, 5);
    expect(v.balance).toBeCloseTo(1.0, 5);
    expect(v.reaction).toBeCloseTo(0, 5);
    expect(v.coordination).toBeCloseTo(0.25, 5);
  });

  it('null/undefined skorları 0.5 (popülasyon medyanı) ile doldurur', () => {
    const v = testScoresToVector({});
    expect(v.explosivePower).toBe(0.5);
    expect(v.balance).toBe(0.5);
    expect(v.reaction).toBe(0.5);
  });

  it('out-of-range değerler 0..1 clamp edilir', () => {
    const v = testScoresToVector({ jumpScore: 150 });
    expect(v.explosivePower).toBe(1);
    const v2 = testScoresToVector({ jumpScore: -10 });
    expect(v2.explosivePower).toBe(0);
  });
});

describe('recommendSports', () => {
  it('topN sport döndürür (default 5)', () => {
    const child = testScoresToVector({
      jumpScore: 80,
      broadJumpScore: 70,
      balanceScore: 60,
      reactionScore: 75,
      agilityScore: 70,
      coordScore: 65,
      enduranceScore: 60,
    });
    const recs = recommendSports(child, null);
    expect(recs).toHaveLength(5);
    // Sıralı: en yüksek finalScore başta
    for (let i = 0; i < recs.length - 1; i++) {
      expect(recs[i].finalScore).toBeGreaterThanOrEqual(recs[i + 1].finalScore);
    }
  });

  it('topN parametresi limit edebilir', () => {
    const child = testScoresToVector({ jumpScore: 80 });
    expect(recommendSports(child, null, 3)).toHaveLength(3);
    expect(recommendSports(child, null, 10)).toHaveLength(10);
  });

  it('confidencePercent 0-100 aralığında ve finalScore × 100 = confidencePercent', () => {
    const child = testScoresToVector({ jumpScore: 80 });
    const recs = recommendSports(child, null);
    for (const r of recs) {
      expect(r.confidencePercent).toBeGreaterThanOrEqual(0);
      expect(r.confidencePercent).toBeLessThanOrEqual(100);
      expect(r.confidencePercent).toBe(Math.round(r.finalScore * 100));
    }
  });

  it('antropometrik bonus aralığı [0, 0.15]', () => {
    const child = testScoresToVector({ jumpScore: 80 });
    const recs = recommendSports(child, {
      heightPercentile: 95,
      bmiPercentile: 10,
    });
    for (const r of recs) {
      expect(r.anthroBonus).toBeGreaterThanOrEqual(0);
      expect(r.anthroBonus).toBeLessThanOrEqual(0.15);
    }
  });

  it('explosive + reaction baskın profil → top 5\'te güç odaklı sporlar', () => {
    const child = testScoresToVector({
      jumpScore: 95,
      broadJumpScore: 80,
      reactionScore: 90,
      balanceScore: 70,
      agilityScore: 85,
      coordScore: 80,
      enduranceScore: 60,
    });
    const recs = recommendSports(child, null);
    const top5Sports = recs.map((r) => r.sport.toLowerCase());
    // En az bir patlayıcı/reaksiyon-yoğun spor top 5'te olmalı
    const explosiveSports = [
      'voleybol',
      'basketbol',
      'badminton',
      'tenis',
      'taekwondo',
      'boks',
      'atletizm — sprint',
    ];
    const hasExplosive = top5Sports.some((s) =>
      explosiveSports.some((e) => s.includes(e.split(' ')[0]))
    );
    expect(hasExplosive).toBe(true);
  });
});

describe('estimateHeightPercentile', () => {
  it('medyan boy → ~50. persentil', () => {
    // 12 yaş erkek medyan = 149cm
    const p = estimateHeightPercentile(149, 12, 'male');
    expect(p).toBeGreaterThan(40);
    expect(p).toBeLessThan(60);
  });

  it('+1 SD (7cm) → ~84. persentil', () => {
    const p = estimateHeightPercentile(156, 12, 'male');
    expect(p).toBeGreaterThan(78);
    expect(p).toBeLessThan(90);
  });

  it('cinsiyet farkı yansır', () => {
    const male = estimateHeightPercentile(150, 12, 'male');
    const female = estimateHeightPercentile(150, 12, 'female');
    expect(male).not.toBe(female);
  });
});

describe('estimateBmiPercentile', () => {
  it('normal BMI → ~50. persentil civarı', () => {
    // 12 yaş erkek norm BMI = 17.5, h=149cm, kg = 17.5 * 1.49^2 = 38.84kg
    const p = estimateBmiPercentile(149, 38.8, 12, 'male');
    expect(p).toBeGreaterThan(40);
    expect(p).toBeLessThan(60);
  });

  it('yüksek BMI → yüksek persentil', () => {
    // Same h, weight +6kg
    const p = estimateBmiPercentile(149, 45, 12, 'male');
    expect(p).toBeGreaterThan(70);
  });
});
