/**
 * OG image endpoint — paylaşım kartı.
 *
 * Pratik karar: ImageResponse (next/og) Turbopack dev modunda kararsız
 * çalıştığı için saf SVG döndürüyoruz. Çoğu sosyal platform OG için PNG
 * tercih eder ama image/svg+xml de kabul ediyor (Twitter Cards SVG'yi
 * desteklemez ama WhatsApp/Facebook/Telegram destekler).
 *
 * Production'da Vercel Edge ile ImageResponse'a yükseltebiliriz.
 *
 * Query: ?name=Zeynep&age=11&sport=Voleybol&score=92
 */

export const runtime = 'nodejs';

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get('name') ?? '').slice(0, 40);
  const ageParam = searchParams.get('age');
  const age = ageParam ? Number(ageParam) : null;
  const sport = (searchParams.get('sport') ?? 'Yetenek Profili').slice(0, 30);
  const scoreParam = searchParams.get('score');
  const score = scoreParam
    ? Math.max(0, Math.min(100, Number(scoreParam)))
    : null;

  const headline = name
    ? `${name}’in Yetenek Profili`
    : 'Yetenek Profili';
  const ageLabel = age != null ? `${age} yas` : '';
  const sportSafe = xmlEscape(sport);
  const headlineSafe = xmlEscape(headline);
  const scoreLabel = score != null ? `%${score} uyum` : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="system-ui, -apple-system, sans-serif">
  <defs>
    <radialGradient id="g" cx="20%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#f6c453" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0a0a0a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <rect width="1200" height="630" fill="url(#g)"/>

  <!-- Brand -->
  <text x="80" y="100" font-size="32" font-weight="700" fill="#fafafa">Yetenek<tspan fill="#f6c453">.</tspan></text>
  ${
    ageLabel
      ? `<text x="1120" y="100" font-size="20" letter-spacing="4" text-anchor="end" fill="#a3a3a3" text-transform="uppercase">${xmlEscape(ageLabel.toUpperCase())}</text>`
      : ''
  }

  <!-- Hero -->
  <text x="80" y="280" font-size="32" letter-spacing="4" fill="#a3a3a3" text-transform="uppercase">EN GUCLU UYUM</text>
  <text x="80" y="430" font-size="160" font-weight="800" fill="#f6c453">${sportSafe}</text>
  ${
    scoreLabel
      ? `<text x="80" y="510" font-size="60" font-weight="700" fill="#fafafa">${xmlEscape(scoreLabel)}</text>`
      : ''
  }

  <!-- Footer -->
  <line x1="80" y1="555" x2="1120" y2="555" stroke="rgba(250,250,250,0.15)" stroke-width="1"/>
  <text x="80" y="590" font-size="26" font-weight="600" fill="#fafafa">${headlineSafe}</text>
  <text x="1120" y="590" font-size="20" letter-spacing="2" text-anchor="end" fill="#a3a3a3" font-family="monospace">yetenek.app</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
