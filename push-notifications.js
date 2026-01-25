/**
 * Sistema de Notificaciones Push
 * Integración con Firebase Cloud Messaging
 */

class PushNotifications {
    constructor() {
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        this.permission = this.isSupported ? Notification.permission : 'denied';
        this.vapidKey = null; // Configurar con tu VAPID key de Firebase

        if (this.isSupported) {
            console.log('[Push] Sistema de notificaciones soportado');
        } else {
            console.warn('[Push] Notificaciones push no soportadas');
        }
    }

    /**
     * Solicitar permiso para notificaciones
     */
    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Notificaciones push no soportadas');
        }

        if (this.permission === 'granted') {
            console.log('[Push] Permiso ya otorgado');
            return true;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                console.log('[Push] Permiso otorgado');
                await this.subscribe();
                return true;
            } else {
                console.log('[Push] Permiso denegado');
                return false;
            }
        } catch (error) {
            console.error('[Push] Error solicitando permiso:', error);
            throw error;
        }
    }

    /**
     * Suscribirse a notificaciones push
     */
    async subscribe() {
        if (!this.vapidKey) {
            console.warn('[Push] VAPID key no configurada');
            return null;
        }

        try {
            const registration = await navigator.serviceWorker.ready;

            // Verificar si ya hay suscripción
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // Crear nueva suscripción
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(this.vapidKey)
                });

                console.log('[Push] Nueva suscripción creada');
            } else {
                console.log('[Push] Suscripción existente encontrada');
            }

            // Guardar suscripción en Firebase
            await this.saveSubscription(subscription);

            return subscription;
        } catch (error) {
            console.error('[Push] Error al suscribirse:', error);
            throw error;
        }
    }

    /**
     * Cancelar suscripción
     */
    async unsubscribe() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                await this.removeSubscription(subscription);
                console.log('[Push] Suscripción cancelada');
                return true;
            }

            return false;
        } catch (error) {
            console.error('[Push] Error al cancelar suscripción:', error);
            throw error;
        }
    }

    /**
     * Guardar suscripción en Firebase
     */
    async saveSubscription(subscription) {
        const user = window.firebaseAuth?.currentUser;
        if (!user) return;

        try {
            await window.firebaseDB.collection('pushSubscriptions').doc(user.uid).set({
                subscription: JSON.parse(JSON.stringify(subscription)),
                userId: user.uid,
                userEmail: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('[Push] Suscripción guardada en Firebase');
        } catch (error) {
            console.error('[Push] Error guardando suscripción:', error);
        }
    }

    /**
     * Eliminar suscripción de Firebase
     */
    async removeSubscription(subscription) {
        const user = window.firebaseAuth?.currentUser;
        if (!user) return;

        try {
            await window.firebaseDB.collection('pushSubscriptions').doc(user.uid).delete();
            console.log('[Push] Suscripción eliminada de Firebase');
        } catch (error) {
            console.error('[Push] Error eliminando suscripción:', error);
        }
    }

    /**
     * Mostrar notificación local
     */
    async showNotification(title, options = {}) {
        if (!this.isSupported || this.permission !== 'granted') {
            console.warn('[Push] No se puede mostrar notificación');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;

            const defaultOptions = {
                icon: '/icon-192.png',
                badge: '/badge-72.png',
                vibrate: [200, 100, 200],
                tag: 'default',
                requireInteraction: false,
                ...options
            };

            await registration.showNotification(title, defaultOptions);
            console.log('[Push] Notificación mostrada:', title);
        } catch (error) {
            console.error('[Push] Error mostrando notificación:', error);
        }
    }

    /**
     * Convertir VAPID key de base64 a Uint8Array
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    }

    /**
     * Verificar estado de suscripción
     */
    async getSubscriptionStatus() {
        if (!this.isSupported) return { supported: false };

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            return {
                supported: true,
                permission: this.permission,
                subscribed: !!subscription,
                subscription
            };
        } catch (error) {
            console.error('[Push] Error obteniendo estado:', error);
            return { supported: true, error: error.message };
        }
    }
}

// Instancia global
window.pushNotifications = new PushNotifications();

// Ejemplo de uso al iniciar sesión
window.addEventListener('load', async () => {
    // Esperar a que el usuario esté autenticado
    window.firebaseAuth?.onAuthStateChanged(async (user) => {
        if (user && window.pushNotifications.isSupported) {
            // Preguntar al usuario si quiere recibir notificaciones
            // (esto debería hacerse en un momento apropiado de la UX)
            console.log('[Push] Usuario autenticado, notificaciones disponibles');
        }
    });
});
