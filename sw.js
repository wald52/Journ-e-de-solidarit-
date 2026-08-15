/* Service worker — PWA Journée de solidarité.
   L'interface est disponible hors-ligne. Les données utilisent une stratégie
   network-first afin de privilégier les chiffres les plus récents dès qu'une
   connexion est disponible. */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `journee-solidarite-static-${CACHE_VERSION}`;
const DATA_CACHE = `journee-solidarite-data-${CACHE_VERSION}`;
const CACHE_PREFIX = 'journee-solidarite-';

const scopedUrl = (path) => new URL(path, self.registration.scope).href;

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  'assets/style.css',
  'assets/app.js',
  'assets/charts.js',
  'assets/pwa.js',
  'assets/vendor/echarts.min.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'data/donnees.json',
  'data/donnees.csv'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map(scopedUrl)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, DATA_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await caches.match(request)) || (fallbackUrl ? caches.match(fallbackUrl) : undefined) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const update = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || update || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isData = /\/data\/donnees\.(json|csv)$/.test(url.pathname);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, scopedUrl('index.html')));
    return;
  }

  if (isData) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
