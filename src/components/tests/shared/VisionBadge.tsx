'use client';

/**
 * Görsel denetimin bu denemede çalışıp çalışmadığını gösteren rozet.
 *
 * Şeffaflık gerekçesi: kullanıcı "hareket kalitem de denetlendi mi" sorusunu
 * cevaplayabilmeli. Sessizce atlanan bir denetim, hiç olmayan bir denetimden
 * daha kötüdür — çünkü kullanıcı olduğunu sanır.
 *
 * Çalışmadığında da gösteriliyor: rıza yok, ağ yok veya anahtar yok
 * durumlarının hepsi kullanıcı açısından aynı sonucu doğuruyor ve bunu
 * bilmesi gerekiyor.
 */

interface Props {
  readonly applied: boolean;
}

export function VisionBadge({ applied }: Props) {
  return (
    <p
      className="mt-2 text-xs"
      style={{ color: 'var(--color-ink-3)' }}
      title={
        applied
          ? 'Hareket kalitesi (kol savurma, uçuşta diz çekme, kısmi hareket açıklığı) da denetlendi.'
          : 'Cihazınızdaki protokol denetimi çalıştı. Hareket kalitesi denetimi için profil sayfasından onay verebilirsiniz.'
      }
    >
      {applied
        ? '✓ protokol + hareket kalitesi denetlendi'
        : '✓ protokol denetlendi (cihazda)'}
    </p>
  );
}
