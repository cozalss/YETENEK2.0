/**
 * Test rotalarının suspend boundary'si — App Router otomatik gösteriyor.
 * Yetenek render olana kadar minimum 2 saniyeye yakın geçen "boş ekran"
 * deneyimini iyileştirir.
 */
export default function TestLoading() {
  return (
    <main
      className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center gap-4 px-6 text-center"
      style={{
        background: 'var(--whistle-cream)',
        color: 'var(--form-navy)',
      }}
    >
      <div className="relative h-12 w-12">
        <div
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: 'rgba(44, 62, 107, 0.15)' }}
        />
        <div
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--track-mustard)' }}
        />
      </div>
      <p
        className="text-xs uppercase tracking-widest"
        style={{ color: 'var(--track-mustard)', fontFamily: 'var(--font-display)' }}
      >
        Yetenek 2.0
      </p>
      <p
        className="text-base font-medium"
        style={{ color: 'var(--form-navy)', fontFamily: 'var(--font-display)' }}
      >
        Test ekranı hazırlanıyor…
      </p>
      <p
        className="max-w-xs text-sm"
        style={{ color: 'var(--form-navy)', opacity: 0.7 }}
      >
        AI motoru ve kamera arayüzü yükleniyor. İlk açılışta birkaç saniye
        sürebilir.
      </p>
    </main>
  );
}
