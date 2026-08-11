import { test, expect } from '@playwright/test';

/**
 * API endpoint E2E testleri — health, og, robots, sitemap, manifest.
 *
 * Authentication gerektiren endpoint'ler (chat, report, children) ayrıca
 * test ediliyor; çoğu unauthenticated istekte 401 veya structured error
 * dönmeli.
 */

test.describe('Health endpoint', () => {
  test('/api/health 200 + JSON döner', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('ok');
    expect(json.service).toBe('yetenek-2.0');
    expect(typeof json.uptimeSec).toBe('number');
    expect(json.features).toBeTruthy();
    expect(typeof json.features.anthropicConfigured).toBe('boolean');
  });

  test('/api/health Cache-Control no-store header', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('/api/health features.fallbackReportAvailable true', async ({
    request,
  }) => {
    const response = await request.get('/api/health');
    const json = await response.json();
    // Rule-based fallback her zaman aktif olmalı — Claude env eksik olsa bile
    // rapor üretebilmeli.
    expect(json.features.fallbackReportAvailable).toBe(true);
  });

  test('/api/health kural hakemi her zaman açık, görsel hakem opsiyonel', async ({
    request,
  }) => {
    const response = await request.get('/api/health');
    const json = await response.json();
    // Kural tabanlı geçerlilik hakemi anahtar durumundan bağımsız olarak
    // devrede — protokol denetimi hiçbir koşulda kapanmamalı.
    expect(json.features.ruleJudgeAvailable).toBe(true);
    // Görsel hakem yapılandırmaya bağlı; sadece tipi garanti ediyoruz ki
    // anahtarsız CI koşusunda da geçsin.
    expect(typeof json.features.visionJudgeConfigured).toBe('boolean');
  });

  test('/api/health version string döner', async ({ request }) => {
    const response = await request.get('/api/health');
    const json = await response.json();
    expect(typeof json.version).toBe('string');
    expect(json.version.length).toBeGreaterThan(0);
  });

  test('/api/health timestamp ISO formatında', async ({ request }) => {
    const response = await request.get('/api/health');
    const json = await response.json();
    // ISO 8601 parse edilebilmeli
    expect(Number.isNaN(Date.parse(json.timestamp))).toBe(false);
  });
});

test.describe('OG image endpoint', () => {
  test('/api/og parametresiz PNG döner', async ({ request }) => {
    const response = await request.get('/api/og');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('/api/og full params PNG döner', async ({ request }) => {
    const response = await request.get(
      '/api/og?name=Mert&age=11&sport=Basketbol&score=88',
    );
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('/api/og uzun isim güvenle sınırlanır', async ({ request }) => {
    const longName = 'A'.repeat(200);
    const response = await request.get(`/api/og?name=${longName}`);
    expect(response.status()).toBe(200);
  });
});

test.describe('Sitemap & robots', () => {
  test('/sitemap.xml XML döner ve ana yolları içerir', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('<urlset');
    expect(text).toContain('/test');
    expect(text).toContain('/about');
    expect(text).toContain('/sports/voleybol');
  });

  test('/robots.txt sitemap referansı içerir', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('Sitemap:');
    expect(text).toContain('/sitemap.xml');
    // /api/, /profile, /history disallow edilmeli
    expect(text).toContain('Disallow:');
  });
});

test.describe('Public manifest & PWA', () => {
  test('/manifest.webmanifest (varsa) yüklenir', async ({ request }) => {
    // PWA için manifest. Eğer /public altında yoksa 404 olabilir, esnek bir
    // kontrol — bulunduysa JSON, yoksa 404 ya da redirect.
    const response = await request.get('/manifest.webmanifest', {
      failOnStatusCode: false,
    });
    expect([200, 404]).toContain(response.status());
  });

  test('/sw.js Service Worker erişilebilir', async ({ request }) => {
    const response = await request.get('/sw.js', { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());
  });
});
