/**
 * offline-storage.js - Sistema compartido de almacenamiento offline
 * Almacena datos del usuario (perfil, cliente, unidad) para acceso offline
 */

class OfflineStorage {
    constructor() {
        this.DB_NAME = 'geopoint-offline-data'; // Nombre único para este proyecto
        this.STORES = {
            user: 'user-profile',
            globals: 'app-globals'
        };
        this.init();
    }

    async init() {
        try {
            await this.openDB();
            console.log('✓ OfflineStorage inicializado');
        } catch (e) {
            console.warn('Error inicializando OfflineStorage:', e?.message);
        }
    }

    // Abrir/crear IndexedDB
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Crear stores si no existen
                if (!db.objectStoreNames.contains(this.STORES.user)) {
                    db.createObjectStore(this.STORES.user, { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains(this.STORES.globals)) {
                    db.createObjectStore(this.STORES.globals, { keyPath: 'key' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Guardar datos del usuario
    async setUserData(userData) {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORES.user, 'readwrite');
                const store = tx.objectStore(this.STORES.user);

                const data = {
                    key: 'current-user',
                    email: userData.email,
                    uid: userData.uid, // Usamos uid para consistencia con Firebase
                    displayName: userData.displayName || '',
                    cliente: userData.cliente || '',
                    unidad: userData.unidad || '',
                    savedAt: new Date().toISOString()
                };

                const request = store.put(data);
                request.onsuccess = () => {
                    console.log('✓ Datos de usuario guardados offline:', data.uid);
                    resolve(data);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Error guardando userData:', e?.message);
            throw e;
        }
    }

    // Obtener datos del usuario
    async getUserData() {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORES.user, 'readonly');
                const store = tx.objectStore(this.STORES.user);
                const request = store.get('current-user');

                request.onsuccess = () => {
                    if (request.result) {
                        console.log('✓ Datos de usuario recuperados offline');
                        resolve(request.result);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Error obteniendo userData:', e?.message);
            return null;
        }
    }

    // Limpiar datos offline (Logout)
    async clearAll() {
        try {
            const db = await this.openDB();
            for (const storeName of Object.values(this.STORES)) {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                store.clear();
            }
            console.log('✓ Datos offline limpiados');
        } catch (e) {
            console.error('Error limpiando datos:', e?.message);
        }
    }
}

// Instancia global
window.offlineStorage = new OfflineStorage();
