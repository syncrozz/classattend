// Self-unregistering Service Worker
// Automatically wipes all caches and unregisters itself from the browser
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => {
          client.navigate(client.url);
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch directly from network without caching
  event.respondWith(fetch(event.request));
});
