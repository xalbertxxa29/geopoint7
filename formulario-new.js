/**
 * Formulario.js - Gestión del Formulario de Tareas con Leaflet
 */

// Variables globales
let formMap = null;
let formMarker = null;        // Marcador del CLIENTE/UNIDAD
let userLocationMarker = null; // Marcador del USUARIO
let rangeCircle = null;       // Círculo de rango
let distancePolyline = null;  // Línea de distancia
let currentPosition = null;

const DEFAULT_LOCATION = [-12.177364138937, -77.01657306103841];
const MAX_DISTANCE_METERS = 100;

// ========== INICIALIZACIÓN ==========

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Formulario] Inicializando...');

  // Verificar autenticación
  window.firebaseAuth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Mostrar información del usuario
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    const fechaElement = document.getElementById('fecha');

    if (userNameElement) userNameElement.textContent = user.displayName || 'Usuario';
    if (userEmailElement) userEmailElement.textContent = user.email;
    if (fechaElement) fechaElement.textContent = new Date().toLocaleDateString('es-ES');

    // Inicializar componentes
    initMenu();
    initLogout();
    await cargarClientes();
    initFormButtons();
    getUserLocation();
  });
});

// ========== MENÚ LATERAL ==========

function initMenu() {
  const menuBtn = document.getElementById('menu-btn');
  const sideMenu = document.getElementById('side-menu');
  const overlay = document.createElement('div');
  overlay.classList.add('overlay');
  document.body.appendChild(overlay);

  if (!menuBtn || !sideMenu) return;

  menuBtn.addEventListener('click', () => {
    sideMenu.classList.toggle('active');
    overlay.classList.toggle('active');
  });

  overlay.addEventListener('click', () => {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
  });
}

// ========== LOGOUT ==========

function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');

  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    if (window.notificationSystem) {
      window.notificationSystem.confirm(
        '¿Deseas cerrar sesión?',
        async () => {
          try {
            if (window.loadingSystem) window.loadingSystem.show('Cerrando sesión...');
            await window.firebaseAuth.signOut();
            window.location.href = 'index.html';
          } catch (error) {
            if (window.loadingSystem) window.loadingSystem.hide();
            if (window.notificationSystem) window.notificationSystem.error('Error: ' + error.message);
          }
        }
      );
    }
  });
}

// ========== BOTONES DEL FORMULARIO ==========

function initFormButtons() {
  const cancelarBtn = document.getElementById('cancelar');
  const enviarBtn = document.getElementById('enviar');

  if (cancelarBtn) {
    cancelarBtn.addEventListener('click', () => {
      if (window.notificationSystem) {
        window.notificationSystem.confirm(
          '¿Descartar cambios y volver?',
          () => {
            window.location.href = 'menu.html';
          }
        );
      }
    });
  }

  if (enviarBtn) {
    enviarBtn.addEventListener('click', handleSubmit);
  }
}

// ========== GEOLOCALIZACIÓN Y VALIDACIÓN ==========

function getUserLocation() {
  if (!navigator.geolocation) {
    useDefaultLocation();
    return;
  }

  navigator.geolocation.watchPosition(
    (position) => {
      currentPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Asegurar que el mapa existe
      if (!formMap) {
        initFormMap(currentPosition.lat, currentPosition.lng);
      }

      updateUserMarker(currentPosition.lat, currentPosition.lng);
      validateDistance();
    },
    (error) => {
      console.warn('[Form] Error GPS:', error);
      useDefaultLocation();
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000 // 10 segundos timeout para forzar el fallback
    }
  );
}

function useDefaultLocation() {
  currentPosition = { lat: DEFAULT_LOCATION[0], lng: DEFAULT_LOCATION[1] };

  if (!formMap) {
    initFormMap(currentPosition.lat, currentPosition.lng);
  }

  updateUserMarker(currentPosition.lat, currentPosition.lng);
  validateDistance();
}

function updateUserMarker(lat, lng) {
  if (!formMap) return;

  const newLatLng = [lat, lng];

  if (userLocationMarker) {
    userLocationMarker.setLatLng(newLatLng);
  } else {
    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `<div style="font-size: 2rem; filter: drop-shadow(0 0 5px #00ff64);">🔵</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    userLocationMarker = L.marker(newLatLng, { icon: userIcon }).addTo(formMap);
    userLocationMarker.bindPopup("Tu ubicación actual");
  }
}

// ========== MAPA DE LEAFLET ==========

function initFormMap(lat, lng) {
  const mapContainer = document.getElementById('ubicaciones-mapa');
  if (!mapContainer) return;

  try {
    if (formMap) {
      formMap.remove();
      formMap = null;
    }

    formMap = L.map('ubicaciones-mapa', {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(formMap);

    L.control.zoom({ position: 'bottomright' }).addTo(formMap);

    // Marcador por defecto (se actualizará al cargar unidad)
    const destIcon = L.divIcon({
      className: 'dest-marker',
      html: `<div style="font-size: 2.5rem; filter: drop-shadow(0 0 10px #ff0055);">📍</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });

    formMarker = L.marker([lat, lng], { icon: destIcon }).addTo(formMap);

    rangeCircle = L.circle([lat, lng], {
      radius: MAX_DISTANCE_METERS,
      color: '#ff0055',
      fillColor: '#ff0055',
      fillOpacity: 0.1,
      weight: 1
    }).addTo(formMap);

    // Línea de distancia
    distancePolyline = L.polyline([], {
      color: 'white',
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 10'
    }).addTo(formMap);

    if (currentPosition) {
      updateUserMarker(currentPosition.lat, currentPosition.lng);
      validateDistance();
    }

  } catch (error) {
    console.error('[Form Map] Error:', error);
  }
}

function updateFormMapLocation(lat, lng) {
  if (!formMap) {
    initFormMap(lat, lng);
    return;
  }

  const newLatLng = [lat, lng];

  // Animar vista para mostrar ambos puntos
  if (currentPosition) {
    const bounds = L.latLngBounds([
      [currentPosition.lat, currentPosition.lng],
      newLatLng
    ]);
    formMap.fitBounds(bounds, { padding: [50, 50] });
  } else {
    formMap.setView(newLatLng, 16);
  }

  if (formMarker) {
    formMarker.setLatLng(newLatLng);
    formMarker.setPopupContent(`
        <div style="background:#0a0e27; color:#00d4ff; padding:10px; border-radius:10px; text-align:center;">
          <strong>📍 Destino</strong><br>
          <span style="font-size:0.8rem;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
        </div>
      `);
  }

  if (rangeCircle) rangeCircle.setLatLng(newLatLng);

  validateDistance();
}

function validateDistance() {
  const enviarBtn = document.getElementById('enviar');
  const latDest = parseFloat(document.getElementById('latitud').value);
  const lngDest = parseFloat(document.getElementById('longitud').value);

  if (!currentPosition || isNaN(latDest) || isNaN(lngDest)) {
    if (distancePolyline) distancePolyline.setLatLngs([]);
    if (enviarBtn) {
      enviarBtn.disabled = true;
      enviarBtn.textContent = "ESPERANDO UBICACIÓN...";
      enviarBtn.style.opacity = 0.5;
      enviarBtn.style.background = "gray";
    }
    return;
  }

  const from = L.latLng(currentPosition.lat, currentPosition.lng);
  const to = L.latLng(latDest, lngDest);
  const distance = from.distanceTo(to);

  // Actualizar línea
  if (distancePolyline) {
    distancePolyline.setLatLngs([from, to]);

    // Color según distancia
    if (distance <= MAX_DISTANCE_METERS) {
      distancePolyline.setStyle({ color: '#00ff64' });
    } else {
      distancePolyline.setStyle({ color: '#ff0055' });
    }
  }

  if (distance <= MAX_DISTANCE_METERS) {
    if (rangeCircle) rangeCircle.setStyle({ color: '#00ff64', fillColor: '#00ff64' });
    if (enviarBtn) {
      enviarBtn.disabled = false;
      enviarBtn.textContent = "SIGUIENTE";
      enviarBtn.style.opacity = 1;
      enviarBtn.style.background = "linear-gradient(45deg, #00ff64, #00cc50)";
    }
  } else {
    if (rangeCircle) rangeCircle.setStyle({ color: '#ff0055', fillColor: '#ff0055' });
    if (enviarBtn) {
      enviarBtn.disabled = true;
      enviarBtn.textContent = `ACÉRCATE AL LOCAL (${Math.round(distance)}m)`;
      enviarBtn.style.opacity = 0.5;
      enviarBtn.style.background = "gray";
    }
  }
}

// ========== CARGAR CLIENTES ==========

async function cargarClientes() {
  const clienteDropdown = document.getElementById('buscarCliente');
  const unidadDropdown = document.getElementById('buscarUnidad');

  if (!clienteDropdown || !unidadDropdown) {
    console.error('❌ Elementos del formulario no encontrados');
    return;
  }

  try {
    if (window.loadingSystem) window.loadingSystem.show('Cargando clientes...');

    console.log('🔍 Consultando colección CLIENTES desde Firebase...');
    const snapshot = await window.firebaseDB.collection('CLIENTES').get();

    console.log(`📊 Total documentos encontrados: ${snapshot.size}`);

    clienteDropdown.innerHTML = '<option value="">Seleccionar Cliente</option>';
    unidadDropdown.innerHTML = '<option value="">Seleccionar Unidad</option>';
    unidadDropdown.disabled = true;

    if (snapshot.empty) {
      console.error('❌ La colección CLIENTES está vacía');
      if (window.notificationSystem) window.notificationSystem.warning('No se encontraron clientes');
      if (window.loadingSystem) window.loadingSystem.hide();
      return;
    }

    snapshot.forEach((doc) => {
      const clienteId = doc.id;
      const opt = document.createElement('option');
      opt.value = clienteId;
      opt.textContent = clienteId;
      clienteDropdown.appendChild(opt);
    });

    // Evento para cargar unidades cuando se selecciona un cliente
    clienteDropdown.addEventListener('change', async () => {
      const selectedClienteId = clienteDropdown.value;
      console.log(`👤 Cliente seleccionado: ${selectedClienteId}`);

      unidadDropdown.innerHTML = '<option value="">Seleccionar Unidad</option>';
      document.getElementById('latitud').value = '';
      document.getElementById('longitud').value = '';

      if (!selectedClienteId) {
        unidadDropdown.disabled = true;
        return;
      }

      try {
        if (window.loadingSystem) window.loadingSystem.show('Cargando unidades...');

        const unidadesSnapshot = await window.firebaseDB
          .collection(`CLIENTES/${selectedClienteId}/UNIDADES`)
          .get();

        console.log(`📊 Unidades encontradas: ${unidadesSnapshot.size}`);

        if (unidadesSnapshot.empty) {
          console.warn(`⚠️ El cliente ${selectedClienteId} no tiene unidades`);
          if (window.notificationSystem) window.notificationSystem.warning('Este cliente no tiene unidades registradas');
          if (window.loadingSystem) window.loadingSystem.hide();
          return;
        }

        unidadesSnapshot.forEach((unidadDoc) => {
          const unidadId = unidadDoc.id;
          const opt = document.createElement('option');
          opt.value = unidadId;
          opt.textContent = unidadId;
          unidadDropdown.appendChild(opt);
        });

        unidadDropdown.disabled = false;
        if (window.loadingSystem) window.loadingSystem.hide();
      } catch (error) {
        if (window.loadingSystem) window.loadingSystem.hide();
        console.error('❌ Error al cargar unidades:', error);
        if (window.notificationSystem) window.notificationSystem.error('Error: ' + error.message);
      }
    });

    // Evento para cargar datos de la unidad seleccionada
    unidadDropdown.addEventListener('change', async () => {
      const clienteId = clienteDropdown.value;
      const unidadId = unidadDropdown.value;

      if (!clienteId || !unidadId) {
        document.getElementById('latitud').value = '';
        document.getElementById('longitud').value = '';
        return;
      }

      try {
        if (window.loadingSystem) window.loadingSystem.show('Cargando datos de la unidad...');

        const unidadDoc = await window.firebaseDB
          .doc(`CLIENTES/${clienteId}/UNIDADES/${unidadId}`)
          .get();

        if (unidadDoc.exists) {
          const unidadData = unidadDoc.data();
          const lat = unidadData.latitud || '';
          const lng = unidadData.longitud || '';

          document.getElementById('latitud').value = lat;
          document.getElementById('longitud').value = lng;

          // Actualizar mapa con la ubicación de la unidad
          if (lat && lng) {
            updateFormMapLocation(parseFloat(lat), parseFloat(lng));
          }

          if (window.loadingSystem) window.loadingSystem.hide();
        } else {
          if (window.loadingSystem) window.loadingSystem.hide();
          if (window.notificationSystem) window.notificationSystem.error('No se encontraron datos de la unidad');
        }
      } catch (error) {
        if (window.loadingSystem) window.loadingSystem.hide();
        console.error('❌ Error al cargar unidad:', error);
        if (window.notificationSystem) window.notificationSystem.error('Error: ' + error.message);
      }
    });

    if (window.loadingSystem) window.loadingSystem.hide();
  } catch (error) {
    console.error('❌ Error cargando clientes:', error);
    if (window.notificationSystem) window.notificationSystem.error('Error al cargar clientes: ' + error.message);
    if (window.loadingSystem) window.loadingSystem.hide();
  }
}

// ========== ENVIAR FORMULARIO ==========

// Nota: handleSubmit ya fue redefinido arriba en el bloque de reemplazo grande.
// Nos aseguramos que no haya duplicados ni lógica vieja.
// Esta sección reemplaza la función antigua handleSubmit.

// (Si el bloque anterior ya cubrió esto, esto es solo por seguridad para limpiar residuos)
async function handleSubmit() {
  const clienteId = document.getElementById('buscarCliente').value;
  const unidadId = document.getElementById('buscarUnidad').value;
  const latitudCliente = document.getElementById('latitud').value;
  const longitudCliente = document.getElementById('longitud').value;

  // Validaciones
  if (!clienteId || !unidadId || !latitudCliente || !longitudCliente) {
    if (window.notificationSystem) window.notificationSystem.error('Por favor completa todos los campos');
    return;
  }

  if (!currentPosition) {
    if (window.notificationSystem) window.notificationSystem.error('No se puede obtener tu ubicación');
    return;
  }

  try {
    if (window.loadingSystem) window.loadingSystem.show('Guardando tarea...');

    const user = window.firebaseAuth.currentUser;
    const tarea = {
      cliente: clienteId,
      unidad: unidadId,
      userId: user.uid,
      userEmail: user.email,
      ubicacion: {
        latitude: parseFloat(latitudCliente),
        longitude: parseFloat(longitudCliente)
      },
      ubicacionUsuario: {
        latitude: currentPosition.lat,
        longitude: currentPosition.lng
      },
      estado: 'pendiente',
      fecha: new Date().toISOString(),
      createdAt: new Date()
    };

    await window.firebaseDB.collection('tareas').add(tarea);

    if (window.loadingSystem) window.loadingSystem.hide();
    if (window.notificationSystem) window.notificationSystem.success('Tarea guardada exitosamente');

    setTimeout(() => {
      window.location.href = 'tareas.html';
    }, 1500);
  } catch (error) {
    if (window.loadingSystem) window.loadingSystem.hide();
    console.error('❌ Error al guardar tarea:', error);
    if (window.notificationSystem) window.notificationSystem.error('Error al guardar: ' + error.message);
  }
}
