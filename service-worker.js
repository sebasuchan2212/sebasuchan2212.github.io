/* service-worker.js */
const CACHE_VERSION = 'v2025.09.03.1';
const STATIC_CACHE = `pdftools-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `pdftools-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  '/', '/index.html', '/offline.html',
  '/manifest.json', '/app-core.js', '/hotfix.js',
  '/icons/icon-192.png', '/icons/icon-512.png',
  '/en/', '/en/index.html', '/es/', '/es/index.html'
];

const CDN = [
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async()=>{
    const cache = await caches.open(STATIC_CACHE);
    try { await cache.addAll(APP_SHELL.concat(CDN)); } catch(e) {}
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k=> (k.startsWith('pdftools-') && !k.endsWith(CACHE_VERSION)) ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

async function networkFirst(request){
  try {
    const res = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, res.clone());
    return res;
  } catch (e){
    const cache = await caches.open(RUNTIME_CACHE);
    return (await cache.match(request)) || (await caches.match('/offline.html'));
  }
}

async function cacheFirst(request){
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(request, res.clone());
  return res;
}

async function swr(request){
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then(res=>{ cache.put(request, res.clone()); return res; }).catch(()=>null);
  return cached || network || fetch(request).catch(()=>caches.match('/offline.html'));
}

self.addEventListener('fetch', (event)=>{
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') { event.respondWith(networkFirst(req)); return; }
  if (/^https:\/\/cdn\.jsdelivr\.net\//.test(req.url)) { event.respondWith(swr(req)); return; }
  if (url.origin === self.location.origin) {
    if (url.pathname.match(/\.(?:js|css|png|jpg|jpeg|svg|webp|ico)$/)) { event.respondWith(cacheFirst(req)); return; }
  }
  event.respondWith(swr(req));
});
