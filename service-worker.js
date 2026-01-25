/**
 * Service Worker v8 - PWA Completa
 * Sistema robusto de caché offline con lista completa de assets
 */

const CACHE_NAME = 'geopoint-v8';
const CACHE_VERSION = '8.0.0';

// Lista completa de assets para caché offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './menu.html',
  './formulario.html',
  './offline.html',
  './verificacion-mapa.html',

  // JavaScript
  './auth.js',
  './menu-new.js',
  './formulario-new.js',
  './firebase-config.js',
  './helpers.js',
  './notification-system.js',
  './loader-system.js',
  './offline-storage.js',
  './offline-queue.js',
  './map-manager.js',
  './pwa-init.js',
  './logger.js',
  './error-tracker.js',
  './push-notifications.js',
  './i18n.js',
  './export-manager.js',
  './dashboard.js',

  // CSS
  './neon-styles.css',
  './styles.css',
  './menu-new.css',
  './formulario.css',
  './dashboard.css',

  // Manifest
  './manifest.json'
];

// INSTALL - Cachear assets críticos
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker v' + CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('[SW] Cache failed:', err);
      })
  );
});

// ACTIVATE - Limpiar cachés antiguos
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker v' + CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

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

// ========== PUSH NOTIFICATIONS ==========

// Manejar evento push
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');

  let notificationData = {
    title: 'LiderControl',
    body: 'Nueva notificación',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Manejar click en notificación
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  // Abrir la app o enfocar ventana existente
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Si hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no, abrir nueva ventana
        if (clients.openWindow) {
          return clients.openWindow('/menu.html');
        }
      })
  );
});
