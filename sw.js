// Service Worker - Modul Al Fatih Reader
// Letakkan di folder yang sama dengan index.html, manifest.json, icon-192.png, icon-512.png dan buku.enc
const CACHE = 'alfatih-pwa-v11';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Hanya file kecil yang disimpan saat install. Buku (besar) disimpan setelah pertama kali dibaca.
    await Promise.allSettled([...SHELL, ...CDN].map((url) => cache.add(url)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.status === 200) {
    const cache = await caches.open(CACHE);
    cache.put(req, res.clone());
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Membuka aplikasi: tampilkan versi tersimpan SEGERA (tanpa menunggu jaringan), lalu perbarui di latar belakang
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = (await cache.match('./index.html')) || (await cache.match('./'));
      const update = fetch(req).then((res) => {
        if (res && res.status === 200) cache.put('./index.html', res.clone());
        return res;
      }).catch(() => null);
      if (cached) { event.waitUntil(update); return cached; }
      return (await update) || Response.error();
    })());
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isBook = sameOrigin && url.pathname.endsWith('buku.enc');
  const isShellFile = sameOrigin && /(manifest\.json|icon-\d+\.png)$/.test(url.pathname);
  const isCdn = CDN.includes(req.url) || url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';

  if (isBook || isShellFile || isCdn) {
    event.respondWith(cacheFirst(req).catch(() => Response.error()));
  }
});
