/**
 * Geçerlilik kararının ölçüme uygulanması — **deterministik kapı**.
 *
 * Hakem (kural tabanlı ya da görsel) yalnızca *gözlem* üretir. Ne yapılacağına
 * burada, saf ve birim-testlenebilir kodla karar verilir. Bu ayrım mimarinin
 * belkemiği: bir dil modeli asla "bu ölçüm sayılsın mı" sorusunu cevaplamaz,
 * yalnızca "ne gördüm" sorusunu cevaplar.
 *
 * ## İki sonuç, üç davranış
 *
 *   1. **Test yapılmamış** → ölçüm tamamen atılır, çocuktan tekrar istenir.
 *   2. **Ölümcül protokol ihlali** → ölçüm atılır, ihlale özgü ipucu gösterilir.
 *   3. **Kusurlu ama geçerli** → ölçüm **değeri korunur**, belirsizliği büyür.
 *
 * Üçüncüsü istatistiksel olarak doğru olan davranıştır: kötü teknik ölçümün
 * *bilgi içeriğini* azaltır, ölçümü *kaydırmaz*. Skoru "ceza olarak" düşürmek
 * ölçümü bozar; σ'yı genişletmek belirsizliği dürüstçe taşır ve karar
 * katmanındaki Monte Carlo bunu kendiliğinden hesaba katar.
 */

import {
  INVALIDATING_VIOLATIONS,
  UNIVERSAL_INVALIDATING,
  type Compensation,
  type ProtocolViolation,
  type TestVerdict,
} from '@/core/ports/validity-judge';
import { ok, type Result } from '@/core/types/result';
import type { TestType } from '@/types';

/**
 * Teknik kusurunun belirsizliği ne kadar büyütebileceğinin üst sınırı.
 *
 * techniqueScore=100 → çarpan 1.0 (belirsizlik değişmez)
 * techniqueScore=0   → çarpan 2.0 (belirsizlik iki katına çıkar)
 *
 * Üst sınır 2.0'da tutuldu: daha büyük bir çarpan ölçümü fiilen işe yaramaz
 * hâle getirir; o noktada ölçümü kabul etmek yerine reddetmek daha dürüst.
 */
const MAX_TECHNIQUE_SIGMA_MULTIPLIER = 2.0;

export interface AcceptedMeasurement {
  /** σ bu çarpanla genişletilir. Her zaman ≥ 1. */
  readonly sigmaMultiplier: number;
  /** Ölümcül olmayan, kaydedilmeye değer ihlaller. */
  readonly warnings: readonly ProtocolViolation[];
  /**
   * Teknik gözlem uyarıları — veliye gösterilecek Türkçe metinler.
   *
   * Görsel hakem `knee_valgus` gibi kompansasyon işaretleri üretiyordu ama
   * hiçbir yerde tüketilmiyordu: üretilen değer çöpe gidiyordu. Bu sinyaller
   * ölçüm sayısından bağımsız gerçek bir gözlem, ama tek bir test seansından
   * çıkarılmış bir gözlem — tanı değil. Metinler bunu yansıtmalı (bkz.
   * `COMPENSATION_WARNINGS`).
   */
  readonly injuryWarnings: readonly string[];
  readonly verdict: TestVerdict;
}

export interface RejectedMeasurement {
  readonly reason: 'not-performed' | 'protocol-violation';
  readonly violations: readonly ProtocolViolation[];
  /** Çocuğa gösterilecek, ihlale özgü Türkçe ipucu. */
  readonly retryHint: string;
  readonly verdict: TestVerdict;
}

/** İhlal → çocuğa gösterilecek somut düzeltme. Genel "tekrar dene" değil. */
const RETRY_HINTS: Readonly<Record<ProtocolViolation, string>> = {
  both_feet_down:
    'Bu testte tek ayak üstünde durman gerekiyor. Diğer ayağını yerden kes ve tekrar dene.',
  foot_touched_down:
    'Havadaki ayağın yere değdi. Dengeni koruyarak tekrar dene — düşersen sorun değil, baştan başlarız.',
  hand_on_support:
    'Duvara veya bir yere tutunmadan denemen gerekiyor. Ellerini beline koy ve tekrar dene.',
  no_flight_phase:
    'Ayakların yerden hiç kesilmedi. Bu bir sıçrama testi — iki ayağınla birlikte havalanman gerekiyor.',
  stepped_not_jumped:
    'Sıçramak yerine adım attın. Çömelip iki ayağınla birlikte öne doğru zıpla.',
  heel_raise_only:
    'Sadece topuklarını kaldırdın. Çömelip bütün vücudunla patlayıcı bir şekilde yukarı zıpla.',
  non_ballistic:
    'Hareket sıçramaya benzemiyor — çok yavaş yükseldin. Hızlı ve patlayıcı bir zıplama dene.',
  insufficient_amplitude:
    'Yana yeterince açılmadın. Çizginin iki tarafına belirgin şekilde zıplaman gerekiyor.',
  finger_resting:
    'Parmağın neredeyse hiç hareket etmedi. Hareketli noktayı parmağınla takip et.',
  not_tracking:
    'Noktayı takip etmedin. Parmağını ekrandaki noktanın üzerinde tutmaya çalış.',
  partial_rom:
    'Hareketleri yarım yaptın. Kollarını tam yukarı kaldır, ayaklarını tam aç.',
  // Not: "telefonu uzaklaştır" demiyoruz — kullanıcı laptopla da test
  // yapabiliyor ve o durumda kamerayı değil KENDİSİNİ geri çekmesi gerekiyor.
  // Gerçek bir kullanıcı laptopla yalnız yüzü görünecek mesafede test
  // başlattı; mesaj ne yapacağını somut söylemeli.
  out_of_frame:
    'Vücudunun tamamı kadraja sığmıyor. Kameradan 2-3 metre uzaklaş; ayakların ve kalçan görünmeli, ayaklarının altında biraz zemin kalsın.',
  multiple_people:
    'Kadrajda birden fazla kişi var. Test sırasında yalnız olman gerekiyor.',
  wrong_exercise:
    'Yapılan hareket bu teste uymuyor. Talimatları bir kez daha izleyip tekrar dene.',
  camera_moved:
    'Kamera hareket etti. Telefonu sabit bir yere dayayıp tekrar dene.',
  insufficient_data:
    'Yeterli görüntü toplanamadı. Işığın iyi olduğundan ve vücudunun göründüğünden emin ol.',
};

/**
 * Yerel reddetme kurucusu.
 *
 * Paylaşılan `err()` bilinçli olarak `E extends AppError` ile kısıtlı.
 * `RejectedMeasurement` bir altyapı hatası değil, bir **alan kararı** —
 * `AppError` birleşimine eklemek o tipin anlamını bulandırırdı. Bu yüzden
 * kısıtı gevşetmek yerine burada literal kuruyoruz.
 */
function rejected(
  r: RejectedMeasurement
): Result<AcceptedMeasurement, RejectedMeasurement> {
  return { ok: false, error: r };
}

/**
 * Kompansasyon → veliye gösterilecek uyarı.
 *
 * Metinler tanı koymuyor, gözlem bildiriyor ve ne yapılacağını söylüyor.
 * "Çocuğunuzda X var" değil, "şu görüldü, şuna dikkat" — tek bir test
 * seansından tıbbi iddia çıkarılamaz. "Sakatlanma", "risk", "hekim" gibi
 * kelimeler kasıtlı olarak kullanılmıyor (bkz. InjuryWarning.tsx dil kuralı).
 */
const COMPENSATION_WARNINGS: Readonly<Record<Compensation, string>> = {
  knee_valgus:
    'İniş sırasında dizler içe doğru kapandı. Antrenörle çift ayak iniş tekniği çalışılması bu örüntüyü azaltmaya yardımcı olur.',
  trunk_lean:
    'Hareket sırasında gövde belirgin şekilde yana eğildi. Genellikle gövde-kalça stabilitesi eksikliğine işaret eder; plank ve yan plank çalışmaları faydalı olur.',
  asymmetric_landing:
    'İniş iki bacağa eşit dağılmadı. Sol-sağ denge çalışması bu farkı zamanla kapatmaya yardımcı olur.',
  stiff_landing:
    'İniş dizler kilitli, sert şekilde yapıldı. Yumuşak iniş (diz-kalça bükerek) öğretilmesi eklem yükünü belirgin azaltır.',
};

/** Kompansasyon işaretlerini veliye gösterilecek metinlere çevirir. */
export function compensationsToWarnings(
  compensations: readonly Compensation[]
): string[] {
  return compensations
    .map((c) => COMPENSATION_WARNINGS[c])
    .filter((t): t is string => typeof t === 'string');
}

function isInvalidating(test: TestType, v: ProtocolViolation): boolean {
  return (
    UNIVERSAL_INVALIDATING.includes(v) ||
    INVALIDATING_VIOLATIONS[test].includes(v)
  );
}

/**
 * Hakem kararını ölçüm üzerinde uygular.
 *
 * @returns `ok` → ölçüm kabul (σ çarpanıyla), `err` → ölçüm reddedildi.
 */
export function applyVerdict(
  test: TestType,
  verdict: TestVerdict
): Result<AcceptedMeasurement, RejectedMeasurement> {
  const fatal = verdict.protocolViolations.filter((v) => isInvalidating(test, v));

  if (!verdict.performed) {
    // `performed: false` ama ihlal listesi boşsa genel ipucuna düş.
    const primary = fatal[0] ?? verdict.protocolViolations[0];
    return rejected({
      reason: 'not-performed',
      violations: verdict.protocolViolations,
      retryHint: primary
        ? RETRY_HINTS[primary]
        : 'Bu deneme sayılmadı. Talimatları izleyip tekrar dene.',
      verdict,
    });
  }

  if (fatal.length > 0) {
    return rejected({
      reason: 'protocol-violation',
      violations: fatal,
      retryHint: RETRY_HINTS[fatal[0]],
      verdict,
    });
  }

  // Kusurlu ama geçerli: değeri koru, belirsizliği genişlet.
  const quality = Math.max(0, Math.min(100, verdict.techniqueScore)) / 100;
  const sigmaMultiplier =
    1 + (1 - quality) * (MAX_TECHNIQUE_SIGMA_MULTIPLIER - 1);

  return ok({
    sigmaMultiplier,
    warnings: verdict.protocolViolations,
    injuryWarnings: compensationsToWarnings(verdict.compensations),
    verdict,
  });
}

/** Test dışı tüketiciler için ipucu tablosunu aç. */
export { RETRY_HINTS };
