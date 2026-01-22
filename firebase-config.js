/**
 * Firebase Configuration
 * Archivo centralizado para las credenciales de Firebase
 */

const firebaseConfig = {
  apiKey: "AIzaSyA5-v9DhFUgl8tuBFDw50y8x0t0jyS4Qak",
  authDomain: "geopint-dea12.firebaseapp.com",
  projectId: "geopint-dea12",
  storageBucket: "geopint-dea12.firebasestorage.app",
  messagingSenderId: "275082094487",
  appId: "1:275082094487:web:6db788f8d8893e58d586d2"
};

// Inicializar Firebase una sola vez
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Crear instancias y exportar directamente a window
// (NO crear const variables locales para evitar conflictos)
window.firebaseDB = firebase.firestore();
window.firebaseAuth = firebase.auth();
window.firebaseStorage = firebase.storage();
window.firebaseConfig = firebaseConfig;

// Configurar persistencia local (sesión permanente)
window.firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => {
    console.warn('No se pudo establecer persistencia local:', error);
  });

// Configurar Firestore para WebView y offline
try {
  window.firebaseDB.settings({
    ignoreUndefinedProperties: true,
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false
  });
} catch (e) {
  console.warn('[Firestore] settings:', e?.message);
}

// Habilitar sincronización offline para Firestore
if (!window.__FIRESTORE_PERSISTENCE_ENABLED__) {
  window.__FIRESTORE_PERSISTENCE_ENABLED__ = true;
  (async () => {
    try {
      await window.firebaseDB.enablePersistence({ synchronizeTabs: true });
      console.log('[Firestore] Persistencia habilitada.');
    } catch (err) {
      const code = err && err.code;
      if (code === 'failed-precondition') {
        console.warn('[Firestore] Otra instancia tiene el lock');
      } else if (code === 'unimplemented') {
        console.warn('[Firestore] Persistencia no soportada');
      }
    }
  })();
}
