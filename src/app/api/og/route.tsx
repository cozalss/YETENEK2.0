/**
 * OG image endpoint — sosyal paylaşım kartı (PNG).
 *
 * `next/og` ImageResponse ile gerçek PNG üretir → Twitter Cards, LinkedIn,
 * tüm modern sosyal platformlar destekler (SVG yetersiz kalıyordu).
 *
 * Runtime nodejs — Next 13.4+ ile next/og artık Node'da da çalışır;
 * edge runtime build'de "static generation disabled" uyarısı verirdi,
 * API route zaten dinamik olduğu için bu opt-out anlamsızdı.
 *
 * Cache 1 saat — query parametresi varsa farklı imaj.
 *
 * Query: ?name=Zeynep&age=11&sport=Voleybol&score=92
 */

import { ImageResponse } from 'next/og';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get('name') ?? '').slice(0, 40);
  const ageParam = searchParams.get('age');
  const age = ageParam ? Number(ageParam) : null;
  const sport = (searchParams.get('sport') ?? 'Yetenek Profili').slice(0, 30);
  const scoreParam = searchParams.get('score');
  const score =
    scoreParam != null && scoreParam !== ''
      ? Math.max(0, Math.min(100, Number(scoreParam)))
      : null;

  const headline = name ? `${name}'in Yetenek Profili` : 'Yetenek Profili';
  const ageLabel = age != null && Number.isFinite(age) ? `${age} YAŞ` : '';
  const scoreLabel = score != null ? `%${score} uyum` : '';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'radial-gradient(circle at 20% 30%, rgba(246, 196, 83, 0.18) 0%, rgba(10, 10, 10, 0) 60%), #0a0a0a',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Brand bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#fafafa' }}>
            Yetenek
            <span style={{ color: '#f6c453' }}>.</span>
          </div>
          {ageLabel && (
            <div
              style={{
                fontSize: 20,
                letterSpacing: 4,
                color: '#a3a3a3',
                textTransform: 'uppercase',
              }}
            >
              {ageLabel}
            </div>
          )}
        </div>

        {/* Hero */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 160,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 28,
              letterSpacing: 4,
              color: '#a3a3a3',
              textTransform: 'uppercase',
            }}
          >
            En güçlü uyum
          </div>
          <div
            style={{
              fontSize: 140,
              fontWeight: 800,
              color: '#f6c453',
              marginTop: 24,
              lineHeight: 1,
            }}
          >
            {sport}
          </div>
          {scoreLabel && (
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: '#fafafa',
                marginTop: 32,
              }}
            >
              {scoreLabel}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(250, 250, 250, 0.15)',
            paddingTop: 30,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 600, color: '#fafafa' }}>
            {headline}
          </div>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 2,
              color: '#a3a3a3',
              fontFamily: 'monospace',
            }}
          >
            yetenek.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    }
  );
}
