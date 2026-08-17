/**
 * Karar katmanı testleri.
 *
 * Çıktı artık bir olasılık iddiası taşıyor ("%78 ihtimalle ilk 3'te"), yani
 * yanlış olması mümkün bir iddia. Testler bu iddianın iç tutarlılığını
 * zorluyor: olasılıklar toplamı doğru mu, belirsizlik arttıkça aralık
 * genişliyor mu, aynı girdi aynı çıktıyı veriyor mu.
 */

import { describe, expect, it } from 'vitest';
import { buildZProfile } from '@/lib/matching/zspace';
import { decide, wilsonInterval } from './decide';

const explosiveChild = () =>
  buildZProfile({
    explosivePower: 2.0,
    horizontalPower: 1.2,
    agility: 0.8,
    reaction: 0.3,
    endurance: -0.2,
  });

const enduranceChild = () =>
  buildZProfile({
    explosivePower: -0.6,
    horizontalPower: -0.8,
    agility: -0.5,
    reaction: -0.4,
    endurance: 2.2,
  });

describe('wilsonInterval', () => {
  it('p=0.5, n=100 → simetrik ve makul genişlikte', () => {
    const [lo, hi] = wilsonInterval(50, 100);
    expect(lo).toBeGreaterThan(0.39);
    expect(hi).toBeLessThan(0.61);
    expect((lo + hi) / 2).toBeCloseTo(0.5, 2);
  });

  it('p=0 ve p=1'.concat(' sıfır genişlik vermez — normal yaklaşımın hatası'), () => {
    const [lo0, hi0] = wilsonInterval(0, 100);
    expect(hi0).toBeGreaterThan(0);
    const [lo1, hi1] = wilsonInterval(100, 100);
    expect(lo1).toBeLessThan(1);
    // Aralık her zaman [0,1] içinde kalır.
    expect(lo0).toBeGreaterThanOrEqual(0);
    expect(hi1).toBeLessThanOrEqual(1);
  });

  it('örneklem büyüdükçe aralık daralır', () => {
    const wide = wilsonInterval(50, 100);
    const narrow = wilsonInterval(500, 1000);
    expect(narrow[1] - narrow[0]).toBeLessThan(wide[1] - wide[0]);
  });

  it('n=0 → tam belirsizlik', () => {
    expect(wilsonInterval(0, 0)).toEqual([0, 1]);
  });
});

describe('decide — olasılıkların iç tutarlılığı', () => {
  const d = decide(explosiveChild(), { topN: 12, samples: 2000 });
  /**
   * Olasılık artık spor bazlı geri çekilebiliyor: ağırlığının çoğu
   * ölçülemeyen bir spor (Cimnastik %61.4, Masa Tenisi %65.1) yüzde iddiası
   * taşımıyor. Tutarlılık kontrolleri bu yüzden yalnız iddia taşıyanlar
   * üzerinde yapılıyor.
   */
  const claimed = d.ranking.filter((r) => r.pTopK != null);

  it('en az bir spor olasılık taşıyor', () => {
    expect(claimed.length).toBeGreaterThan(0);
  });

  it('her olasılık [0,1] aralığında', () => {
    for (const r of claimed) {
      expect(r.pTopK!).toBeGreaterThanOrEqual(0);
      expect(r.pTopK!).toBeLessThanOrEqual(1);
      expect(r.pTopOne!).toBeGreaterThanOrEqual(0);
      expect(r.pTopOne!).toBeLessThanOrEqual(1);
    }
  });

  it('ilk-3 olasılıkları toplami 3 sinirini asmaz', () => {
    // Her örneklemde tam 3 spor seçiliyor; geri çekilenler toplamdan
    // düştüğü için eşitlik değil üst sınır kontrol ediliyor.
    const total = claimed.reduce((s, r) => s + (r.pTopK ?? 0), 0);
    expect(total).toBeLessThanOrEqual(3 + 1e-9);
    expect(total).toBeGreaterThan(0);
  });

  it('MC sayımları bütün sporlar üzerinden hâlâ tutarlı', () => {
    // `mcPrecision` geri çekilme durumundan bağımsız, ham sayımdan geliyor —
    // yani Monte Carlonun kendi tutarlılığını buradan doğrulayabiliyoruz.
    const mid = (r: (typeof d.ranking)[number]) =>
      (r.mcPrecision[0] + r.mcPrecision[1]) / 2;
    const total = d.ranking.reduce((s, r) => s + mid(r), 0);
    expect(total).toBeCloseTo(3, 0);
  });

  it('birincilik olasılığı ilk-3 olasılığını aşamaz', () => {
    for (const r of claimed) {
      expect(r.pTopOne!).toBeLessThanOrEqual(r.pTopK! + 1e-9);
    }
  });

  it('güven aralığı nokta tahminini kapsar', () => {
    for (const r of claimed) {
      expect(r.pTopK!).toBeGreaterThanOrEqual(r.mcPrecision[0] - 1e-9);
      expect(r.pTopK!).toBeLessThanOrEqual(r.mcPrecision[1] + 1e-9);
    }
  });

  it('olasılık taşıyanlar kendi aralarında azalan sırada', () => {
    for (let i = 1; i < claimed.length; i++) {
      expect(claimed[i].pTopK!).toBeLessThanOrEqual(claimed[i - 1].pTopK!);
    }
  });
});

describe('decide — kapsam kapısı (taban oran çarpıklığı düzeltmesi)', () => {
  const d = decide(explosiveChild(), { topN: 12, samples: 1000 });

  it('ağırlığının çoğu ölçülemeyen spor yüzde İDDİA ETMEZ', () => {
    // Ölçülen: Cimnastik kapsamı %61.4, Masa Tenisi %65.1 — eşik %70.
    // Bu ikisi 2500 sentetik çocukta en çok fazla-önerilen sporlardı.
    for (const sport of ['Cimnastik', 'Masa Tenisi']) {
      const r = d.ranking.find((x) => x.sport === sport)!;
      expect(r.weightCoverage, sport).toBeLessThan(0.7);
      expect(r.pTopK, sport).toBeNull();
      expect(r.probabilityWithheldReason, sport).toBeTruthy();
    }
  });

  it('kapsamı yeterli spor iddiasını korur', () => {
    const atletizm = d.ranking.find((x) => x.sport === 'Atletizm')!;
    expect(atletizm.weightCoverage).toBeGreaterThan(0.7);
    expect(atletizm.pTopK).not.toBeNull();
    expect(atletizm.probabilityWithheldReason).toBeNull();
  });

  it('geri çekme sebebi hangi boyutların eksik olduğunu SÖYLER', () => {
    const cim = d.ranking.find((x) => x.sport === 'Cimnastik')!;
    expect(cim.probabilityWithheldReason).toContain('balance');
    expect(cim.probabilityWithheldReason).toContain('coordination');
  });

  it('spor sıralamadan ATILMIYOR — yalnız iddia geri çekiliyor', () => {
    expect(d.ranking.map((r) => r.sport)).toContain('Cimnastik');
  });
});

describe('decide — determinizm ve tekrarlanabilirlik', () => {
  it('aynı ölçüm her zaman aynı sonucu verir', () => {
    const a = decide(explosiveChild(), { samples: 500 });
    const b = decide(explosiveChild(), { samples: 500 });
    expect(a.ranking.map((r) => [r.sport, r.pTopK])).toEqual(
      b.ranking.map((r) => [r.sport, r.pTopK])
    );
  });

  it('farklı çocuk farklı sonuç verir', () => {
    const a = decide(explosiveChild(), { samples: 500 });
    const b = decide(enduranceChild(), { samples: 500 });
    expect(a.ranking[0].sport).not.toBe(b.ranking[0].sport);
  });
});

describe('decide — belirsizlik davranışı', () => {
  it('σ çarpanı büyüdükçe olasılıklar merkeze yaklaşır (daha az kesinlik)', () => {
    const sure = decide(explosiveChild(), { samples: 3000, sigmaMultiplier: 1 });
    const unsure = decide(explosiveChild(), {
      samples: 3000,
      sigmaMultiplier: 3,
    });
    // Kusurlu teknikte lider sporun ilk-3 olasılığı düşmeli.
    expect(unsure.ranking[0].pTopK!).toBeLessThan(sure.ranking[0].pTopK!);
  });

  it('daha çok örneklem MC hassasiyetini daraltır (çocuk belirsizliğini değil)', () => {
    const few = decide(explosiveChild(), { samples: 200 });
    const many = decide(explosiveChild(), { samples: 4000 });
    const w = (r: { mcPrecision: readonly [number, number] }) =>
      r.mcPrecision[1] - r.mcPrecision[0];
    expect(w(many.ranking[0])).toBeLessThan(w(few.ranking[0]));
  });
});

describe('decide — şeffaflık', () => {
  it('kalibresiz boyutlar çıktıda AÇIKÇA raporlanır', () => {
    const d = decide(explosiveChild(), { samples: 200 });
    expect(d.excludedByNorm).toContain('balance');
    expect(d.excludedByNorm).toContain('coordination');
  });

  it('ölçülmemiş boyutlar raporlanır', () => {
    const partial = buildZProfile({ explosivePower: 1 });
    const d = decide(partial, { samples: 200 });
    expect(d.missingMeasurement).toContain('agility');
  });

  it('hiç ölçüm yoksa boş sıralama döner — sayı uydurmaz', () => {
    const d = decide(buildZProfile({}), { samples: 200 });
    expect(d.ranking).toHaveLength(0);
    expect(d.samples).toBe(0);
  });
});

describe('decide — karşı-olgusal', () => {
  it('somut ve eyleme dönüşür bir hedef üretir', () => {
    const d = decide(explosiveChild(), { topN: 8, samples: 1000 });
    for (const c of d.counterfactuals) {
      expect(c.zDelta).toBeGreaterThan(0);
      expect(c.zDelta).toBeLessThanOrEqual(2);
      expect(d.excludedByNorm).not.toContain(c.dimension);
    }
  });

  it('en kolay ulaşılabilir hedefler önce sıralanır', () => {
    const d = decide(explosiveChild(), { topN: 8, samples: 1000 });
    for (let i = 1; i < d.counterfactuals.length; i++) {
      expect(d.counterfactuals[i].zDelta).toBeGreaterThanOrEqual(
        d.counterfactuals[i - 1].zDelta
      );
    }
  });
});

describe('decide — ayrıştırma gücü (eski metriğin asıl sorunu)', () => {
  it('medyan çocukta bile sporlar arasında anlamlı fark oluşur', () => {
    // Eski metrik burada 55-75 bandına sıkışıyordu ("over-matching").
    const median = buildZProfile({
      explosivePower: 0,
      horizontalPower: 0,
      agility: 0,
      reaction: 0,
      endurance: 0,
    });
    const d = decide(median, { topN: 12, samples: 3000 });
    const top = d.ranking[0].pTopK!;
    const bottom = d.ranking[d.ranking.length - 1].pTopK!;
    expect(top - bottom).toBeGreaterThan(0.3);
  });

  it('güçlü profilde lider spor belirgin şekilde öne çıkar', () => {
    const d = decide(enduranceChild(), { topN: 12, samples: 3000 });
    expect(d.ranking[0].pTopK!).toBeGreaterThan(0.8);
  });
});


describe('decide — doygunluk kapısı (adversarial inceleme bulgusu)', () => {
  it('tek boyut ölçülmüşse olasılık RAPORLANMAZ', () => {
    // Bulgu: tek CMJ ölçümüyle Tenis ve Boks similarity 0.32 iken %100
    // raporlanıyordu. P(ilk 3) o koşulda "uygunluk" ölçmüyor.
    const d = decide(buildZProfile({ explosivePower: -1.5 }), { samples: 500 });
    expect(d.probabilityReported).toBe(false);
    expect(d.probabilityWithheldReason).toBeTruthy();
    for (const r of d.ranking) expect(r.pTopK).toBeNull();
  });

  it('yeterli boyut ölçülmüşse olasılık raporlanır', () => {
    const d = decide(explosiveChild(), { samples: 500 });
    expect(d.probabilityReported).toBe(true);
    expect(d.ranking[0].pTopK).not.toBeNull();
  });

  it('olasılık verilmezken bile sıralama benzerliğe göre anlamlı', () => {
    const d = decide(buildZProfile({ explosivePower: -1.5 }), { samples: 500 });
    for (let i = 1; i < d.ranking.length; i++) {
      expect(d.ranking[i].similarity).toBeLessThanOrEqual(
        d.ranking[i - 1].similarity
      );
    }
  });
});

describe('decide — bonus baskınlığı sınırlandı', () => {
  const flatChild = () =>
    buildZProfile({
      explosivePower: 0,
      horizontalPower: 0,
      agility: 0,
      reaction: 0,
      endurance: 0,
    });

  it('antropometri ölçümü ezemiyor — sıralama tamamen alt üst olmuyor', () => {
    // Bulgu: aynı ölçümlerle, sadece boy persentili değişince Basketbol
    // %25 → %90, Futbol %26 → %0 oluyordu.
    const noBonus = decide(flatChild(), { topN: 12, samples: 2000 });
    const bigAnthro = decide(flatChild(), {
      topN: 12,
      samples: 2000,
      anthroBonus: (p) => p.anthroFavor.heightAdvantage * 0.1 + 0.05,
    });

    const rank = (d: ReturnType<typeof decide>, sport: string) =>
      d.ranking.findIndex((r) => r.sport === sport);

    // Hiçbir spor sıralamada 6 basamaktan fazla oynamamalı: antropometri
    // gerçek bir sinyal ama ölçümün yerine geçemez.
    for (const r of noBonus.ranking) {
      const shift = Math.abs(rank(noBonus, r.sport) - rank(bigAnthro, r.sport));
      expect(shift).toBeLessThanOrEqual(6);
    }
  });

  it('bonuslar Monte Carlo içinde belirsizlik taşıyor (sabit ofset değil)', () => {
    // Bonuslar sabit ofset olsaydı, bonuslu ve bonussuz koşuda aynı sporun
    // olasılığı ya 0 ya 1'e sabitlenirdi. Belirsizlik taşındığında ara
    // değerler oluşur.
    const d = decide(flatChild(), {
      topN: 12,
      samples: 3000,
      anthroBonus: (p) => p.anthroFavor.heightAdvantage * 0.1,
    });
    const intermediate = d.ranking.filter(
      (r) => r.pTopK != null && r.pTopK > 0.05 && r.pTopK < 0.95
    );
    expect(intermediate.length).toBeGreaterThan(0);
  });
});

describe('decide — sınır durumları (adversarial inceleme bulgusu)', () => {
  it('samples=0 NaN üretmez', () => {
    const d = decide(explosiveChild(), { samples: 0 });
    for (const r of d.ranking) {
      expect(Number.isNaN(r.pTopK ?? 0)).toBe(false);
      expect(Number.isNaN(r.similarity)).toBe(false);
    }
  });

  it('eşitlikte sıralama dizi konumuna göre belirlenmiyor', () => {
    // Bulgu: Boks/Masa Tenisi/Badminton aynı reaction hedefine sahip;
    // Badminton yalnız listede son olduğu için 7 puan kaybediyordu.
    // Artık eşitlik ada göre çözülüyor — konum sızmıyor.
    const d = decide(buildZProfile({ reaction: 1.5 }), {
      topN: 12,
      samples: 500,
    });
    expect(d.probabilityReported).toBe(false);
    const names = d.ranking.map((r) => r.sport);
    expect(new Set(names).size).toBe(names.length);
  });
});


describe('decide — kapsam şeffaflığı (adversarial inceleme bulgusu)', () => {
  it('her öneri kendi ağırlık kapsamını raporlar', () => {
    const d = decide(explosiveChild(), { topN: 12, samples: 500 });
    for (const r of d.ranking) {
      expect(r.weightCoverage).toBeGreaterThan(0);
      expect(r.weightCoverage).toBeLessThanOrEqual(1);
    }
  });

  it('teknik sporlar güç sporlarından belirgin daha düşük kapsamlı', () => {
    // Cimnastik denge (1.0) + koordinasyon (0.95) kaybediyor; Atletizm
    // bu eksenlere çok daha az yaslanıyor. Fark çıktıda görünür olmalı.
    const d = decide(explosiveChild(), { topN: 12, samples: 500 });
    const cim = d.ranking.find((r) => r.sport === 'Cimnastik')!;
    const atl = d.ranking.find((r) => r.sport === 'Atletizm')!;
    expect(cim.weightCoverage).toBeLessThan(atl.weightCoverage);
  });
});

describe('karakter uyumu — yön düzeltmesi', () => {
  it('daha yüksek sebat daha yüksek boost verir (ters değil)', async () => {
    const { computeCharacterSimilarityBoost } = await import(
      '@/lib/matching/bonuses'
    );
    const { SPORT_PROFILES } = await import('@/lib/matching/sportProfiles');
    const voleybol = SPORT_PROFILES.find((p) => p.sport === 'Voleybol')!;

    const base = { cooperation: 70, encouragement: 70, fairPlay: 70 };
    const low = computeCharacterSimilarityBoost(voleybol, {
      ...base,
      persistence: 70,
    });
    const high = computeCharacterSimilarityBoost(voleybol, {
      ...base,
      persistence: 100,
    });
    // Bulgu: eskiden 70 → 0.1000, 100 → 0.0717 idi. Maksimum azim
    // bildirmek çocuğu cezalandırıyordu.
    expect(high).toBeGreaterThan(low);
  });

  it('her faktörde 100 veren çocuk maksimum boost alır', async () => {
    const { computeCharacterSimilarityBoost } = await import(
      '@/lib/matching/bonuses'
    );
    const { SPORT_PROFILES } = await import('@/lib/matching/sportProfiles');
    for (const p of SPORT_PROFILES) {
      const max = computeCharacterSimilarityBoost(p, {
        cooperation: 100,
        encouragement: 100,
        persistence: 100,
        fairPlay: 100,
      });
      expect(max).toBeCloseTo(0.1, 6);
    }
  });
});
