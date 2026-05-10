import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yetenek.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s · Yetenek',
    default: 'Yetenek 2.0 — Çocuğunun Spor Yeteneğini Keşfet',
  },
  description:
    '5 dakikada AI tabanlı çocuk spor yeteneği keşfi. 7 boyutlu bio-motor profil, 14 spor önerisi, sakatlanma uyarısı, kişiselleştirilmiş Türkçe rapor — telefonun kamerasıyla.',
  keywords: [
    'çocuk spor yeteneği',
    'spor önerisi',
    'AI yetenek tarama',
    'yetenek testi',
    'CMJ sıçrama',
    'denge testi',
    'reaksiyon süresi',
    'asimetri sakatlanma',
    'pediatrik spor',
    'MediaPipe',
    'Yetenek 2.0',
  ],
  authors: [{ name: 'Yetenek 2.0 Team' }],
  creator: 'Yetenek 2.0',
  publisher: 'Yetenek 2.0',
  applicationName: 'Yetenek',
  category: 'health',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Yetenek 2.0',
    title: 'Yetenek 2.0 — Çocuğunun Spor Yeteneğini Keşfet',
    description:
      '5 dakikada AI tabanlı 7 boyutlu spor yetenek profili. Telefonun kamerasıyla.',
    url: SITE_URL,
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Yetenek 2.0 — Çocuk Spor Yeteneği Keşfi',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yetenek 2.0 — Çocuğunun Spor Yeteneğini Keşfet',
    description:
      '5 dakikada AI tabanlı 7 boyutlu spor yetenek profili. Telefonun kamerasıyla.',
    images: ['/og-default.png'],
  },
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>{children}</QueryProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Yetenek 2.0',
              applicationCategory: 'HealthApplication',
              operatingSystem: 'Web',
              inLanguage: 'tr',
              description:
                '5 dakikada AI tabanlı 7 boyutlu çocuk spor yetenek profili.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'TRY',
              },
              creator: {
                '@type': 'Organization',
                name: 'Yetenek 2.0',
                url: SITE_URL,
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
