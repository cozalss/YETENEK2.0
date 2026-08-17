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
import {
  fitParabola,
  gravityConsistentCmPerUnit,
  parabolaRSquared,
} from '@/lib/tests/kinematics';
import { POSE_LANDMARKS, type PoseFrame, type TestType } from '@/types';

/** Analiz için gereken asgari kare sayısı. */
const MIN_FRAMES = 30;

/**
 * ## Eşikler neden VÜCUT ölçeğine göre
 *
 * Bu sabitler eskiden kadraj-normalize mutlak değerlerdi (0.02 / 0.03 /
 * 0.04) ve yorumları "kadraj doluluğu ~%70-80 varsayımıyla" diyordu. O
 * varsayım telefonla ~2 m'de doğru; laptop kamerasıyla ~3 m'de doluluk
 * ~%45'e düşüyor ve aynı sayı gerçek dünyada neredeyse iki kat büyük bir
 * mesafeye karşılık geliyor. Sonuç: doğru yapılan hareket algılanmıyordu.
 *
 * Artık hepsi **bacak uzunluğunun** (kalça→yere basan ayak bileği) oranı.
 * Bu ölçü kameradan uzaklıkla birlikte ölçeklendiği için eşikler mesafeden
 * bağımsız hale geliyor — çocuğun kadrajdaki büyüklüğü değişse de "4 cm
 * ayak kalktı" aynı şeyi ifade ediyor.
 */

/** Ayağın "yerden kesildi" sayılması için gereken yükselme, bacak oranı. */
const AIRBORNE_LIFT_FRAC = 0.05;

/**
 * Tek bacak duruşunda iki ayak bileği arasındaki asgari dikey fark, bacak
 * oranı. ~150 cm bir çocukta ≈ 4 cm.
 *
 * Eski mutlak 0.04 değeri, kodun kendi varsaydığı %75 doluluğunda bile
 * ~8 cm'e denk geliyordu; çocuklar tek ayak üstünde dururken ayağı genelde
 * o kadar kaldırmıyor (protokol "dizine kadar kaldır" demiyor). Bu yüzden
 * doğru duruşlar `both_feet_down` ile reddediliyordu.
 */
const SINGLE_LEG_MIN_ANKLE_GAP_FRAC = 0.05;

/**
 * Ayak bileği gürültüsünün ölçek tahmini bozduğu patolojik kareler için
 * emniyet payı. Bacak uzunluğu bunun dışına düşerse ölçüm güvenilmez
 * sayılır ve eski varsayıma (≈%75 doluluk) geri dönülür — eşiklerin sıfıra
 * inip HER ŞEYİ geçirmesi, fazla sıkı olmaktan daha tehlikeli.
 */
const MIN_PLAUSIBLE_LEG = 0.05;
const MAX_PLAUSIBLE_LEG = 0.9;
const FALLBACK_LEG = 0.39; // 0.52 × 0.75 — eski kod bu duruma ayarlıydı

/**
 * `foot_touched_down` için asgari KESİNTİSİZ temas süresi.
 *
 * Bu kural eskiden `touchdowns / n > 0.1` idi; `touchdowns/n` cebirsel
 * olarak `1 - ratio` olduğu için `ratio < 0.9` demekti ve
 * `SINGLE_LEG_MIN_RATIO = 0.7`'nin belgelenmiş "anlık denge kaybı testi
 * geçersiz kılmamalı" toleransını ölü koda çeviriyordu — aynı sinyalden
 * iki kez, üstelik çelişkili eşiklerle ceza kesiliyordu.
 *
 * Artık gerçekten AYRI bir şey ölçüyor: dağınık tek kareler denge
 * salınımıdır, yarım saniyeyi aşan kesintisiz temas ise protokol ihlali.
 */
const MIN_TOUCHDOWN_EPISODE_MS = 400;

/**
 * Duruşun "tek bacak" sayılması için karelerin en az bu oranında ayak
 * farkının eşiği geçmesi gerekir. Anlık bir denge kaybı testi geçersiz
 * kılmamalı, ama sürekli iki ayak üstünde durmak yakalanmalı.
 */
const SINGLE_LEG_MIN_RATIO = 0.7;

/** Gerçek bir sıçramada kalçanın yükselmesi gereken asgari mesafe, bacak
 * oranı. Bunun altı "gövde yerinde kaldı" demektir.
 */
const MIN_JUMP_HIP_RISE_FRAC = 0.04;

/** Kol savurma: bilek kalçaya göre bacak boyunun bu oranından fazla yükselirse ihlal. Cömert — doğal denge savurması değil, tam savurma. */
const ARM_SWING_FRAC = 0.28;

/** Kalça parabolünün "bu gerçekten serbest düşüştü" sayılması için R². */
const MIN_HIP_BALLISTIC_R_SQUARED = 0.9;

/** Yanal hop için asgari genlik (X standart sapması), bacak oranı. */
const MIN_LATERAL_AMPLITUDE_FRAC = 0.08;

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
    POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST,
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

/**
 * Kadraj-bağımsız ölçek birimi: kalça merkezinden yere basan ayak bileğine
 * dikey mesafe (bacak uzunluğu), karelerin medyanı.
 *
 * Neden bu ölçü: eşiklerin tamamı ayak bileği hareketiyle ilgili ve bacak
 * uzunluğu hem çocukla hem kamera mesafesiyle birlikte ölçekleniyor. Boyun
 * tamamını kullanmak baş/omuz kadraj dışına çıktığında kırılgan olurdu;
 * kalça ve ayak bileği zaten her testin ZORUNLU landmark'ları.
 */
function bodyScale(frames: readonly PoseFrame[]): number {
  const lengths: number[] = [];
  for (const f of frames) {
    const hipYs = [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP]
      .filter((i) => visible(f, i))
      .map((i) => lm(f, i).y);
    const ankleYs = [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE]
      .filter((i) => visible(f, i))
      .map((i) => lm(f, i).y);
    if (hipYs.length === 0 || ankleYs.length === 0) continue;

    const hipY = hipYs.reduce((s, v) => s + v, 0) / hipYs.length;
    // Yere basan ayak = görüntüde daha AŞAĞIDA = daha büyük Y.
    const len = Math.max(...ankleYs) - hipY;
    if (len > 0) lengths.push(len);
  }

  const m = median(lengths);
  // Ölçek çöktüğünde eşikler de sıfıra iner ve hakem HER ŞEYİ geçirir.
  // Fazla gevşek olmak, fazla sıkı olmaktan daha tehlikeli: geçersiz bir
  // ölçüm rapora girer ve kimse fark etmez.
  if (m < MIN_PLAUSIBLE_LEG || m > MAX_PLAUSIBLE_LEG) return FALLBACK_LEG;
  return m;
}

/** Kareler arası tipik süre (ms) — sabit fps varsaymamak için ölçülüyor. */
function frameIntervalMs(frames: readonly PoseFrame[]): number {
  const deltas: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    const dt = frames[i].timestamp - frames[i - 1].timestamp;
    if (dt > 0 && dt < 500) deltas.push(dt);
  }
  const m = median(deltas);
  return m > 0 ? m : 1000 / 30;
}

/**
 * Bir boolean serisindeki en uzun kesintisiz `true` dizisinin uzunluğu.
 * Dağınık gürültüyü sürekli bir olaydan ayırmanın en basit yolu.
 */
function longestRun(flags: readonly boolean[]): number {
  let best = 0;
  let cur = 0;
  for (const f of flags) {
    cur = f ? cur + 1 : 0;
    if (cur > best) best = cur;
  }
  return best;
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
 * Uçuş = her iki ayağın da baseline'dan AIRBORNE_LIFT_FRAC × bacak boyu
 * kadar yükselmesi.
 * Tek ayağın kalkması yürüyüştür, sıçrama değil — bu ayrım broad jump'ta
 * yana yürümeyi eleyen şeydir.
 */
function detectAirborneFrames(
  frames: readonly PoseFrame[],
  scale: number
): number {
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
    if (baseline - y > AIRBORNE_LIFT_FRAC * scale) airborne++;
  }
  return airborne;
}

interface HipSeries {
  readonly t: number[];
  readonly y: number[];
}

function extractHipY(frames: readonly PoseFrame[]): HipSeries {
  const t: number[] = [];
  const y: number[] = [];
  for (const f of frames) {
    const okL = visible(f, POSE_LANDMARKS.LEFT_HIP);
    const okR = visible(f, POSE_LANDMARKS.RIGHT_HIP);
    if (!okL && !okR) continue;
    const hips = [
      okL ? lm(f, POSE_LANDMARKS.LEFT_HIP).y : null,
      okR ? lm(f, POSE_LANDMARKS.RIGHT_HIP).y : null,
    ].filter((v): v is number => v != null);
    const hipY = hips.reduce((s, v) => s + v, 0) / hips.length;
    const okSL = visible(f, POSE_LANDMARKS.LEFT_SHOULDER);
    const okSR = visible(f, POSE_LANDMARKS.RIGHT_SHOULDER);
    let yVal = hipY;
    if (okSL || okSR) {
      const shoulders = [
        okSL ? lm(f, POSE_LANDMARKS.LEFT_SHOULDER).y : null,
        okSR ? lm(f, POSE_LANDMARKS.RIGHT_SHOULDER).y : null,
      ].filter((v): v is number => v != null);
      const shoulderY = shoulders.reduce((s, v) => s + v, 0) / shoulders.length;
      yVal = 0.6 * hipY + 0.4 * shoulderY;
    }
    t.push(f.timestamp);
    y.push(yVal);
  }
  return { t, y };
}

interface HipMotion {
  readonly hipRise: number;
  readonly ankleRise: number;
  readonly hipBarelyMoved: boolean;
}

function measureHipAnkleRise(
  frames: readonly PoseFrame[],
  scale: number
): HipMotion | null {
  const hipY: number[] = [];
  const ankleY: number[] = [];
  for (const f of frames) {
    const hipOk =
      visible(f, POSE_LANDMARKS.LEFT_HIP) || visible(f, POSE_LANDMARKS.RIGHT_HIP);
    const ankleOk =
      visible(f, POSE_LANDMARKS.LEFT_ANKLE) ||
      visible(f, POSE_LANDMARKS.RIGHT_ANKLE);
    if (!hipOk || !ankleOk) continue;
    const hL = visible(f, POSE_LANDMARKS.LEFT_HIP)
      ? lm(f, POSE_LANDMARKS.LEFT_HIP).y
      : null;
    const hR = visible(f, POSE_LANDMARKS.RIGHT_HIP)
      ? lm(f, POSE_LANDMARKS.RIGHT_HIP).y
      : null;
    const aL = visible(f, POSE_LANDMARKS.LEFT_ANKLE)
      ? lm(f, POSE_LANDMARKS.LEFT_ANKLE).y
      : null;
    const aR = visible(f, POSE_LANDMARKS.RIGHT_ANKLE)
      ? lm(f, POSE_LANDMARKS.RIGHT_ANKLE).y
      : null;
    const hips = [hL, hR].filter((v): v is number => v != null);
    const ankles = [aL, aR].filter((v): v is number => v != null);
    hipY.push(hips.reduce((s, v) => s + v, 0) / hips.length);
    ankleY.push(ankles.reduce((s, v) => s + v, 0) / ankles.length);
  }
  if (hipY.length < MIN_FRAMES) return null;

  const hipBase = median(hipY.slice(0, Math.min(25, hipY.length)));
  const ankleBase = median(ankleY.slice(0, Math.min(25, ankleY.length)));
  const hipRise = hipBase - Math.min(...hipY);
  const ankleRise = ankleBase - Math.min(...ankleY);
  return {
    hipRise,
    ankleRise,
    hipBarelyMoved: hipRise < MIN_JUMP_HIP_RISE_FRAC * scale,
  };
}

/**
 * Kalça Y'sinin tepe çevresi yerçekimiyle tutarlı bir parabol mü?
 *
 * Yapışkan ayak / uçuş karelerinin visibility yüzünden silinmesi durumunda
 * ayak bileği "havalanmadı" der; kalça yörüngesi hâlâ balistikse hareket
 * sıçramadır. Eğrilik testi taban çizgisinden bağımsızdır.
 */
function hipBallisticEvidence(
  frames: readonly PoseFrame[],
  scale: number,
  hipRise: number
): boolean {
  if (hipRise < MIN_JUMP_HIP_RISE_FRAC * scale) return false;

  const { t, y } = extractHipY(frames);
  if (t.length < 5) return false;

  const hipBase = median(y.slice(0, Math.min(25, y.length)));
  let apexIdx = 0;
  for (let i = 1; i < y.length; i++) {
    if (y[i] < y[apexIdx]) apexIdx = i;
  }

  const peakRise = hipBase - y[apexIdx];
  if (peakRise <= 0) return false;
  const inAir = 0.25 * peakRise;

  let left = apexIdx;
  while (left > 0 && hipBase - y[left - 1] > inAir) left--;
  let right = apexIdx;
  while (right < y.length - 1 && hipBase - y[right + 1] > inAir) right++;

  // Parabol fit en az 5 nokta ister. Pencere daralırsa tepe etrafını aç.
  if (right - left + 1 < 5) {
    left = Math.max(0, apexIdx - 3);
    right = Math.min(y.length - 1, apexIdx + 3);
  }
  if (right - left + 1 < 5) return false;

  const ts = t.slice(left, right + 1);
  const ys = y.slice(left, right + 1);
  const fit = fitParabola(ts, ys);
  if (!fit) return false;
  if (gravityConsistentCmPerUnit(fit.a) == null) return false;
  return parabolaRSquared(fit, ys) >= MIN_HIP_BALLISTIC_R_SQUARED;
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

  const scale = bodyScale(frames);
  const minGap = SINGLE_LEG_MIN_ANKLE_GAP_FRAC * scale;

  const n = Math.min(leftY.length, rightY.length);
  const bothDown: boolean[] = [];
  let singleLegFrames = 0;
  for (let i = 0; i < n; i++) {
    const up = Math.abs(leftY[i] - rightY[i]) > minGap;
    bothDown.push(!up);
    if (up) singleLegFrames++;
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

  // Duruş doğrulandı. Arada ayak yere değdi mi?
  //
  // Dikkat: toplam temas ORANINA bakmak yanlış olurdu — o sayı yukarıdaki
  // `ratio`nun aynısıdır (1 - ratio) ve aynı sinyalden ikinci kez, daha sıkı
  // bir eşikle ceza keserdi. Ayrı olan şey temasın SÜREKLİLİĞİ: dağınık tek
  // kareler denge salınımı, yarım saniyeyi aşan kesintisiz temas ihlaldir.
  const violations: ProtocolViolation[] = [];
  const episodeMs = longestRun(bothDown) * frameIntervalMs(frames);
  if (episodeMs > MIN_TOUCHDOWN_EPISODE_MS) {
    violations.push('foot_touched_down');
  }

  return verdict({
    protocolViolations: violations,
    stanceConfirmed: true,
    techniqueScore: Math.round(ratio * 100),
    judgeConfidence: 0.85,
  });
}

function detectArmSwing(
  frames: readonly PoseFrame[],
  scale: number
): boolean {
  const deltas: number[] = [];
  for (const f of frames) {
    const hipOk =
      visible(f, POSE_LANDMARKS.LEFT_HIP) || visible(f, POSE_LANDMARKS.RIGHT_HIP);
    const wristOk =
      visible(f, POSE_LANDMARKS.LEFT_WRIST) &&
      visible(f, POSE_LANDMARKS.RIGHT_WRIST);
    if (!hipOk || !wristOk) continue;
    const hips = [
      visible(f, POSE_LANDMARKS.LEFT_HIP) ? lm(f, POSE_LANDMARKS.LEFT_HIP).y : null,
      visible(f, POSE_LANDMARKS.RIGHT_HIP) ? lm(f, POSE_LANDMARKS.RIGHT_HIP).y : null,
    ].filter((v): v is number => v != null);
    const wrists = [
      lm(f, POSE_LANDMARKS.LEFT_WRIST).y,
      lm(f, POSE_LANDMARKS.RIGHT_WRIST).y,
    ];
    const hipY = hips.reduce((s, v) => s + v, 0) / hips.length;
    const wristY = (wrists[0] + wrists[1]) / 2;
    // Görüntü Y aşağı pozitif: bilek yükselince wristY küçülür, d büyür.
    deltas.push(hipY - wristY);
  }
  if (deltas.length < MIN_FRAMES) return false;
  const baseline = median(deltas.slice(0, Math.min(20, deltas.length)));
  const peak = Math.max(...deltas);
  return peak - baseline > ARM_SWING_FRAC * scale;
}

function armSwingVerdict(): TestVerdict {
  return verdict({
    performed: false,
    protocolViolations: ['arm_swing'],
    techniqueScore: 0,
    judgeConfidence: 0.85,
    notes: 'Bilekler kalçaya göre belirgin yükseldi — kol savurma.',
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

  const scale = bodyScale(frames);
  const swing = detectArmSwing(frames, scale);
  const motion = measureHipAnkleRise(frames, scale);
  if (!motion) {
    return verdict({ judgeConfidence: 0.3, notes: 'Kalça izlenemedi.' });
  }

  // 1. Kalça parabolü ayağı ezer — yapışkan ayak / kaybolan uçuş kareleri.
  if (hipBallisticEvidence(frames, scale, motion.hipRise)) {
    if (swing) return armSwingVerdict();
    return verdict({
      judgeConfidence: 0.85,
      notes: 'Kalça yörüngesi balistik; ayak izlemesi yok sayılsın.',
    });
  }

  const airborne = detectAirborneFrames(frames, scale);

  // 2. Ne ayak havalandı ne gövde yükseldi — kıpırdamama.
  if (airborne === 0 && motion.hipBarelyMoved) {
    return verdict({
      performed: false,
      protocolViolations: ['no_flight_phase'],
      techniqueScore: 0,
      judgeConfidence: 0.9,
      notes: 'Ayaklar hiçbir karede yerden kesilmedi ve gövde yükselmedi.',
    });
  }

  // 3. Ayak kalktı, gövde yerinde — parmak ucu / topuk kaldırma.
  // Kural eskiden ORANA bakıyordu (`hipRise / ankleRise < 0.5`) ve bu yanlıştı:
  // gerçek bir sıçramada çocuk havada dizlerini toplarsa ayak bileği gövdeden
  // çok daha fazla yükselir. Ayırt edici olan kalçanın MUTLAK yükselişi.
  if (motion.ankleRise > AIRBORNE_LIFT_FRAC * scale && motion.hipBarelyMoved) {
    return verdict({
      performed: false,
      protocolViolations: ['heel_raise_only'],
      techniqueScore: 0,
      judgeConfidence: 0.85,
      notes: 'Ayak yükseldi ama gövde takip etmedi — topuk kaldırma.',
    });
  }

  // 4. Ayak izlemesi uçuş göstermedi ama kalça yükseldi ve balistik
  // doğrulanamadı. Hakem reddetmez — "protokol ihlal edildi mi" belirsiz;
  // ölçülebilirlik kararını analyzeJump verir.
  if (airborne === 0) {
    if (swing) return armSwingVerdict();
    return verdict({
      judgeConfidence: 0.45,
      notes:
        'Ayak izlemesi uçuş göstermedi; kalça yükseldi ama balistik doğrulanamadı. Ölçüm katmanı karar verir.',
    });
  }

  if (swing) return armSwingVerdict();
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

  const scale = bodyScale(frames);
  const motion = measureHipAnkleRise(frames, scale);
  if (motion && hipBallisticEvidence(frames, scale, motion.hipRise)) {
    return verdict({
      judgeConfidence: 0.85,
      notes: 'Kalça yörüngesi balistik; ayak izlemesi yok sayılsın.',
    });
  }

  const airborne = detectAirborneFrames(frames, scale);
  if (airborne === 0 && (motion == null || motion.hipBarelyMoved)) {
    return verdict({
      performed: false,
      protocolViolations: ['no_flight_phase', 'stepped_not_jumped'],
      techniqueScore: 0,
      judgeConfidence: 0.9,
      notes: 'Yatay yer değiştirme var ama uçuş fazı yok — yürüyüş.',
    });
  }

  if (airborne === 0) {
    return verdict({
      judgeConfidence: 0.45,
      notes:
        'Ayak izlemesi uçuş göstermedi; kalça yükseldi ama balistik doğrulanamadı. Ölçüm katmanı karar verir.',
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
  const scale = bodyScale(frames);
  const amplitude = standardDeviation(centerX);
  if (amplitude < MIN_LATERAL_AMPLITUDE_FRAC * scale) {
    return verdict({
      performed: false,
      protocolViolations: ['insufficient_amplitude'],
      techniqueScore: 0,
      judgeConfidence: 0.85,
      notes: `Yanal genlik ${amplitude.toFixed(4)} birim — titreme.`,
    });
  }

  const airborne = detectAirborneFrames(frames, scale);
  if (airborne === 0) {
    return verdict({
      judgeConfidence: 0.55,
      notes:
        'Yanal genlik yeterli; ayak izlemesi uçuş göstermedi. Ölçüm katmanı karar verir.',
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
