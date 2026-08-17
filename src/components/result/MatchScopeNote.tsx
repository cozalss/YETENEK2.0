/**
 * Spor eşleştirmesinin kapsam beyanı — sıralamadan ÖNCE, zorunlu.
 *
 * ## Neden var
 *
 * Üç gerçek kodda uzun zamandır belgeliydi ama kullanıcıya hiç ulaşmıyordu:
 *
 *   1. Denge ve koordinasyon boyutlarının yaş/cinsiyet norm tablosu yok —
 *      bu ikisi spor kararına HİÇ girmiyor (bkz. `zspace.ts`
 *      EXCLUDED_DIMENSIONS). Cimnastik gibi tam da bu iki boyutla
 *      tanımlanan sporlarda ağırlığın ~%39'u ölçülemiyor (bkz. `decide.ts`
 *      MIN_COVERAGE_FOR_PROBABILITY dokümanı) — sıralamada görünürler ama
 *      arkalarında eksik bir kanıt tabanı vardır.
 *   2. Bu oturumda atlanan testler o boyutu da karardan düşürür.
 *   3. Batarya 8-15 yaş için kalibre edildi; dışındaki bir yaş en yakın uç
 *      norm tablosuna sessizce sabitlenir (bkz. `recommend.ts`
 *      `interpolateNorm`).
 *
 * Bunu göstermeden bir sıralama göstermek, ölçmediğimiz bir kesinliği ima
 * etmek olurdu — o yüzden bu not listeden ÖNCE geliyor (StabilityNote'un
 * "sonra göster" mantığının tersi: kapsam bir önkoşul, kesinlik derecesi
 * bir sonuç yorumu).
 */

import type { SessionSummary } from '@/lib/session/store';
import { DIMENSION_LABELS_TR, type DimensionKey } from '@/lib/matching/sportProfiles';

const MIN_CALIBRATED_AGE = 8;
const MAX_CALIBRATED_AGE = 15;

function labelsFor(keys: readonly string[]): string[] {
  return keys.map((k) => DIMENSION_LABELS_TR[k as DimensionKey] ?? k);
}

export function MatchScopeNote({ session }: { session: SessionSummary }) {
  const excluded = session.matchExcludedDimensions ?? [];
  const missing = session.matchMissingDimensions ?? [];
  const ageOutOfRange =
    session.child.ageYears < MIN_CALIBRATED_AGE ||
    session.child.ageYears > MAX_CALIBRATED_AGE;

  if (excluded.length === 0 && missing.length === 0 && !ageOutOfRange) {
    return null;
  }

  const excludedLabels = labelsFor(excluded);
  const missingLabels = labelsFor(missing);

  return (
    <div
      className="rounded-xl px-4 py-3 text-xs leading-relaxed"
      style={{
        background: 'var(--color-canvas)',
        color: 'var(--color-ink-2)',
        border: '1px solid var(--color-line)',
      }}
    >
      <strong style={{ color: 'var(--form-navy)' }}>
        Bu sıralamanın ölçüm kapsamı sınırlı.
      </strong>{' '}
      {excludedLabels.length > 0 && (
        <>
          {excludedLabels.join(' ve ')} için henüz yaş/cinsiyet norm tablosu
          yok — bu boyutlar spor kararına hiç girmiyor. Bu yüzden bu
          boyutlarla tanımlanan sporlarda (ör. Cimnastik) ölçüm kapsamı
          düşük çıkar; kart üzerindeki not bunu spor bazında açıklar.{' '}
        </>
      )}
      {missingLabels.length > 0 && (
        <>
          Bu oturumda ölçülmeyen boyutlar da (
          {missingLabels.join(', ')}) karara giremedi.{' '}
        </>
      )}
      {ageOutOfRange && (
        <>
          Batarya {MIN_CALIBRATED_AGE}-{MAX_CALIBRATED_AGE} yaş için kalibre
          edildi; {session.child.ageYears} yaş en yakın uç norm tablosuyla
          değerlendirildi — kesinlik bu aralığın dışında düşer.
        </>
      )}
    </div>
  );
}
