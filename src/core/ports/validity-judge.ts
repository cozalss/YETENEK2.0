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
 * - `OpenAiVisionValidityJudge` — niteliksel ihlaller (kol savurma, uçuşta diz
 *   çekme, kısmi hareket açıklığı) için. Anahtar yoksa devre dışı.
 *
 * İkisi `CompositeValidityJudge` ile birleşir: kural hakemi taban güvenlik
 * ağıdır, görsel hakem üstüne eklenir. Tek bir sağlayıcıya bağımlılık yok.
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
  jump: ['heel_raise_only', 'non_ballistic', 'no_flight_phase', 'insufficient_data'],
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
