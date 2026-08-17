/**
 * İki hakem kararının birleştirilmesi — saf, tek kaynak.
 *
 * ## Nerede çalışıyor
 *
 * İstemcide (`use-validity-gate.ts`). Sebebi mimari: kural hakemi tarayıcıda
 * TAM kare seti üzerinde koşuyor, görsel hakem ise sunucuda yalnız 8 anahtar
 * kare görüyor. Birleştirmeyi sunucuda yapmak, orada kural hakemini eksik
 * veriyle yeniden koşturmayı gerektirirdi — ilk uygulamada tam olarak bu
 * yapıldı ve görsel hakem üretimde hiç çalışmadı (8 kare < 30 kare eşiği →
 * "insufficient_data" → kısa devre). Gerçek bir çağrıyla yakalandı.
 *
 * ## Birleştirme kuralı: yetki alanı
 *
 * Fail-closed "her etiket mühür" kalkmıştır. Bir hakem yalnız kendi
 * sorusunda veto eder:
 *
 *   - Temas / zamanlama (`CONTACT_VIOLATIONS`) → Vision etiketi düşer.
 *   - Sahne / protokol (`VISION_VETO_VIOLATIONS`) → Vision veto eder, yeter
 *     ki `judgeConfidence >= MIN_VISION_VETO_CONFIDENCE`.
 *   - Denge istisnası: kural hakemi duruşu değerlendiremediyse Vision'ın
 *     `both_feet_down` / `foot_touched_down` etiketi veto hakkını geri alır.
 *
 * Vision gerekçe gösteremeden (`protocolViolations` boşken) `performed: false`
 * diyemez.
 *
 * `coerce` (adapter) = "bu etiket bu test için anlamlı mı" (şema hijyeni).
 * `mergeVerdicts` = "bu hakemin bu etikette yetkisi var mı" (politika).
 * İkisi bilinçli olarak ayrıdır.
 */

import {
  BALANCE_VISION_FALLBACK,
  MIN_VISION_VETO_CONFIDENCE,
  TECHNIQUE_FLOOR_WHEN_DROPPED,
  VISION_VETO_VIOLATIONS,
  type ProtocolViolation,
  type TestVerdict,
} from '@/core/ports/validity-judge';

export interface MergeResult {
  readonly verdict: TestVerdict;
  /** Vision üretip yetkisi olmadığı için düşürülen etiketler. */
  readonly droppedFromVision: readonly ProtocolViolation[];
}

function isVisionVetoEligible(
  v: ProtocolViolation,
  rules: TestVerdict
): boolean {
  if ((VISION_VETO_VIOLATIONS as readonly string[]).includes(v)) return true;
  // Kural hakemi denge duruşunu göremediyse Vision boş alanı doldurur.
  if (
    rules.stanceConfirmed === null &&
    (BALANCE_VISION_FALLBACK as readonly string[]).includes(v)
  ) {
    return true;
  }
  return false;
}

export function mergeVerdicts(
  rules: TestVerdict,
  vision: TestVerdict
): MergeResult {
  const eligible: ProtocolViolation[] = [];
  const dropped: ProtocolViolation[] = [];
  for (const v of vision.protocolViolations) {
    if (isVisionVetoEligible(v, rules)) eligible.push(v);
    else dropped.push(v);
  }

  const confident = vision.judgeConfidence >= MIN_VISION_VETO_CONFIDENCE;
  // Düşük güvende veto etiketleri de düşer — aksi halde applyVerdict
  // `wrong_exercise` gibi evrensel ihlali performed true olsa bile öldürür.
  const retainedVision = confident ? eligible : [];
  const droppedFromVision = confident ? dropped : [...dropped, ...eligible];
  const visionVetoes = retainedVision.length > 0 && confident;

  const visionScore =
    droppedFromVision.length > 0
      ? Math.max(vision.techniqueScore, TECHNIQUE_FLOOR_WHEN_DROPPED)
      : vision.techniqueScore;

  return {
    verdict: {
      performed: rules.performed && !visionVetoes,
      protocolViolations: [
        ...new Set([...rules.protocolViolations, ...retainedVision]),
      ],
      techniqueScore: Math.min(rules.techniqueScore, visionScore),
      stanceConfirmed: rules.stanceConfirmed ?? vision.stanceConfirmed,
      compensations: vision.compensations,
      judgeConfidence: Math.max(rules.judgeConfidence, vision.judgeConfidence),
      source: 'composite',
      notes: [rules.notes, vision.notes].filter(Boolean).join(' ') || undefined,
    },
    droppedFromVision,
  };
}
