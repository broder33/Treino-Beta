const CACHE_NAME = 'treino-v507';

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const STATIC_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@600;700&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;600&display=swap'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('api.anthropic.com')) return;
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('fonts.gstatic.com')) return;
  if (event.request.url.includes('unpkg.com')) return;
  if (event.request.url.includes('jsdelivr.net')) return;

  // index.html always from network — never cached.
  // ATENÇÃO: fetch(event.request) puro ainda passa pelo CACHE HTTP do navegador (camada
  // separada do cache do Service Worker). O GitHub Pages manda header de cache no HTML, então
  // o PWA ficava preso numa versão antiga: no desktop o Ctrl+Shift+R ignora esse cache, mas no
  // Android não existe hard reload e fechar o app não o limpa. cache:'no-store' força ida real
  // à rede. Passamos a URL (string) em vez do Request porque construir um Request novo a partir
  // de um request com mode:'navigate' lança TypeError.
  if (event.request.mode === 'navigate' || event.request.url.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request.url, { cache: 'no-store', credentials: 'same-origin' }).catch(function() {
        return new Response('<h1>Offline</h1><p>Conecte-se para usar o app.</p>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  // Static assets from cache
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request);
    })
  );
});
