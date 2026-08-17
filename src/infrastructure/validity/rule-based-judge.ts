/**
 * Kural tabanlı geçerlilik hakemi — fizik ve geometriyle yakalanabilen
 * protokol ihlallerini deterministik olarak tespit eder.
 *
 * ## Neden görsel modelden önce bu
 *
 * Düşmanca senaryoların çoğu aslında iskelet verisinde **açıkça** görünür:
 * iki ayağın da yerde olması, uçuş fazının hiç olmaması, yanal genliğin
 * sıfıra yakın olması. Bunları bir dil modeline sormak hem gereksiz pahalı
 * hem de gereksiz belirsiz olurdu. Kural hakemi:
 *
 *   - ücretsiz ve çevrimdışı çalışır (uçak modunda da),
 *   - deterministiktir (aynı girdi → aynı karar, birim testlenebilir),
 *   - hiçbir dış servise bağlı değildir.
 *
 * Görsel hakem bunun **üstüne** eklenir ve yalnız niteliksel olanı üstlenir:
 * kol savurma, uçuşta diz çekme, kısmi hareket açıklığı. Böylece OpenAI
 * erişilemez olduğunda sistem savunmasız kalmaz.
 */

// NOT: bilinçli olarak `server-only` YOK. Bu hakem saf hesaplama — ağ yok,
// gizli anahtar yok. Tam da tarayıcıda, ölçümün hemen yanında çalışması
// gerekiyor ki çocuğa "bu deneme sayılmadı" geri bildirimi anında verilebilsin
// ve uçak modunda da korunma sürsün. Yalnızca görsel hakem sunucuya ait.
import {
  INVALIDATING_VIOLATIONS,
  type Compensation,
  type JudgeRequest,
  type ProtocolViolation,
  type TestVerdict,
  type ValidityJudge,
} from '@/core/ports/validity-judge';
import { ok, type Result } from '@/core/types/result';
import { POSE_LANDMARKS, type PoseFrame, type TestType } from '@/types';

/** Analiz için gereken asgari kare sayısı. */
const MIN_FRAMES = 30;

/**
 * Ayak bileğinin "yerden kesildi" sayılması için baseline'dan yükselmesi
 * gereken normalize mesafe. Kadraj doluluğu ~%70-80 varsayımıyla ~2-3 cm.
 */
const AIRBORNE_LIFT = 0.02;

/**
 * Tek bacak duruşunda destek ayağı ile havadaki ayak arasındaki asgari
 * dikey fark. İki ayak da yerdeyse bu fark ~0 olur.
 */
const SINGLE_LEG_MIN_ANKLE_GAP = 0.04;

/**
 * Duruşun "tek bacak" sayılması için karelerin en az bu oranında ayak
 * farkının eşiği geçmesi gerekir. Anlık bir denge kaybı testi geçersiz
 * kılmamalı, ama sürekli iki ayak üstünde durmak yakalanmalı.
 */
const SINGLE_LEG_MIN_RATIO = 0.7;

/** Yanal sıçramada gerçek bir hop sayılması için asgari yanal genlik. */
const MIN_LATERAL_AMPLITUDE = 0.03;

/** Koordinasyon: parmağın "takip ediyor" sayılması için asgari hareket. */
const MIN_TOUCH_SPREAD_PX = 20;

function lm(frame: PoseFrame, index: number) {
  return frame.landmarks[index];
}

function visible(frame: PoseFrame, index: number, min = 0.5): boolean {
  const p = lm(frame, index);
  return p != null && (p.visibility ?? 1) >= min;
}

/**
 * Landmark hem güvenilir hem de **kadrajın içinde** mi?
 *
 * `visible()` tek başına yetmiyor: MediaPipe kadraj dışında kalan eklemleri
 * silmez, **tahmin eder** ve bu tahminlere düşük olmayan visibility atayabilir.
 * Sonuç, gerçek bir kullanıcıda görüldü: laptop kamerası yalnız yüzü
 * gördüğünde sistem uydurulmuş kalça/ayak bileği konumlarından "topuk
 * kaldırdın" teşhisi üretti. Doğru cevap "bacaklarını göremiyorum"du.
 *
 * Kenar payı bilinçli: tam kenardaki bir nokta neredeyse her zaman dışarı
 * taşmış demektir.
 */
function inFrame(frame: PoseFrame, index: number, min = 0.5): boolean {
  const p = lm(frame, index);
  if (p == null) return false;
  if ((p.visibility ?? 1) < min) return false;
  return p.x > 0.02 && p.x < 0.98 && p.y > 0.02 && p.y < 0.98;
}

/** Teste göre kadrajda olması ZORUNLU landmark'lar. */
const REQUIRED_IN_FRAME: Partial<Record<TestType, readonly number[]>> = {
  jump: [
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
  ],
  broadJump: [
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
  ],
  balance: [
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE,
    POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
  ],
  lateralHops: [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE],
  endurance: [
    POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST,
    POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
  ],
};

/**
 * Yakalamanın bu oranında zorunlu noktalar kadrajda olmalı.
 *
 * %60: anlık bir kaybolma (kol geçişi, hızlı hareket bulanıklığı) testi
 * geçersiz kılmamalı; ama vücudun yarısı hiç görünmüyorsa ölçüm yapılamaz.
 */
const MIN_IN_FRAME_RATIO = 0.6;

/**
 * Kadraj kapsamını denetler. Yetersizse `out_of_frame` döner ve teste özgü
 * mantık HİÇ çalışmaz — yoksa var olmayan veriden teşhis üretilir.
 */
function checkFrameCoverage(
  test: TestType,
  frames: readonly PoseFrame[]
): TestVerdict | null {
  const required = REQUIRED_IN_FRAME[test];
  if (!required || frames.length === 0) return null;

  let covered = 0;
  for (const f of frames) {
    if (required.every((i) => inFrame(f, i))) covered++;
  }
  const ratio = covered / frames.length;
  if (ratio >= MIN_IN_FRAME_RATIO) return null;

  return verdict({
    performed: false,
    protocolViolations: ['out_of_frame'],
    techniqueScore: 0,
    judgeConfidence: 0.95,
    notes: `Ölçüm için gereken vücut noktaları karelerin yalnızca %${Math.round(ratio * 100)}'inde kadrajda.`,
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const varSum = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(varSum / values.length);
}

interface AnkleSeries {
  readonly leftY: number[];
  readonly rightY: number[];
  readonly minY: number[];
  readonly centerX: number[];
  readonly usableFrames: number;
}

function extractAnkles(frames: readonly PoseFrame[]): AnkleSeries {
  const leftY: number[] = [];
  const rightY: number[] = [];
  const minY: number[] = [];
  const centerX: number[] = [];
  let usableFrames = 0;

  for (const f of frames) {
    const okL = visible(f, POSE_LANDMARKS.LEFT_ANKLE);
    const okR = visible(f, POSE_LANDMARKS.RIGHT_ANKLE);
    if (!okL && !okR) continue;
    usableFrames++;

    const l = lm(f, POSE_LANDMARKS.LEFT_ANKLE);
    const r = lm(f, POSE_LANDMARKS.RIGHT_ANKLE);
    if (okL) leftY.push(l.y);
    if (okR) rightY.push(r.y);

    const ys = [okL ? l.y : null, okR ? r.y : null].filter(
      (v): v is number => v != null
    );
    // Görüntüde küçük Y = yukarıda. "En yüksek ayak" = min Y.
    minY.push(Math.min(...ys));

    const xs = [okL ? l.x : null, okR ? r.x : null].filter(
      (v): v is number => v != null
    );
    centerX.push(xs.reduce((s, v) => s + v, 0) / xs.length);
  }

  return { leftY, rightY, minY, centerX, usableFrames };
}

/**
 * Serinin herhangi bir noktasında gerçek bir uçuş fazı var mı?
 *
 * Baseline = **alt** ayak bileği Y'sinin medyanı (yere basma yüksekliği).
 * Uçuş = her iki ayağın da baseline'dan AIRBORNE_LIFT kadar yükselmesi.
 * Tek ayağın kalkması yürüyüştür, sıçrama değil — bu ayrım broad jump'ta
 * yana yürümeyi eleyen şeydir.
 */
function detectAirborneFrames(frames: readonly PoseFrame[]): number {
  const lowerAnkleY: number[] = [];
  for (const f of frames) {
    const okL = visible(f, POSE_LANDMARKS.LEFT_ANKLE);
    const okR = visible(f, POSE_LANDMARKS.RIGHT_ANKLE);
    if (!okL && !okR) continue;
    const ys = [
      okL ? lm(f, POSE_LANDMARKS.LEFT_ANKLE).y : null,
      okR ? lm(f, POSE_LANDMARKS.RIGHT_ANKLE).y : null,
    ].filter((v): v is number => v != null);
    // Yere basan ayak = daha AŞAĞIDA = daha büyük Y.
    lowerAnkleY.push(Math.max(...ys));
  }
  if (lowerAnkleY.length < MIN_FRAMES) return 0;

  const baseline = median(lowerAnkleY.slice(0, Math.min(25, lowerAnkleY.length)));
  let airborne = 0;
  for (const y of lowerAnkleY) {
    if (baseline - y > AIRBORNE_LIFT) airborne++;
  }
  return airborne;
}

function verdict(partial: Partial<TestVerdict>): TestVerdict {
  return {
    performed: true,
    protocolViolations: [],
    techniqueScore: 100,
    stanceConfirmed: null,
    compensations: [],
    judgeConfidence: 0.8,
    source: 'rules',
    ...partial,
  };
}

function judgeBalance(frames: readonly PoseFrame[]): TestVerdict {
  const { leftY, rightY, usableFrames } = extractAnkles(frames);
  if (usableFrames < MIN_FRAMES || leftY.length < MIN_FRAMES || rightY.length < MIN_FRAMES) {
    // Ayak bilekleri görünmüyor → duruş doğrulanamıyor. Bu bir ihlal DEĞİL,
    // bir bilgi eksikliği: kararı görsel hakeme veya insana bırak.
    return verdict({
      stanceConfirmed: null,
      judgeConfidence: 0.2,
      notes: 'Ayak bilekleri yeterince görünmüyor; duruş doğrulanamadı.',
    });
  }

  const n = Math.min(leftY.length, rightY.length);
  let singleLegFrames = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(leftY[i] - rightY[i]) > SINGLE_LEG_MIN_ANKLE_GAP) singleLegFrames++;
  }
  const ratio = singleLegFrames / n;

  if (ratio < SINGLE_LEG_MIN_RATIO) {
    return verdict({
      performed: false,
      protocolViolations: ['both_feet_down'],
      stanceConfirmed: false,
      techniqueScore: 0,
      judgeConfidence: 0.9,
      notes: `Karelerin yalnızca %${Math.round(ratio * 100)}'inde tek bacak duruşu görüldü.`,
    });
  }

  // Duruş doğrulandı ama arada ayak yere değdi mi?
  const touchdowns = n - singleLegFrames;
  const violations: ProtocolViolation[] = [];
  if (touchdowns / n > 0.1) violations.push('foot_touched_down');

  return verdict({
    protocolViolations: violations,
    stanceConfirmed: true,
    techniqueScore: Math.round(ratio * 100),
    judgeConfidence: 0.85,
  });
}

function judgeJump(frames: readonly PoseFrame[]): TestVerdict {
  if (frames.length < MIN_FRAMES) {
    return verdict({
      performed: false,
      protocolViolations: ['insufficient_data'],
      judgeConfidence: 0.9,
    });
  }

  const airborne = detectAirborneFrames(frames);
  if (airborne === 0) {
    return verdict({
      performed: false,
      protocolViolations: ['no_flight_phase'],
      techniqueScore: 0,
      judgeConfidence: 0.9,
      notes: 'Ayaklar hiçbir karede yerden kesilmedi.',
    });
  }

  // Kalça yükselmesi ayak yükselmesiyle orantılı mı? Topuk kaldırmada ayak
  // kalkar ama gövde neredeyse yerinde kalır.
  const hipY: number[] = [];
  const ankleY: number[] = [];
  for (const f of frames) {
    if (!visible(f, POSE_LANDMARKS.LEFT_HIP) || !visible(f, POSE_LANDMARKS.LEFT_ANKLE)) continue;
    hipY.push((lm(f, POSE_LANDMARKS.LEFT_HIP).y + lm(f, POSE_LANDMARKS.RIGHT_HIP).y) / 2);
    ankleY.push((lm(f, POSE_LANDMARKS.LEFT_ANKLE).y + lm(f, POSE_LANDMARKS.RIGHT_ANKLE).y) / 2);
  }
  if (hipY.length < MIN_FRAMES) {
    return verdict({ judgeConfidence: 0.3, notes: 'Kalça izlenemedi.' });
  }

  const hipBase = median(hipY.slice(0, Math.min(25, hipY.length)));
  const ankleBase = median(ankleY.slice(0, Math.min(25, ankleY.length)));
  const hipRise = hipBase - Math.min(...hipY);
  const ankleRise = ankleBase - Math.min(...ankleY);

  // Gerçek sıçramada gövde ve ayak birlikte yükselir (rijit cisim, serbest
  // düşüş). Topuk kaldırmada ayak kalkar, kalça yerinde kalır.
  if (ankleRise > 0 && hipRise / ankleRise < 0.5) {
    return verdict({
      performed: false,
      protocolViolations: ['heel_raise_only'],
      techniqueScore: 0,
      judgeConfidence: 0.85,
      notes: 'Ayak yükseldi ama gövde takip etmedi — topuk kaldırma.',
    });
  }

  return verdict({ judgeConfidence: 0.8 });
}

function judgeBroadJump(frames: readonly PoseFrame[]): TestVerdict {
  if (frames.length < MIN_FRAMES) {
    return verdict({
      performed: false,
      protocolViolations: ['insufficient_data'],
      judgeConfidence: 0.9,
    });
  }

  const airborne = detectAirborneFrames(frames);
  if (airborne === 0) {
    return verdict({
      performed: false,
      protocolViolations: ['no_flight_phase', 'stepped_not_jumped'],
      techniqueScore: 0,
      judgeConfidence: 0.9,
      notes: 'Yatay yer değiştirme var ama uçuş fazı yok — yürüyüş.',
    });
  }

  return verdict({ judgeConfidence: 0.8 });
}

function judgeLateralHops(frames: readonly PoseFrame[]): TestVerdict {
  const { centerX, usableFrames } = extractAnkles(frames);
  if (usableFrames < MIN_FRAMES) {
    return verdict({
      performed: false,
      protocolViolations: ['insufficient_data'],
      judgeConfidence: 0.9,
    });
  }

  // Yanal genlik: X serisinin standart sapması. Titremede ~0.003, gerçek
  // hop'ta ~0.05.
  const amplitude = standardDeviation(centerX);
  const violations: ProtocolViolation[] = [];
  if (amplitude < MIN_LATERAL_AMPLITUDE) {
    violations.push('insufficient_amplitude');
  }

  const airborne = detectAirborneFrames(frames);
  if (airborne === 0) {
    violations.push('no_flight_phase');
  }

  if (violations.length > 0) {
    return verdict({
      performed: false,
      protocolViolations: violations,
      techniqueScore: 0,
      judgeConfidence: 0.85,
      notes: `Yanal genlik ${amplitude.toFixed(4)} birim, havada geçen kare ${airborne}.`,
    });
  }

  return verdict({ judgeConfidence: 0.8 });
}

/** Koordinasyon poz değil dokunma verisi kullanır; ayrı bir yardımcı. */
export function judgeCoordinationTouches(
  touches: ReadonlyArray<{ touchX: number; touchY: number }>
): TestVerdict {
  if (touches.length < 5) {
    return verdict({
      performed: false,
      protocolViolations: ['insufficient_data'],
      judgeConfidence: 0.9,
    });
  }

  const spreadX = standardDeviation(touches.map((t) => t.touchX));
  const spreadY = standardDeviation(touches.map((t) => t.touchY));
  const spread = Math.hypot(spreadX, spreadY);

  if (spread < MIN_TOUCH_SPREAD_PX) {
    return verdict({
      performed: false,
      protocolViolations: ['finger_resting'],
      techniqueScore: 0,
      judgeConfidence: 0.9,
      notes: `Parmak neredeyse hiç hareket etmedi (yayılım ${spread.toFixed(1)} px).`,
    });
  }

  return verdict({ judgeConfidence: 0.8 });
}

/**
 * Deterministik, çevrimdışı geçerlilik hakemi.
 *
 * Asenkron imza port sözleşmesinden geliyor (görsel uygulama ağ çağrısı
 * yapıyor); bu uygulama hiçbir I/O yapmaz ve her zaman `ok` döner — karar
 * `TestVerdict` içindedir, hata değildir.
 */
export class RuleBasedValidityJudge implements ValidityJudge {
  async judge(req: JudgeRequest): Promise<Result<TestVerdict>> {
    // Kadraj kapsamı EN BAŞTA. Gerekli noktalar görünmüyorsa teste özgü
    // mantık hiç çalışmamalı: MediaPipe kadraj dışını tahmin ettiği için
    // uydurulmuş koordinatlardan "topuk kaldırdın" gibi kendinden emin ama
    // tamamen yanlış teşhisler çıkıyor. Kullanıcıya doğru olan söylenmeli:
    // "vücudun kadrajda değil".
    const coverage = checkFrameCoverage(req.test, req.frames);
    if (coverage) return ok(coverage);

    switch (req.test) {
      case 'balance':
        return ok(judgeBalance(req.frames));
      case 'jump':
        return ok(judgeJump(req.frames));
      case 'broadJump':
        return ok(judgeBroadJump(req.frames));
      case 'lateralHops':
        return ok(judgeLateralHops(req.frames));
      // Reaksiyon ve koordinasyon poz verisi kullanmıyor; endurance'ın kısmi
      // hareket açıklığı denetimi görsel hakemin işi. Kural hakemi burada
      // sessiz kalır — "ihlal yok" değil, "değerlendirmedim" der.
      case 'reaction':
      case 'coordination':
      case 'endurance':
        return ok(
          verdict({
            judgeConfidence: 0,
            notes: 'Bu test kural hakemi kapsamında değil.',
          })
        );
    }
  }
}

export const ruleBasedValidityJudge = new RuleBasedValidityJudge();

/** Kapı tablosunu dışarı aç — `applyVerdict` bunu kullanıyor. */
export { INVALIDATING_VIOLATIONS };

/** Sakatlanma sinyali tipini yeniden dışa aktar (tüketici kolaylığı). */
export type { Compensation };
