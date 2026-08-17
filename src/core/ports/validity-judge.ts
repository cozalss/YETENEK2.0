/**
 * ValidityJudge — "bu test gerçekten yapıldı mı?" sorusunun sözleşmesi.
 *
 * ## Neden ayrı bir katman
 *
 * Ölçüm katmanı *ne kadar* sorusuna cevap verir: kalça kaç birim salındı, ayak
 * bileği kaç ms havada kaldı. Ama *neyin* ölçüldüğünü bilmez. Denge analizi
 * yalnız kalça ve omuz X'ini okuduğu için çocuğun tek ayak üstünde olup
 * olmadığını göremez; broad jump analizi zaman denetimi yapmadığı için yana
 * yürümekle sıçramayı ayırt edemez. Bu boşluk daha iyi bir ölçüm formülüyle
 * kapanmaz — ayrı bir **hakem** gerekir.
 *
 * ## Değişmez kural
 *
 * > Hakem birimli sayı döndürmez. Ne santimetre, ne milisaniye, ne persentil.
 *
 * Bu kural şemayla zorlanır: `TestVerdict` içinde ölçüm alanı yoktur. LLM
 * tabanlı bir uygulama halüsinasyon yapamaz, çünkü halüsinasyon yapacağı alan
 * yoktur. Hakem yalnızca *oldu/olmadı*, *kural ihlali* ve *nitel teknik*
 * bildirir; sayıyı ölçüm katmanı üretir, kararı istatistik katmanı verir.
 *
 * ## Uygulamalar
 *
 * - `RuleBasedValidityJudge` — deterministik, ücretsiz, çevrimdışı, her zaman
 *   çalışır. Fizik ve geometri ile yakalanabilen ihlalleri yakalar.
 * - `OpenAiVisionValidityJudge` — niteliksel / sahne ihlalleri (yanlış egzersiz,
 *   birden fazla kişi, tutunma, kısmi hareket açıklığı) için. Anahtar yoksa
 *   devre dışı.
 *
 * İkisi istemcide `mergeVerdicts` ile birleşir. Birleştirme **yetki alanına**
 * göredir: her hakem yalnız kendi sorusunda veto eder. Temas/zamanlama
 * (ayak yerden kesildi mi) kural hakemi + kalça balistiğinin işidir; Vision
 * o etiketle ölçümü öldüremez. Sahne/protokol ihlallerinde Vision veto hakkı
 * durur. Tek bir sağlayıcıya bağımlılık yok.
 */

import type { Result } from '@/core/types/result';
import type { PoseFrame, TestType } from '@/types';

/**
 * Protokol ihlalleri — kapalı küme.
 *
 * Serbest metin yerine enum: hem deterministik kapı kurulabilsin hem de LLM
 * tabanlı uygulamada strict JSON şeması ile zorlanabilsin.
 */
export type ProtocolViolation =
  // Denge
  | 'both_feet_down'
  | 'foot_touched_down'
  | 'hand_on_support'
  // Sıçrama / broad jump
  | 'no_flight_phase'
  | 'stepped_not_jumped'
  | 'heel_raise_only'
  | 'non_ballistic'
  | 'arm_swing'
  // Yanal sıçrama
  | 'insufficient_amplitude'
  // Koordinasyon
  | 'finger_resting'
  | 'not_tracking'
  // Dayanıklılık
  | 'partial_rom'
  // Genel
  | 'out_of_frame'
  | 'multiple_people'
  | 'wrong_exercise'
  | 'camera_moved'
  | 'insufficient_data';

/** Sakatlanma riski sinyali — nitel, ölçüm değil. */
export type Compensation =
  | 'knee_valgus'
  | 'trunk_lean'
  | 'asymmetric_landing'
  | 'stiff_landing';

export interface TestVerdict {
  /** Bu test hiç yapıldı mı? false ise ölçüm tamamen atılır. */
  readonly performed: boolean;
  /** Tespit edilen protokol ihlalleri. Boş dizi = temiz. */
  readonly protocolViolations: readonly ProtocolViolation[];
  /** 0-100 **nitel** teknik kalitesi. Birimsiz; skora dönüşmez, σ'yı etkiler. */
  readonly techniqueScore: number;
  /**
   * Duruş doğrulandı mı (denge testine özgü: gerçekten tek ayak üstünde
   * miydi). Değerlendirilemiyorsa null.
   */
  readonly stanceConfirmed: boolean | null;
  /** Sakatlanma riski sinyalleri. */
  readonly compensations: readonly Compensation[];
  /** Hakemin kendi kararına güveni (0-1). */
  readonly judgeConfidence: number;
  /** Kararı hangi uygulama üretti — kaynak izlenebilirliği. */
  readonly source: 'rules' | 'vision' | 'composite';
  /** İnsan tarafından okunabilir gerekçe (loglama ve UI için). */
  readonly notes?: string;
}

export interface JudgeRequest {
  readonly test: TestType;
  /**
   * Ham poz kareleri. Hakem indirgenmiş örneklere değil iskelete bakar —
   * açıkların çoğu indirgeme sırasında kaybolduğu için.
   */
  readonly frames: readonly PoseFrame[];
  /** Ölçüm katmanının ne bulduğunu iddia ettiği (çapraz kontrol için). */
  readonly measurementClaim?: MeasurementClaim;
  readonly signal?: AbortSignal;
}

/**
 * Ölçüm katmanının iddiası — hakem bunu doğrular ama **kullanmaz**.
 * Birim taşıyan tek yapı budur ve hakemden çıkmaz, hakeme girer.
 */
export interface MeasurementClaim {
  readonly valid: boolean;
  readonly primaryValue: number | null;
  readonly unit: 'cm' | 'ms' | 'count' | 'score';
}

export interface ValidityJudge {
  judge(req: JudgeRequest): Promise<Result<TestVerdict>>;
}

/** Testi tamamen geçersiz kılan ihlaller — deterministik kapının tablosu. */
export const INVALIDATING_VIOLATIONS: Readonly<
  Record<TestType, readonly ProtocolViolation[]>
> = {
  balance: ['both_feet_down', 'foot_touched_down', 'hand_on_support', 'insufficient_data'],
  jump: ['heel_raise_only', 'non_ballistic', 'no_flight_phase', 'arm_swing', 'insufficient_data'],
  broadJump: ['no_flight_phase', 'stepped_not_jumped', 'insufficient_data'],
  lateralHops: ['insufficient_amplitude', 'no_flight_phase', 'insufficient_data'],
  coordination: ['finger_resting', 'not_tracking', 'insufficient_data'],
  endurance: ['partial_rom', 'insufficient_data'],
  reaction: ['insufficient_data'],
} as const;

/** Her testte geçersiz kılan, teste bağlı olmayan ihlaller. */
export const UNIVERSAL_INVALIDATING: readonly ProtocolViolation[] = [
  'wrong_exercise',
  'multiple_people',
];

/**
 * Temas / zamanlama ailesi — yalnız kural hakemi + kalça balistiği karar verir.
 *
 * Vision 6 seyrek iskelet karesinden uçuş fazına, topuk kaldırmaya veya
 * adım/sıçrama ayrımına bakamaz. Bu etiketleri üretse bile birleştirmede
 * düşer; σ cezası da tabanlanır.
 */
export const CONTACT_VIOLATIONS: readonly ProtocolViolation[] = [
  'no_flight_phase',
  'heel_raise_only',
  'non_ballistic',
  'stepped_not_jumped',
  'both_feet_down',
  'foot_touched_down',
  'insufficient_amplitude',
];

/**
 * Vision'ın veto yetkisi olduğu sahne / protokol etiketleri.
 *
 * `out_of_frame` kasten yok: kural hakemi tam akışı ve kadraj kenar payını
 * görür, 6 kareden daha iyi karar verir. `insufficient_data` yok: o bir
 * gözlem değil, gözlem yokluğudur — düşük `judgeConfidence` ile ifade edilir.
 */
export const VISION_VETO_VIOLATIONS: readonly ProtocolViolation[] = [
  'wrong_exercise',
  'multiple_people',
  'camera_moved',
  'hand_on_support',
  'partial_rom',
];

/**
 * Kural hakemi denge duruşunu değerlendiremediyse (`stanceConfirmed === null`)
 * Vision'ın bu iki etiketi veto hakkını geri kazanır — alan boş kalmasın.
 */
export const BALANCE_VISION_FALLBACK: readonly ProtocolViolation[] = [
  'both_feet_down',
  'foot_touched_down',
];

/** Vision etiketinin veto sayılması için asgari güven. */
export const MIN_VISION_VETO_CONFIDENCE = 0.7;

/**
 * Yetkisiz (düşürülen) bir Vision etiketinin `techniqueScore`'una uygulanan
 * taban. Etiket düşünce gerekçesi de düşmeli — aksi halde σ 2.0 ile şişer.
 */
export const TECHNIQUE_FLOOR_WHEN_DROPPED = 50;

/** Bu ihlal bu testte ölçümü öldürür mü? */
export function isFatalViolation(
  test: TestType,
  v: ProtocolViolation
): boolean {
  return (
    UNIVERSAL_INVALIDATING.includes(v) ||
    (INVALIDATING_VIOLATIONS[test] as readonly ProtocolViolation[]).includes(v)
  );
}
