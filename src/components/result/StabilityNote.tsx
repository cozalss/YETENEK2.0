/**
 * Sıralamanın tekrarlanabilirlik uyarısı.
 *
 * ## Neden var
 *
 * Ölçtüğümüz gerçek: aynı çocuk, aynı gün, ikinci ölçüm → **1. sıradaki spor
 * %74.7 ihtimalle aynı**. Yani her 4 çocuktan 1'i farklı bir "birinci spor"
 * görür. Top-3 örtüşmesi 2.62/3.
 *
 * Ürün bu sayıyı hiçbir yerde söylemiyordu. Sıralı bir liste, sıralamanın
 * anlamlı olduğu izlenimi verir; bu sayı o izlenimin ne kadar geçerli
 * olduğunu belirtiyor. Söylememek, sahip olmadığımız bir kesinliği ima etmek
 * olurdu.
 *
 * ## Sayının statüsü
 *
 * Bu bir **model tahmini**, ölçülmüş saha verisi değil: sentetik çocuk
 * profilleri ölçüm σ'sıyla iki kez örneklenip sıralama karşılaştırıldı.
 * Gerçek sayı için 10 çocuk × 2 ardışık batarya gerekiyor. Metin bunu
 * gizlemiyor.
 */

/**
 * Modelde ölçülen 1. sıra kararlılığı. Gerçek saha ölçümü yapıldığında bu
 * sabit onunla değiştirilmeli ve `measured` true yapılmalı.
 */
export const TOP1_STABILITY = 0.75;

/** Saha ölçümü yapıldı mı — metnin dilini belirliyor. */
const STABILITY_MEASURED_IN_FIELD = false;

export function StabilityNote() {
  const changePercent = Math.round((1 - TOP1_STABILITY) * 100);

  return (
    <p
      className="mt-3 rounded-xl px-4 py-3 text-xs leading-relaxed"
      style={{
        background: 'var(--color-canvas)',
        color: 'var(--color-ink-2)',
        border: '1px solid var(--color-line)',
      }}
    >
      <strong style={{ color: 'var(--form-navy)' }}>
        Bu bir kesin sıralama değil.
      </strong>{' '}
      Aynı test ikinci kez yapıldığında birinci sıradaki spor yaklaşık{' '}
      <strong>her {Math.round(100 / changePercent)} çocuktan 1&apos;inde</strong>{' '}
      değişiyor. Listeyi &quot;en uygun spor&quot; olarak değil,{' '}
      <strong>çocuğunuzun güçlü yönlerine yakın spor ailesi</strong> olarak
      okuyun — ilk üçün hepsi denemeye değer.
      {!STABILITY_MEASURED_IN_FIELD && (
        <>
          {' '}
          <span style={{ opacity: 0.75 }}>
            (Bu oran model hesabıdır; gerçek çocuklarla saha ölçümü henüz
            yapılmadı.)
          </span>
        </>
      )}
    </p>
  );
}
