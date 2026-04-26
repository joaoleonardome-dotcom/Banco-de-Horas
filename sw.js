const CACHE_NAME = 'banco-horas-v2';
const BASE = self.registration.scope;

const ASSETS = [
  BASE,
  BASE + 'index.html',
];

// Instala e faz cache dos assets principais
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Remove caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: Network first, fallback para cache
self.addEventListener('fetch', e => {
  // Ignora requisições para Firebase e APIs externas
  if (
    e.request.url.includes('firestore.googleapis.com') ||
    e.request.url.includes('firebase') ||
    e.request.url.includes('gstatic.com') ||
    e.request.url.includes('anthropic') ||
    !e.request.url.startsWith('http')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Atualiza o cache com a resposta mais recente
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: tenta servir do cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Fallback para index.html (SPA)
          return caches.match(BASE + 'index.html');
        });
      })
  );
});

// Recebe mensagem para pular espera
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
