const CACHE_NAME = 'sicob-upen-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/sicob-logo.png',
  '/favicon-32.png'
];

// Instalar el Service Worker y almacenar recursos básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones y servir desde caché / red (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar peticiones de método GET en el mismo origen o recursos estáticos
  if (request.method !== 'GET') {
    return;
  }

  // Evitar cachear llamadas de API dinámicas (las APIs se manejan por hooks resilientes)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Verificar si la respuesta es válida antes de guardarla en la caché
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Silenciar errores de red offline
      });

      // Retornar la respuesta cacheada inmediatamente, o esperar a la red
      return cachedResponse || fetchPromise;
    })
  );
});
