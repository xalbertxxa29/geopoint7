/**
 * Service Worker v3 - PWA con Offline y Sesión Robusta
 * Estrategia inteligente de caché
 */

const CACHE_NAME = 'geopoint-v4';
const urlsToCache = [
  './',
  './index.html',
  './menu.html',
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
  './manifest.json',
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-storage-compat.js'
];

// INSTALL - Cachear archivos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE - Limpiar cachés antigués
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH - Estrategia inteligente
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ⚠️ CRÍTICO: NO CACHEAR REDIRECCIONES A LOGIN
  // Dejar que onAuthStateChanged + SessionManager decidan
  if (url.pathname === '/index.html' || url.pathname === '/') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Network first para APIs Firebase (datos siempre frescos)
  if (url.host.includes('firebaseio') || url.host.includes('googleapis')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache first para assets (JS, CSS, imágenes)
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => new Response('Offline', { status: 503 }))
  );
});
