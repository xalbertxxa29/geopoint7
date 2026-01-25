/**
 * Error Tracking con Sentry
 * Sistema profesional de captura y reporte de errores
 */

class ErrorTracker {
    constructor() {
        this.isInitialized = false;
        this.sentryDSN = null; // Configurar con tu DSN de Sentry
        this.environment = window.location.hostname === 'localhost' ? 'development' : 'production';

        // Solo inicializar en producción si hay DSN configurado
        if (this.environment === 'production' && this.sentryDSN) {
            this.initSentry();
        } else {
            console.log('[ErrorTracker] Modo desarrollo - errores solo en consola');
        }
    }

    /**
     * Inicializar Sentry
     */
    initSentry() {
        if (typeof Sentry === 'undefined') {
            console.warn('[ErrorTracker] Sentry no está cargado');
            return;
        }

        try {
            Sentry.init({
                dsn: this.sentryDSN,
                environment: this.environment,
                release: 'geopoint7@8.0.0',

                // Configuración de performance
                tracesSampleRate: 1.0,

                // Configuración de sesiones
                replaysSessionSampleRate: 0.1,
                replaysOnErrorSampleRate: 1.0,

                // Filtros
                beforeSend(event, hint) {
                    // Filtrar errores conocidos o no importantes
                    const error = hint.originalException;

                    // Ignorar errores de extensiones del navegador
                    if (error && error.message && error.message.includes('chrome-extension://')) {
                        return null;
                    }

                    return event;
                }
            });

            this.isInitialized = true;
            console.log('[ErrorTracker] Sentry inicializado');
        } catch (error) {
            console.error('[ErrorTracker] Error al inicializar Sentry:', error);
        }
    }

    /**
     * Capturar error
     */
    captureError(error, context = {}) {
        // Log local
        console.error('[ErrorTracker] Error capturado:', error, context);

        // Enviar a logger
        if (window.logger) {
            window.logger.error('Error capturado', error, context);
        }

        // Enviar a Sentry si está inicializado
        if (this.isInitialized && typeof Sentry !== 'undefined') {
            Sentry.captureException(error, {
                extra: context,
                tags: {
                    component: context.component || 'unknown',
                    action: context.action || 'unknown'
                }
            });
        }
    }

    /**
     * Capturar mensaje
     */
    captureMessage(message, level = 'info', context = {}) {
        console.log(`[ErrorTracker] Mensaje (${level}):`, message, context);

        if (this.isInitialized && typeof Sentry !== 'undefined') {
            Sentry.captureMessage(message, {
                level,
                extra: context
            });
        }
    }

    /**
     * Establecer contexto de usuario
     */
    setUser(userData) {
        if (this.isInitialized && typeof Sentry !== 'undefined') {
            Sentry.setUser({
                id: userData.uid,
                email: userData.email,
                username: userData.displayName
            });
        }
    }

    /**
     * Limpiar contexto de usuario
     */
    clearUser() {
        if (this.isInitialized && typeof Sentry !== 'undefined') {
            Sentry.setUser(null);
        }
    }

    /**
     * Agregar breadcrumb (rastro de navegación)
     */
    addBreadcrumb(message, category = 'default', data = {}) {
        if (this.isInitialized && typeof Sentry !== 'undefined') {
            Sentry.addBreadcrumb({
                message,
                category,
                data,
                level: 'info'
            });
        }
    }
}

// Instancia global
window.errorTracker = new ErrorTracker();

// Capturar errores globales no manejados
window.addEventListener('error', (event) => {
    window.errorTracker.captureError(event.error, {
        component: 'global',
        action: 'unhandled_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

// Capturar promesas rechazadas no manejadas
window.addEventListener('unhandledrejection', (event) => {
    window.errorTracker.captureError(event.reason, {
        component: 'global',
        action: 'unhandled_promise_rejection'
    });
});
