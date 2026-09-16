/* Five08 offline cache.
   Hashed assets are served cache-first; HTML is fetched fresh when the network
   allows so a deploy lands, and falls back to the last copy when it does not. */
const VERSION = 'five08-v2';
const SHELL = ['/', '/app/', '/five08-logo.svg', '/five08-mark.svg', '/site.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const isDocument = request => request.mode === 'navigate' || request.destination === 'document';

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isDocument(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(VERSION).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(hit => hit || caches.match('/app/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(VERSION).then(cache => cache.put(request, copy));
      }
      return response;
    })),
  );
});
