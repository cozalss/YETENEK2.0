/**
 * Yetenek 2.0 — Service Worker.
 *
 * Strateji:
 *   - App shell (`/`, manifest, icon): precache install sırasında.
 *   - Navigations: network-first, fallback cached shell (offline çalışsın).
 *   - Next.js static (`/_next/static/...`): cache-first (hash'li, immutable).
 *   - MediaPipe CDN (cdn.jsdelivr.net @mediapipe/...) + model dosyaları
 *     (storage.googleapis.com/.../pose_landmarker_*): runtime cache —
 *     ~10MB indirme, ikinci açılışta offline çalışır.
 *   - API rotaları (/api/*): bypass — daima canlı.
 *
 * Versiyonlama: CACHE_VERSION değişince activate eski cache'i siler.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `yetenek-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `yetenek-runtime-${CACHE_VERSION}`;

const SHELL_URLS = ['/', '/manifest.webmanifest', '/icon.svg'];

const MEDIAPIPE_HOSTS = [
  'cdn.jsdelivr.net',
  'storage.googleapis.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isMediaPipeAsset(url) {
  if (!MEDIAPIPE_HOSTS.includes(url.hostname)) return false;
  // jsdelivr: @mediapipe paketleri; storage.googleapis: pose_landmarker_*
  return (
    url.pathname.includes('/@mediapipe/') ||
    url.pathname.includes('mediapipe-models/') ||
    url.pathname.endsWith('.task') ||
    url.pathname.endsWith('.wasm')
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function networkFirst(request, cacheName, fallbackPath) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackPath) {
      const fallback = await cache.match(fallbackPath);
      if (fallback) return fallback;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // API rotalarını cache'leme — daima canlı (rapor, chat, health).
  if (url.pathname.startsWith('/api/')) return;

  // MediaPipe WASM + model — büyük, yavaş yavaş indirilir; cache-first.
  if (isMediaPipeAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Next.js immutable static — cache-first.
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Sayfa navigation'ı — network-first, offline'da shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/'));
    return;
  }

  // Same-origin static asset (icon, manifest gibi) — cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Diğer cross-origin (Google Fonts vb.) — passthrough (browser yönetir).
});
