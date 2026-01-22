/**
 * PWA Initialization Script
 * Registra el Service Worker para soporte offline
 */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('✅ ServiceWorker registrado con éxito:', registration.scope);
            })
            .catch(error => {
                console.error('❌ Fallo al registrar ServiceWorker:', error);
            });
    });
}
