/**
 * Düşmanca fixture'lar — sistemin **reddetmesi gereken** senaryolar.
 *
 * Normal testler "doğru girdi doğru çıktı veriyor mu" diye sorar. Bu dosya
 * tersini sorar: **yanlış girdi reddediliyor mu?** Ölçüm hattının gerçek hata
 * kaynağı model değil, testi yapmamış bir çocuğun yine de skor almasıdır.
 *
 * Her fixture gerçek bir kaçamağı modelliyor:
 *
 *   - `twoFootedBalance`   — tek bacak denge testinde iki ayak üstünde durmak
 *   - `walkingBroadJump`   — sıçramak yerine yana yürümek
 *   - `heelRaiseJump`      — sıçramak yerine topuk kaldırmak
 *   - `jitterLateralHops`  — zıplamak yerine orta çizgide titremek
 *   - `restingFinger`      — noktayı takip etmek yerine parmağı merkeze koymak
 *
 * Üretilen veriler **poz karesi** düzeyindedir: hakem katmanı indirgenmiş
 * örneklere değil ham iskelete bakmak zorunda, çünkü açıkların çoğu tam da
 * indirgeme sırasında kayboluyor (denge analizi ayak bileğini hiç okumuyor).
 */

import { POSE_LANDMARKS, type Keypoint, type PoseFrame } from '@/types';

const N_LANDMARKS = 33;

interface BodyPose {
  hipY: number;
  hipXLeft: number;
  hipXRight: number;
  shoulderY: number;
  ankleYLeft: number;
  ankleYRight: number;
  ankleXLeft: number;
  ankleXRight: number;
  /** Görünmez sayılacak landmark indeksleri. */
  hidden?: readonly number[];
}

/** Tek bir poz karesi kurar — belirtilmeyen landmark'lar makul varsayılanda. */
function frameFrom(t: number, b: BodyPose): PoseFrame {
  const landmarks: Keypoint[] = Array.from({ length: N_LANDMARKS }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.95,
  }));

  const set = (i: number, x: number, y: number) => {
    landmarks[i] = { x, y, z: 0, visibility: 0.95 };
  };

  set(POSE_LANDMARKS.NOSE, 0.5, b.shoulderY - 0.12);
  set(POSE_LANDMARKS.LEFT_SHOULDER, 0.44, b.shoulderY);
  set(POSE_LANDMARKS.RIGHT_SHOULDER, 0.56, b.shoulderY);
  set(POSE_LANDMARKS.LEFT_HIP, b.hipXLeft, b.hipY);
  set(POSE_LANDMARKS.RIGHT_HIP, b.hipXRight, b.hipY);
  set(POSE_LANDMARKS.LEFT_KNEE, b.ankleXLeft, (b.hipY + b.ankleYLeft) / 2);
  set(POSE_LANDMARKS.RIGHT_KNEE, b.ankleXRight, (b.hipY + b.ankleYRight) / 2);
  set(POSE_LANDMARKS.LEFT_ANKLE, b.ankleXLeft, b.ankleYLeft);
  set(POSE_LANDMARKS.RIGHT_ANKLE, b.ankleXRight, b.ankleYRight);
  set(POSE_LANDMARKS.LEFT_HEEL, b.ankleXLeft, b.ankleYLeft + 0.01);
  set(POSE_LANDMARKS.RIGHT_HEEL, b.ankleXRight, b.ankleYRight + 0.01);
  set(POSE_LANDMARKS.LEFT_WRIST, 0.38, b.hipY);
  set(POSE_LANDMARKS.RIGHT_WRIST, 0.62, b.hipY);

  for (const i of b.hidden ?? []) {
    landmarks[i] = { ...landmarks[i], visibility: 0.1 };
  }

  return { timestamp: t, landmarks };
}

/** Küçük, deterministik salınım — gerçek insan hiç kıpırdamadan duramaz. */
function wobble(t: number, amplitude: number, periodMs: number): number {
  return amplitude * Math.sin((2 * Math.PI * t) / periodMs);
}

export interface FixtureOptions {
  readonly durationMs?: number;
  readonly fps?: number;
}

/**
 * **İKİ AYAK ÜSTÜNDE "TEK BACAK DENGE".**
 *
 * Çocuk iki ayağı üstünde duruyor — yani test hiç yapılmamış. İki ayak
 * üstünde salınım doğal olarak *daha az* olduğu için mevcut analiz bunu
 * "mükemmel denge" olarak puanlar. Sistemin kaçırdığı en pahalı yanlış
 * pozitif bu: çocuk denge yeteneği yüksek sanılıp cimnastiğe yönlendirilir.
 */
export function twoFootedBalance(opts: FixtureOptions = {}): PoseFrame[] {
  const { durationMs = 15_000, fps = 30 } = opts;
  const frames: PoseFrame[] = [];
  for (let t = 0; t < durationMs; t += 1000 / fps) {
    frames.push(
      frameFrom(t, {
        hipY: 0.55 + wobble(t, 0.002, 2600),
        hipXLeft: 0.46 + wobble(t, 0.0015, 3100),
        hipXRight: 0.54 + wobble(t, 0.0015, 3100),
        shoulderY: 0.35 + wobble(t, 0.002, 2600),
        // İKİ ayak da yerde ve yanal olarak ayrık — tek bacak duruşu değil.
        ankleYLeft: 0.95,
        ankleYRight: 0.95,
        ankleXLeft: 0.44,
        ankleXRight: 0.56,
      })
    );
  }
  return frames;
}

/** Dürüst tek bacak duruşu — hakem bunu KABUL etmeli (yanlış negatif kontrolü). */
export function genuineSingleLegBalance(opts: FixtureOptions = {}): PoseFrame[] {
  const { durationMs = 15_000, fps = 30 } = opts;
  const frames: PoseFrame[] = [];
  for (let t = 0; t < durationMs; t += 1000 / fps) {
    frames.push(
      frameFrom(t, {
        // Tek bacakta salınım belirgin biçimde daha büyük.
        hipY: 0.55 + wobble(t, 0.006, 1700),
        hipXLeft: 0.46 + wobble(t, 0.012, 1300),
        hipXRight: 0.54 + wobble(t, 0.012, 1300),
        shoulderY: 0.35 + wobble(t, 0.008, 1700),
        // Destek ayağı yerde; havadaki ayak yukarıda ve gövdeye yakın.
        ankleYLeft: 0.95,
        ankleYRight: 0.78,
        ankleXLeft: 0.5,
        ankleXRight: 0.52,
      })
    );
  }
  return frames;
}

/**
 * **YANA YÜRÜYÜŞ "BROAD JUMP".**
 *
 * Ayak bileği X'i baştan sona ilerliyor ama hiçbir an yerden kesilmiyor.
 * Mevcut analiz yalnızca ilk 15 / son 15 karenin X ortalamasına baktığı için
 * bunu geçerli bir sıçrama mesafesi olarak okur.
 */
export function walkingBroadJump(opts: FixtureOptions = {}): PoseFrame[] {
  const { durationMs = 3000, fps = 30 } = opts;
  const frames: PoseFrame[] = [];
  const startX = 0.3;
  const endX = 0.7;
  for (let t = 0; t < durationMs; t += 1000 / fps) {
    const u = Math.min(1, Math.max(0, (t - 500) / 2000));
    const x = startX + (endX - startX) * u;
    frames.push(
      frameFrom(t, {
        hipY: 0.55 + wobble(t, 0.004, 700), // yürüyüş salınımı
        hipXLeft: x - 0.04,
        hipXRight: x + 0.04,
        shoulderY: 0.35,
        // Ayaklar HİÇ yerden kesilmiyor — uçuş fazı yok.
        ankleYLeft: 0.95,
        ankleYRight: 0.95,
        ankleXLeft: x - 0.03,
        ankleXRight: x + 0.03,
      })
    );
  }
  return frames;
}

/**
 * **TOPUK KALDIRMA "SIÇRAMA".**
 *
 * Ayak bileği eşiği geçecek kadar yükseliyor ama hareket balistik değil:
 * yavaş, simetrik olmayan, yerçekimiyle tutarsız. Kalça neredeyse hiç
 * hareket etmiyor.
 */
export function heelRaiseJump(opts: FixtureOptions = {}): PoseFrame[] {
  const { durationMs = 3000, fps = 30 } = opts;
  const frames: PoseFrame[] = [];
  for (let t = 0; t < durationMs; t += 1000 / fps) {
    // 1000-1800ms arası yavaşça topuk kalkıyor ve iniyor (yarım sinüs).
    const inLift = t >= 1000 && t <= 1800;
    const u = inLift ? (t - 1000) / 800 : 0;
    const lift = inLift ? 0.03 * Math.sin(u * Math.PI) : 0;
    frames.push(
      frameFrom(t, {
        hipY: 0.55 - lift * 0.35, // kalça çok az yükseliyor
        hipXLeft: 0.46,
        hipXRight: 0.54,
        shoulderY: 0.35 - lift * 0.35,
        ankleYLeft: 0.95 - lift,
        ankleYRight: 0.95 - lift,
        ankleXLeft: 0.46,
        ankleXRight: 0.54,
      })
    );
  }
  return frames;
}

/**
 * **ORTA ÇİZGİDE TİTREME "LATERAL HOPS".**
 *
 * Ayak bileği X'i orta çizgiyi defalarca geçiyor ama genlik neredeyse sıfır
 * ve ayaklar hiç yerden kesilmiyor. Mevcut analiz yalnız geçiş sayar.
 */
export function jitterLateralHops(opts: FixtureOptions = {}): PoseFrame[] {
  const { durationMs = 15_000, fps = 30 } = opts;
  const frames: PoseFrame[] = [];
  for (let t = 0; t < durationMs; t += 1000 / fps) {
    // 400ms periyotlu, ±0.004 birimlik mikro salınım — "hop" değil titreme.
    const x = 0.5 + wobble(t, 0.004, 400);
    frames.push(
      frameFrom(t, {
        hipY: 0.55,
        hipXLeft: x - 0.04,
        hipXRight: x + 0.04,
        shoulderY: 0.35,
        ankleYLeft: 0.95,
        ankleYRight: 0.95,
        ankleXLeft: x - 0.01,
        ankleXRight: x + 0.01,
      })
    );
  }
  return frames;
}

/** Dürüst yanal sıçrama — hakem bunu KABUL etmeli. */
export function genuineLateralHops(opts: FixtureOptions = {}): PoseFrame[] {
  const { durationMs = 15_000, fps = 30 } = opts;
  const frames: PoseFrame[] = [];
  const periodMs = 700;
  for (let t = 0; t < durationMs; t += 1000 / fps) {
    const phase = (t % periodMs) / periodMs;
    const side = Math.sin(2 * Math.PI * (t / periodMs));
    const x = 0.5 + 0.07 * side; // belirgin yanal genlik
    // Her periyodun ortasında gerçek uçuş fazı.
    const airborne = phase > 0.2 && phase < 0.45;
    const lift = airborne ? 0.035 : 0;
    frames.push(
      frameFrom(t, {
        hipY: 0.55 - lift,
        hipXLeft: x - 0.04,
        hipXRight: x + 0.04,
        shoulderY: 0.35 - lift,
        ankleYLeft: 0.95 - lift,
        ankleYRight: 0.95 - lift,
        ankleXLeft: x - 0.01,
        ankleXRight: x + 0.01,
      })
    );
  }
  return frames;
}

/**
 * **MERKEZE KONMUŞ PARMAK "KOORDİNASYON".**
 *
 * Parmak canvas merkezinde sabit duruyor; hareketli nokta etrafında dönüyor.
 * Hata sınırlı kalır (nokta merkezden çok uzaklaşmaz) ve sistem sıfırdan
 * büyük bir skor verir.
 */
export function restingFingerTouches(opts: {
  durationMs?: number;
  canvasW?: number;
  canvasH?: number;
}): Array<{ t: number; dotX: number; dotY: number; touchX: number; touchY: number }> {
  const { durationMs = 25_000, canvasW = 600, canvasH = 400 } = opts;
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const touches = [];
  for (let t = 0; t < durationMs; t += 80) {
    const dotX = cx + canvasW * 0.38 * Math.sin((2 * Math.PI * 0.32 * t) / 1000 + Math.PI / 2);
    const dotY = cy + canvasH * 0.32 * Math.sin((2 * Math.PI * 0.41 * t) / 1000);
    // Parmak kıpırdamıyor.
    touches.push({ t, dotX, dotY, touchX: cx, touchY: cy });
  }
  return touches;
}
