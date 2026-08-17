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
 * ## Birleştirme kuralı: fail-closed
 *
 * Bir hakem "yapılmadı" diyorsa yapılmamıştır. İkisi de kaçamağı yakalamaya
 * ayarlı, yanlış pozitif üretmeye değil — şüphede tekrar istemek, yapılmamış
 * bir testi ölçmüş gibi raporlamaktan çok daha ucuz.
 */

import type { TestVerdict } from '@/core/ports/validity-judge';

export function mergeVerdicts(
  rules: TestVerdict,
  vision: TestVerdict
): TestVerdict {
  return {
    // Fail-closed: biri reddediyorsa sonuç ret.
    performed: rules.performed && vision.performed,
    protocolViolations: [
      ...new Set([...rules.protocolViolations, ...vision.protocolViolations]),
    ],
    // Teknik skorda kötümser olan kazanır.
    techniqueScore: Math.min(rules.techniqueScore, vision.techniqueScore),
    // Duruş geometriyle belirleniyor; kural hakemi karar verdiyse önceliği o.
    // Görsel hakem yalnız kural hakemi değerlendiremediğinde söz sahibi.
    stanceConfirmed: rules.stanceConfirmed ?? vision.stanceConfirmed,
    // Kompansasyon (sakatlanma sinyali) yalnız görsel hakemden gelebilir;
    // kural hakemi iskelet geometrisinden diz valgusu çıkaramıyor.
    compensations: vision.compensations,
    judgeConfidence: Math.max(rules.judgeConfidence, vision.judgeConfidence),
    source: 'composite',
    notes: [rules.notes, vision.notes].filter(Boolean).join(' ') || undefined,
  };
}
