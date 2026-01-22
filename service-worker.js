/**
 * Service Worker v5 - PWA Robusta
 * Separación de caché local y externa para garantizar instalación
 */

const CACHE_NAME = 'geopoint-v7';

// ... (assets list remains the same)

// FETCH - Estrategia Híbrida
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Navegación (HTML): Network -> Cache -> Offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Usar ignoreSearch: true para evitar problemas con query params (?uid=...)
          return caches.match(event.request, { ignoreSearch: true })
            .then(cachedResponse => {
              if (cachedResponse) return cachedResponse;
              // Si no hay red ni caché, mostrar página offline
              return caches.match('./offline.html', { ignoreSearch: true });
            });
        })
    );
    return;
  }

  // 2. Firebase y APIs: Network First (siempre intentar fresco)
  if (url.host.includes('firebaseio') || url.host.includes('googleapis')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Guardar copia fresca en caché si es exitosa
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true })) // Fallback a caché
    );
    return;
  }

  // 3. Assets Estáticos (JS, CSS, Imágenes): Cache First
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(response => {
        if (response) return response; // Hit de caché

        // Si no está en caché, buscar en red y cachear (Runtime Caching)
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
  );
});
