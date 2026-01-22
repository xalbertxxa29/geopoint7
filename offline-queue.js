/**
 * Offline Queue System - Sincronización de datos en offline
 * Maneja cola de tareas, fotos y datos cuando no hay conexión
 */

class OfflineQueueManager {
  constructor() {
    this.DB_NAME = 'LiderControlOfflineDB';
    this.DB_VERSION = 1;
    this.QUEUE_STORE = 'offlineQueue';
    this.PHOTOS_STORE = 'offlinePhotos';
    this.db = null;
    this.isOnline = navigator.onLine;
    
    this.init();
    this.monitorConnection();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Error al abrir OfflineDB:', request.error);
        reject(request.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(this.QUEUE_STORE)) {
          db.createObjectStore(this.QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        }
        
        if (!db.objectStoreNames.contains(this.PHOTOS_STORE)) {
          db.createObjectStore(this.PHOTOS_STORE, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('OfflineQueueManager inicializado');
        resolve(this.db);
      };
    });
  }

  monitorConnection() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Conexión restaurada - sincronizando...');
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Sin conexión - usando modo offline');
    });
  }

  /**
   * Agregar tarea a la cola offline
   */
  async addToQueue(taskData) {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(this.QUEUE_STORE);
        
        const item = {
          type: taskData.type, // 'form', 'update', 'delete', etc
          collection: taskData.collection,
          data: taskData.data,
          timestamp: new Date().toISOString(),
          synced: false,
          attempts: 0
        };

        const request = store.add(item);

        request.onerror = () => {
          console.error('Error al agregar a cola:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          console.log('Tarea agregada a cola offline:', item);
          resolve(request.result);
        };
      });
    } catch (error) {
      console.error('Error en addToQueue:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las tareas pendientes
   */
  async getQueuedTasks() {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.QUEUE_STORE], 'readonly');
        const store = transaction.objectStore(this.QUEUE_STORE);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const tasks = request.result.filter(t => !t.synced);
          resolve(tasks);
        };
      });
    } catch (error) {
      console.error('Error en getQueuedTasks:', error);
      return [];
    }
  }

  /**
   * Marcar tarea como sincronizada
   */
  async markSynced(taskId) {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(this.QUEUE_STORE);
        const request = store.get(taskId);

        request.onsuccess = () => {
          const task = request.result;
          if (task) {
            task.synced = true;
            task.syncedAt = new Date().toISOString();
            const updateRequest = store.put(task);
            updateRequest.onsuccess = () => resolve(true);
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            resolve(false);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error en markSynced:', error);
    }
  }

  /**
   * Sincronizar cola con Firebase
   */
  async syncQueue() {
    if (!this.isOnline) {
      console.log('No hay conexión, abortando sincronización');
      return;
    }

    try {
      const tasks = await this.getQueuedTasks();
      
      if (tasks.length === 0) {
        console.log('No hay tareas pendientes para sincronizar');
        return;
      }

      console.log(`Sincronizando ${tasks.length} tareas...`);

      for (const task of tasks) {
        try {
          await this.executeSyncTask(task);
          await this.markSynced(task.id);
          console.log(`Tarea ${task.id} sincronizada exitosamente`);
        } catch (error) {
          console.error(`Error sincronizando tarea ${task.id}:`, error);
          task.attempts = (task.attempts || 0) + 1;
          
          if (task.attempts >= 3) {
            await this.markSynced(task.id); // Marcar como error final
            window.notificationSystem?.error(`No se pudo sincronizar tarea: ${error.message}`);
          }
        }
      }

      window.notificationSystem?.success('Datos sincronizados correctamente');
    } catch (error) {
      console.error('Error en sincronización general:', error);
    }
  }

  /**
   * Ejecutar tarea de sincronización específica
   */
  async executeSyncTask(task) {
    const { type, collection, data } = task;

    if (type === 'form') {
      // Agregar documento a Firestore
      return window.firebaseDB.collection(collection).add({
        ...data,
        syncedAt: new Date()
      });
    } else if (type === 'update') {
      // Actualizar documento
      return window.firebaseDB.collection(collection).doc(data.id).update({
        ...data,
        syncedAt: new Date()
      });
    } else if (type === 'delete') {
      // Eliminar documento
      return window.firebaseDB.collection(collection).doc(data.id).delete();
    }
  }

  /**
   * Agregar foto a la cola
   */
  async addPhotoToQueue(blob, metadata) {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.PHOTOS_STORE], 'readwrite');
        const store = transaction.objectStore(this.PHOTOS_STORE);
        
        const photo = {
          blob: blob,
          metadata: metadata,
          timestamp: new Date().toISOString(),
          uploaded: false
        };

        const request = store.add(photo);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          console.log('Foto agregada a cola');
          resolve(request.result);
        };
      });
    } catch (error) {
      console.error('Error en addPhotoToQueue:', error);
      throw error;
    }
  }

  /**
   * Obtener fotos pendientes
   */
  async getQueuedPhotos() {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.PHOTOS_STORE], 'readonly');
        const store = transaction.objectStore(this.PHOTOS_STORE);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const photos = request.result.filter(p => !p.uploaded);
          resolve(photos);
        };
      });
    } catch (error) {
      console.error('Error en getQueuedPhotos:', error);
      return [];
    }
  }

  /**
   * Limpiar cola (después de sincronización exitosa)
   */
  async clearOldQueue() {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(this.QUEUE_STORE);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          console.log('Cola limpiada');
          resolve(true);
        };
      });
    } catch (error) {
      console.error('Error en clearOldQueue:', error);
    }
  }
}

// Crear instancia global
window.OfflineQueueManager = OfflineQueueManager;
window.offlineQueue = new OfflineQueueManager();
