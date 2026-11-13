// Kegelkasse Service Worker – Version 1.5
const CACHE = 'kegelkasse-1.5';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache:'reload' umgeht den Browser-Zwischenspeicher, damit wirklich die neuen Dateien gespeichert werden
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, {cache:'reload'}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function timeout(ms){ return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App-Seite: immer zuerst frisch aus dem Netz, ohne Zwischenspeicher; offline aus dem Speicher
  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.race([fetch(req.url, {cache:'no-store'}), timeout(4000)])
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
          return res.ok ? res : caches.match('./index.html').then(hit => hit || res);
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Update-Prüfung der App nicht abfangen
  if (url.origin === location.origin && url.search.includes('v=')) return;
  // Eigene Dateien und Schriften: erst Speicher, sonst Netz und merken
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
