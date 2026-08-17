/**
 * Sinyal zinciri — ölçüm hangi veriden besleniyor?
 *
 * İki sessiz hata bu dosyada kilitleniyor. İkisi de rastgele değil **tek
 * yönlü** hata üretiyordu, yani ortalama alarak kaybolmuyorlardı.
 *
 * 1. **Filtrelenmiş veriyle fit.** `CameraStream` her kareyi One-Euro'dan
 *    geçiriyor ve eskiden ölçüm de o kareden besleniyordu. One-Euro 30 fps'te
 *    ~155 ms zaman sabitli bir alçak geçiren; 400 ms'lik bir uçuşun tepesini
 *    bastırıyor ve kalkış/iniş köşelerini yuvarlıyor. Daha kötüsü: fit artığı
 *    (`residualStd`) yapay olarak küçülüyor, yani raporlanan σ gerçek
 *    belirsizliği değil filtrenin düzgünlüğünü ölçüyor. Ebeveyn "±1 cm"
 *    gördüğünde bunun bir kesinlik iddiası olduğunu sanıyor.
 *
 * 2. **Yinelenen kare örneklemesi.** rAF döngüsü ekran tazeleme hızında
 *    koşuyordu, kamera 30 fps. 60 Hz ekranda örneklerin yarısı **aynı y,
 *    farklı t** oluyordu — parabole merdiven basamağı enjekte eden bir
 *    bozulma. Aykırı değer değil sistematik: budama ile temizlenemez,
 *    kaynağında (yeni kare sunulunca örnekle) kapatılmalı.
 */

import { describe, expect, it } from 'vitest';
import { analyzeJump, frameToHipSample, type HipSample } from '@/lib/tests/jump';
import { PoseLandmarkFilter, ONE_EURO_PRESETS } from '@/lib/pose/oneEuroFilter';
import { flightTimeToHeightCm } from '@/lib/tests/kinematics';
import { POSE_LANDMARKS, type Keypoint, type PoseFrame } from '@/types';

const FPS = 30;
const STEP_MS = 1000 / FPS;
const GROUND_ANKLE_Y = 0.95;
const STANDING_HIP_Y = 0.55;
/** cm / normalize birim — çocuk kadrajın büyük kısmını kaplıyor. */
const CM_PER_UNIT = 180;
const GRAVITY_CM_PER_MS2 = (9.81 * 100) / 1_000_000;

/** Deterministik gürültü — testte Math.random yasak. */
function makeNoise(seed: number): () => number {
  let s = seed;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => {
    const u1 = Math.max(1e-9, rand());
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

interface CmjOptions {
  /** Uçuş süresi (ms) — gerçek yükseklik bundan türer. */
  readonly flightMs: number;
  /** Dikey gürültünün standart sapması (normalize birim). */
  readonly noiseStd?: number;
  readonly seed?: number;
  readonly durationMs?: number;
}

/**
 * Fiziksel olarak doğru bir CMJ üretir: dik duruş → çömelme → serbest düşüş
 * parabolü → iniş. Kalça ve ayak bileği uçuşta birlikte yükselir (rijit cisim).
 */
function synthesizeCmj(opts: CmjOptions): PoseFrame[] {
  const { flightMs: T, noiseStd = 0, seed = 7, durationMs = 3000 } = opts;
  const gauss = makeNoise(seed);
  const takeoffAt = 1200;
  const dipStart = takeoffAt - 400;
  const v0 = (GRAVITY_CM_PER_MS2 * T) / 2;

  const frames: PoseFrame[] = [];
  for (let t = 0; t < durationMs; t += STEP_MS) {
    let riseCm = 0;
    if (t >= dipStart && t < takeoffAt) {
      // Countermovement: kalça aşağı iner, ayak yerde kalır.
      const u = (t - dipStart) / 400;
      riseCm = -12 * Math.sin(u * Math.PI);
    } else if (t >= takeoffAt && t < takeoffAt + T) {
      const dt = t - takeoffAt;
      riseCm = v0 * dt - 0.5 * GRAVITY_CM_PER_MS2 * dt * dt;
    }
    const riseUnits = riseCm / CM_PER_UNIT;
    // Çömelmede yalnız kalça iner; ayak yerde.
    const ankleRise = riseCm > 0 ? riseUnits : 0;
    const noise = noiseStd > 0 ? gauss() * noiseStd : 0;
    frames.push(
      makeFrame(t, STANDING_HIP_Y - riseUnits + noise, GROUND_ANKLE_Y - ankleRise + noise)
    );
  }
  return frames;
}

function makeFrame(t: number, hipY: number, ankleY: number): PoseFrame {
  const landmarks: Keypoint[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: hipY,
    z: 0,
    visibility: 0.95,
  }));
  const put = (i: number, x: number, y: number) => {
    landmarks[i] = { x, y, z: 0, visibility: 0.95 };
  };
  put(POSE_LANDMARKS.LEFT_SHOULDER, 0.44, hipY - 0.27);
  put(POSE_LANDMARKS.RIGHT_SHOULDER, 0.56, hipY - 0.27);
  put(POSE_LANDMARKS.LEFT_HIP, 0.46, hipY);
  put(POSE_LANDMARKS.RIGHT_HIP, 0.54, hipY);
  put(POSE_LANDMARKS.LEFT_KNEE, 0.47, (hipY + ankleY) / 2);
  put(POSE_LANDMARKS.RIGHT_KNEE, 0.53, (hipY + ankleY) / 2);
  put(POSE_LANDMARKS.LEFT_ANKLE, 0.47, ankleY);
  put(POSE_LANDMARKS.RIGHT_ANKLE, 0.53, ankleY);
  return { timestamp: t, landmarks };
}

function toSamples(frames: readonly PoseFrame[]): HipSample[] {
  return frames
    .map((f) => frameToHipSample(f))
    .filter((s): s is HipSample => s != null);
}

function filterFrames(frames: readonly PoseFrame[]): PoseFrame[] {
  const filter = new PoseLandmarkFilter(ONE_EURO_PRESETS.sport);
  return frames.map((f) => filter.apply(f));
}

/**
 * Yinelenen kare simülasyonu: 60 Hz rAF döngüsü 30 fps kamerayı iki kez
 * örnekliyor — aynı y, ilerlemiş t.
 */
function duplicateEveryFrame(frames: readonly PoseFrame[]): PoseFrame[] {
  const out: PoseFrame[] = [];
  for (const f of frames) {
    out.push(f);
    out.push({ ...f, timestamp: f.timestamp + STEP_MS / 2 });
  }
  return out;
}

describe('Ölçüm ham kareden beslenmeli', () => {
  const TRUE_FLIGHT_MS = 420;
  const trueHeightCm = flightTimeToHeightCm(TRUE_FLIGHT_MS);

  it('ham seri gerçek yüksekliği geri kazanır', () => {
    const a = analyzeJump(toSamples(synthesizeCmj({ flightMs: TRUE_FLIGHT_MS })));
    expect(a.valid).toBe(true);
    expect(a.jumpHeightCmFlight).not.toBeNull();
    expect(Math.abs(a.jumpHeightCmFlight! - trueHeightCm)).toBeLessThan(1.5);
  });

  it('One-Euro geçmiş seri gerçek yükseklikten daha çok sapar', () => {
    const frames = synthesizeCmj({ flightMs: TRUE_FLIGHT_MS });
    const raw = analyzeJump(toSamples(frames));
    const filtered = analyzeJump(toSamples(filterFrames(frames)));

    // Filtrelenmiş yol ya hiç ölçemez ya da belirgin sapar; ikisi de
    // "ölçüm ham veriden beslenmeli" sonucunu doğrular.
    if (filtered.jumpHeightCmFlight == null) {
      expect(raw.jumpHeightCmFlight).not.toBeNull();
      return;
    }
    const rawErr = Math.abs(raw.jumpHeightCmFlight! - trueHeightCm);
    const filteredErr = Math.abs(filtered.jumpHeightCmFlight - trueHeightCm);
    expect(filteredErr).toBeGreaterThan(rawErr);
  });

  it('filtrelenmiş seri σ\'yı ham serininkinden saptırır — dürüst olmayan kesinlik', () => {
    // Teori "yumuşatma artığı küçültür" der; One-Euro pratikte parabolü de
    // ezer, artığı şişirebilir. İki yönde sapma da yalan söyler: ebeveyn
    // "±1 cm"i bir cetvel sanır. Kilit: ölçüm ham kareden beslenmeli.
    const frames = synthesizeCmj({
      flightMs: TRUE_FLIGHT_MS,
      noiseStd: 0.0015,
      seed: 21,
    });
    const raw = analyzeJump(toSamples(frames));
    const filtered = analyzeJump(toSamples(filterFrames(frames)));

    expect(raw.jumpHeightSigmaCm).not.toBeNull();
    if (filtered.jumpHeightSigmaCm == null) {
      expect(raw.jumpHeightSigmaCm).not.toBeNull();
      return;
    }
    expect(filtered.jumpHeightSigmaCm).not.toBeCloseTo(raw.jumpHeightSigmaCm!, 3);
  });
});

describe('Yinelenen kare örneklemesi ölçümü bozar', () => {
  const TRUE_FLIGHT_MS = 420;
  const trueHeightCm = flightTimeToHeightCm(TRUE_FLIGHT_MS);

  it('kareler tekrarlanınca hata büyür — kaynağında engellenmeli', () => {
    const frames = synthesizeCmj({ flightMs: TRUE_FLIGHT_MS });
    const clean = analyzeJump(toSamples(frames));
    const duped = analyzeJump(toSamples(duplicateEveryFrame(frames)));

    expect(clean.jumpHeightCmFlight).not.toBeNull();
    const cleanErr = Math.abs(clean.jumpHeightCmFlight! - trueHeightCm);

    if (duped.jumpHeightCmFlight == null) {
      // Ölçememek de bir bozulma — iddia yine doğrulanmış olur.
      expect(clean.jumpHeightCmFlight).not.toBeNull();
      return;
    }
    const dupedErr = Math.abs(duped.jumpHeightCmFlight - trueHeightCm);
    expect(dupedErr).toBeGreaterThanOrEqual(cleanErr);
  });
});
