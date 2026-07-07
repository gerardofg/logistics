const CACHE = 'logistics-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/db.js',
  '/js/sync.js',
  'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API requests: network first, queue if offline
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Static assets: cache first
  e.respondWith(cacheFirst(e.request));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  const cache = await caches.open(CACHE);
  cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    return res;
  } catch {
    return new Response(JSON.stringify({ offline: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Background sync: retry queued mutations when back online
self.addEventListener('sync', e => {
  if (e.tag === 'sync-queue') {
    e.waitUntil(notifyClients('sync'));
  }
});

function notifyClients(type) {
  return self.clients.matchAll().then(clients =>
    clients.forEach(c => c.postMessage({ type }))
  );
}
