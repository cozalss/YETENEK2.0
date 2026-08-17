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
  hasVisibleLandmarks,
  smoothSeries,
} from '@/lib/pose/extractKeypoints';
import { POSE_LANDMARKS } from '@/types';
import {
  fitParabola,
  solveFlightFromParabola,
  flightTimeToHeightCm,
  heightSigmaCm,
  type FlightSolution,
} from './kinematics';

// Hip + ayak görünmeden ölçüm güvenilmez.
const REQUIRED_LANDMARKS = [
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
];

export interface HipSample {
  t: number; // ms (frame timestamp)
  y: number; // normalized image y kalça merkezi (0-1, daha küçük = daha yukarıda)
  /** Ayak bileği Y (sol/sağ ortalaması). Flight-time tespiti için. */
  ankleY?: number;
}

export type HeightMethod = 'flight-time' | 'hip-displacement' | 'consensus';

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
const MAX_FLIGHT_TIME_MS = 1200; // 1.2s = ~177cm — kimse bu kadar zıplamaz, glitch
const MIN_FLIGHT_HEIGHT_CM = 5; // Daha azı yanlış-pozitif

// Cross-method tolerance — iki yöntem (flight-time + hip-displacement) %20'den
// fazla farklıysa kullanıcı kalibrasyon hatası ya da kamera açısı yaşıyor;
// `consistent: false` flag'lenir ve flight-time'a güvenilir. Eşik Donaldson
// & Edge 2014'ten (J Sci Med Sport 17:670) uyarlandı: motion capture vs
// flight-time CMJ ölçüm farkı tipik %5-15; %20 üstü = method drift.
const HEIGHT_AGREEMENT_TOLERANCE = 0.2;

/**
 * Parabol fit'inin "bu gerçekten serbest düşüştü" sayılması için gereken
 * asgari R². Gerçek bir sıçramada ayak bileği yörüngesi neredeyse kusursuz
 * parabolik olur (R² > 0.99); topuk kaldırma, ağırlık aktarımı ve yavaş
 * yükselme bu uyumu tutturamaz. Eşik 0.9'da tutuldu — gürültülü telefon
 * yakalamasına pay bırakırken balistik olmayanı elemeye yeter.
 */
const MIN_BALLISTIC_R_SQUARED = 0.9;

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
  ts: readonly number[],
  ys: readonly number[],
  takeoffIdx: number,
  landingIdx: number,
  baselineY: number
): FlightSolution | null {
  const coarseEnd = Math.max(takeoffIdx + 1, landingIdx - 1);
  const coarseTs = ts.slice(takeoffIdx, coarseEnd + 1);
  const coarseYs = ys.slice(takeoffIdx, coarseEnd + 1);

  const coarseFit = fitParabola(coarseTs, coarseYs);
  if (!coarseFit) return null;
  const coarse = solveFlightFromParabola(coarseFit, baselineY, coarseYs);
  if (!coarse) return null;

  // Köklerin kesin içinde kalan kareler — yer temasına ait olanlar elenir.
  const innerTs: number[] = [];
  const innerYs: number[] = [];
  for (let i = 0; i < ts.length; i++) {
    if (ts[i] > coarse.takeoffMs && ts[i] < coarse.landingMs) {
      innerTs.push(ts[i]);
      innerYs.push(ys[i]);
    }
  }
  if (innerTs.length < 5) return coarse;

  const fineFit = fitParabola(innerTs, innerYs);
  if (!fineFit) return coarse;
  const fine = solveFlightFromParabola(fineFit, baselineY, innerYs);
  return fine ?? coarse;
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
  //
  // Pencere seçimi kritik: `landingIdx` zaten yere basılan ilk karedir, uçuşa
  // ait değildir. Parabol dışı kareler fit'e girerse eğrilik yassılaşır, ölçek
  // ve süre birlikte kayar. Bu yüzden önce kaba pencereyle bir kez çözülür,
  // sonra bulunan köklerle pencere daraltılıp **yeniden** fit edilir.
  const solution = refineFlightSolution(ts, ankleYs, takeoffIdx, landingIdx, baselineAnkleY);

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
    valid: false,
    reason,
    ...partial,
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
export function analyzeJump(samples: HipSample[]): JumpAnalysis {
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
    ? flightTimeToHeightCm(flight.flightTimeMs)
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
    jumpHeightSigmaCm: flight
      ? heightSigmaCm(flight.flightTimeMs, flight.sigmaMs)
      : null,
    flightMethod: flight?.method ?? null,
    cmPerUnitFromGravity: flight?.cmPerUnitFromGravity ?? null,
    ballisticFit: flight?.rSquared ?? null,
    valid: true,
  };
}

/**
 * Hip displacement metoduyla sıçrama yüksekliğini cm'e çevirir + flight-time
 * sonucuyla cross-check eder. İki yöntem tutarlıysa flight-time birincil
 * kalır; tutarsızsa flag'lenir ve consensus (ortalama) raporlanır.
 *
 * Öncelik:
 *   1. flight-time varsa → birincil
 *   2. Worldlandmarks varsa → cmPerUnit hesaplanır, hip displacement ikincil
 *   3. heightCm verilmişse → boy fallback ile hip displacement
 */
export function calibrateJumpHeight(
  analysis: JumpAnalysis,
  calibrationFrame: PoseFrame,
  heightCm: number | null
): JumpAnalysis {
  if (!analysis.valid) return analysis;
  const cmPerUnit = getCmPerUnit(calibrationFrame, heightCm);
  const jumpHeightCmHip =
    cmPerUnit != null ? analysis.jumpUnits * cmPerUnit : null;

  // Birincil yükseklik politikası:
  //   - flight-time varsa HER ZAMAN birincil (Bosco 1983 — perspektif bağımsız,
  //     fiziksel olarak doğru). Hip-displacement sadece cross-check ve tutarlılık
  //     flag'i için kullanılır.
  //   - flight-time yoksa hip-displacement fallback.
  //
  // Eski "consensus = ortalama" davranışı kaldırıldı çünkü hip-displacement
  // kamera açısı/perspektif hatalarından doğrudan etkileniyor ve doğru
  // flight-time ölçümünü bozuyordu.
  let primary: number | null = analysis.jumpHeightCmFlight;
  const method: HeightMethod =
    analysis.jumpHeightCmFlight != null ? 'flight-time' : 'hip-displacement';
  let consistent = true;

  if (primary != null && jumpHeightCmHip != null && primary > 0) {
    const diff = Math.abs(primary - jumpHeightCmHip) / primary;
    consistent = diff <= HEIGHT_AGREEMENT_TOLERANCE;
    // primary değiştirilmiyor — flight-time kalır
  } else if (primary == null && jumpHeightCmHip != null) {
    primary = jumpHeightCmHip;
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
 * AnkleY ortalaması da yakalanır — flight-time tespiti için kullanılır.
 */
export function frameToHipSample(frame: PoseFrame): HipSample | null {
  if (!isJumpFrameUsable(frame)) return null;
  const hip = getHipCenter(frame);
  if (!hip) return null;
  const leftAnkle = frame.landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = frame.landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const ankleY =
    leftAnkle && rightAnkle ? (leftAnkle.y + rightAnkle.y) / 2 : undefined;
  return { t: frame.timestamp, y: hip.y, ankleY };
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
  const ages = Object.keys(CMJ_NORMS).map(Number);
  const closestAge = ages.reduce((a, b) =>
    Math.abs(b - ageYears) < Math.abs(a - ageYears) ? b : a
  );
  const { mean, sd } = CMJ_NORMS[closestAge][sex];
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
 * En-iyi-3 protokolü: birden fazla CMJ denemesi arasından en yükseğini
 * seçer. Spor bilimi standardı — tek deneme yorgunluk/ısınmamış kas/tesadüfi
 * teknik hatasını ortalamayla süzme şansı bırakmaz.
 *
 * Yalnızca geçerlilik kapısından geçmiş (`accepted`) VE analizi valid olan
 * denemeler aday sayılır; reddedilen bir deneme daha yüksek bir sayı
 * gösterse bile seçilmez — o sayı gerçek bir sıçramayı ölçmüyor olabilir.
 *
 * @returns Hiçbir deneme uygun değilse `null` (JumpTest bunu "3 denemenin
 *          hiçbiri sayılmadı" ekranı için kullanır).
 */
export function pickBestJumpAttempt<
  T extends {
    accepted: boolean;
    analysis: { valid: boolean; jumpHeightCm: number | null };
  },
>(attempts: readonly T[]): T | null {
  const candidates = attempts.filter(
    (a) => a.accepted && a.analysis.valid && a.analysis.jumpHeightCm != null
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, cur) =>
    (cur.analysis.jumpHeightCm ?? 0) > (best.analysis.jumpHeightCm ?? 0)
      ? cur
      : best
  );
}
