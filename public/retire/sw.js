/* Service worker — offline app shell for the retirement simulator */
const CACHE = 'retire-v1';
const ASSETS = [
  './', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // only handle same-origin; let cross-origin (fonts) go to network
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).catch(() => caches.match('index.html'))
    )
  );
});
