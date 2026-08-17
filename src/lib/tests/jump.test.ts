/**
 * Jump test analizi unit testleri.
 *
 * Hedef: flight-time + hip displacement + persentil mantığını
 * regression'a karşı korumak. Bu modülde kullanılan iki bağımsız metot
 * sahnedeki "32cm sıçradı" çıktısının dayandığı yer — sessizce kırılırsa
 * demo yanlış sayı gösterir.
 */

import { describe, expect, it } from 'vitest';
import type { PoseFrame } from '@/types';
import {
  analyzeJump,
  calibrateJumpHeight,
  formatJumpHeightCm,
  frameToHipSample,
  isJumpFrameUsable,
  jumpHeightRangeCm,
  jumpPercentile,
  jumpScore,
  maxPlausibleJumpHeightCm,
  pickBestJumpAttempt,
  BIAS_CORRECTION_CM,
  type HipSample,
} from './jump';
import { POSE_LANDMARKS } from '@/types';

/**
 * Bir CMJ atışının zaman serisini sentezler.
 *
 *   t=0..(durationMs)  — frame'ler 33ms aralıkla (~30fps).
 *   Hip Y baseline 0.55, çömelme 0.62'ye iner, apex 0.55 - jumpDelta'ya çıkar.
 *   Ankle Y baseline 0.95, uçuş süresince baseline - ankleLift kalkar.
 */
function synthesizeJumpSamples(opts: {
  durationMs?: number;
  jumpDelta?: number;
  flightTimeMs?: number;
  ankleLift?: number;
  loadingMs?: number;
  /** Capture başında saf "yere basıyor" warmup süresi — baseline hesabı için. */
  preFlightIdleMs?: number;
}): HipSample[] {
  const preIdleMs = opts.preFlightIdleMs ?? 900;
  const loadingMs = opts.loadingMs ?? 400;
  const flightTimeMs = opts.flightTimeMs ?? 400;
  const durationMs =
    opts.durationMs ?? preIdleMs + loadingMs + flightTimeMs + 700;
  const jumpDelta = opts.jumpDelta ?? 0.08;
  const ankleLift = opts.ankleLift ?? 0.04;
  const fps = 30;
  const samples: HipSample[] = [];

  const baselineHip = 0.55;
  const baselineAnkle = 0.95;
  const loadingDepth = 0.07;

  const loadingStart = preIdleMs;
  const takeoffMs = preIdleMs + loadingMs;
  const landingMs = takeoffMs + flightTimeMs;

  for (let t = 0; t < durationMs; t += 1000 / fps) {
    let hipY = baselineHip;
    let ankleY = baselineAnkle;

    if (t < loadingStart) {
      // Idle warmup — yere basıyor, baseline hesabı için kritik
      hipY = baselineHip;
      ankleY = baselineAnkle;
    } else if (t < takeoffMs) {
      // Çömelme: lineer aşağı iner
      const u = (t - loadingStart) / loadingMs;
      hipY = baselineHip + loadingDepth * u;
    } else if (t >= takeoffMs && t <= landingMs) {
      // Hip parabolik: gravity altında düşey atış
      const u = (t - takeoffMs) / (landingMs - takeoffMs); // 0..1
      const arc = Math.sin(u * Math.PI); // 0..1..0
      hipY = baselineHip - jumpDelta * arc;
      // Ankle: gerçek atışta uçuş süresince step-function — anında kalkar,
      // anında iner. Sin eğrisi değil. Bosco protokolünün bağımlı olduğu
      // davranış bu — kalkış/iniş anları keskin olmalı.
      ankleY = baselineAnkle - ankleLift;
    } else {
      hipY = baselineHip;
      ankleY = baselineAnkle;
    }

    samples.push({ t, y: hipY, ankleY });
  }

  return samples;
}

function makePoseFrame(
  landmarkOverrides: Partial<
    Record<number, { x: number; y: number; z?: number; visibility?: number }>
  > = {}
): PoseFrame {
  // 33 default landmark — hepsi orta pozisyonda, görünür.
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }));
  for (const [idx, lm] of Object.entries(landmarkOverrides)) {
    const i = Number(idx);
    landmarks[i] = { ...landmarks[i], ...lm };
  }
  return {
    timestamp: 0,
    landmarks,
  };
}

describe('analyzeJump — input validation', () => {
  it('30 sample altında geçersiz döner', () => {
    const samples: HipSample[] = Array.from({ length: 20 }, (_, i) => ({
      t: i * 33,
      y: 0.5,
    }));
    const result = analyzeJump(samples);
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toMatch(/yetersiz|sample|veri/i);
  });

  it('düz hat (sıçrama yok) → invalid + jumpUnits ~= 0', () => {
    const samples: HipSample[] = Array.from({ length: 60 }, (_, i) => ({
      t: i * 33,
      y: 0.55,
      ankleY: 0.95,
    }));
    const result = analyzeJump(samples);
    expect(result.valid).toBe(false);
    expect(result.jumpUnits).toBeLessThan(0.01);
  });
});

describe('analyzeJump — flight-time tespiti', () => {
  it('400ms uçuş süresi ölçülür ve Bosco formülü ile ~20cm verir', () => {
    const samples = synthesizeJumpSamples({ flightTimeMs: 400 });
    const result = analyzeJump(samples);
    expect(result.valid).toBe(true);
    expect(result.method).toBe('flight-time');
    // Bosco: h = (9.81 * 0.4²) / 8 = 0.1962 m = 19.62 cm
    expect(result.jumpHeightCmFlight).toBeGreaterThan(15);
    expect(result.jumpHeightCmFlight).toBeLessThan(25);
    // Toleranslı flight time tespiti — 30fps ankleY threshold'u aşma süresi
    // synthesized 400ms'in altında küçük bir kayma olabilir.
    expect(result.flightTimeMs).toBeGreaterThan(250);
    expect(result.flightTimeMs).toBeLessThan(450);
  });

  it('600ms uçuş ~44cm verir (gerçek elite range)', () => {
    const samples = synthesizeJumpSamples({
      flightTimeMs: 600,
      jumpDelta: 0.18,
      ankleLift: 0.1,
    });
    const result = analyzeJump(samples);
    expect(result.valid).toBe(true);
    // Bosco: h = (9.81 * 0.6²) / 8 = 0.4415 m = 44.15 cm
    // ±%20 tolerans — smoothing window (3 frame) edge bias gerçek dünyada
    // beklenen seviyede (One-Euro filter gerçek ankle hareketini biraz yumuşatır).
    expect(result.jumpHeightCmFlight).toBeGreaterThan(35);
    expect(result.jumpHeightCmFlight).toBeLessThan(58);
  });

  it('~1000ms uçuş 125 cm olarak raporlanmaz — tavan 700ms', () => {
    const samples = synthesizeJumpSamples({
      flightTimeMs: 1008,
      jumpDelta: 0.08,
      ankleLift: 0.1,
    });
    const result = analyzeJump(samples);
    expect(result.jumpHeightCmFlight).toBeNull();
    if (result.jumpHeightCm != null) {
      expect(result.jumpHeightCm).toBeLessThan(70);
    }
  });

  it('8 yaş tavanını aşan uçuş invalid', () => {
    const samples = synthesizeJumpSamples({
      flightTimeMs: 600,
      jumpDelta: 0.18,
      ankleLift: 0.1,
    });
    const result = analyzeJump(samples, { ageYears: 8, sex: 'male' });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uçuş süresi güvenilir değil/i);
  });

  it('ankleY yoksa flight-time düşer, hip-displacement metodu çalışır', () => {
    const samples = synthesizeJumpSamples({ flightTimeMs: 400 }).map((s) => ({
      t: s.t,
      y: s.y,
      // ankleY çıkarıldı
    }));
    const result = analyzeJump(samples);
    expect(result.valid).toBe(true);
    expect(result.jumpHeightCmFlight).toBeNull();
    expect(result.method).toBe('hip-displacement');
    expect(result.jumpUnits).toBeGreaterThan(0.04);
  });
});

describe('calibrateJumpHeight — cross-check', () => {
  it('worldLandmarks ile cmPerUnit hesaplanır', () => {
    // Hip 0.55, ankle 0.95 → normalize delta = 0.40
    // World hip y = 0.0, ankle y = 0.4 (m, bacak alt-yarısı 40cm)
    const calibFrame = makePoseFrame({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.5, y: 0.55, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.5, y: 0.55, visibility: 0.95 },
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.5, y: 0.95, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.5, y: 0.95, visibility: 0.95 },
    });
    calibFrame.worldLandmarks = Array.from({ length: 33 }, () => ({
      x: 0,
      y: 0,
      z: 0,
    }));
    calibFrame.worldLandmarks[POSE_LANDMARKS.LEFT_HIP] = { x: 0, y: 0, z: 0 };
    calibFrame.worldLandmarks[POSE_LANDMARKS.RIGHT_HIP] = { x: 0, y: 0, z: 0 };
    calibFrame.worldLandmarks[POSE_LANDMARKS.LEFT_ANKLE] = {
      x: 0,
      y: 0.4,
      z: 0,
    };
    calibFrame.worldLandmarks[POSE_LANDMARKS.RIGHT_ANKLE] = {
      x: 0,
      y: 0.4,
      z: 0,
    };

    const samples = synthesizeJumpSamples({ flightTimeMs: 400 });
    const analysis = analyzeJump(samples);
    const calibrated = calibrateJumpHeight(analysis, calibFrame, null);

    expect(calibrated.jumpHeightCmHip).not.toBeNull();
    expect(calibrated.jumpHeightCmHip).toBeGreaterThan(0);
    expect(calibrated.jumpHeightCm).not.toBeNull();
  });

  it('flight-time varsa birincil — hip-displacement sadece tutarlılık check', () => {
    const calibFrame = makePoseFrame({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.5, y: 0.55, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.5, y: 0.55, visibility: 0.95 },
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.5, y: 0.95, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.5, y: 0.95, visibility: 0.95 },
    });
    calibFrame.worldLandmarks = Array.from({ length: 33 }, () => ({
      x: 0,
      y: 0,
      z: 0,
    }));
    // Bacak ~50cm — flight-time 20cm ile yaklaşık tutarlı sonuç çıkar
    calibFrame.worldLandmarks[POSE_LANDMARKS.LEFT_HIP] = { x: 0, y: 0, z: 0 };
    calibFrame.worldLandmarks[POSE_LANDMARKS.RIGHT_HIP] = { x: 0, y: 0, z: 0 };
    calibFrame.worldLandmarks[POSE_LANDMARKS.LEFT_ANKLE] = {
      x: 0,
      y: 0.5,
      z: 0,
    };
    calibFrame.worldLandmarks[POSE_LANDMARKS.RIGHT_ANKLE] = {
      x: 0,
      y: 0.5,
      z: 0,
    };

    const samples = synthesizeJumpSamples({
      flightTimeMs: 400,
      jumpDelta: 0.08,
    });
    const analysis = analyzeJump(samples);
    const calibrated = calibrateJumpHeight(analysis, calibFrame, null);

    // Yeni politika: flight-time varsa her zaman birincil; hip-displacement
    // sadece tutarlılık flag'i için kullanılır (perspektif hatası bozmasın).
    expect(calibrated.method).toBe('flight-time');
    expect(calibrated.jumpHeightCm).toBe(calibrated.jumpHeightCmFlight);
  });

  it('valid=false ise calibrate hiçbir şey değiştirmez', () => {
    const samples: HipSample[] = Array.from({ length: 10 }, (_, i) => ({
      t: i * 33,
      y: 0.5,
    }));
    const analysis = analyzeJump(samples);
    expect(analysis.valid).toBe(false);
    const frame = makePoseFrame();
    const calibrated = calibrateJumpHeight(analysis, frame, 150);
    expect(calibrated).toEqual(analysis);
  });

  it('uçuş 44cm ve kalça ~8cm ise deneme reddedilir', () => {
    const calibFrame = makePoseFrame({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.5, y: 0.55, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.5, y: 0.55, visibility: 0.95 },
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.5, y: 0.95, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.5, y: 0.95, visibility: 0.95 },
    });
    calibFrame.worldLandmarks = Array.from({ length: 33 }, () => ({
      x: 0,
      y: 0,
      z: 0,
    }));
    calibFrame.worldLandmarks[POSE_LANDMARKS.LEFT_HIP] = { x: 0, y: 0, z: 0 };
    calibFrame.worldLandmarks[POSE_LANDMARKS.RIGHT_HIP] = { x: 0, y: 0, z: 0 };
    calibFrame.worldLandmarks[POSE_LANDMARKS.LEFT_ANKLE] = {
      x: 0,
      y: 0.4,
      z: 0,
    };
    calibFrame.worldLandmarks[POSE_LANDMARKS.RIGHT_ANKLE] = {
      x: 0,
      y: 0.4,
      z: 0,
    };

    const samples = synthesizeJumpSamples({
      flightTimeMs: 600,
      jumpDelta: 0.08,
      ankleLift: 0.1,
    });
    const analysis = analyzeJump(samples);
    expect(analysis.valid).toBe(true);
    expect(analysis.jumpHeightCmFlight).toBeGreaterThan(35);
    const calibrated = calibrateJumpHeight(analysis, calibFrame, null);
    expect(calibrated.valid).toBe(false);
    expect(calibrated.reason).toMatch(/uyuşmuyor/i);
  });
});

describe('jumpPercentile + jumpScore', () => {
  it('mean değer 50. persentil verir', () => {
    // 12 yaş erkek mean = 28cm → ~50
    const p = jumpPercentile(28, 12, 'male');
    expect(p).toBeGreaterThan(45);
    expect(p).toBeLessThan(55);
  });

  it('+1 SD ~84. persentil', () => {
    // 12 yaş erkek mean=28, sd=5.5 → 33.5cm
    const p = jumpPercentile(33.5, 12, 'male');
    expect(p).toBeGreaterThan(80);
    expect(p).toBeLessThan(88);
  });

  it('-1 SD ~16. persentil', () => {
    const p = jumpPercentile(22.5, 12, 'male');
    expect(p).toBeGreaterThan(13);
    expect(p).toBeLessThan(20);
  });

  it('1..99 aralığında clamp', () => {
    expect(jumpPercentile(0.1, 12, 'male')).toBeGreaterThanOrEqual(1);
    expect(jumpPercentile(200, 12, 'male')).toBeLessThanOrEqual(99);
  });

  it("jumpScore eski API'yi koruyor (backward compat)", () => {
    const score = jumpScore(28, 12, 'male');
    const percentile = jumpPercentile(28, 12, 'male');
    expect(score).toBe(percentile);
  });

  it('cinsiyet farkı norm tablosuna yansıyor', () => {
    // Aynı yaşta kız norm değeri erkekten farklı
    const malePercentile = jumpPercentile(25, 12, 'male');
    const femalePercentile = jumpPercentile(25, 12, 'female');
    expect(malePercentile).not.toBe(femalePercentile);
  });

  it('en yakın yaş (closest match) doğru seçilir', () => {
    // 8 ile 9 yaş arası bir sıçrama → bir tarafa düşer
    const eightYearScore = jumpPercentile(18, 8, 'male');
    const nineYearScore = jumpPercentile(18, 9, 'male');
    // 8 yaş normu daha düşük olduğu için 18cm'lik atış 8 yaşta daha yüksek persentil
    expect(eightYearScore).toBeGreaterThan(nineYearScore);
  });
});

describe('frameToHipSample + isJumpFrameUsable', () => {
  it('hip ve ayak görünürse usable', () => {
    const frame = makePoseFrame({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.4, y: 0.6, visibility: 0.9 },
      [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.6, y: 0.6, visibility: 0.9 },
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.4, y: 0.95, visibility: 0.9 },
      [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.6, y: 0.95, visibility: 0.9 },
    });
    expect(isJumpFrameUsable(frame)).toBe(true);
  });

  it('düşük görünürlükte usable=false', () => {
    const frame = makePoseFrame({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.4, y: 0.6, visibility: 0.2 },
      [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.6, y: 0.6, visibility: 0.2 },
    });
    expect(isJumpFrameUsable(frame)).toBe(false);
  });

  it('frameToHipSample hip+ankleY üretir', () => {
    const frame = makePoseFrame({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.4, y: 0.55, visibility: 0.9 },
      [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.6, y: 0.65, visibility: 0.9 },
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.4, y: 0.92, visibility: 0.9 },
      [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.6, y: 0.98, visibility: 0.9 },
    });
    frame.timestamp = 1234;
    const sample = frameToHipSample(frame);
    expect(sample).not.toBeNull();
    expect(sample!.t).toBe(1234);
    expect(sample!.hipY).toBeCloseTo(0.6, 5); // (0.55 + 0.65) / 2
    // y = 0.6×kalça + 0.4×omuz (varsayılan omuz y=0.5)
    expect(sample!.y).toBeCloseTo(0.6 * 0.6 + 0.4 * 0.5, 5);
    expect(sample!.ankleY).toBeCloseTo(0.95, 5); // (0.92 + 0.98) / 2
  });

  it('eksik keypoint → null', () => {
    const frame = makePoseFrame({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.4, y: 0.6, visibility: 0.1 },
    });
    expect(frameToHipSample(frame)).toBeNull();
  });
});

describe('formatJumpHeightCm — nokta tahmin yerine aralık', () => {
  it('σ varsa "cm (±N)" formatında döner', () => {
    expect(formatJumpHeightCm(32.4, 4.2)).toBe('32 cm (±4)');
  });

  it('σ null ise (hip-displacement fallback) uydurulmuş bir ± eklenmez', () => {
    expect(formatJumpHeightCm(32.4, null)).toBe('~32 cm');
  });

  it('σ 0.5 cm altındaysa (pratikte anlamsız) düz değere düşer', () => {
    expect(formatJumpHeightCm(32.4, 0.1)).toBe('~32 cm');
  });

  it('margin en az 1 cm olarak yuvarlanır (0 gösterip yanlış kesinlik iddia etmez)', () => {
    expect(formatJumpHeightCm(32.4, 0.6)).toBe('32 cm (±1)');
  });
});

describe('jumpHeightRangeCm — rapor metni için açık aralık', () => {
  it('28-36 gibi düşük/yüksek sınır döner', () => {
    const r = jumpHeightRangeCm(32, 4);
    expect(r).toEqual({ low: 28, high: 36 });
  });

  it('σ null ise aralık üretilmez (uydurulmuş belirsizlik yok)', () => {
    expect(jumpHeightRangeCm(32, null)).toBeNull();
  });
});

describe('pickBestJumpAttempt — en-iyi-3 seçimi', () => {
  function attempt(cm: number | null, accepted = true, valid = true) {
    return { accepted, analysis: { valid, jumpHeightCm: cm } };
  }

  it('3 geçerli denemeden en yükseği seçilir', () => {
    const attempts = [attempt(24), attempt(31), attempt(28)];
    expect(pickBestJumpAttempt(attempts)).toBe(attempts[1]);
  });

  it('reddedilen deneme daha yüksek cm gösterse bile seçilmez', () => {
    const attempts = [attempt(24), attempt(99, false), attempt(28)];
    expect(pickBestJumpAttempt(attempts)).toBe(attempts[2]);
  });

  it('valid:false olan deneme (algoritma reddi) seçilmez', () => {
    const attempts = [attempt(24), attempt(99, true, false), attempt(28)];
    expect(pickBestJumpAttempt(attempts)).toBe(attempts[2]);
  });

  it('hiçbir deneme uygun değilse null döner', () => {
    const attempts = [attempt(null), attempt(10, false), attempt(5, true, false)];
    expect(pickBestJumpAttempt(attempts)).toBeNull();
  });

  it('tek geçerli deneme varsa o seçilir', () => {
    const attempts = [attempt(null, false), attempt(22)];
    expect(pickBestJumpAttempt(attempts)).toBe(attempts[1]);
  });

  it('medyandan sapan 125 cm deneme en iyi seçilmez', () => {
    const attempts = [attempt(31), attempt(125), attempt(26)];
    expect(pickBestJumpAttempt(attempts)).toBe(attempts[0]);
  });
});

describe('maxPlausibleJumpHeightCm', () => {
  it('14 yaş erkek ≈ 60 cm (34 + 4×6.5)', () => {
    expect(maxPlausibleJumpHeightCm(14, 'male')).toBeCloseTo(60, 5);
  });
});

describe('BIAS_CORRECTION_CM', () => {
  it('ölçülene kadar 0 kalır — uydurulmuş sapma yok', () => {
    expect(BIAS_CORRECTION_CM).toBe(0);
  });
});

describe('gövde merkezi proxy — diz çekme şişirmez', () => {
  it('uçuşta diz çekmek HipSample.y\'yi yukarı kaydırmaz', () => {
    const hipY = 0.4;
    const shoulderY = 0.13;
    const base = makePoseFrame({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.46, y: hipY, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.54, y: hipY, visibility: 0.95 },
      [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.44, y: shoulderY, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_SHOULDER]: { x: 0.56, y: shoulderY, visibility: 0.95 },
      [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.47, y: 0.7, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_KNEE]: { x: 0.53, y: 0.7, visibility: 0.95 },
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.47, y: 0.9, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.53, y: 0.9, visibility: 0.95 },
    });
    const tucked = makePoseFrame({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.46, y: hipY, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.54, y: hipY, visibility: 0.95 },
      [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.44, y: shoulderY, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_SHOULDER]: { x: 0.56, y: shoulderY, visibility: 0.95 },
      [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.47, y: hipY + 0.02, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_KNEE]: { x: 0.53, y: hipY + 0.02, visibility: 0.95 },
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.47, y: 0.9, visibility: 0.95 },
      [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.53, y: 0.9, visibility: 0.95 },
    });
    const a = frameToHipSample(base);
    const b = frameToHipSample(tucked);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.y).toBeCloseTo(b!.y, 6);
    expect(a!.y).toBeCloseTo(0.6 * hipY + 0.4 * shoulderY, 6);
  });
});
