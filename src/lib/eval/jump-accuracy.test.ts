/**
 * Ölçüm doğruluğu kapısı — CMJ.
 *
 * Bilinen gerçek değerden sentezlenmiş poz serileri ölçüm hattından geçirilir
 * ve hata bütçesi CI'da zorlanır. Bu dosya "±X cm hatayla ölçüyoruz"
 * iddiasının tek dayanağı; buradaki sayılar kötüleşirse PR kırmızıya döner.
 *
 * NOT: Bu sentetik doğruluktur — algoritmanın kendi hatasını ölçer, MediaPipe'ın
 * poz tahmini hatasını DEĞİL. Gerçek uçtan uca doğruluk için mezura ile pilot
 * ölçüm gerekir (docs/ARCHITECTURE-V3.md §8.4, Faz F7).
 */

import { describe, expect, it } from 'vitest';
import { analyzeJump } from '@/lib/tests/jump';
import { synthesizeCmj, synthesizeCmjStepAnkle } from './synthesize';

/** Test edilen gerçekçi sıçrama aralığı — 8-15 yaş çocuk CMJ'si. */
const HEIGHTS_CM = [12, 18, 24, 30, 36, 42];

interface ErrorStats {
  readonly mae: number;
  readonly bias: number;
  readonly maxAbs: number;
  readonly n: number;
}

function errorStats(errors: readonly number[]): ErrorStats {
  const n = errors.length;
  const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / n;
  const bias = errors.reduce((s, e) => s + e, 0) / n;
  const maxAbs = errors.reduce((m, e) => Math.max(m, Math.abs(e)), 0);
  return { mae, bias, maxAbs, n };
}

/** Bir koşul için tüm yüksekliklerde hata dağılımını ölçer. */
function measure(opts: {
  fps: number;
  noiseStd?: number;
  dropoutRate?: number;
  stepAnkle?: boolean;
}): ErrorStats & { methods: Record<string, number> } {
  const errors: number[] = [];
  const methods: Record<string, number> = {};

  for (const trueH of HEIGHTS_CM) {
    // Tohumu yüksekliğe göre değiştir — her koşul farklı gürültü örneklemi
    // görsün, ama koşular arası deterministik kalsın.
    for (let rep = 0; rep < 3; rep++) {
      const seed = trueH * 100 + rep;
      const samples = opts.stepAnkle
        ? synthesizeCmjStepAnkle({ jumpHeightCm: trueH, ...opts, seed })
        : synthesizeCmj({ jumpHeightCm: trueH, ...opts, seed });

      const r = analyzeJump(samples);
      const key = r.valid ? (r.flightMethod ?? 'none') : 'invalid';
      methods[key] = (methods[key] ?? 0) + 1;

      if (r.valid && r.jumpHeightCmFlight != null) {
        errors.push(r.jumpHeightCmFlight - trueH);
      }
    }
  }

  return { ...errorStats(errors), methods };
}

describe('CMJ ölçüm doğruluğu — sentetik ground truth', () => {
  it('30 fps, gürültüsüz: parabol yöntemi seçilir ve MAE < 0.5 cm', () => {
    const s = measure({ fps: 30 });
    expect(s.methods.parabolic).toBe(HEIGHTS_CM.length * 3);
    expect(s.n).toBe(HEIGHTS_CM.length * 3);
    expect(s.mae).toBeLessThan(0.5);
    expect(Math.abs(s.bias)).toBeLessThan(0.5);
  });

  it('24 fps (düşük kare hızı) bile MAE < 1.0 cm', () => {
    const s = measure({ fps: 24 });
    expect(s.mae).toBeLessThan(1.0);
  });

  it('gürültüsüz veride kare hızı ölçümü etkilemez — yöntemin asıl kazancı', () => {
    // Eşik tabanlı tespitte hata doğrudan kare aralığına bağlıdır (24 fps'te
    // 30 fps'ten belirgin kötü). Parabol kökü kare ızgarasından bağımsız
    // olduğu için gürültüsüz veride üç kare hızı da makine hassasiyetinde
    // aynı sonucu verir.
    const maes = [24, 30, 60].map((fps) => measure({ fps }).mae);
    for (const mae of maes) expect(mae).toBeLessThan(1e-6);
  });

  it('gürültü altında daha yüksek kare hızı gerçekten yardım eder', () => {
    // Burada fps'in faydası gerçek: daha çok örnek → daha iyi fit.
    const lo = measure({ fps: 24, noiseStd: 0.004 });
    const hi = measure({ fps: 60, noiseStd: 0.004 });
    expect(hi.mae).toBeLessThan(lo.mae);
  });

  it('gerçekçi landmark gürültüsü altında MAE < 2.5 cm', () => {
    // 0.004 normalize birim ≈ 180 cm/birim ölçekte ~0.7 cm landmark jitter'ı.
    const s = measure({ fps: 30, noiseStd: 0.004 });
    expect(s.n).toBeGreaterThan(0);
    expect(s.mae).toBeLessThan(2.5);
  });

  it('kare düşmesi (%10) ölçümü çökertmez', () => {
    const s = measure({ fps: 30, dropoutRate: 0.1 });
    expect(s.n).toBeGreaterThan(0);
    expect(s.mae).toBeLessThan(2.5);
  });

  it('parabol yöntemi eşik yöntemini geçer — asıl iddia budur', () => {
    // Adım fonksiyonlu ayak bileği = eski eşik yönteminin örtük varsayımı;
    // parabol fit'i orada tutmaz ve eşiğe düşer. Fiziksel olarak doğru
    // yörüngede ise parabol devreye girer.
    const physical = measure({ fps: 30 });
    const stepped = measure({ fps: 30, stepAnkle: true });

    expect(physical.methods.parabolic).toBeGreaterThan(0);
    expect(stepped.methods.threshold ?? 0).toBeGreaterThan(0);
    // Fizik doğru modellendiğinde hata belirgin biçimde küçük.
    expect(physical.mae).toBeLessThan(stepped.mae);
  });
});

describe('Doğruluk raporu', () => {
  // `EVAL_REPORT=1` ile çalıştırıldığında docs/ACCURACY.md'yi besleyen tabloyu
  // basar. Varsayılan koşuda sessiz — CI çıktısını kirletmesin.
  it('koşul matrisini raporlar', () => {
    const conditions = [
      { name: '24 fps, gürültüsüz', opts: { fps: 24 } },
      { name: '30 fps, gürültüsüz', opts: { fps: 30 } },
      { name: '60 fps, gürültüsüz', opts: { fps: 60 } },
      { name: '30 fps, gürültü 0.002', opts: { fps: 30, noiseStd: 0.002 } },
      { name: '30 fps, gürültü 0.004', opts: { fps: 30, noiseStd: 0.004 } },
      { name: '60 fps, gürültü 0.004', opts: { fps: 60, noiseStd: 0.004 } },
      { name: '30 fps, %10 kare düşmesi', opts: { fps: 30, dropoutRate: 0.1 } },
      { name: '30 fps, adım-fonksiyonu ayak (eşiğe düşer)', opts: { fps: 30, stepAnkle: true } },
    ];

    const rows = conditions.map((c) => {
      const s = measure(c.opts);
      return {
        Koşul: c.name,
        'MAE (cm)': s.mae.toExponential(2),
        'Bias (cm)': s.bias.toExponential(2),
        'Max |hata| (cm)': s.maxAbs.toFixed(3),
        Yöntem: Object.entries(s.methods)
          .map(([k, v]) => `${k}:${v}`)
          .join(' '),
      };
    });

    if (process.env.EVAL_REPORT) {
      console.table(rows);
    }

    expect(rows).toHaveLength(conditions.length);
  });
});

describe('Belirsizlik (σ) dürüstlüğü', () => {
  it('σ raporlanır ve pozitiftir', () => {
    const r = analyzeJump(synthesizeCmj({ jumpHeightCm: 28, fps: 30 }));
    expect(r.valid).toBe(true);
    expect(r.jumpHeightSigmaCm).not.toBeNull();
    expect(r.jumpHeightSigmaCm!).toBeGreaterThan(0);
  });

  it('σ gürültüyle birlikte büyür — sabit bir sayı değil', () => {
    const quiet = analyzeJump(synthesizeCmj({ jumpHeightCm: 28, fps: 30 }));
    const noisy = analyzeJump(
      synthesizeCmj({ jumpHeightCm: 28, fps: 30, noiseStd: 0.005, seed: 7 })
    );
    expect(noisy.jumpHeightSigmaCm!).toBeGreaterThan(quiet.jumpHeightSigmaCm!);
  });

  it('gerçek hata çoğunlukla 3σ bandının içinde kalır', () => {
    let inside = 0;
    let total = 0;
    for (const trueH of HEIGHTS_CM) {
      for (let rep = 0; rep < 4; rep++) {
        const r = analyzeJump(
          synthesizeCmj({
            jumpHeightCm: trueH,
            fps: 30,
            noiseStd: 0.004,
            seed: trueH * 10 + rep,
          })
        );
        if (!r.valid || r.jumpHeightCmFlight == null || r.jumpHeightSigmaCm == null) continue;
        total++;
        // Fit artığından türeyen σ'ya ek olarak modelleme hatası için 0.5cm pay.
        if (Math.abs(r.jumpHeightCmFlight - trueH) <= 3 * r.jumpHeightSigmaCm + 0.5) {
          inside++;
        }
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(inside / total).toBeGreaterThan(0.9);
  });
});

describe('Kendi kendine kalibrasyon — yerçekiminden ölçek', () => {
  it('çocuğun boyu verilmeden cmPerUnit %5 içinde geri kazanılır', () => {
    for (const cmPerUnit of [140, 180, 240]) {
      const r = analyzeJump(
        synthesizeCmj({ jumpHeightCm: 30, cmPerUnit, fps: 30 })
      );
      expect(r.cmPerUnitFromGravity).not.toBeNull();
      expect(r.cmPerUnitFromGravity!).toBeGreaterThan(cmPerUnit * 0.95);
      expect(r.cmPerUnitFromGravity!).toBeLessThan(cmPerUnit * 1.05);
    }
  });
});
