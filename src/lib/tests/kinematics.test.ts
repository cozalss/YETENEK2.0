/**
 * Kinematik çekirdek testleri.
 *
 * Bu modül sıçrama yüksekliğinin dayandığı yer: parabol fit'i sessizce
 * kırılırsa sahnedeki "32cm" yanlış olur ve hiçbir şey uyarmaz. Bu yüzden
 * testler bilinen bir gerçek değerden sentezleyip geri kazanımı ölçüyor.
 */

import { describe, expect, it } from 'vitest';
import {
  fitParabola,
  fitParabolaRobust,
  solveFlightFromParabola,
  flightTimeToHeightCm,
  heightSigmaCm,
  gravityConsistentCmPerUnit,
  parabolaRSquared,
  HALF_GRAVITY_CM_PER_MS2,
} from './kinematics';

const BASELINE_Y = 0.95;

/**
 * Fiziksel olarak doğru bir uçuş fazı sentezler.
 *
 * Uçuş boyunca gövde serbest düşüştedir: yükselme = v₀t − ½gt², v₀ = gT/2.
 * Normalize görüntü birimine `cmPerUnit` ile çevrilir.
 */
function synthesizeFlight(opts: {
  flightTimeMs: number;
  cmPerUnit: number;
  fps: number;
  takeoffAtMs?: number;
  /** Dikey gürültünün standart sapması (normalize birim). */
  noiseStd?: number;
  /** Deterministik gürültü için tohum. */
  seed?: number;
}): { ts: number[]; ys: number[] } {
  const { flightTimeMs: T, cmPerUnit, fps } = opts;
  const takeoffAt = opts.takeoffAtMs ?? 0;
  const noiseStd = opts.noiseStd ?? 0;
  let seed = opts.seed ?? 1;

  // Deterministik sözde-rastgele (mulberry32) — Math.random test'te yasak.
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Box-Muller ile normal gürültü.
  const gauss = () => {
    const u1 = Math.max(1e-9, rand());
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const g = HALF_GRAVITY_CM_PER_MS2 * 2; // cm/ms²
  const v0 = (g * T) / 2; // cm/ms
  const step = 1000 / fps;

  const ts: number[] = [];
  const ys: number[] = [];
  // Uçuş içinde kalan kareler (kenarları dahil etme — gerçek yakalamada
  // kalkış/iniş anı kare ızgarasına denk gelmez).
  for (let t = step / 2; t < T; t += step) {
    const riseCm = v0 * t - 0.5 * g * t * t;
    const y = BASELINE_Y - riseCm / cmPerUnit + (noiseStd > 0 ? gauss() * noiseStd : 0);
    ts.push(takeoffAt + t);
    ys.push(y);
  }
  return { ts, ys };
}

describe('fitParabola', () => {
  it('gürültüsüz parabolü katsayı düzeyinde geri kazanır', () => {
    const ts = Array.from({ length: 20 }, (_, i) => 1000 + i * 33);
    const [a, b, c] = [3e-6, -2.1e-3, 0.94];
    const ys = ts.map((t) => a * t * t + b * t + c);

    const fit = fitParabola(ts, ys);
    expect(fit).not.toBeNull();
    expect(fit!.a).toBeCloseTo(a, 12);
    expect(fit!.b).toBeCloseTo(b, 8);
    expect(fit!.c).toBeCloseTo(c, 5);
    expect(fit!.residualStd).toBeLessThan(1e-9);
  });

  it('5 örnekten az girdide null döner', () => {
    expect(fitParabola([1, 2, 3, 4], [1, 2, 3, 4])).toBeNull();
  });

  it('uzunluk uyuşmazlığında null döner', () => {
    expect(fitParabola([1, 2, 3, 4, 5, 6], [1, 2, 3])).toBeNull();
  });

  it('dejenere (tek noktada yığılmış) zaman ekseninde null döner', () => {
    const ts = new Array(10).fill(500);
    const ys = ts.map((_, i) => i * 0.001);
    expect(fitParabola(ts, ys)).toBeNull();
  });
});

describe('solveFlightFromParabola — gerçek uçuş süresini geri kazanır', () => {
  // 30fps'te 400ms uçuş = yalnızca ~12 kare. Eşik tabanlı tespit burada
  // kaybediyor; parabol kökleri kare ızgarasından bağımsız.
  it.each([
    { T: 300, fps: 30 },
    { T: 400, fps: 30 },
    { T: 520, fps: 30 },
    { T: 400, fps: 24 },
    { T: 400, fps: 60 },
  ])('T=$T ms @ $fps fps → %1ms içinde geri kazanılır', ({ T, fps }) => {
    const { ts, ys } = synthesizeFlight({
      flightTimeMs: T,
      cmPerUnit: 200,
      fps,
      takeoffAtMs: 1234,
    });
    const fit = fitParabola(ts, ys)!;
    const sol = solveFlightFromParabola(fit, BASELINE_Y, ys)!;

    expect(sol).not.toBeNull();
    expect(sol.flightTimeMs).toBeCloseTo(T, 0);
    expect(sol.takeoffMs).toBeCloseTo(1234, 0);
    expect(sol.rSquared).toBeGreaterThan(0.999);
  });

  it('ölçeği yerçekiminden kendi kendine kalibre eder (boy gerekmez)', () => {
    for (const cmPerUnit of [120, 200, 340]) {
      const { ts, ys } = synthesizeFlight({
        flightTimeMs: 420,
        cmPerUnit,
        fps: 30,
      });
      const fit = fitParabola(ts, ys)!;
      const sol = solveFlightFromParabola(fit, BASELINE_Y, ys)!;
      // %1'den iyi — çocuğun boyu hiç kullanılmadan.
      expect(sol.cmPerUnitFromGravity).toBeGreaterThan(cmPerUnit * 0.99);
      expect(sol.cmPerUnitFromGravity).toBeLessThan(cmPerUnit * 1.01);
    }
  });

  it('gürültü altında da doğru kalır ve σ gürültüyle birlikte büyür', () => {
    const base = synthesizeFlight({ flightTimeMs: 400, cmPerUnit: 200, fps: 30 });
    const quiet = solveFlightFromParabola(fitParabola(base.ts, base.ys)!, BASELINE_Y, base.ys)!;

    const noisy = synthesizeFlight({
      flightTimeMs: 400,
      cmPerUnit: 200,
      fps: 30,
      noiseStd: 0.004,
      seed: 42,
    });
    const loud = solveFlightFromParabola(fitParabola(noisy.ts, noisy.ys)!, BASELINE_Y, noisy.ys)!;

    expect(loud.sigmaMs).toBeGreaterThan(quiet.sigmaMs);
    // Tahmin hâlâ 2σ bandının içinde olmalı — σ dürüst bir belirsizlik ölçüsü.
    expect(Math.abs(loud.flightTimeMs - 400)).toBeLessThan(2 * loud.sigmaMs + 1);
  });

  it('balistik olmayan hareketi (doğrusal rampa) reddeder', () => {
    // Yavaşça yükselen gövde — parabol yukarı açılmaz.
    const ts = Array.from({ length: 20 }, (_, i) => i * 33);
    const ys = ts.map((t) => BASELINE_Y - t * 1e-4);
    const fit = fitParabola(ts, ys)!;
    expect(solveFlightFromParabola(fit, BASELINE_Y, ys)).toBeNull();
  });

  it('ters yönlü parabolü (çömelme) reddeder', () => {
    const ts = Array.from({ length: 20 }, (_, i) => i * 33);
    // Aşağı doğru açılan parabol → a < 0.
    const ys = ts.map((t) => BASELINE_Y + 3e-6 * (t - 300) * (t - 300) * -1 + 0.02);
    const fit = fitParabola(ts, ys)!;
    expect(solveFlightFromParabola(fit, BASELINE_Y, ys)).toBeNull();
  });

  it('taban çizgisini hiç kesmeyen parabolü reddeder', () => {
    // Tamamen baseline'ın altında (görüntüde yukarıda) kalan, kesişmeyen eğri.
    const ts = Array.from({ length: 20 }, (_, i) => i * 33);
    const ys = ts.map((t) => BASELINE_Y + 0.1 + 3e-6 * (t - 300) * (t - 300));
    const fit = fitParabola(ts, ys)!;
    expect(solveFlightFromParabola(fit, BASELINE_Y, ys)).toBeNull();
  });
});

describe('Bosco yüksekliği ve belirsizlik yayılımı', () => {
  it('400ms → ~19.6cm (Bosco)', () => {
    expect(flightTimeToHeightCm(400)).toBeCloseTo(19.62, 1);
  });

  it('600ms → ~44cm', () => {
    expect(flightTimeToHeightCm(600)).toBeCloseTo(44.15, 1);
  });

  it('σ_h = (g·t/4)·σ_t hata yayılımını uygular', () => {
    // t=0.5s, σ_t=10ms → dh/dt = 9.81*0.5/4 = 1.226 m/s → 0.01226 m = 1.226cm
    expect(heightSigmaCm(500, 10)).toBeCloseTo(1.226, 2);
  });

  it('belirsizlik uçuş süresiyle doğrusal büyür', () => {
    expect(heightSigmaCm(500, 20)).toBeCloseTo(2 * heightSigmaCm(500, 10), 6);
  });
});

describe('gravityConsistentCmPerUnit ve parabolaRSquared', () => {
  it('makul eğrilikten ölçek çıkarır', () => {
    const cmPerUnit = 200;
    const a = HALF_GRAVITY_CM_PER_MS2 / cmPerUnit;
    expect(gravityConsistentCmPerUnit(a)).toBeCloseTo(cmPerUnit, 6);
  });

  it('doğrusal rampayı (a≈0) reddeder', () => {
    expect(gravityConsistentCmPerUnit(1e-12)).toBeNull();
    expect(gravityConsistentCmPerUnit(-1e-6)).toBeNull();
  });

  it('gürültüsüz parabolde R² ≈ 1', () => {
    const ts = Array.from({ length: 20 }, (_, i) => 1000 + i * 33);
    const [a, b, c] = [3e-6, -2.1e-3, 0.94];
    const ys = ts.map((t) => a * t * t + b * t + c);
    const fit = fitParabola(ts, ys)!;
    expect(parabolaRSquared(fit, ys)).toBeGreaterThan(0.999);
  });
});

describe('fitParabolaRobust — aykırı kare', () => {
  it('tek kaçık örnekte yükseklik hatası düz OLS\'ten küçük kalır', () => {
    const { ts, ys } = synthesizeFlight({
      flightTimeMs: 400,
      cmPerUnit: 200,
      fps: 30,
    });
    const dirtyY = [...ys];
    dirtyY[Math.floor(dirtyY.length / 2)] -= 0.08;

    const ols = fitParabola(ts, dirtyY)!;
    const robust = fitParabolaRobust(ts, dirtyY)!;
    const olsSol = solveFlightFromParabola(ols, BASELINE_Y, dirtyY)!;
    const robSol = solveFlightFromParabola(robust, BASELINE_Y, dirtyY)!;

    const olsErr = Math.abs(olsSol.flightTimeMs - 400);
    const robErr = Math.abs(robSol.flightTimeMs - 400);
    expect(robErr).toBeLessThanOrEqual(olsErr);
    expect(robErr).toBeLessThan(25);
  });
});
