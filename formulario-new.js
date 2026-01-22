/**
 * Formulario.js Mejorado - Gestión del Formulario de Tareas con Sesión Persistente
 */

// Las instancias de Firebase ya están en window desde firebase-config.js
// window.firebaseAuth, window.firebaseDB, window.firebaseStorage

// Variables globales
let ubicacionMapa, userMarker, clienteMarker, clienteCircle, distancePolyline;
let currentPosition = null;
let watchId = null;
const MAX_DISTANCE = 30; // metros (círculo de 30m - radio de geolocalización)
let authStateChangesFired = false;

// Elementos del DOM
const menuBtn = document.getElementById('menu-btn');
const sideMenu = document.getElementById('side-menu');
const logoutBtn = document.getElementById('logout-btn');
const enviarBtn = document.getElementById('enviar');
const cancelarBtn = document.getElementById('cancelar');
const emergencyBtn = document.getElementById('emergency-btn');
const overlay = document.createElement('div');

overlay.classList.add('overlay');
document.body.appendChild(overlay);

// ========== PROTECCIÓN DE PÁGINA ==========

window.firebaseAuth.onAuthStateChanged((user) => {
  if (!user) {
    console.log('❌ Sin sesión activa. Redirigiendo al login...');
    window.location.href = 'index.html';
  } else {
    console.log('✅ Usuario autenticado:', user.email);
    document.getElementById('fecha').innerText = Helpers.formatDate();
    document.getElementById('user-name').innerText = user.displayName || user.email;
    document.getElementById('user-email').innerText = user.email;
    inicializar();
  }
});

async function inicializar() {
  try {
    console.log('🔄 Iniciando formulario...');
    console.log(`🌐 Estado de conexión: ${navigator.onLine ? '✅ ONLINE' : '❌ OFFLINE'}`);

    // Esperar a que la autenticación esté lista
    const user = window.firebaseAuth.currentUser;
    if (!user) {
      console.warn('⏳ Usuario no autenticado, esperando...');
      // Esperar un poco para que la autenticación se establezca
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`👤 Usuario autenticado: ${user?.email || 'No disponible'}`);

    // Inicializar mapa primero
    initUbicacionesMapa();

    // Cargar datos offline o desde Firebase
    cargarTipoDeTarea();

    console.log('📋 Cargando clientes y unidades...');
    await populateDropdowns(); // Esperar a que se carguen los clientes

    // Restaurar selecciones previas si existen
    const lastCliente = Helpers.getStorage('ultimoCliente');
    const lastUnidad = Helpers.getStorage('ultimaUnidad');

    if (lastCliente) {
      document.getElementById('buscarCliente').value = lastCliente;
      // Disparar cambio para cargar unidades
      const event = new Event('change', { bubbles: true });
      document.getElementById('buscarCliente').dispatchEvent(event);

      // Esperar a que se carguen las unidades y luego seleccionar
      await new Promise(resolve => setTimeout(resolve, 500));
      if (lastUnidad) {
        document.getElementById('buscarUnidad').value = lastUnidad;
        document.getElementById('buscarUnidad').dispatchEvent(event);
      }
    }

    console.log('✅ Formulario inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar:', error);
    window.notificationSystem.error('Error al inicializar: ' + error.message);
  }
}

// ========== MENÚ LATERAL ==========

menuBtn.addEventListener('click', () => {
  sideMenu.classList.toggle('active');
  overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
  sideMenu.classList.remove('active');
  overlay.classList.remove('active');
});

logoutBtn.addEventListener('click', async () => {
  window.notificationSystem.confirm(
    '¿Deseas cerrar sesión?',
    async () => {
      try {
        window.loadingSystem.show('Cerrando sesión...');
        await window.logoutUser();
      } catch (error) {
        window.loadingSystem.hide();
        window.notificationSystem.error('Error: ' + error.message);
      }
    }
  );
});

// ========== MONITOR DE CONEXIÓN ==========

window.addEventListener('online', () => {
  console.log('✅ CONEXIÓN RESTAURADA');
  window.notificationSystem.success('Conexión restaurada. Ya puedes cargar clientes.');
});

window.addEventListener('offline', () => {
  console.log('❌ PERDISTE CONEXIÓN A INTERNET');
  window.notificationSystem.warning('Sin conexión a internet. No puedes descargar datos nuevos.', 'warning', 0);
});

// ========== GEOLOCALIZACIÓN Y MAPA ==========

/**
 * Inicializa el mapa de Google Maps con marcadores y círculo de validación
 */
function initUbicacionesMapa() {
  const mapContainer = document.getElementById('ubicaciones-mapa');
  if (!mapContainer) {
    console.error('❌ Contenedor del mapa no encontrado');
    window.notificationSystem.error('Contenedor del mapa no encontrado');
    return;
  }

  // Verificar si Google Maps API está cargado
  if (typeof google === 'undefined' || !google.maps) {
    console.warn('⚠️ Google Maps API no está disponible (modo offline).');
    mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#0a0e1a;color:#00d4ff;">Mapa no disponible sin internet</div>';

    // Aún así intentamos obtener la ubicación (no depende de Google Maps)
    trackUserLocation(null, null); // Pasamos null para no intentar animaciones de mapa
    return;
  }

  // Mostrar overlay de carga con efecto tipo Google Earth
  const gpsOverlay = document.createElement('div');
  gpsOverlay.className = 'map-loading';
  gpsOverlay.innerHTML = `
    <div style="text-align: center;">
      <div class="gps-loading-spinner"></div>
      <div class="gps-loading-text">Localizando dispositivo...</div>
    </div>
  `;
  mapContainer.parentElement.style.position = 'relative';
  mapContainer.parentElement.insertBefore(gpsOverlay, mapContainer);

  // Aplicar efecto de zoom desde el espacio al contenedor del mapa
  mapContainer.style.animation = 'spaceZoomEffect 3s ease-out forwards';

  const initialPosition = { lat: -12.0453, lng: -77.0311 }; // Lima, Perú

  ubicacionMapa = new google.maps.Map(mapContainer, {
    center: initialPosition,
    zoom: 3, // Comienza zoom bajo (como viendo desde el espacio)
    mapTypeControl: false,
    fullscreenControl: true,
    zoomControl: true,
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

  // 🔵 Marcador del dispositivo (azul)
  userMarker = new google.maps.Marker({
    map: ubicacionMapa,
    title: 'Tu ubicación (Dispositivo)',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#00d4ff',
      fillOpacity: 1,
      strokeColor: 'white',
      strokeWeight: 2
    },
    zIndex: 100
  });

  // 📍 Marcador del cliente (rojo)
  clienteMarker = new google.maps.Marker({
    map: ubicacionMapa,
    title: 'Ubicación del Cliente',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#ff0055',
      fillOpacity: 1,
      strokeColor: 'white',
      strokeWeight: 2
    },
    zIndex: 50
  });

  // ⭕ Círculo de validación (30 metros alrededor del cliente)
  clienteCircle = new google.maps.Circle({
    map: ubicacionMapa,
    radius: MAX_DISTANCE, // 30 metros
    fillColor: '#ff0055',
    fillOpacity: 0.1,
    strokeColor: '#ff0055',
    strokeOpacity: 0.6,
    strokeWeight: 2,
    clickable: false,
    zIndex: 1
  });

  // 📏 Línea de distancia entre dispositivo y cliente
  distancePolyline = new google.maps.Polyline({
    map: ubicacionMapa,
    path: [],
    geodesic: true,
    strokeColor: '#ff0000',
    strokeOpacity: 0.9,
    strokeWeight: 6,
    clickable: false,
    zIndex: 10
  });

  // Iniciar rastreo de ubicación del dispositivo
  trackUserLocation(gpsOverlay, mapContainer);
}

/**
 * Realiza seguimiento continuo de la ubicación del dispositivo
 */
function trackUserLocation(gpsOverlay, mapContainer) {
  if (!navigator.geolocation) {
    console.error('❌ Navegador no soporta geolocalización');
    window.notificationSystem.error('Tu navegador no soporta geolocalización');
    if (gpsOverlay) gpsOverlay.remove();
    return;
  }

  // Limpiar watch anterior si existe
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }

  console.log('🔍 Iniciando rastreo de ubicación...');
  window.loadingSystem.show('Obteniendo ubicación del dispositivo...');

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      currentPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      console.log(`📍 Ubicación del dispositivo actualizada:`, currentPosition);

      // Efecto de zoom suave desde el espacio al ubicarse
      if (ubicacionMapa) {
        // Animación de zoom suave: zoom in desde 3 a 16
        const zoomAnimation = setInterval(() => {
          const currentZoom = ubicacionMapa.getZoom();
          if (currentZoom < 16) {
            ubicacionMapa.setZoom(currentZoom + 1);
          } else {
            clearInterval(zoomAnimation);
            // Actualizar marcador después de terminar el zoom
            userMarker.setPosition(currentPosition);
          }
        }, 100); // 100ms entre cada zoom, total ~1.3 segundos
      }

      // Centrar mapa en dispositivo si existe el mapa
      if (ubicacionMapa) {
        ubicacionMapa.setCenter(currentPosition);
      }

      // Actualizar línea de distancia si hay coordenadas del cliente
      actualizarLineaDistancia();

      // Verificar si está dentro del círculo
      verificarDistancia();

      // Efecto de éxito: agregar clase y remover overlay
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
          background: radial-gradient(circle at center, rgba(0, 255, 100, 0.3), transparent 60%);
          pointer-events: none;
          z-index: 5;
          animation: earthZoomIn 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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

      window.loadingSystem.hide();
    },
    (error) => {
      window.loadingSystem.hide();

      // Remover overlay en caso de error
      if (gpsOverlay && gpsOverlay.parentElement) {
        gpsOverlay.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => {
          gpsOverlay.remove();
        }, 500);
      }

      const errorMessages = {
        1: '❌ Permiso denegado. Habilita la geolocalización en tu dispositivo.',
        2: '⚠️ No se pudo obtener la ubicación. Asegúrate de tener GPS activado.',
        3: '⏱️ Tiempo agotado. Intenta nuevamente.'
      };

      const message = errorMessages[error.code] || '❌ Error desconocido de geolocalización';
      console.error(message, error);
      window.notificationSystem.error(message);
    },
    {
      enableHighAccuracy: true,  // Usa GPS de alta precisión
      timeout: 20000,            // 20 segundos de timeout
      maximumAge: 5000           // Usa datos de caché máximo de 5 segundos
    }
  );
}

/**
 * Actualiza la línea visual de distancia entre dispositivo y cliente
 */
function actualizarLineaDistancia() {
  const clienteLat = parseFloat(document.getElementById('latitud').value);
  const clienteLng = parseFloat(document.getElementById('longitud').value);

  if (currentPosition && !isNaN(clienteLat) && !isNaN(clienteLng)) {
    // Actualizar la línea roja entre ambas ubicaciones
    if (distancePolyline) {
      distancePolyline.setPath([
        currentPosition,
        { lat: clienteLat, lng: clienteLng }
      ]);
    }

    // ✅ NUEVO: Zoom automático para ver ambas ubicaciones
    if (ubicacionMapa) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(currentPosition);
      bounds.extend({ lat: clienteLat, lng: clienteLng });

      // Ajustar zoom para que quepan ambas ubicaciones con padding
      ubicacionMapa.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }
}

// ========== VALIDACIÓN DE DISTANCIA ==========

/**
 * Verifica si el dispositivo está dentro del círculo de validación
 */
function verificarDistancia() {
  const clienteLat = parseFloat(document.getElementById('latitud').value);
  const clienteLng = parseFloat(document.getElementById('longitud').value);

  // Si no hay posición actual o datos incompletos
  if (!currentPosition || isNaN(clienteLat) || isNaN(clienteLng)) {
    enviarBtn.disabled = true;
    enviarBtn.title = 'Completa cliente, unidad y ubicación';
    enviarBtn.style.opacity = '0.5';
    return;
  }

  // Calcular distancia usando la fórmula de Haversine
  const distancia = Helpers.calculateDistance(
    currentPosition.lat,
    currentPosition.lng,
    clienteLat,
    clienteLng
  );

  console.log(`📏 Distancia al cliente: ${distancia.toFixed(2)}m (máximo: ${MAX_DISTANCE}m)`);

  // Actualizar la línea de distancia visualmente
  actualizarLineaDistancia();

  // Determinar si está dentro del círculo
  if (distancia > MAX_DISTANCE) {
    enviarBtn.disabled = true;
    enviarBtn.style.opacity = '0.5';
    enviarBtn.title = `⚠️ Estás a ${Math.round(distancia)}m del cliente (máximo ${MAX_DISTANCE}m)`;

    // Cambiar color del círculo para indicar que está fuera
    if (clienteCircle) {
      clienteCircle.setOptions({
        fillColor: '#ff3333',
        strokeColor: '#ff3333',
        fillOpacity: 0.15
      });
    }

    console.warn(`❌ Fuera del rango: ${distancia.toFixed(2)}m > ${MAX_DISTANCE}m`);
  } else {
    enviarBtn.disabled = false;
    enviarBtn.style.opacity = '1';
    enviarBtn.title = `✅ Estás a ${Math.round(distancia)}m - ¡Listo para enviar!`;

    // Cambiar color del círculo para indicar que está dentro
    if (clienteCircle) {
      clienteCircle.setOptions({
        fillColor: '#00ff00',
        strokeColor: '#00ff00',
        fillOpacity: 0.15
      });
    }

    console.log(`✅ Dentro del rango: ${distancia.toFixed(2)}m ≤ ${MAX_DISTANCE}m`);
  }
}

/**
 * Actualiza las coordenadas del cliente en el mapa cuando se selecciona una unidad
 */
function actualizarClienteMapa(lat, lng) {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
    const clientePosition = { lat: parsedLat, lng: parsedLng };

    console.log(`📍 Actualizando posición del cliente:`, clientePosition);

    // Actualizar marcador si existe
    if (clienteMarker) clienteMarker.setPosition(clientePosition);

    // Actualizar círculo de validación si existe
    if (clienteCircle) clienteCircle.setCenter(clientePosition);

    // Centrar mapa en el cliente si existe
    if (ubicacionMapa) {
      ubicacionMapa.setCenter(clientePosition);

      // Ajustar zoom para ver ambos marcadores
      const bounds = new google.maps.LatLngBounds();
      if (currentPosition) {
        bounds.extend(new google.maps.LatLng(currentPosition.lat, currentPosition.lng));
      }
      bounds.extend(new google.maps.LatLng(parsedLat, parsedLng));
      ubicacionMapa.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }

    // Actualizar línea de distancia visualmente
    actualizarLineaDistancia();

    // Verificar distancia
    verificarDistancia();

    // Centrar mapa en el cliente
    ubicacionMapa.setCenter(clientePosition);

    // Ajustar zoom para ver ambos marcadores
    const bounds = new google.maps.LatLngBounds();
    if (currentPosition) {
      bounds.extend(new google.maps.LatLng(currentPosition.lat, currentPosition.lng));
    }
    bounds.extend(new google.maps.LatLng(parsedLat, parsedLng));
    ubicacionMapa.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });

    // Actualizar línea de distancia
    actualizarLineaDistancia();

    // Verificar distancia
    verificarDistancia();
  }
}

// ========== DESPLEGABLES Y SELECCIONES ==========

/**
 * Carga la lista de clientes y prepara los desplegables
 */
async function populateDropdowns() {
  const clienteDropdown = document.getElementById('buscarCliente');
  const unidadDropdown = document.getElementById('buscarUnidad');

  if (!clienteDropdown || !unidadDropdown) {
    console.error('❌ Elementos del formulario no encontrados');
    return;
  }

  try {
    // Si está offline, intentar cargar de almacenamiento local
    if (!navigator.onLine) {
      console.warn('⚠️ Sin conexión - cargando datos locales');
      const clientesLocales = Helpers.getStorage('clientesCache') || [];
      if (clientesLocales.length > 0) {
        clienteDropdown.innerHTML = '<option value="">Seleccionar Cliente</option>';
        clientesLocales.forEach(clienteId => {
          const opt = document.createElement('option');
          opt.value = clienteId;
          opt.textContent = clienteId;
          clienteDropdown.appendChild(opt);
        });
        console.log(`✅ ${clientesLocales.length} clientes cargados del caché`);
      }
      return;
    }

    window.loadingSystem.show('Cargando clientes...');

    console.log('🔍 Consultando colección CLIENTES desde Firebase...');
    const snapshot = await window.firebaseDB.collection('CLIENTES').get();

    console.log(`📊 Total documentos encontrados: ${snapshot.size}`);

    clienteDropdown.innerHTML = '<option value="">Seleccionar Cliente</option>';
    unidadDropdown.innerHTML = '<option value="">Seleccionar Unidad</option>';
    unidadDropdown.disabled = true;

    if (snapshot.empty) {
      console.error('❌ La colección CLIENTES está vacía');
      window.notificationSystem.warning('No se encontraron clientes. Verifica tu conexión.');
      window.loadingSystem.hide();
      return;
    }

    let clientesValidos = [];

    snapshot.forEach((doc) => {
      const clienteId = doc.id;
      console.log(`✅ Cliente encontrado: ${clienteId}`);

      const opt = document.createElement('option');
      opt.value = clienteId;
      opt.textContent = clienteId;
      clienteDropdown.appendChild(opt);

      clientesValidos.push(clienteId);
    });

    // Guardar en caché para acceso offline
    Helpers.setStorage('clientesCache', clientesValidos);
    console.log(`✨ ${clientesValidos.length} clientes válidos cargados y cacheados`);

    // Evento para cargar unidades cuando se selecciona un cliente
    clienteDropdown.addEventListener('change', async () => {
      const selectedClienteId = clienteDropdown.value;
      console.log(`👤 Cliente seleccionado: ${selectedClienteId}`);

      // Guardar selección
      Helpers.setStorage('ultimoCliente', selectedClienteId);

      unidadDropdown.innerHTML = '<option value="">Seleccionar Unidad</option>';

      // Limpiar datos del cliente
      document.getElementById('latitud').value = '';
      document.getElementById('longitud').value = '';
      actualizarClienteMapa(null, null);

      if (!selectedClienteId) {
        unidadDropdown.disabled = true;
        return;
      }

      try {
        window.loadingSystem.show('Cargando unidades...');
        console.log(`🔍 Consultando: CLIENTES/${selectedClienteId}/UNIDADES`);

        const unidadesSnapshot = await window.firebaseDB
          .collection(`CLIENTES/${selectedClienteId}/UNIDADES`)
          .get();

        console.log(`📊 Unidades encontradas: ${unidadesSnapshot.size}`);

        if (unidadesSnapshot.empty) {
          console.warn(`⚠️ El cliente ${selectedClienteId} no tiene unidades`);
          window.notificationSystem.warning('Este cliente no tiene unidades registradas');
          window.loadingSystem.hide();
          return;
        }

        unidadesSnapshot.forEach((unidadDoc) => {
          const unidadId = unidadDoc.id;
          console.log(`✅ Unidad encontrada: ${unidadId}`);

          const opt = document.createElement('option');
          opt.value = unidadId;
          opt.textContent = unidadId;
          unidadDropdown.appendChild(opt);
        });

        unidadDropdown.disabled = false;
        console.log('✨ Dropdown de unidades habilitado');
        window.loadingSystem.hide();
      } catch (error) {
        window.loadingSystem.hide();
        console.error('❌ Error al cargar unidades:', error);
        window.notificationSystem.error('Error: ' + error.message);
      }
    });

  } catch (error) {
    console.error('❌ Error cargando clientes:', error);
    window.notificationSystem.error('Error al cargar clientes: ' + error.message);
  } finally {
    window.loadingSystem.hide();
  }
}

/**
 * Cargar datos de la unidad seleccionada
 */
document.addEventListener('DOMContentLoaded', () => {
  const unidadDropdown = document.getElementById('buscarUnidad');

  unidadDropdown?.addEventListener('change', async () => {
    const clienteId = document.getElementById('buscarCliente').value;
    const unidadId = unidadDropdown.value;

    // Guardar selección
    if (unidadId) {
      Helpers.setStorage('ultimaUnidad', unidadId);
    }

    console.log(`📍 Unidad seleccionada - Cliente: ${clienteId}, Unidad: ${unidadId}`);

    if (!clienteId || !unidadId) {
      document.getElementById('latitud').value = '';
      document.getElementById('longitud').value = '';
      actualizarClienteMapa(null, null);
      return;
    }

    try {
      window.loadingSystem.show('Cargando datos de la unidad...');
      console.log(`🔍 Obteniendo: CLIENTES/${clienteId}/UNIDADES/${unidadId}`);

      const unidadDoc = await window.firebaseDB
        .doc(`CLIENTES/${clienteId}/UNIDADES/${unidadId}`)
        .get();

      if (unidadDoc.exists) {
        const unidadData = unidadDoc.data();
        console.log('📊 Datos de unidad obtenidos:', unidadData);

        const lat = unidadData.latitud || '';
        const lng = unidadData.longitud || '';

        document.getElementById('latitud').value = lat;
        document.getElementById('longitud').value = lng;


        console.log(`📍 Coordenadas: ${lat}, ${lng}`);

        // Actualizar mapa con nueva ubicación del cliente
        actualizarClienteMapa(lat, lng);

        window.loadingSystem.hide();
        console.log('✅ Datos de unidad cargados correctamente');
      } else {
        window.loadingSystem.hide();
        console.warn('⚠️ El documento de la unidad no existe');
        window.notificationSystem.error('No se encontraron datos de la unidad');
      }
    } catch (error) {
      window.loadingSystem.hide();
      console.error('❌ Error al cargar unidad:', error);
      window.notificationSystem.error('Error: ' + error.message);
    }
  });
});

// ========== TIPO DE TAREA ==========

function cargarTipoDeTarea() {
  const tipoDeTarea = Helpers.getStorage('tipoDeTarea');
  if (tipoDeTarea) {
    document.getElementById('tipoTarea').value = tipoDeTarea;
  }
}

// ========== BOTONES ==========

cancelarBtn.addEventListener('click', () => {
  window.notificationSystem.confirm(
    '¿Descartar cambios y volver?',
    () => {
      window.location.href = 'menu.html';
    }
  );
});

// ========== MANEJO DE ENVÍO Y OFFLINE QUEUE ==========

enviarBtn.addEventListener('click', async () => {
  // 1. Recopilar datos
  const clienteId = document.getElementById('buscarCliente').value;
  const unidadId = document.getElementById('buscarUnidad').value;
  const tipoTarea = document.getElementById('tipoTarea').value;
  const latitudCliente = document.getElementById('latitud').value;
  const longitudCliente = document.getElementById('longitud').value;

  // 2. Validaciones básicas
  if (!clienteId || !unidadId || !tipoTarea || !latitudCliente || !longitudCliente) {
    window.notificationSystem.error('Por favor completa todos los campos');
    return;
  }

  if (!currentPosition) {
    window.notificationSystem.error('No se puede obtener tu ubicación');
    return;
  }

  const distancia = Helpers.calculateDistance(
    currentPosition.lat,
    currentPosition.lng,
    parseFloat(latitudCliente),
    parseFloat(longitudCliente)
  );

  if (distancia > MAX_DISTANCE) {
    window.notificationSystem.error(`Debes estar a menos de ${MAX_DISTANCE}m del cliente`);
    return;
  }

  // 3. Preparar objeto de tarea
  window.loadingSystem.show('Guardando tarea...');
  enviarBtn.disabled = true;

  try {
    const user = window.firebaseAuth.currentUser;
    const tarea = {
      clienteId,
      unidadId,
      userId: user.uid,
      userEmail: user.email,
      tipoTarea,
      latitudCliente: parseFloat(latitudCliente),
      longitudCliente: parseFloat(longitudCliente),
      latitudUsuario: currentPosition.lat,
      longitudUsuario: currentPosition.lng,
      distancia: Math.round(distancia),
      estado: 'pendiente',
      fecha: Helpers.formatDate(),
      hora: Helpers.formatTime(),
      createdAt: new Date().toISOString()
    };

    // 4. Lógica Offline/Online
    if (!navigator.onLine) {
      console.log('⚠️ Detectado MODO OFFLINE. Guardando en cola...');

      await window.offlineQueue.addToQueue({
        type: 'form',
        collection: 'tareas',
        data: tarea
      });

      window.loadingSystem.hide();
      window.notificationSystem.success('Guardado OFFLINE. Se sincronizará al tener internet.');

      // Simular éxito visualmente
      setTimeout(() => {
        window.location.href = 'menu.html';
      }, 2000);

    } else {
      // Enviar directo a Firebase
      console.log('🌐 Conexión disponible. Enviando directo...');
      const docRef = await window.firebaseDB.collection('tareas').add(tarea);

      window.loadingSystem.hide();
      window.notificationSystem.success(`Tarea enviada: ${docRef.id}`);

      setTimeout(() => {
        window.location.href = 'menu.html';
      }, 1500);
    }

  } catch (error) {
    window.loadingSystem.hide();
    enviarBtn.disabled = false;
    console.error('❌ Error al guardar:', error);
    window.notificationSystem.error('Error al guardar: ' + error.message);
  }
});

emergencyBtn.addEventListener('click', () => {
  window.notificationSystem.confirm(
    'Recargar todos los datos y permisos',
    () => {
      window.loadingSystem.show('Recargando...');

      // Limpiar y reinicializar
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      setTimeout(() => {
        inicializar();
        window.loadingSystem.hide();
        window.notificationSystem.success('Datos recargados');
      }, 1000);
    }
  );
});

// ========== MONITOR DE CONEXIÓN ==========

Helpers.onConnectionChange((isOnline) => {
  if (isOnline) {
    window.notificationSystem.success('Conexión restaurada', 'success', 3000);
  } else {
    window.notificationSystem.warning('Sin conexión a internet', 'warning', 0);
  }
});

// ========== LIMPIAR RECURSOS AL DESCARGAR ==========

window.addEventListener('beforeunload', () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
});
