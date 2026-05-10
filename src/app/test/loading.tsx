/**
 * Test rotalarının suspend boundary'si — App Router otomatik gösteriyor.
 * Yetenek render olana kadar minimum 2 saniyeye yakın geçen "boş ekran"
 * deneyimini iyileştirir.
 */
export default function TestLoading() {
  return (
    <main className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center text-white">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-amber-400" />
      </div>
      <p className="text-xs uppercase tracking-widest text-amber-300">
        Yetenek 2.0
      </p>
      <p className="text-base font-medium text-white">
        Test ekranı hazırlanıyor…
      </p>
      <p className="max-w-xs text-sm text-neutral-400">
        AI motoru ve kamera arayüzü yükleniyor. İlk açılışta birkaç saniye
        sürebilir.
      </p>
    </main>
  );
}
