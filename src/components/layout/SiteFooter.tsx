/**
 * Site genelinde paylaşılan footer.
 *
 * Sade, tutarlı: brand mark, sayfa linkleri (3 grup), KVKK/yasal mini-link
 * satırı, scientific reference satırı.
 */

import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-canvas)]">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link
              href="/"
              className="font-display text-xl font-bold tracking-tight text-[var(--color-ink-1)]"
            >
              Yetenek<span className="text-[var(--color-signal)]">.</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--color-ink-2)]">
              AI destekli çocuk spor yetenek keşif platformu. 5 dakikalık
              taramayla 7 boyutlu bio-motor profil + spor önerisi.
            </p>
            <p className="mt-4 text-[11px] tracking-wider text-[var(--color-ink-3)] uppercase">
              METU Sports Tech Hackathon 2026
            </p>
          </div>

          {/* Ürün */}
          <FooterCol title="Ürün">
            <FooterLink href="/test">Test Bataryası</FooterLink>
            <FooterLink href="/test/full">Tam Akış</FooterLink>
            <FooterLink href="/test/full?mode=quick">Hızlı Akış</FooterLink>
            <FooterLink href="/result/demo">Demo Sonuç</FooterLink>
            <FooterLink href="/profile">Cüzdanım</FooterLink>
          </FooterCol>

          {/* Kaynaklar */}
          <FooterCol title="Kaynaklar">
            <FooterLink href="/about">Hakkında</FooterLink>
            <FooterLink href="/training">Antrenman</FooterLink>
            <FooterLink href="/sports">Spor Rehberi</FooterLink>
            <FooterLink href="/history">Geçmişim</FooterLink>
          </FooterCol>

          {/* Yasal */}
          <FooterCol title="Yasal">
            <FooterLink href="/privacy">Gizlilik (KVKK)</FooterLink>
            <FooterLink href="/terms">Kullanım Koşulları</FooterLink>
            <FooterLink href="/about#bilim">Bilim Referansları</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 text-xs text-[var(--color-ink-3)] md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Yetenek. Test verileri{' '}
            <strong className="text-[var(--color-ink-2)]">cihazda</strong>{' '}
            işlenir, sunucuya video gitmez.
          </p>
          <p className="font-mono tracking-wider uppercase">
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
      <h3 className="text-xs font-semibold tracking-widest text-[var(--color-signal)] uppercase">
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
        className="text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
      >
        {children}
      </Link>
    </li>
  );
}
