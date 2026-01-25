/**
 * Sistema de Logging Profesional
 * Niveles: DEBUG, INFO, WARN, ERROR
 * Modo producción vs desarrollo
 */

class Logger {
    constructor() {
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };

        // Detectar modo producción (puedes cambiar esto según tu configuración)
        this.isProduction = window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1' &&
            !window.location.hostname.includes('192.168');

        // En producción, solo mostrar WARN y ERROR
        this.currentLevel = this.isProduction ? this.levels.WARN : this.levels.DEBUG;

        // Buffer para enviar logs a servidor (opcional)
        this.logBuffer = [];
        this.maxBufferSize = 100;

        console.log(`[Logger] Inicializado en modo ${this.isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
    }

    /**
     * Log de debug (solo en desarrollo)
     */
    debug(message, ...args) {
        if (this.currentLevel <= this.levels.DEBUG) {
            console.log(`🔍 [DEBUG] ${message}`, ...args);
        }
        this._addToBuffer('DEBUG', message, args);
    }

    /**
     * Log de información
     */
    info(message, ...args) {
        if (this.currentLevel <= this.levels.INFO) {
            console.log(`ℹ️ [INFO] ${message}`, ...args);
        }
        this._addToBuffer('INFO', message, args);
    }

    /**
     * Log de advertencia
     */
    warn(message, ...args) {
        if (this.currentLevel <= this.levels.WARN) {
            console.warn(`⚠️ [WARN] ${message}`, ...args);
        }
        this._addToBuffer('WARN', message, args);
    }

    /**
     * Log de error
     */
    error(message, error, ...args) {
        if (this.currentLevel <= this.levels.ERROR) {
            console.error(`❌ [ERROR] ${message}`, error, ...args);
        }
        this._addToBuffer('ERROR', message, { error, args });

        // Enviar a error tracker si está disponible
        if (window.errorTracker) {
            window.errorTracker.captureError(error, { message, args });
        }
    }

    /**
     * Agregar al buffer de logs
     */
    _addToBuffer(level, message, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.logBuffer.push(logEntry);

        // Mantener solo los últimos N logs
        if (this.logBuffer.length > this.maxBufferSize) {
            this.logBuffer.shift();
        }
    }

    /**
     * Obtener logs del buffer
     */
    getLogs(level = null) {
        if (level) {
            return this.logBuffer.filter(log => log.level === level);
        }
        return this.logBuffer;
    }

    /**
     * Limpiar buffer de logs
     */
    clearLogs() {
        this.logBuffer = [];
    }

    /**
     * Exportar logs como JSON
     */
    exportLogs() {
        const data = JSON.stringify(this.logBuffer, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Cambiar nivel de logging
     */
    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.currentLevel = this.levels[level];
            console.log(`[Logger] Nivel cambiado a ${level}`);
        }
    }
}

// Instancia global
window.logger = new Logger();

// Reemplazar console.log en producción
if (window.logger.isProduction) {
    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };

    console.log = (...args) => window.logger.debug(...args);
    console.warn = (...args) => window.logger.warn(...args);
    console.error = (...args) => window.logger.error(...args);

    // Mantener acceso al console original si es necesario
    window.originalConsole = originalConsole;
}
