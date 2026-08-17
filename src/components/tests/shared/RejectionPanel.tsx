'use client';

/**
 * Reddedilen deneme paneli.
 *
 * Genel bir "bir şeyler ters gitti" mesajı değil: hakemin tespit ettiği
 * ihlale özgü, çocuğun ne yapması gerektiğini söyleyen bir yönerge gösterir
 * ("Diğer ayağını yerden kes ve tekrar dene"). Yönergeyi `apply-verdict.ts`
 * üretiyor; burası yalnız sunum.
 *
 * Ton bilinçli olarak suçlayıcı değil: hedef kitle 8-15 yaş, ve reddedilen
 * bir deneme çocuğun başarısızlığı değil ölçümün geçersizliği.
 */

import type { RejectedMeasurement } from '@/core/use-cases/apply-verdict';

interface Props {
  readonly rejection: RejectedMeasurement;
  readonly onRetry: () => void;
}

export function RejectionPanel({ rejection, onRetry }: Props) {
  return (
    <div
      className="rounded-2xl border border-amber-300 bg-amber-50 p-5"
      role="alert"
    >
      <h3 className="text-lg font-semibold text-amber-900">
        Bu deneme sayılmadı
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-amber-900">
        {rejection.retryHint}
      </p>
      {rejection.rejectedBy ? (
        <p className="mt-1 text-xs text-amber-800/70">
          Karar:{' '}
          {rejection.rejectedBy === 'vision' ? 'görsel hakem' : 'kural hakemi'}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-amber-700">
        Merak etme — yanlış yapılan bir testi kaydetmek yerine tekrar etmek
        sonucun doğru olmasını sağlıyor.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 w-full rounded-xl bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
      >
        Tekrar dene
      </button>
    </div>
  );
}
