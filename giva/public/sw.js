// GIVA service worker: offline app shell + cached images. Never touches Firebase traffic.
const VERSION = 'giva-v3';
const SHELL = `${VERSION}-shell`;
const IMAGES = `${VERSION}-img`;
const MAX_IMAGES = 200;

const PRECACHE = [
  '/pos', '/manager', '/', '/icon.svg', '/pwa-192x192.png', '/pwa-512x512.png',
  '/pwa-maskable-512x512.png', '/apple-touch-icon.png',
  '/assets/giva-logo.jpg', '/assets/giva-brand-circle.jpg',
  '/manifest-pos.json', '/manifest-mobile.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) =>
      // add one by one so a single 404 (e.g. host without /pos routing) can't fail the install
      Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

// Show the cached copy instantly, refresh it in the background (great on slow mobile data).
async function staleWhileRevalidate(request, cacheName, { ignoreSearch = false } = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch });
  const network = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firestore / Auth / Google APIs and anything non-image cross-origin: do not intercept.
  if (url.origin !== self.location.origin) {
    if (req.destination === 'image') {
      event.respondWith(
        staleWhileRevalidate(req, IMAGES).then((r) => {
          trim(IMAGES, MAX_IMAGES);
          return r;
        })
      );
    }
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      staleWhileRevalidate(req, SHELL, { ignoreSearch: true }).then(
        (res) => (res && res.type !== 'error' ? res : caches.match('/pos') || Response.error())
      )
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(req, SHELL));
});
