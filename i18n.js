/**
 * Sistema de Internacionalización (i18n)
 * Soporte multi-idioma para la aplicación
 */

class I18n {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'es';
        this.translations = {};
        this.fallbackLanguage = 'es';

        this.init();
    }

    /**
     * Inicializar sistema i18n
     */
    async init() {
        try {
            await this.loadTranslations(this.currentLanguage);
            this.applyTranslations();
            console.log(`[i18n] Idioma cargado: ${this.currentLanguage}`);
        } catch (error) {
            console.error('[i18n] Error inicializando:', error);
        }
    }

    /**
     * Cargar traducciones desde archivo JSON
     */
    async loadTranslations(lang) {
        try {
            const response = await fetch(`./locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.translations = await response.json();
        } catch (error) {
            console.error(`[i18n] Error cargando ${lang}.json:`, error);

            // Fallback a idioma por defecto
            if (lang !== this.fallbackLanguage) {
                console.log(`[i18n] Usando fallback: ${this.fallbackLanguage}`);
                await this.loadTranslations(this.fallbackLanguage);
            }
        }
    }

    /**
     * Obtener traducción por clave
     */
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`[i18n] Clave no encontrada: ${key}`);
                return key;
            }
        }

        // Reemplazar parámetros
        if (typeof value === 'string') {
            return value.replace(/\{(\w+)\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }

        return value;
    }

    /**
     * Cambiar idioma
     */
    async setLanguage(lang) {
        if (lang === this.currentLanguage) return;

        try {
            await this.loadTranslations(lang);
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            this.applyTranslations();

            // Disparar evento personalizado
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));

            console.log(`[i18n] Idioma cambiado a: ${lang}`);
            window.notificationSystem?.success(`Idioma cambiado a ${lang === 'es' ? 'Español' : 'English'}`);
        } catch (error) {
            console.error('[i18n] Error cambiando idioma:', error);
            window.notificationSystem?.error('Error al cambiar idioma');
        }
    }

    /**
     * Aplicar traducciones a elementos con data-i18n
     */
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Actualizar atributos title
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Actualizar document title si existe
        const titleKey = document.querySelector('meta[name="i18n-title"]');
        if (titleKey) {
            document.title = this.t(titleKey.content);
        }
    }

    /**
     * Obtener idioma actual
     */
    getLanguage() {
        return this.currentLanguage;
    }

    /**
     * Obtener idiomas disponibles
     */
    getAvailableLanguages() {
        return ['es', 'en'];
    }
}

// Instancia global
window.i18n = new I18n();

// Observar cambios en el DOM para aplicar traducciones a elementos nuevos
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Aplicar traducciones a elementos nuevos
                    if (node.hasAttribute && node.hasAttribute('data-i18n')) {
                        const key = node.getAttribute('data-i18n');
                        const translation = window.i18n.t(key);

                        if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                            node.placeholder = translation;
                        } else {
                            node.textContent = translation;
                        }
                    }

                    // Aplicar a hijos
                    if (node.querySelectorAll) {
                        node.querySelectorAll('[data-i18n]').forEach(element => {
                            const key = element.getAttribute('data-i18n');
                            const translation = window.i18n.t(key);

                            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                                element.placeholder = translation;
                            } else {
                                element.textContent = translation;
                            }
                        });
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
