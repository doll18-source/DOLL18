// Service worker: bikin web bisa di-install, dan semua gambar (thumbnail) ikut tersimpan di HP.
const CACHE = 'doll18-v2';
const SHELL = [
  './', 'index.html', 'watch.html', 'app.js', 'manifest.json',
  'icon-192.png', 'icon-512.png', 'logo-bg.png', 'glass.css'
];

// Simpan semua thumbnail yang ada di videos.json
async function cacheThumbs(list) {
  const cache = await caches.open(CACHE);
  await Promise.all(list.map(v => v && v.thumb
    ? cache.match(v.thumb).then(hit => hit || cache.add(v.thumb)).catch(() => {})
    : null));
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    try {
      const res = await fetch('videos.json', { cache: 'no-store' });
      if (res.ok) {
        await cache.put('videos.json', res.clone());
        await cacheThumbs(await res.json());
      }
    } catch (err) {}
    await self.skipWaiting();
  })());
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
  if (url.origin !== location.origin) return; // video, font, API GitHub: langsung ke jaringan

  // Gambar thumbnail: ambil dari cache dulu (cepat & jalan offline)
  if (url.pathname.includes('/thumbs/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const c = res.clone(); caches.open(CACHE).then(ch => ch.put(req, c)); }
      return res;
    })));
    return;
  }

  // Halaman & daftar video: jaringan dulu supaya selalu terbaru, cache sebagai cadangan offline
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        // video baru ditambahkan -> simpan thumbnail barunya juga
        if (url.pathname.endsWith('/videos.json')) res.clone().json().then(cacheThumbs).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
