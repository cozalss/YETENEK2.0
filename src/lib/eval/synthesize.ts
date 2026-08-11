/**
 * Sentetik poz üretimi — bilinen gerçek değerden (ground truth) ölçüm hattını
 * besler.
 *
 * ## Neden var
 *
 * "Sıçramayı ±X cm hatayla ölçüyoruz" iddiası ancak gerçek değeri bilinen bir
 * girdiyle sınanabilir. Çocukla pilot yapmadan önce bunu yapmanın tek yolu
 * fiziği tersine çevirmek: bilinen bir h'den kinematiği üret, ölçüm hattına
 * ver, geri ne çıktığına bak.
 *
 * Bu dosya **saf** — rastgelelik tohumlu, zaman ekseni açıkça verilir. Aynı
 * girdi her koşuda aynı çıktıyı verir; aksi hâlde regresyon kapısı gürültüden
 * ibaret olurdu.
 *
 * ## Fiziksel model
 *
 * Uçuş fazında gövde rijit bir cisim gibi serbest düşüştedir: kalça da ayak
 * bileği de **aynı** kütle merkezi parabolünü çizer.
 *
 *     yükselme(t) = v₀t − ½gt²,   v₀ = gT/2,   T = √(8h/g)
 *
 * Bu, Bosco'nun h = gT²/8 bağıntısının tersidir — yani ürettiğimiz seriden
 * ölçüm hattı doğru çalışırsa tam olarak h'yi geri vermelidir.
 */

const G_CM_PER_MS2 = 9.81 * 100 / 1_000_000; // 9.81 m/s² → cm/ms²

export interface CmjSynthesisOptions {
  /** Gerçek sıçrama yüksekliği (cm) — geri kazanılması beklenen değer. */
  readonly jumpHeightCm: number;
  /** Görüntü ölçeği: 1 normalize birim kaç cm. Tipik çocuk yakalaması ~180. */
  readonly cmPerUnit?: number;
  /** Kare hızı. */
  readonly fps?: number;
  /** Landmark gürültüsünün standart sapması (normalize birim). */
  readonly noiseStd?: number;
  /** Kare düşme olasılığı (0-1) — telefon yakalamasında gerçekçi. */
  readonly dropoutRate?: number;
  /** Deterministik tohum. */
  readonly seed?: number;
  /** Kayıt başındaki hareketsiz süre (baseline hesabı için). */
  readonly preIdleMs?: number;
  /** Çömelme (counter-movement) süresi. */
  readonly countermovementMs?: number;
}

export interface SynthSample {
  t: number;
  y: number;
  ankleY?: number;
}

/** Deterministik sözde-rastgele üreteç (mulberry32). */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller ile standart normal. */
function makeGauss(rand: () => number): () => number {
  return () => {
    const u1 = Math.max(1e-9, rand());
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

/** Bosco tersi: yükseklikten uçuş süresi. */
export function heightCmToFlightTimeMs(hCm: number): number {
  return Math.sqrt((8 * hCm) / G_CM_PER_MS2);
}

/**
 * Fiziksel olarak tutarlı bir CMJ poz serisi üretir.
 *
 * Fazlar: hareketsiz → çömelme → uçuş (serbest düşüş) → iniş emilimi → duruş.
 */
export function synthesizeCmj(opts: CmjSynthesisOptions): SynthSample[] {
  const {
    jumpHeightCm,
    cmPerUnit = 180,
    fps = 30,
    noiseStd = 0,
    dropoutRate = 0,
    seed = 1,
    preIdleMs = 900,
    countermovementMs = 450,
  } = opts;

  const rand = makeRng(seed);
  const gauss = makeGauss(rand);

  const T = heightCmToFlightTimeMs(jumpHeightCm);
  const v0 = (G_CM_PER_MS2 * T) / 2;

  const HIP_STAND = 0.55;
  const ANKLE_STAND = 0.95;
  const dipCm = 18; // tipik çocuk çömelme derinliği
  const landingMs = 350;

  const tTakeoff = preIdleMs + countermovementMs;
  const tLanding = tTakeoff + T;
  const totalMs = tLanding + landingMs + 400;
  const step = 1000 / fps;

  const samples: SynthSample[] = [];

  for (let t = 0; t < totalMs; t += step) {
    if (dropoutRate > 0 && rand() < dropoutRate) continue;

    let hipRiseCm = 0;
    let ankleRiseCm = 0;

    if (t < preIdleMs) {
      // hareketsiz
    } else if (t < tTakeoff) {
      // Çömel ve patlayıcı biçimde geri çık: yarım sinüs çukuru.
      const u = (t - preIdleMs) / countermovementMs; // 0..1
      hipRiseCm = -dipCm * Math.sin(u * Math.PI);
    } else if (t <= tLanding) {
      // Serbest düşüş — kalça ve ayak bileği AYNI parabolü çizer.
      const tf = t - tTakeoff;
      const rise = v0 * tf - 0.5 * G_CM_PER_MS2 * tf * tf;
      hipRiseCm = rise;
      ankleRiseCm = rise;
    } else if (t < tLanding + landingMs) {
      // İniş emilimi: çömelip geri doğrulur.
      const u = (t - tLanding) / landingMs;
      hipRiseCm = -dipCm * 0.6 * Math.sin(u * Math.PI);
    }

    const noise = noiseStd > 0 ? gauss() * noiseStd : 0;
    const ankleNoise = noiseStd > 0 ? gauss() * noiseStd : 0;

    samples.push({
      t,
      y: HIP_STAND - hipRiseCm / cmPerUnit + noise,
      ankleY: ANKLE_STAND - ankleRiseCm / cmPerUnit + ankleNoise,
    });
  }

  return samples;
}

/**
 * Ayak bileği yörüngesini **adım fonksiyonu** olarak üretir — yani ayak uçuş
 * boyunca sabit bir yükseklikte kalır.
 *
 * Bu fiziksel olarak yanlıştır (gerçek ayak bileği kütle merkeziyle birlikte
 * parabol çizer) ama eski eşik tabanlı tespitin örtük varsayımıdır. Parabol
 * yönteminin bu dejenere sinyalde eşiğe düşüp düşmediğini sınamak için var.
 */
export function synthesizeCmjStepAnkle(
  opts: CmjSynthesisOptions & { ankleLift?: number }
): SynthSample[] {
  const base = synthesizeCmj(opts);
  const T = heightCmToFlightTimeMs(opts.jumpHeightCm);
  const tTakeoff = (opts.preIdleMs ?? 900) + (opts.countermovementMs ?? 450);
  const lift = opts.ankleLift ?? 0.04;

  return base.map((s) => ({
    ...s,
    ankleY: s.t >= tTakeoff && s.t <= tTakeoff + T ? 0.95 - lift : 0.95,
  }));
}
