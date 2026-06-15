// Simple, network-first service worker to satisfy PWA installation criteria without caching stale ledger data
const CACHE_NAME = 'sovereign-vault-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Let browser make real network requests to avoid offline synchronization issues
  e.respondWith(fetch(e.request));
});
