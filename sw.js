const CACHE_NAME = 'bible-concordance-v1';
const STATIC_ASSETS = [
  '/bible-concordance/',
  '/bible-concordance/index.html',
  '/bible-concordance/assets/js/app.js',
  '/bible-concordance/assets/css/style.css',
  '/bible-concordance/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/assets/data/')) {
    e.respondWith(
      caches.match(e.request).then(res => res || fetch(e.request).then(f => {
        const clone = f.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return f;
      }).catch(() => caches.match('/bible-concordance/offline.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(res => res || fetch(e.request))
    );
  }
});
