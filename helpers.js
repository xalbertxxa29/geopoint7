/**
 * Utilidades y Funciones Auxiliares
 */

class Helpers {
  /**
   * Calcular distancia entre dos puntos usando fórmula del Haversine
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const toRad = (value) => (value * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en metros
  }

  /**
   * Validar email
   */
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Validar campos requeridos
   */
  static validateRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
  }

  /**
   * Formatear fecha
   */
  static formatDate(date = new Date()) {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Formatear hora
   */
  static formatTime(date = new Date()) {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Guardar en localStorage de forma segura
   */
  static setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error al guardar en localStorage:', error);
      return false;
    }
  }

  /**
   * Obtener de localStorage de forma segura
   */
  static getStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error al leer de localStorage:', error);
      return defaultValue;
    }
  }

  /**
   * Eliminar de localStorage
   */
  static removeStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error al eliminar de localStorage:', error);
      return false;
    }
  }

  /**
   * Debounce para funciones
   */
  static debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle para funciones
   */
  static throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Verificar conexión a internet
   */
  static isOnline() {
    return navigator.onLine;
  }

  /**
   * Hacer una solicitud con reintentos
   */
  static async fetchWithRetry(url, options = {}, retries = 3) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      if (retries <= 0) throw error;
      // Esperar antes de reintentar (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
      return this.fetchWithRetry(url, options, retries - 1);
    }
  }

  /**
   * Generar ID único
   */
  static generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Esperar un tiempo específico
   */
  static sleep(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Copiar texto al portapapeles
   */
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      window.notificationSystem?.success('Copiado al portapapeles');
      return true;
    } catch (error) {
      console.error('Error al copiar:', error);
      window.notificationSystem?.error('No se pudo copiar al portapapeles');
      return false;
    }
  }

  /**
   * Solicitar permiso de geolocalización
   */
  static requestGeolocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Navegador no soporta geolocalización'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Observar cambios de conectividad
   */
  static onConnectionChange(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
}

// Exportar globalmente
window.Helpers = Helpers;
