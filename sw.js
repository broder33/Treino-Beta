const CACHE_NAME = 'agenda-v0601';

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const STATIC_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;600&display=swap'
];

// Bibliotecas externas: ficam em cache para o app nunca depender da rede
// no momento em que abre. Sem isso, uma abertura sem rede sobe o app sem
// Supabase e ele roda offline sem avisar.
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'
];

function isCdnAsset(url) {
  for (var i = 0; i < CDN_ASSETS.length; i++) {
    if (url === CDN_ASSETS[i]) return true;
  }
  return false;
}

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      var local = cache.addAll(STATIC_ASSETS.filter(function(url) { return !url.startsWith('http'); }));
      var cdn = Promise.all(CDN_ASSETS.map(function(url) {
        return fetch(url, { mode: 'cors' }).then(function(res) {
          if (res && res.ok) return cache.put(url, res);
        }).catch(function() {});
      }));
      return Promise.all([local, cdn]);
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
  var url = event.request.url;

  // Bibliotecas: cache primeiro, rede depois (atualiza em segundo plano)
  if (isCdnAsset(url)) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) {
          fetch(event.request).then(function(res) {
            if (res && res.ok) {
              return caches.open(CACHE_NAME).then(function(c) { return c.put(event.request, res); });
            }
          }).catch(function() {});
          return cached;
        }
        return fetch(event.request).then(function(res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function(c) { c.put(event.request, copy); }).catch(function() {});
          }
          return res;
        });
      })
    );
    return;
  }

  if (url.includes('api.anthropic.com')) return;
  if (url.includes('supabase.co')) return;
  if (url.includes('fonts.gstatic.com')) return;
  if (url.includes('unpkg.com')) return;
  if (url.includes('jsdelivr.net')) return;
  if (url.includes('accounts.google.com')) return;

  if (event.request.mode === 'navigate' || url.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response('<h1>Offline</h1><p>Conecte-se para usar o app.</p>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request);
    })
  );
});
