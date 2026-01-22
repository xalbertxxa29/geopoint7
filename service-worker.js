/**
 * Service Worker v5 - PWA Robusta
 * Separación de caché local y externa para garantizar instalación
 */

const CACHE_NAME = 'geopoint-v5';

// 1. Archivos LOCALES (Críticos) - Deben existir sí o sí para instalarse
const LOCAL_ASSETS = [
  './',
  './index.html',
  './menu.html',
  './offline.html', // Nueva página offline
  './formulario.html',
  './firebase-config.js',
  './auth.js',
  './helpers.js',
  './loader-system.js',
  './notification-system.js',
  './offline-queue.js',
  './menu-new.js',
  './formulario-new.js',
  './map-manager.js',
  './neon-styles.css',
  './styles.css',
  './menu-new.css',
  './formulario.css',
  './manifest.json'
];

// 2. Archivos EXTERNOS (Opcionales en instalación) - Se cachean al usarse
// No los ponemos en install para que no rompan la PWA si fallan
const EXTERNAL_ASSETS = [
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-storage-compat.js'
];

// INSTALL - Solo cachear lo local crítico
self.addEventListener('install', event => {
  console.log('👷 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cacheando archivos locales...');
        return cache.addAll(LOCAL_ASSETS);
      })
      .then(() => {
        console.log('✅ Instalación completada');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ Error en instalación SW:', err);
      })
  );
});

// ACTIVATE - Limpiar cachés viejos
self.addEventListener('activate', event => {
  console.log('wh Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Limpiando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker Activo y controlando clientes');
      return self.clients.claim();
    })
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
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) return cachedResponse;
              // Si no hay red ni caché, mostrar página offline
              return caches.match('./offline.html');
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
        .catch(() => caches.match(event.request)) // Fallback a caché
    );
    return;
  }

  // 3. Assets Estáticos (JS, CSS, Imágenes): Cache First
  event.respondWith(
    caches.match(event.request)
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
