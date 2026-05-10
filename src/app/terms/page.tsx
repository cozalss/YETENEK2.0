import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları',
  description:
    'Yetenek 2.0 kullanım koşulları, sorumluluk sınırları ve güvenli kullanım ilkeleri.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>

        <header className="mt-8 border-b border-[var(--color-line)] pb-10">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-[var(--color-signal)] uppercase">
            <ShieldCheck className="h-4 w-4" />
            Kullanım Koşulları
          </p>
          <h1 className="mt-3 text-4xl leading-tight font-bold md:text-6xl">
            Güvenli kullanım
            <br />
            <span className="text-[var(--color-signal)]">önce gelir.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-2)]">
            Yetenek 2.0, çocukların spor yatkınlığını anlamaya yardımcı olan
            bir ön değerlendirme aracıdır. Sonuçlar karar desteği sağlar; tıbbi
            tanı, kesin yetenek seçimi veya profesyonel antrenör değerlendirmesi
            yerine geçmez.
          </p>
        </header>

        <article className="prose-yetenek mt-12 space-y-10">
          <Section number="01" title="Kimler kullanabilir?">
            <p>
              Uygulama 8-15 yaş arası çocuklar için tasarlanmıştır. Çocuk
              profili oluştururken veli veya yasal temsilci gözetimi gerekir.
              Velisi olmadığınız bir çocuğun bilgilerini uygulamaya girmeyin.
            </p>
          </Section>

          <Section number="02" title="Sonuçlar nasıl yorumlanmalı?">
            <p>
              Test skorları kamera kalitesi, ışık, alan genişliği, çocuğun o
              günkü yorgunluğu ve hareketin doğru yapılması gibi değişkenlerden
              etkilenebilir. Spor önerileri olasılık temelli bir başlangıç
              noktasıdır; çocuğun ilgisi, motivasyonu ve antrenör gözlemiyle
              birlikte değerlendirilmelidir.
            </p>
          </Section>

          <Section number="03" title="Sağlık ve güvenlik">
            <p>
              Testleri ağrısı, akut sakatlığı, baş dönmesi veya doktorun
              sınırladığı bir durumu olan çocuklara yaptırmayın. Hareketler için
              kaymayan zemin, yeterli boş alan ve yetişkin gözetimi önerilir.
              Şüpheli durumda spor hekimi, fizyoterapist veya antrenörden görüş
              alın.
            </p>
          </Section>

          <Section number="04" title="Veri ve gizlilik">
            <p>
              Kamera görüntüsü sunucuya gönderilmez. Aktif test oturumu cihazda
              geçici olarak tutulur; tamamlanan geçmiş ve rozetler yine cihazda
              saklanabilir. Ayrıntılar için{' '}
              <Link
                href="/privacy"
                className="underline decoration-[var(--color-signal)] underline-offset-4"
              >
                Gizlilik ve KVKK
              </Link>{' '}
              sayfasını okuyun.
            </p>
          </Section>

          <Section number="05" title="Sorumluluk sınırı">
            <p>
              Yetenek 2.0, eğitim ve ön değerlendirme amacıyla sunulur. Test
              sonuçlarına dayanarak tek başına spor dalı seçimi, sağlık kararı
              veya yoğun antrenman programı başlatılması önerilmez.
            </p>
          </Section>
        </article>

        <p className="mt-16 text-xs text-[var(--color-ink-3)]">
          Son güncelleme: 2026-05-10.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--color-line)] pt-8">
      <p className="font-mono text-xs tracking-widest text-[var(--color-signal)] uppercase">
        {number}
      </p>
      <h2 className="mt-2 text-2xl font-bold md:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4 text-base leading-relaxed text-[var(--color-ink-2)] [&_strong]:text-[var(--color-ink-1)]">
        {children}
      </div>
    </section>
  );
}
