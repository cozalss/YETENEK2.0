/**
 * Counter-Movement Jump (CMJ) — patlayıcı güç testi.
 *
 * Phases (algılama mantığı):
 *   READY       → kullanıcı dik duruyor, kalça Y baseline.
 *   LOADING     → kalça Y aşağı iner (çömelme).
 *   LAUNCH      → kalça Y hızla yukarı çıkar (patlayıcı kalkış).
 *   AIRBORNE    → ayaklar yerden kesilir, kalça maksimum Y'de.
 *   LANDING     → kalça tekrar iner.
 *
 * İki ayrı sıçrama yüksekliği hesabı çalışır, sonra cross-check edilir:
 *
 *   1. FLIGHT TIME (PRIMARY) — Bosco et al. 1983 protokolü
 *      h (m) = (g × t²) / 8, g = 9.81 m/s², t = uçuş süresi (s)
 *      Ayak bileği Y'sinin baseline'dan ne zaman kalktığı (toe-off) ve ne
 *      zaman geri döndüğü (landing) ile ölçülür. Perspektiften bağımsız.
 *
 *   2. HIP DISPLACEMENT (CROSS-CHECK) — hip Y delta * cmPerUnit
 *      Eski yaklaşım. Perspektif/kalibrasyon hatasına açık ama bağımsız bir
 *      sinyal — iki yöntem >%30 farklıysa düşük güven flag'i konur.
 *
 * MediaPipe'da Y aşağı doğru artıyor (görüntü koordinat sistemi).
 *   → daha küçük Y = daha yukarıda
 *   → "yukarı çıkmak" Y'nin AZALMASI demek
 */

import type { PoseFrame } from '@/types';
import {
  getCmPerUnit,
  getHipCenter,
  getShoulderCenter,
  hasVisibleLandmarks,
  smoothSeries,
} from '@/lib/pose/extractKeypoints';
import { POSE_LANDMARKS } from '@/types';
import {
  fitParabolaRobust,
  solveFlightFromParabola,
  flightTimeToHeightCm,
  heightSigmaCm,
  type FlightSolution,
} from './kinematics';
import { MIN_SIGMA_CM, OUTLIER_SIGMA_K } from './jumpStats';

// Hip + ayak görünmeden ölçüm güvenilmez.
const REQUIRED_LANDMARKS = [
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
];

export interface HipSample {
  t: number; // ms (frame timestamp)
  /**
   * Dikey seri — gövde merkezi proxy'si (`0.6 × kalça + 0.4 × omuz`) veya
   * omuz yoksa kalça. Bu gerçek bir biyomekanik kütle merkezi değil; gövde
   * rijit olduğu için iki bağımsız jitter'ı düşüren bir araç. Diz bilinçli
   * olarak dışarıda: uçuşta diz çekme onu yukarı kaydırır ve ölçümü şişirir.
   */
  y: number;
  /** Ham kalça Y — yatay kayma ve bacak ölçeği için. */
  hipY?: number;
  hipX?: number;
  /** Ayak bileği Y (sol/sağ ortalaması). Flight-time tespiti için. */
  ankleY?: number;
  /** Fit'e giren kareler için min(kalça, ayak) görünürlüğü. */
  visibility?: number;
  /** En bükük diz açısı (derece); çömelme derinliği için. */
  kneeAngleDeg?: number;
}

export type HeightMethod = 'flight-time' | 'hip-displacement' | 'consensus';

export type JumpIdentity = {
  readonly ageYears: number;
  readonly sex: 'male' | 'female';
};

export interface JumpAnalysis {
  /** Net hip Y delta — normalize birim cinsinden (cross-check için) */
  jumpUnits: number;
  /** Sıçrama yüksekliği cm (raporlanan birincil değer) */
  jumpHeightCm: number | null;
  /** Hip displacement metoduyla bulunan yükseklik (cross-check) */
  jumpHeightCmHip: number | null;
  /** Flight-time metoduyla bulunan yükseklik (Bosco protokolü) */
  jumpHeightCmFlight: number | null;
  /** Hangi metot birincil olarak raporlandı */
  method: HeightMethod;
  /** Flight-time / hip-displacement tutarlı mı? (% fark < 30 → true) */
  consistent: boolean;
  /** Yer durumundaki kalça Y (apex'ten önceki son local maksimum) */
  takeoffY: number;
  /** Tepe noktasındaki kalça Y (en küçük Y değeri) */
  apexY: number;
  /** Uçuş süresi (toe-off → landing). Tespit edilmediyse 0. */
  flightTimeMs: number;
  /**
   * Raporlanan yüksekliğin 1σ belirsizliği (cm). Ölçüm hatasız değildir;
   * bu alan olmadan "32cm" ifadesi eksik bir iddiadır. Uçuş tespit
   * edilemediyse null.
   */
  jumpHeightSigmaCm: number | null;
  /**
   * Uçuş süresi nasıl bulundu:
   *   'parabolic' → serbest düşüş parabolünün taban çizgisi kökleri (fizik
   *                 doğrulamalı, alt-kare hassasiyetinde)
   *   'threshold' → eşik geçişi (geriye dönük uyum; kare ızgarasına bağlı)
   */
  flightMethod: 'parabolic' | 'threshold' | null;
  /**
   * Parabol eğriliğinden türeyen ölçek (cm / normalize birim). Çocuğun boyu
   * veya world landmark gerekmeden yerçekiminden çıkar; kalibrasyon için
   * bağımsız bir çapraz kontrol.
   */
  cmPerUnitFromGravity: number | null;
  /** Balistik uyum kalitesi (R²). Yalnız 'parabolic' yöntemde dolu. */
  ballisticFit: number | null;
  /**
   * Test sırası yumuşak sinyaller — reddetmez, σ'yı genişletir. Veliye
   * gösterilecek kısa notlar (yatay kayma, sığ çömelme, düşük fps).
   */
  captureNotes: readonly string[];
  /** Yorumlama yapacak kadar veri var mıydı */
  valid: boolean;
  /** Validasyon başarısızsa sebep */
  reason?: string;
}

// CMJ algılama eşikleri.
// MIN_JUMP_UNITS: 5cm'lik bir gerçek sıçramaya tipik olarak ~0.025 normalize
// karşılık geliyor (kişi çerçevenin %80'ini kaplarsa). Bunun altı "ufak baş
// hareketi" rejyonu, yanlış pozitif riski büyük.
const MIN_JUMP_UNITS = 0.04;

// Sıçrama hızlı bir olay olmalı: takeoff <-> apex arası 100-700ms.
// Daha uzunsa muhtemelen kullanıcı yavaşça eğilip kalkıyor — gerçek CMJ değil.
const MAX_TAKEOFF_TO_APEX_MS = 700;
const MIN_TAKEOFF_TO_APEX_MS = 100;

// Flight-time tespit eşikleri.
// Ayak bileği baseline'dan en az ANKLE_LIFT_THRESHOLD kadar yukarı kalkarsa
// toe-off sayılır. Çocuk telefon karşısındayken vücut frame'in ~%70-80'ini
// dolduruyor → 5cm'lik bir kalkış normalize Y'de ~0.012-0.018 değişim demek.
// 0.015 = "çok hafif sıçrama" eşiği, üstünü kabul ediyoruz.
const ANKLE_LIFT_THRESHOLD = 0.015;
const MIN_FLIGHT_TIME_MS = 100; // 0.1s = ~12cm fiziksel limit
// 0.7s ≈ 60 cm (Bosco). 8-15 yaş CMJ'de 60 cm elit; 1.2s/177cm glitch'e yol
// açıyordu (eşik fallback ~1s uçuş → 125 cm "en iyi" seçiliyordu).
const MAX_FLIGHT_TIME_MS = 700;
const MIN_FLIGHT_HEIGHT_CM = 5; // Daha azı yanlış-pozitif
/** Yaş tavanı: norm ortalama + bu kadar SD. 14 yaş erkek ≈ 60 cm. */
const PLAUSIBLE_HEIGHT_SD = 4;

// Cross-method tolerance — iki yöntem (flight-time + hip-displacement) %20'den
// fazla farklıysa VE mutlak fark 15 cm'i aşarsa deneme reddedilir. Eşik
// Donaldson & Edge 2014'ten (J Sci Med Sport 17:670): motion capture vs
// flight-time farkı tipik %5-15; %20 + 15 cm üstü = yanlış uçuş tespiti.
const HEIGHT_AGREEMENT_TOLERANCE = 0.2;
const HEIGHT_AGREEMENT_ABS_CM = 15;

/**
 * Parabol fit'inin "bu gerçekten serbest düşüştü" sayılması için gereken
 * asgari R². Gerçek bir sıçramada ayak bileği yörüngesi neredeyse kusursuz
 * parabolik olur (R² > 0.99); topuk kaldırma, ağırlık aktarımı ve yavaş
 * yükselme bu uyumu tutturamaz. Eşik 0.9'da tutuldu — gürültülü telefon
 * yakalamasına pay bırakırken balistik olmayanı elemeye yeter.
 */
const MIN_BALLISTIC_R_SQUARED = 0.9;

/**
 * Force-plate sapması ölçülene kadar 0. Kamera tabanlı uçuş süresinin
 * platforma göre tutarlı bir kayması vardır; ölçülmeden sabit uydurmak
 * mevcut durumdan kötüdür. Pilot protokolü: `docs/BIAS_PILOT.md`.
 */
export const BIAS_CORRECTION_CM = 0;

/** Fit'e giren karelerde kalça/ayak görünürlük tabanı — bulanık uçuş karelerini eker. */
const FIT_MIN_VISIBILITY = 0.65;

/** Yatay kayma: uçuşta kalça X aralığı bacak uzunluğunun bu oranını aşarsa σ şişer. */
const HORIZONTAL_DRIFT_FRAC = 0.18;
/** Çömelmede diz açısı (derece) — aşırı sığ / aşırı derin. */
const SQUAT_SHALLOW_DEG = 145;
const SQUAT_DEEP_DEG = 55;

interface FlightDetection {
  takeoffIdx: number;
  landingIdx: number;
  flightTimeMs: number;
  /** Uçuş süresinin 1σ belirsizliği (ms). */
  sigmaMs: number;
  /** Baseline ankle Y (ilk birkaç frame'in median'ı) */
  baselineAnkleY: number;
  /** Süre nasıl bulundu — parabol kökü mü, eşik geçişi mi. */
  method: 'parabolic' | 'threshold';
  /** Parabol eğriliğinden çıkan ölçek; eşik yönteminde null. */
  cmPerUnitFromGravity: number | null;
  /** Balistik uyum R²; eşik yönteminde null. */
  rSquared: number | null;
}

/**
 * Parabol çözümünü iki geçişte hassaslaştırır.
 *
 * 1. **Kaba geçiş.** Eşik penceresinden `landingIdx` çıkarılarak (o kare zaten
 *    yere basıyor) ilk fit yapılır ve kökler bulunur.
 * 2. **Daraltılmış geçiş.** Bulunan köklerin *arasında* kalan kareler seçilip
 *    yeniden fit edilir. Böylece yer temasına ait kareler tamamen dışarıda
 *    kalır; eğrilik ve dolayısıyla hem süre hem ölçek düzelir.
 *
 * Daraltma yeterli örnek bırakmazsa kaba çözüm korunur — daha az veriyle
 * yapılmış "daha hassas" bir fit, daha kötü bir tahmindir.
 */
function refineFlightSolution(
  samples: ReadonlyArray<HipSample & { ankleY: number }>,
  takeoffIdx: number,
  landingIdx: number,
  baselineY: number
): FlightSolution | null {
  const coarseEnd = Math.max(takeoffIdx + 1, landingIdx - 1);
  const window = samples.slice(takeoffIdx, coarseEnd + 1);
  const visible = window.filter((s) => (s.visibility ?? 1) >= FIT_MIN_VISIBILITY);
  const coarse = visible.length >= 5 ? visible : window;
  const coarseTs = coarse.map((s) => s.t);
  const coarseYs = coarse.map((s) => s.ankleY);

  const coarseFit = fitParabolaRobust(coarseTs, coarseYs);
  if (!coarseFit) return null;
  const coarseSol = solveFlightFromParabola(coarseFit, baselineY, coarseYs);
  if (!coarseSol) return null;

  // Köklerin kesin içinde kalan kareler — yer temasına ait olanlar elenir.
  const inner = samples.filter(
    (s) =>
      s.t > coarseSol.takeoffMs &&
      s.t < coarseSol.landingMs &&
      (s.visibility ?? 1) >= FIT_MIN_VISIBILITY
  );
  if (inner.length < 5) return coarseSol;

  const innerTs = inner.map((s) => s.t);
  const innerYs = inner.map((s) => s.ankleY);
  const fineFit = fitParabolaRobust(innerTs, innerYs);
  if (!fineFit) return coarseSol;
  const fine = solveFlightFromParabola(fineFit, baselineY, innerYs);
  return fine ?? coarseSol;
}

/** Örneklerin medyan zaman aralığı (ms) — kare kuantizasyonu için. */
function medianInterval(ts: readonly number[]): number {
  if (ts.length < 2) return 1000 / 30;
  const deltas: number[] = [];
  for (let i = 1; i < ts.length; i++) deltas.push(ts[i] - ts[i - 1]);
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length / 2)] || 1000 / 30;
}

/**
 * Ankle Y zaman serisinden uçuş fazını tespit eder.
 *
 * İki aşamalı:
 *
 *   1. **Bölge bulma (eşik).** Kaba olarak uçuşun hangi kareler arasında
 *      olduğunu bulur. Eşiğin hassas olması gerekmez — yalnız kuşatması yeterli.
 *   2. **Kök çözümü (parabol).** Bölgenin *ham* örneklerine serbest düşüş
 *      parabolü fit edilip taban çizgisi kökleri çözülür. Eşiğin getirdiği
 *      sistematik kısalık ve kare ızgarası bağımlılığı tamamen kalkar; fizik
 *      doğrulaması balistik olmayan hareketi eler.
 *
 * Parabol tutmazsa (adım fonksiyonu gibi dejenere sinyal, aşırı gürültü) eşik
 * zamanlamasına düşülür ve σ kare kuantizasyonundan hesaplanır.
 */
function detectFlightPhase(samples: HipSample[]): FlightDetection | null {
  // Type guard ile filtrele — `as number` yerine TS narrowing'i koru.
  const ankleSamples = samples.filter(
    (s): s is HipSample & { ankleY: number } => s.ankleY != null
  );
  if (ankleSamples.length < 30) return null;

  const ankleYs = ankleSamples.map((s) => s.ankleY);
  const smoothedAnkles = smoothSeries(ankleYs, 3);

  // Baseline: ilk 25 frame'in median'ı (yere basıyor varsayımı).
  const baselineSlice = [
    ...smoothedAnkles.slice(0, Math.min(25, smoothedAnkles.length)),
  ].sort((a, b) => a - b);
  const baselineAnkleY = baselineSlice[Math.floor(baselineSlice.length / 2)];

  let takeoffIdx = -1;
  let landingIdx = -1;

  for (let i = 0; i < smoothedAnkles.length; i++) {
    const lift = baselineAnkleY - smoothedAnkles[i]; // pozitif = yukarı kalktı
    if (takeoffIdx === -1 && lift > ANKLE_LIFT_THRESHOLD) {
      takeoffIdx = i;
    } else if (takeoffIdx !== -1 && i > takeoffIdx + 2 && lift < 0.005) {
      landingIdx = i;
      break;
    }
  }

  if (takeoffIdx === -1 || landingIdx === -1) return null;

  const ts = ankleSamples.map((s) => s.t);

  // --- Aşama 2: parabol kökü ile hassaslaştırma -------------------------
  // Ham (yumuşatılmamış) örnekleri kullan: en küçük kareler zaten gürültüyü
  // bastırıyor ve artık standart sapması gerçek sensör gürültüsünü ölçüyor.
  // Yumuşatılmış seri kullanılsaydı residualStd yapay olarak küçülür, σ yalan
  // söylerdi.
  const solution = refineFlightSolution(
    ankleSamples,
    takeoffIdx,
    landingIdx,
    baselineAnkleY
  );

  if (
    solution &&
    solution.rSquared >= MIN_BALLISTIC_R_SQUARED &&
    solution.flightTimeMs >= MIN_FLIGHT_TIME_MS &&
    solution.flightTimeMs <= MAX_FLIGHT_TIME_MS
  ) {
    return {
      takeoffIdx,
      landingIdx,
      flightTimeMs: solution.flightTimeMs,
      sigmaMs: solution.sigmaMs,
      baselineAnkleY,
      method: 'parabolic',
      cmPerUnitFromGravity: solution.cmPerUnitFromGravity,
      rSquared: solution.rSquared,
    };
  }

  // --- Geriye dönüş: eşik zamanlaması ----------------------------------
  const flightTimeMs = ankleSamples[landingIdx].t - ankleSamples[takeoffIdx].t;

  if (flightTimeMs < MIN_FLIGHT_TIME_MS || flightTimeMs > MAX_FLIGHT_TIME_MS) {
    return null;
  }

  // Her iki kenar da bir kare aralığı içinde düzgün dağılmış → σ = Δt/√12.
  // İki bağımsız kenar → √2 ile birleşir.
  const dt = medianInterval(ts);
  const sigmaMs = (Math.SQRT2 * dt) / Math.sqrt(12);

  return {
    takeoffIdx,
    landingIdx,
    flightTimeMs,
    sigmaMs,
    baselineAnkleY,
    method: 'threshold',
    cmPerUnitFromGravity: null,
    rSquared: null,
  };
}

function invalid(
  reason: string,
  partial: Partial<JumpAnalysis> = {}
): JumpAnalysis {
  return {
    jumpUnits: 0,
    jumpHeightCm: null,
    jumpHeightCmHip: null,
    jumpHeightCmFlight: null,
    method: 'consensus',
    consistent: true,
    takeoffY: 0,
    apexY: 0,
    flightTimeMs: 0,
    jumpHeightSigmaCm: null,
    flightMethod: null,
    cmPerUnitFromGravity: null,
    ballisticFit: null,
    captureNotes: [],
    ...partial,
    valid: false,
    reason,
  };
}

/**
 * Hip Y zaman serisinden CMJ analizini çıkarır + flight-time cross-check.
 *
 * Beklenen örüntü:
 *   - başlangıç düz (READY)
 *   - aşağı eğri (LOADING)
 *   - yukarı keskin (LAUNCH/AIRBORNE)
 *   - tekrar aşağı (LANDING)
 *
 * Yanlış pozitif filtreleri:
 *   - Toplam hareket çok küçükse → ufak baş hareketi sayılır, reddedilir
 *   - Apex 100ms'den hızlı veya 700ms'den yavaş ulaşılmışsa → reddedilir
 */
export function analyzeJump(
  samples: HipSample[],
  identity?: JumpIdentity
): JumpAnalysis {
  if (samples.length < 30) {
    return invalid(
      'Yetersiz örnek. Vücudunun kameraya tam görünmesi gerekiyor.'
    );
  }

  // Frame jitter'ını kır.
  const ys = samples.map((s) => s.y);
  const smoothedYs = smoothSeries(ys, 5);

  // Apex = en küçük Y (en yüksek nokta)
  let apexIdx = 0;
  for (let i = 1; i < smoothedYs.length; i++) {
    if (smoothedYs[i] < smoothedYs[apexIdx]) apexIdx = i;
  }
  const apexY = smoothedYs[apexIdx];

  // Apex'ten geriye gidip yerel maksimumu (takeoff yani yer yüksekliği) bul.
  // Pratik olarak apex'ten önceki en yüksek Y (en alttaki kalça noktası — yere basıyor).
  let takeoffIdx = 0;
  let takeoffY = smoothedYs[0];
  for (let i = 0; i < apexIdx; i++) {
    if (smoothedYs[i] > takeoffY) {
      takeoffY = smoothedYs[i];
      takeoffIdx = i;
    }
  }

  const jumpUnits = takeoffY - apexY;
  const upDurationMs = samples[apexIdx].t - samples[takeoffIdx].t;

  // Flight-time her zaman dene (varsa primary olur).
  const flight = detectFlightPhase(samples);

  // Kalça yörüngesi mantık kapıları yalnızca **fizik doğrulanmışsa** atlanır.
  //
  // Eskiden koşul `!flight` idi; `flight` ise sadece "ayak bileği eşiği geçti"
  // demekti. Topuk kaldırmak bu eşiği geçmeye yetiyor, dolayısıyla üç kapı da
  // devre dışı kalıyor ve topuk kaldırma geçerli bir sıçrama olarak
  // raporlanıyordu. Artık kapılar ancak ayak bileği yörüngesi serbest düşüş
  // parabolüne uyduğunda (R² ≥ eşik, ölçek yerçekimiyle tutarlı) atlanıyor —
  // yani hareketin balistik olduğu bağımsız olarak kanıtlandığında.
  const physicsVerified = flight?.method === 'parabolic';

  if (jumpUnits < MIN_JUMP_UNITS && !physicsVerified) {
    return invalid(
      'Belirgin bir sıçrama algılanmadı. Çömelip patlayıcı bir şekilde zıplaman gerekiyor.',
      { jumpUnits, takeoffY, apexY }
    );
  }

  if (upDurationMs < MIN_TAKEOFF_TO_APEX_MS && !physicsVerified) {
    return invalid(
      'Hareket çok kısa süreli — gerçek sıçrama yerine titreşim olabilir.',
      { jumpUnits, takeoffY, apexY }
    );
  }

  if (upDurationMs > MAX_TAKEOFF_TO_APEX_MS && !physicsVerified) {
    return invalid(
      'Hareket çok yavaş. CMJ patlayıcı bir sıçrama; çömelip hızla yukarı çık.',
      { jumpUnits, takeoffY, apexY }
    );
  }

  // Hip-displacement fallback uçuş süresi: apex etrafında simetri varsayımı.
  const fallbackFlightMs = upDurationMs * 2;
  const flightTimeMs = flight?.flightTimeMs ?? fallbackFlightMs;
  const jumpHeightCmFlight = flight
    ? flightTimeToHeightCm(flight.flightTimeMs) + BIAS_CORRECTION_CM
    : null;

  // Flight-time çok düşük yükseklik veriyorsa, hip-displacement güçlü olsa
  // bile noise sayılır — primary metot yanlış-pozitif vermesin. Çocuk hafif
  // ağırlık aktarımı yaparsa (gerçek sıçrama yok) ankleY threshold'u kısa
  // sürelik geçebilir; o sahte 2cm flight değeri raporlanmamalı.
  if (jumpHeightCmFlight != null && jumpHeightCmFlight < MIN_FLIGHT_HEIGHT_CM) {
    return invalid(
      'Sıçrama algılandı ama çok küçük. Daha güçlü patlayıcı bir CMJ dene.',
      { jumpUnits, takeoffY, apexY }
    );
  }

  if (jumpHeightCmFlight != null && identity) {
    const cap = maxPlausibleJumpHeightCm(identity.ageYears, identity.sex);
    if (jumpHeightCmFlight > cap) {
      return invalid(
        'Uçuş süresi güvenilir değil — bu deneme sayılmadı. Tekrar dene.',
        { jumpUnits, takeoffY, apexY, jumpHeightCmFlight, flightTimeMs }
      );
    }
  }

  const { notes: captureNotes, sigmaBoost } = softCaptureSignals(
    samples,
    flight?.takeoffIdx ?? takeoffIdx,
    flight?.landingIdx ?? apexIdx
  );

  let jumpHeightSigmaCm = flight
    ? heightSigmaCm(flight.flightTimeMs, flight.sigmaMs)
    : null;
  if (jumpHeightSigmaCm != null && sigmaBoost > 1) {
    jumpHeightSigmaCm *= sigmaBoost;
  }

  return {
    jumpUnits,
    jumpHeightCm: jumpHeightCmFlight, // flight-time primary; calibrate doldurursa hip de hesaplanır
    jumpHeightCmHip: null, // calibrateJumpHeight ile doldurulur
    jumpHeightCmFlight,
    method: jumpHeightCmFlight != null ? 'flight-time' : 'hip-displacement',
    consistent: true, // calibrateJumpHeight içinde re-check
    takeoffY,
    apexY,
    flightTimeMs,
    // σ yalnızca uçuş süresi gerçekten ölçüldüğünde anlamlı. Hip-displacement
    // fallback'inde (apex simetrisi varsayımı) belirsizlik modellenmiş değil —
    // uydurulmuş bir σ vermek yerine null bırakılıyor.
    jumpHeightSigmaCm,
    flightMethod: flight?.method ?? null,
    cmPerUnitFromGravity: flight?.cmPerUnitFromGravity ?? null,
    ballisticFit: flight?.rSquared ?? null,
    captureNotes,
    valid: true,
  };
}

/**
 * Hip displacement metoduyla sıçrama yüksekliğini cm'e çevirir + flight-time
 * sonucuyla cross-check eder. İki yöntem tutarlıysa flight-time birincil
 * kalır; hem oransal hem mutlak sapma büyükse deneme reddedilir (sahte
 * ~1 s uçuş + gerçek ~30 cm kalça).
 *
 * Öncelik:
 *   1. flight-time varsa → birincil
 *   2. Worldlandmarks varsa → cmPerUnit hesaplanır, hip displacement ikincil
 *   3. heightCm verilmişse → boy fallback ile hip displacement
 */
export function calibrateJumpHeight(
  analysis: JumpAnalysis,
  calibrationFrame: PoseFrame,
  heightCm: number | null,
  identity?: JumpIdentity
): JumpAnalysis {
  if (!analysis.valid) return analysis;
  const cmPerUnit = getCmPerUnit(calibrationFrame, heightCm);
  const jumpHeightCmHip =
    cmPerUnit != null ? analysis.jumpUnits * cmPerUnit : null;

  // Birincil yükseklik politikası:
  //   - flight-time varsa HER ZAMAN birincil (Bosco 1983 — perspektif bağımsız,
  //     fiziksel olarak doğru). Hip-displacement cross-check; büyük sapmada
  //     reddedilir, sessizce 125 cm bırakılmaz.
  //   - flight-time yoksa hip-displacement fallback.
  let primary: number | null = analysis.jumpHeightCmFlight;
  const method: HeightMethod =
    analysis.jumpHeightCmFlight != null ? 'flight-time' : 'hip-displacement';
  let consistent = true;

  if (primary != null && jumpHeightCmHip != null && primary > 0) {
    const absDiff = Math.abs(primary - jumpHeightCmHip);
    const relDiff = absDiff / primary;
    consistent = relDiff <= HEIGHT_AGREEMENT_TOLERANCE;
    if (!consistent && absDiff > HEIGHT_AGREEMENT_ABS_CM) {
      return invalid(
        'Uçuş süresi ile kalça hareketi uyuşmuyor — bu deneme sayılmadı. Tekrar dene.',
        {
          ...analysis,
          jumpHeightCm: null,
          jumpHeightCmHip,
          method,
          consistent: false,
        }
      );
    }
  } else if (primary == null && jumpHeightCmHip != null) {
    primary = jumpHeightCmHip;
  }

  if (primary != null && identity) {
    const cap = maxPlausibleJumpHeightCm(identity.ageYears, identity.sex);
    if (primary > cap) {
      return invalid(
        'Uçuş süresi güvenilir değil — bu deneme sayılmadı. Tekrar dene.',
        {
          ...analysis,
          jumpHeightCm: null,
          jumpHeightCmHip,
          method,
          consistent,
        }
      );
    }
  }

  return {
    ...analysis,
    jumpHeightCm: primary,
    jumpHeightCmHip,
    method,
    consistent,
  };
}

/**
 * Frame'in sıçrama testinde kullanılabilir olup olmadığını söyler.
 * Hip ve ayak keypoint'leri görünür olmalı.
 */
export function isJumpFrameUsable(frame: PoseFrame): boolean {
  return hasVisibleLandmarks(frame, REQUIRED_LANDMARKS, 0.5);
}

/**
 * Frame'den HipSample üretir. Frame kullanılamaz ise null döner.
 *
 * Dikey seri gövde merkezi proxy'sidir (kalça+omuz); diz bilinçli dışarıda.
 */
export function frameToHipSample(frame: PoseFrame): HipSample | null {
  if (!isJumpFrameUsable(frame)) return null;
  const hip = getHipCenter(frame);
  if (!hip) return null;
  const leftAnkle = frame.landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = frame.landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const ankleY =
    leftAnkle && rightAnkle ? (leftAnkle.y + rightAnkle.y) / 2 : undefined;
  const shoulder = getShoulderCenter(frame);
  // 0.6 kalça + 0.4 omuz: rijit gövde varsayımı. Omuz görünmüyorsa kalça.
  const y =
    shoulder != null && (shoulder.visibility ?? 1) >= 0.5
      ? 0.6 * hip.y + 0.4 * shoulder.y
      : hip.y;
  const visHips = Math.min(
    frame.landmarks[POSE_LANDMARKS.LEFT_HIP]?.visibility ?? 1,
    frame.landmarks[POSE_LANDMARKS.RIGHT_HIP]?.visibility ?? 1
  );
  const visAnkles = Math.min(
    leftAnkle?.visibility ?? 1,
    rightAnkle?.visibility ?? 1
  );
  return {
    t: frame.timestamp,
    y,
    hipY: hip.y,
    hipX: hip.x,
    ankleY,
    visibility: Math.min(visHips, visAnkles),
    kneeAngleDeg: meanKneeAngleDeg(frame),
  };
}

/** Gövde-diz-ayak açısı (derece). Landmark eksikse null. */
function meanKneeAngleDeg(frame: PoseFrame): number | undefined {
  const left = jointAngleDeg(
    frame.landmarks[POSE_LANDMARKS.LEFT_HIP],
    frame.landmarks[POSE_LANDMARKS.LEFT_KNEE],
    frame.landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  );
  const right = jointAngleDeg(
    frame.landmarks[POSE_LANDMARKS.RIGHT_HIP],
    frame.landmarks[POSE_LANDMARKS.RIGHT_KNEE],
    frame.landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  );
  if (left == null && right == null) return undefined;
  if (left == null) return right;
  if (right == null) return left;
  return (left + right) / 2;
}

function jointAngleDeg(
  a: { x: number; y: number } | undefined,
  b: { x: number; y: number } | undefined,
  c: { x: number; y: number } | undefined
): number | undefined {
  if (!a || !b || !c) return undefined;
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (!(mag > 0)) return undefined;
  const cos = Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Test sırası yumuşak sinyaller — reddetmez.
 *
 * Yatay kayma ve aşırı sığ/derin çömelme ölçümü öldürmez; σ'yı genişletir
 * ve sonuç kartında not olarak görünür.
 */
function softCaptureSignals(
  samples: readonly HipSample[],
  takeoffIdx: number,
  landingIdx: number
): { notes: string[]; sigmaBoost: number } {
  const notes: string[] = [];
  let sigmaBoost = 1;

  const lo = Math.max(0, Math.min(takeoffIdx, landingIdx));
  const hi = Math.min(samples.length - 1, Math.max(takeoffIdx, landingIdx));
  const window = samples.slice(lo, hi + 1);
  const xs = window.map((s) => s.hipX).filter((x): x is number => x != null);
  const legs = samples
    .slice(0, Math.min(25, samples.length))
    .map((s) =>
      s.hipY != null && s.ankleY != null ? s.ankleY - s.hipY : null
    )
    .filter((v): v is number => v != null && v > 0.05);
  const leg =
    legs.length > 0
      ? [...legs].sort((a, b) => a - b)[Math.floor(legs.length / 2)]
      : 0.4;

  if (xs.length >= 4) {
    const drift = Math.max(...xs) - Math.min(...xs);
    if (drift > HORIZONTAL_DRIFT_FRAC * leg) {
      notes.push('Sıçrama sırasında öne/yana kayma görüldü — yükseklik belirsizliği arttı.');
      sigmaBoost *= 1.2;
    }
  }

  const angles = samples
    .map((s) => s.kneeAngleDeg)
    .filter((v): v is number => v != null);
  if (angles.length >= 8) {
    const deepest = Math.min(...angles);
    if (deepest > SQUAT_SHALLOW_DEG) {
      notes.push('Çömelme sığ kaldı. Bir sonraki denemede biraz daha alçaktan patla.');
      sigmaBoost *= 1.15;
    } else if (deepest < SQUAT_DEEP_DEG) {
      notes.push('Çömelme çok derindi. CMJ hızlı bir yüklenmedir, çömelip kalma.');
      sigmaBoost *= 1.15;
    }
  }

  return { notes, sigmaBoost };
}

/**
 * Ulaşılan fps ve model katmanı σ'yı genişletir — istenen 60 fps değil,
 * gerçek örnekleme hızı. Lite model + düşük fps = daha geniş belirsizlik.
 */
export function captureQualitySigmaMultiplier(opts: {
  readonly avgFps: number;
  readonly modelTier: string;
}): number {
  let m = 1;
  if (opts.avgFps > 0 && opts.avgFps < 24) m *= 1.25;
  else if (opts.avgFps > 0 && opts.avgFps < 45) m *= 1.1;
  if (opts.modelTier === 'lite') m *= 1.15;
  return m;
}

/**
 * Yaş + cinsiyet için ortalama CMJ sıçrama yüksekliği (cm) + standart sapma.
 *
 * Kaynaklar:
 *   - Temfemo et al. 2009 (Eur J Appl Physiol) — CMJ no-arm-swing, 7-15 yaş
 *   - Tomkinson et al. 2018 (Br J Sports Med) — Eurofit normative pan-Avrupa
 *   - Castro-Piñero et al. 2010 (J Strength Cond Res) — İspanyol çocuklar
 *
 * SD'ler tipik olarak ortalamanın ~%18-22'si (literatürde rapor edilen aralık).
 */
interface CmjNorm {
  mean: number; // ortalama CMJ (cm)
  sd: number; // standart sapma (cm)
}
const CMJ_NORMS: Record<number, { male: CmjNorm; female: CmjNorm }> = {
  8: { male: { mean: 18, sd: 4 }, female: { mean: 17, sd: 3.5 } },
  9: { male: { mean: 20, sd: 4 }, female: { mean: 19, sd: 4 } },
  10: { male: { mean: 22, sd: 4.5 }, female: { mean: 21, sd: 4 } },
  11: { male: { mean: 25, sd: 5 }, female: { mean: 23, sd: 4.5 } },
  12: { male: { mean: 28, sd: 5.5 }, female: { mean: 25, sd: 4.5 } },
  13: { male: { mean: 31, sd: 6 }, female: { mean: 27, sd: 5 } },
  14: { male: { mean: 34, sd: 6.5 }, female: { mean: 28, sd: 5 } },
  15: { male: { mean: 37, sd: 7 }, female: { mean: 30, sd: 5.5 } },
};

function lookupCmjNorm(
  ageYears: number,
  sex: 'male' | 'female'
): CmjNorm {
  const ages = Object.keys(CMJ_NORMS).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  return CMJ_NORMS[closestAge][sex];
}

/** Çocuk CMJ'si için fiziksel tavan (norm ortalama + 4 SD). */
export function maxPlausibleJumpHeightCm(
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const { mean, sd } = lookupCmjNorm(ageYears, sex);
  return mean + PLAUSIBLE_HEIGHT_SD * sd;
}

import { zScorePercentile } from '@/lib/stats/normalCdf';

/**
 * CMJ değerini yaş+cinsiyet normuna göre persentile çevirir.
 *
 * Örnek: 12 yaş erkek, 28cm sıçrama → Z=0 → 50. persentil
 *        12 yaş erkek, 33.5cm → Z=+1 → 84. persentil
 */
export function jumpPercentile(
  jumpHeightCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const { mean, sd } = lookupCmjNorm(ageYears, sex);
  return zScorePercentile(jumpHeightCm, mean, sd);
}

/**
 * Sıçramayı 0-100 skor'a çevirir — persentil tabanlı (1-99 aralığında lineer).
 *
 * Eski lineer (0.5x norm = 0, 1.5x norm = 100) yerine, sportif bilim
 * standardı persentil bazlı skor — tüm yaş gruplarında tutarlı.
 *
 * Backward-compat: imza aynı kaldı, JumpTest.tsx'i kırmaz.
 */
export function jumpScore(
  jumpHeightCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  return jumpPercentile(jumpHeightCm, ageYears, sex);
}

/**
 * Sıçrama yüksekliğini nokta tahmin yerine aralık olarak biçimlendirir.
 *
 * NEDEN: `jumpHeightSigmaCm` hesaplanıyor (kinematics.ts, fit artığından
 * türetilmiş gerçek bir belirsizlik) ama tek ondalıklı bir sayı ("32.4 cm")
 * gösterildiğinde veli bunu bir cetvel ölçümü kadar kesin sanır. Tek bir
 * telefon kamerasından, tek bir denemeden gelen bir sayı bu kesinliği hiç
 * taşımıyor.
 *
 * σ yoksa (hip-displacement fallback — belirsizlik modellenmemiş) yuvarlanmış
 * tek değer döner; uydurulmuş bir ± vermek σ'nın kendisini uydurmaktan
 * farksız olurdu.
 *
 * @param roundToSigma Aralık ± kaç σ ile gösterilsin. 1 = ~%68 kapsama.
 */
export function formatJumpHeightCm(
  jumpHeightCm: number,
  sigmaCm: number | null,
  roundToSigma = 1
): string {
  if (sigmaCm == null || !Number.isFinite(sigmaCm) || sigmaCm < 0.5) {
    return `~${Math.round(jumpHeightCm)} cm`;
  }
  const margin = Math.max(1, Math.round(sigmaCm * roundToSigma));
  return `${Math.round(jumpHeightCm)} cm (±${margin})`;
}

/**
 * Aynı bilgiyi "28–36 cm" gibi açık bir aralık olarak verir — rapor metni
 * (LLM) veya daha geniş kartlar için ± gösteriminden daha okunur olabilir.
 */
export function jumpHeightRangeCm(
  jumpHeightCm: number,
  sigmaCm: number | null,
  roundToSigma = 1
): { low: number; high: number } | null {
  if (sigmaCm == null || !Number.isFinite(sigmaCm) || sigmaCm < 0.5) return null;
  const margin = Math.max(1, Math.round(sigmaCm * roundToSigma));
  return {
    low: Math.round(jumpHeightCm) - margin,
    high: Math.round(jumpHeightCm) + margin,
  };
}

/**
 * En-iyi-3 protokolü: kabul edilen denemeler arasından en yükseğini seçer.
 * Medyandan `OUTLIER_SIGMA_K` sapani (ör. 31 / 26 / 125) elemezse glitch
 * "en iyi" olurdu. Aykırılar elenir, kalanların max'ı alınır; hepsi
 * aykırıysa medyan deneme seçilir.
 */
export function pickBestJumpAttempt<
  T extends {
    accepted: boolean;
    analysis: {
      valid: boolean;
      jumpHeightCm: number | null;
      jumpHeightSigmaCm?: number | null;
    };
  },
>(attempts: readonly T[]): T | null {
  const candidates = attempts.filter(
    (a) => a.accepted && a.analysis.valid && a.analysis.jumpHeightCm != null
  );
  if (candidates.length === 0) return null;

  const pool =
    candidates.length >= 3 ? excludeJumpHeightOutliers(candidates) : candidates;
  const chosen = pool.length > 0 ? pool : medianJumpAttempt(candidates);
  return chosen.reduce((best, cur) =>
    (cur.analysis.jumpHeightCm ?? 0) > (best.analysis.jumpHeightCm ?? 0)
      ? cur
      : best
  );
}

function excludeJumpHeightOutliers<
  T extends {
    analysis: {
      jumpHeightCm: number | null;
      jumpHeightSigmaCm?: number | null;
    };
  },
>(candidates: readonly T[]): T[] {
  const heights = candidates.map((a) => a.analysis.jumpHeightCm as number);
  const sorted = [...heights].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const sigmas = candidates
    .map((a) => a.analysis.jumpHeightSigmaCm)
    .filter((s): s is number => s != null && s > 0);
  const sigma = sigmas.length > 0 ? Math.max(...sigmas) : MIN_SIGMA_CM;
  const threshold = OUTLIER_SIGMA_K * Math.max(sigma, MIN_SIGMA_CM);
  return candidates.filter(
    (a) => Math.abs((a.analysis.jumpHeightCm as number) - median) <= threshold
  );
}

function medianJumpAttempt<
  T extends { analysis: { jumpHeightCm: number | null } },
>(candidates: readonly T[]): T[] {
  const sorted = [...candidates].sort(
    (a, b) => (a.analysis.jumpHeightCm ?? 0) - (b.analysis.jumpHeightCm ?? 0)
  );
  return [sorted[Math.floor(sorted.length / 2)]];
}
