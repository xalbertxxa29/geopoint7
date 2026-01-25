/**
 * Menu.js Mejorado - Gestión del Menú Principal
 * Versión profesional corporativa con sesión offline robusta
 */

// ========== PROTECCIÓN DE PÁGINA CON SESIÓN PERSISTENTE ==========

// ========== PROTECCIÓN DE PÁGINA CON SESIÓN PERSISTENTE ==========

// Esperar a que Firebase y OfflineStorage estén listos
const checkSession = async (user) => {
  if (user) {
    console.log('✅ Usuario autenticado online:', user.email);

    // Guardar sesión para el futuro offline
    if (window.offlineStorage) {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0]
      };
      window.offlineStorage.setUserData(userData);
    }

    initializePage(user);
    return;
  }

  // Si no hay usuario online, verificar almacenamiento offline
  console.log('⚠️ Sin conexión a Firebase. Verificando sesión offline...');

  if (window.offlineStorage) {
    const offlineUser = await window.offlineStorage.getUserData();
    if (offlineUser) {
      console.log('✅ Sesión recuperada del almacenamiento offline:', offlineUser.email);
      window.notificationSystem?.warning('Modo Offline: Usando sesión guardada');

      // Simular objeto user de Firebase para la inicialización
      const mockUser = {
        uid: offlineUser.uid,
        email: offlineUser.email,
        displayName: offlineUser.displayName
      };

      initializePage(mockUser);
      return;
    }
  }

  // Si falla todo, redirigir
  console.log('❌ Sin sesión activa ni offline. Redirigiendo al login...');
  window.location.href = 'index.html';
};

// Escuchar cambios de auth
window.firebaseAuth.onAuthStateChanged(checkSession);

// ========== INICIALIZACIÓN DE PÁGINA ==========

// ========== INICIALIZACIÓN DE PÁGINA ==========

function initializePage(user) {
  // Obtener usuario actual (pasado por parámetro desde checkSession)
  const userData = user ? {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || 'Usuario'
  } : null;

  if (!userData) {
    window.location.href = 'index.html';
    return;
  }

  // Mostrar datos del usuario
  document.getElementById('fecha').innerText = Helpers.formatDate();
  document.getElementById('user-name').innerText = userData.displayName;
  document.getElementById('user-email').innerText = userData.email;

  // Inicializar componentes
  initTabs();
  initLogout();
  initFab();

  // Cargar tareas
  cargarTareas(userData.email);

  // Monitorear conexión
  monitorearConexion();
}

// ========== TABS ==========

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');

      // Remover clase activa de todos
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Agregar clase activa al seleccionado
      btn.classList.add('active');
      const selectedTab = document.getElementById(tabName);
      selectedTab?.classList.add('active');

      // Si es dashboard, cargar datos
      if (tabName === 'dashboard') {
        loadDashboardData();
      }
    });
  });
}

// ========== LOGOUT ==========

function initLogout() {
  const logoutBtn = document.getElementById('logout-btn-float');

  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', () => {
    window.notificationSystem?.confirm(
      '¿Deseas cerrar sesión?',
      async () => {
        try {
          window.loadingSystem?.show('Cerrando sesión...');

          // Cerrar sesión Firebase
          try {
            await window.firebaseAuth.signOut();
          } catch (error) {
            console.warn('Firebase logout:', error);
          }

          // Limpiar sesión local
          if (window.offlineStorage) {
            await window.offlineStorage.clearAll();
          }

          window.loadingSystem?.hide();
          window.notificationSystem?.success('Sesión cerrada');

          setTimeout(() => {
            window.location.href = 'index.html';
          }, 500);
        } catch (error) {
          window.loadingSystem?.hide();
          window.notificationSystem?.error('Error al cerrar sesión');
        }
      }
    );
  });
}

// ========== FAB (Floating Action Button) ==========

function initFab() {
  const addTaskBtn = document.getElementById('add-task-btn');

  if (!addTaskBtn) return;

  // Click en botón: ir directamente al formulario
  addTaskBtn.addEventListener('click', () => {
    window.location.href = 'formulario.html';
  });
}

// ========== CARGAR TAREAS ==========

async function cargarTareas(userEmail) {
  try {
    const user = window.firebaseAuth.currentUser;

    if (user) {
      // Online: cargar desde Firebase
      await cargarTareasFirebase(user.uid);
    } else {
      // Offline: mostrar mensaje
      window.notificationSystem?.warning('Modo offline - datos pueden estar desactualizados');
    }
  } catch (error) {
    console.error('Error al cargar tareas:', error);
    window.notificationSystem?.error('Error al cargar tareas');
  }
}

async function cargarTareasFirebase(userId) {
  const iniciasContainer = document.getElementById('iniciados-container');
  const completasContainer = document.getElementById('completados-container');

  try {
    window.loadingSystem?.show('Cargando tareas...');

    // Tareas iniciadas
    const iniciadas = await window.firebaseDB
      .collection('tareas')
      .where('userId', '==', userId)
      .where('estado', '==', 'iniciada')
      .get();

    // Tareas completadas
    const completadas = await window.firebaseDB
      .collection('tareas')
      .where('userId', '==', userId)
      .where('estado', '==', 'completada')
      .get();

    // Mostrar tareas iniciadas
    if (iniciadas.empty) {
      iniciasContainer.innerHTML = '<p style="text-align:center; color:#a0a0cc; padding:20px;">No hay tareas iniciadas</p>';
    } else {
      iniciasContainer.innerHTML = '';
      iniciadas.forEach(doc => {
        const tarea = doc.data();
        iniciasContainer.appendChild(crearTarjetaTarea(tarea, doc.id));
      });
    }

    // Mostrar tareas completadas
    if (completadas.empty) {
      completasContainer.innerHTML = '<p style="text-align:center; color:#a0a0cc; padding:20px;">No hay tareas completadas</p>';
    } else {
      completasContainer.innerHTML = '';
      completadas.forEach(doc => {
        const tarea = doc.data();
        completasContainer.appendChild(crearTarjetaTarea(tarea, doc.id));
      });
    }

    window.loadingSystem?.hide();
  } catch (error) {
    window.loadingSystem?.hide();
    console.error('Error al cargar tareas de Firebase:', error);
    window.notificationSystem?.error('Error al cargar tareas');
  }
}

function crearTarjetaTarea(tarea, id) {
  const card = document.createElement('div');
  card.className = 'tarea-card';
  card.innerHTML = `
    <div class="tarea-header">
      <h3>${tarea.descripcion || 'Sin descripción'}</h3>
      <span class="tarea-estado">${tarea.estado}</span>
    </div>
    <div class="tarea-body">
      <p><strong>Cliente:</strong> ${tarea.cliente || '-'}</p>
      <p><strong>Unidad:</strong> ${tarea.unidad || '-'}</p>
      ${tarea.distancia ? `<p><strong>Distancia:</strong> ${Math.round(tarea.distancia)}m</p>` : ''}
      <p><strong>Fecha:</strong> ${tarea.fechaCreacion ? Helpers.formatDate(new Date(tarea.fechaCreacion.toDate())) : '-'}</p>
    </div>
  `;
  return card;
}

// ========== MONITOREO DE CONEXIÓN ==========

function monitorearConexion() {
  Helpers.onConnectionChange((isOnline) => {
    if (isOnline) {
      window.notificationSystem?.success('Conexión restaurada', 'success', 3000);
    } else {
      window.notificationSystem?.warning('Sin conexión - modo offline', 'warning', 0);
    }
  });
}

// ========== UTILIDADES ==========

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  document.body.appendChild(overlay);
  return overlay;
}

// ========== INICIALIZACIÓN DE GOOGLE MAPS ==========

function initMap() {
  const mapContainer = document.getElementById('map');

  if (!mapContainer) {
    console.warn('Contenedor del mapa no encontrado');
    return;
  }

  // Mostrar overlay de carga con efecto tipo Google Earth
  const gpsOverlay = document.createElement('div');
  gpsOverlay.className = 'map-loading';
  gpsOverlay.innerHTML = `
    <div style="text-align: center;">
      <div class="gps-loading-spinner"></div>
      <div class="gps-loading-text">Obteniendo ubicación...</div>
    </div>
  `;
  mapContainer.parentElement.style.position = 'relative';
  mapContainer.parentElement.insertBefore(gpsOverlay, mapContainer);

  // Aplicar efecto de zoom desde el espacio al contenedor del mapa
  mapContainer.style.animation = 'spaceZoomEffect 3s ease-out forwards';

  // Ubicación por defecto (Lima)
  const defaultLocation = { lat: -12.0464, lng: -77.0428 };

  // Crear mapa con efecto Google Earth (zoom bajo inicial)
  const map = new google.maps.Map(mapContainer, {
    zoom: 3, // Comienza zoom bajo (como viendo desde el espacio)
    center: defaultLocation,
    mapTypeControl: false,
    fullscreenControl: true,
    streetViewControl: false,
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#0a0e1a' }] },
      { elementType: 'geometry.stroke', stylers: [{ color: '#0a0e1a' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0e1a' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#00d4ff' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#00ff64' }] }, // Verde NEON
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#00ff64' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#00ff88' }] }, // Verde NEON más claro
      { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#00ff88', weight: 1 }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
      { featureType: 'water', elementType: 'geometry.stroke', stylers: [{ color: '#00d4ff' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] }
    ]
  });

  // Agregar marcador por defecto
  new google.maps.Marker({
    position: defaultLocation,
    map: map,
    title: 'Ubicación por defecto (Lima)',
    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#00d4ff', fillOpacity: 0.8, strokeColor: '#00ffff', strokeWeight: 2 }
  });

  // Obtener ubicación del usuario (con timeout de 10 segundos)
  if (navigator.geolocation) {
    const timeoutId = setTimeout(() => {
      // Si tarda más de 10 segundos, usar ubicación por defecto
      gpsOverlay.remove();
      mapContainer.parentElement.classList.remove('gps-found');
      window.notificationSystem?.warning('GPS no disponible, usando ubicación por defecto');
    }, 10000);

    // Usar watchPosition en lugar de getCurrentPosition para:
    // 1. Obtener ubicación en caché rápido (maximumAge)
    // 2. Mantener la ubicación actualizada
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        clearTimeout(timeoutId);

        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Si ya tenemos un mapa y marcador, solo actualizamos posición
        if (window.userMarker) {
          window.userMarker.setPosition(userLocation);
          // Solo centrar si es la primera vez o si el usuario no ha movido mucho el mapa?
          // Por ahora mantenemos comportamiento original: centrar
          map.setCenter(userLocation);
          return;
        }

        // Efecto de zoom suave desde el espacio al ubicarse
        if (map) {
          // Animación de zoom suave: zoom in desde 3 a 15
          const zoomAnimation = setInterval(() => {
            const currentZoom = map.getZoom();
            if (currentZoom < 15) {
              map.setZoom(currentZoom + 1);
            } else {
              clearInterval(zoomAnimation);
              // Actualizar marcador después de terminar el zoom
              window.userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                title: 'Mi ubicación',
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#ff0055', fillOpacity: 0.9, strokeColor: '#ff88cc', strokeWeight: 3 },
                animation: google.maps.Animation.DROP
              });
            }
          }, 100); // 100ms entre cada zoom, total ~1.2 segundos
        }

        // Centrar en ubicación real
        map.setCenter(userLocation);

        // Efecto de éxito: agregar clase y remover overlay con zoom
        // Solo hacerlo si aún existe el overlay
        if (gpsOverlay && gpsOverlay.parentElement) {
          mapContainer.parentElement.classList.add('gps-found');

          // Crear efecto visual de zoom desde el espacio
          const earthEffectOverlay = document.createElement('div');
          earthEffectOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, rgba(0, 255, 100, 0.2), transparent 70%);
            pointer-events: none;
            animation: earthZoomIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            z-index: 5;
            `;
          mapContainer.parentElement.insertBefore(earthEffectOverlay, mapContainer);

          // Crear onda expansiva de ripple (solo si es la primera vez)
          setTimeout(() => {
            const ripples = mapContainer.parentElement.querySelectorAll('.gps-ripple');
            if (ripples.length < 3) {
              const ripple = document.createElement('div');
              ripple.className = 'gps-ripple';
              ripple.style.animation = 'rippleExpand 0.8s ease-out forwards';
              mapContainer.parentElement.appendChild(ripple);

              setTimeout(() => ripple.remove(), 800);
            }
          }, 300);

          // Remover overlay de carga
          gpsOverlay.style.animation = 'fadeOut 0.6s ease-out forwards';
          setTimeout(() => {
            gpsOverlay.remove();
            earthEffectOverlay.remove();
          }, 600);
        }
      },
      (error) => {
        // Solo mostrar error si es el primer intento (overlay visible)
        if (gpsOverlay && gpsOverlay.parentNode) {
          clearTimeout(timeoutId);
          console.warn('Error de geolocalización:', error);
          gpsOverlay.style.animation = 'fadeOut 0.5s ease-out forwards';
          setTimeout(() => {
            gpsOverlay.remove();
          }, 500);
        }
      }
    );
  }
}

// ========== MAPA ==========

function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  try {
    // Inicializar mapa con Leaflet
    window.mapManager.initMap('map', {
      zoom: 13
    });

    console.log('[Map] Mapa inicializado con Leaflet');
  } catch (error) {
    console.error('[Map] Error inicializando mapa:', error);
    window.notificationSystem?.error('Error al cargar el mapa');
  }
}

// Inicializar mapa cuando esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initMap, 500);
  });
} else {
  setTimeout(initMap, 500);
}
