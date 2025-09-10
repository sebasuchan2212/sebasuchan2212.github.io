/* service-worker.js — bump cache for lang-switch v3 */
const CACHE_VERSION = 'v2025.09.03.6';
const STATIC_CACHE = `pdftools-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `pdftools-runtime-${CACHE_VERSION}`;

// ★追加：広告配信ホストはキャッシュ対象外（重要）
const AD_HOSTS = [
  'pagead2.googlesyndication.com',
  'googleads.g.doubleclick.net',
  'tpc.googlesyndication.com'
];

const APP_SHELL = [
  '/', '/index.html', '/offline.html',
  '/manifest.json', '/app-core.js', '/hotfix.js', '/lang-switch.js',
  '/en/', '/es/'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async()=>{
    const cache = await caches.open(STATIC_CACHE);
    try { await cache.addAll(APP_SHELL); } catch(e) {}
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => (k.startsWith('pdftools-') && !k.endsWith(CACHE_VERSION)) ? caches.delete(k) : null)
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event)=>{
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ★追加：広告配信はSWで触らず素通し（respondWithしない）
  if (AD_HOSTS.includes(url.hostname)) return;

  if (req.mode === 'navigate') {
    event.respondWith((async()=>{
      try {
        const res = await fetch(req);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, res.clone());
        return res;
      } catch {
        // /offline.html が無ければ Response.error() に変更OK
        return (await caches.match('/offline.html')) || Response.error();
      }
    })());
    return;
  }

  if (url.origin === self.location.origin && url.pathname.match(/\.(?:js|css|png|ico|svg)$/)) {
    event.respondWith((async()=>{
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  event.respondWith((async()=>{
    try {
      const res = await fetch(req);
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, res.clone());
      return res;
    } catch {
      return (await caches.match(req)) || (await caches.match('/offline.html'));
    }
  })());
});
