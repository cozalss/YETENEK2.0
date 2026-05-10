/**
 * Site genelinde paylaşılan footer.
 *
 * LandingPage tasarım diliyle uyumlu: form-navy zemin, whistle-cream metin,
 * track-mustard accent çizgi.
 */

import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer
      className="relative"
      style={{ background: 'var(--form-navy)' }}
    >
      <div
        className="absolute left-0 top-0 h-[2px] w-full"
        style={{ background: 'var(--track-mustard)' }}
      />

      <div className="mx-auto max-w-[1280px] px-6 py-12 md:py-16 lg:px-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-2">
            <Link
              href="/"
              className="text-xl font-black tracking-[0.3em]"
              style={{
                color: 'var(--whistle-cream)',
                fontFamily: 'var(--font-display)',
              }}
            >
              YETENEK
            </Link>
            <div
              className="mt-3 h-[2px] w-12"
              style={{ background: 'var(--track-mustard)' }}
            />
            <p
              className="mt-4 max-w-xs text-sm leading-relaxed"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.7,
                fontFamily: 'var(--font-body)',
              }}
            >
              AI destekli çocuk spor yetenek keşif platformu. 5 dakikalık
              taramayla 7 boyutlu bio-motor profil + spor önerisi.
            </p>
            <p
              className="mt-4 text-[11px] uppercase tracking-[0.3em]"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.45,
                fontFamily: 'var(--font-body)',
              }}
            >
              Where Symmetry Meets Talent
            </p>
          </div>

          <FooterCol title="Ürün">
            <FooterLink href="/test">Test Bataryası</FooterLink>
            <FooterLink href="/test/full">Tam Akış</FooterLink>
            <FooterLink href="/test/full?mode=quick">Hızlı Akış</FooterLink>
            <FooterLink href="/result/demo">Örnek Sonuç</FooterLink>
            <FooterLink href="/profile">Cüzdanım</FooterLink>
          </FooterCol>

          <FooterCol title="Kaynaklar">
            <FooterLink href="/about">Hakkında</FooterLink>
            <FooterLink href="/training">Antrenman</FooterLink>
            <FooterLink href="/sports">Spor Rehberi</FooterLink>
            <FooterLink href="/history">Geçmişim</FooterLink>
          </FooterCol>

          <FooterCol title="Yasal">
            <FooterLink href="/privacy">Gizlilik (KVKK)</FooterLink>
            <FooterLink href="/terms">Kullanım Koşulları</FooterLink>
            <FooterLink href="/about#bilim">Bilim Referansları</FooterLink>
          </FooterCol>
        </div>

        <div
          className="mt-12 flex flex-col gap-3 border-t pt-6 text-xs md:flex-row md:items-center md:justify-between"
          style={{ borderColor: 'rgba(255, 245, 225, 0.1)' }}
        >
          <p
            style={{
              color: 'var(--whistle-cream)',
              opacity: 0.5,
              fontFamily: 'var(--font-body)',
            }}
          >
            © {new Date().getFullYear()} Yetenek. Test verileri{' '}
            <strong style={{ color: 'var(--whistle-cream)', opacity: 1 }}>
              cihazda
            </strong>{' '}
            işlenir, sunucuya video gitmez.
          </p>
          <p
            className="font-mono uppercase tracking-wider"
            style={{
              color: 'var(--whistle-cream)',
              opacity: 0.4,
              fontFamily: 'var(--font-body)',
            }}
          >
            Bompa · Tomkinson · Croisier · Pion · Bridge · Phomsoupha
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3
        className="text-xs font-bold uppercase tracking-[0.3em]"
        style={{
          color: 'var(--track-mustard)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-xs uppercase tracking-[0.15em] transition-opacity hover:opacity-100"
        style={{
          color: 'var(--whistle-cream)',
          opacity: 0.65,
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
        }}
      >
        {children}
      </Link>
    </li>
  );
}
