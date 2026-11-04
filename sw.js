/**
 * sw.js — Service Worker (membuat aplikasi bisa dibuka offline).
 *
 * Letakkan di folder yang sama dengan index.html.
 * PENTING: setiap kali Anda mengubah file di css/, js/, atau assets/,
 * naikkan nomor versi pada CACHE di bawah (mis. v13 -> v14) agar HP pengguna ikut memperbarui.
 */

const CACHE = 'alfatih-pwa-v13';

// File aplikasi yang disimpan saat pemasangan (kecil-kecil).
// Buku (buku.enc, besar) disimpan setelah pertama kali dibaca.
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './assets/favicon.png',
  './assets/logo.png',
  './css/accessibility.css',
  './css/base/base.css',
  './css/base/variables.css',
  './css/components/about.css',
  './css/components/buttons.css',
  './css/components/dialogs.css',
  './css/components/footer.css',
  './css/responsive.css',
  './css/screens/bookmarks.css',
  './css/screens/login.css',
  './css/screens/reader.css',
  './css/screens/splash.css',
  './css/screens/toc.css',
  './js/config.js',
  './js/core/dom.js',
  './js/core/icons.js',
  './js/core/session.js',
  './js/core/state.js',
  './js/core/storage.js',
  './js/core/utils.js',
  './js/data/socials.js',
  './js/data/toc.js',
  './js/features/auth.js',
  './js/features/chapters.js',
  './js/features/gestures.js',
  './js/features/keyboard.js',
  './js/features/night-mode.js',
  './js/features/notes.js',
  './js/features/reader-overlay.js',
  './js/features/reader.js',
  './js/features/toc.js',
  './js/main.js',
  './js/services/notes-store.js',
  './js/services/pdf-loader.js',
  './js/services/pwa.js',
  './js/theme-init.js',
  './js/ui/about.js',
  './js/ui/actions.js',
  './js/ui/dialogs.js',
  './js/ui/router.js',
  './js/ui/splash.js',
  './js/ui/theme.js',
  './js/ui/toast.js',
];

// Pustaka dari internet yang ikut disimpan.
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
];

// ---------------------------------------------------------------
// Pemasangan: simpan file aplikasi
// ---------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled([...SHELL, ...CDN].map((url) => cache.add(url)));
    self.skipWaiting();
  })());
});

// ---------------------------------------------------------------
// Aktivasi: hapus cache versi lama
// ---------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// ---------------------------------------------------------------
// Strategi pengambilan file
// ---------------------------------------------------------------

/** Cache dulu; bila belum ada, ambil dari jaringan lalu simpan. (Untuk buku, ikon, pustaka CDN.) */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.status === 200) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

/** Tampilkan versi tersimpan SEGERA, sambil memperbarui salinan di latar belakang. (Untuk css/js/assets.) */
async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request);

  const update = fetch(event.request).then((response) => {
    if (response && response.status === 200) cache.put(event.request, response.clone());
    return response;
  }).catch(() => null);

  if (cached) {
    event.waitUntil(update);
    return cached;
  }
  return (await update) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Membuka aplikasi: tampilkan versi tersimpan SEGERA (tanpa menunggu jaringan), lalu perbarui di latar belakang
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = (await cache.match('./index.html')) || (await cache.match('./'));
      const update = fetch(request).then((response) => {
        if (response && response.status === 200) cache.put('./index.html', response.clone());
        return response;
      }).catch(() => null);

      if (cached) {
        event.waitUntil(update);
        return cached;
      }
      return (await update) || Response.error();
    })());
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isBook = sameOrigin && url.pathname.endsWith('buku.enc');
  const isAppAsset = sameOrigin && /\/(css|js|assets)\//.test(url.pathname);
  const isShellFile = sameOrigin && /(manifest\.json|icon-\d+\.png)$/.test(url.pathname);
  const isCdn = CDN.includes(request.url) || url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';

  if (isAppAsset) {
    event.respondWith(staleWhileRevalidate(event));
  } else if (isBook || isShellFile || isCdn) {
    event.respondWith(cacheFirst(request).catch(() => Response.error()));
  }
});
