/**
 * Map Manager con Leaflet
 * Sistema de mapas gratuito con OpenStreetMap
 */

class MapManager {
  constructor() {
    this.map = null;
    this.userMarker = null;
    this.taskMarkers = [];
    this.polylines = [];
    this.userLocation = null;

    // Iconos personalizados
    this.userIcon = this.createCustomIcon('📍', '#00ff64');
    this.taskIcon = this.createCustomIcon('📌', '#00d4ff');
    this.completedIcon = this.createCustomIcon('✅', '#6bcf7f');
  }

  /**
   * Crear icono personalizado con emoji
   */
  createCustomIcon(emoji, color) {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          font-size: 2rem;
          text-align: center;
          filter: drop-shadow(0 0 10px ${color});
          animation: markerPulse 2s ease-in-out infinite;
        ">${emoji}</div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  }

  /**
   * Inicializar mapa
   */
  initMap(containerId, options = {}) {
    const defaultOptions = {
      center: [-12.17728023948694, -77.01656233220194], // Lima, Perú (ubicación específica)
      zoom: 13,
      zoomControl: true,
      ...options
    };

    // Crear mapa
    this.map = L.map(containerId, {
      center: defaultOptions.center,
      zoom: defaultOptions.zoom,
      zoomControl: defaultOptions.zoomControl,
      attributionControl: false
    });

    // Agregar capa de OpenStreetMap con tema oscuro
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    // Agregar controles personalizados
    this.addCustomControls();

    // Obtener ubicación del usuario
    this.getUserLocation();

    return this.map;
  }

  /**
   * Agregar controles personalizados
   */
  addCustomControls() {
    // Control de zoom personalizado
    L.control.zoom({
      position: 'bottomright',
      zoomInTitle: 'Acercar',
      zoomOutTitle: 'Alejar'
    }).addTo(this.map);

    // Botón de ubicación
    const locationButton = L.control({ position: 'bottomright' });
    locationButton.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      div.innerHTML = `
        <a href="#" class="location-btn" title="Mi ubicación" style="
          background: linear-gradient(135deg, #00d4ff, #00ffff);
          color: #0a0e27;
          font-size: 1.2rem;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border-radius: 4px;
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
        ">📍</a>
      `;

      div.onclick = (e) => {
        e.preventDefault();
        this.centerOnUser();
      };

      return div;
    };
    locationButton.addTo(this.map);
  }

  /**
   * Obtener ubicación del usuario
   */
  getUserLocation() {
    // Ubicación por defecto (Lima, Perú - coordenadas específicas del usuario)
    const defaultLocation = [-12.17728023948694, -77.01656233220194];

    if (!navigator.geolocation) {
      console.warn('Geolocalización no soportada, usando ubicación por defecto');
      this.userLocation = defaultLocation;
      this.map.setView(this.userLocation, 15);
      this.addUserMarker(this.userLocation);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.userLocation = [latitude, longitude];

        // Centrar mapa en usuario
        this.map.setView(this.userLocation, 15);

        // Agregar marcador de usuario
        this.addUserMarker(this.userLocation);

        // Agregar círculo de precisión
        L.circle(this.userLocation, {
          radius: position.coords.accuracy,
          color: '#00ff64',
          fillColor: '#00ff64',
          fillOpacity: 0.1,
          weight: 2
        }).addTo(this.map);

        console.log('[Map] Ubicación GPS obtenida:', this.userLocation);
      },
      (error) => {
        console.warn('[Map] Error obteniendo ubicación GPS, usando ubicación por defecto:', error.message);

        // Usar ubicación por defecto si falla el GPS
        this.userLocation = defaultLocation;
        this.map.setView(this.userLocation, 15);
        this.addUserMarker(this.userLocation);

        window.notificationSystem?.warning('Usando ubicación por defecto (GPS no disponible)');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Seguir ubicación en tiempo real (solo si se obtuvo GPS exitosamente)
    navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.userLocation = [latitude, longitude];
        this.updateUserMarker(this.userLocation);
      },
      (error) => {
        console.warn('[Map] Error en watchPosition:', error.message);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }

  /**
   * Agregar marcador de usuario
   */
  addUserMarker(location) {
    if (this.userMarker) {
      this.userMarker.setLatLng(location);
    } else {
      this.userMarker = L.marker(location, { icon: this.userIcon })
        .addTo(this.map)
        .bindPopup(`
          <div style="
            background: linear-gradient(135deg, #1a1e3a, #0a0e27);
            color: #00d4ff;
            padding: 10px;
            border-radius: 8px;
            border: 2px solid #00d4ff;
            text-align: center;
          ">
            <strong>📍 Tu ubicación</strong>
          </div>
        `);
    }
  }

  /**
   * Actualizar marcador de usuario
   */
  updateUserMarker(location) {
    if (this.userMarker) {
      this.userMarker.setLatLng(location);
    }
  }

  /**
   * Centrar mapa en usuario
   */
  centerOnUser() {
    if (this.userLocation) {
      this.map.setView(this.userLocation, 16, {
        animate: true,
        duration: 1
      });
    } else {
      window.notificationSystem?.warning('Ubicación no disponible');
    }
  }

  /**
   * Agregar marcador de tarea
   */
  addTaskMarker(task) {
    if (!task.ubicacion) return;

    const location = [task.ubicacion.latitude, task.ubicacion.longitude];
    const icon = task.estado === 'completada' ? this.completedIcon : this.taskIcon;

    const marker = L.marker(location, { icon })
      .addTo(this.map)
      .bindPopup(`
        <div style="
          background: linear-gradient(135deg, #1a1e3a, #0a0e27);
          color: #00d4ff;
          padding: 15px;
          border-radius: 10px;
          border: 2px solid #00d4ff;
          min-width: 200px;
        ">
          <h3 style="margin: 0 0 10px 0; color: #00ffff; font-size: 1.1rem;">
            ${task.tipoTarea || 'Tarea'}
          </h3>
          <p style="margin: 5px 0; color: #a0a0cc;">
            <strong>Cliente:</strong> ${task.cliente || 'N/A'}
          </p>
          <p style="margin: 5px 0; color: #a0a0cc;">
            <strong>Unidad:</strong> ${task.unidad || 'N/A'}
          </p>
          <p style="margin: 5px 0; color: #a0a0cc;">
            <strong>Estado:</strong> 
            <span style="color: ${this.getStatusColor(task.estado)};">
              ${task.estado || 'pendiente'}
            </span>
          </p>
          ${task.distancia ? `
            <p style="margin: 5px 0; color: #00ff64;">
              <strong>📏 Distancia:</strong> ${Math.round(task.distancia)}m
            </p>
          ` : ''}
        </div>
      `);

    this.taskMarkers.push({ id: task.id, marker });

    // Dibujar línea si hay ubicación de usuario
    if (this.userLocation) {
      this.drawPolyline(this.userLocation, location, task.estado);
    }

    return marker;
  }

  /**
   * Dibujar línea entre dos puntos
   */
  drawPolyline(start, end, status = 'pendiente') {
    const colors = {
      'pendiente': '#ff6b6b',
      'iniciada': '#ffd93d',
      'completada': '#6bcf7f'
    };

    const polyline = L.polyline([start, end], {
      color: colors[status] || '#00d4ff',
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 10',
      className: 'task-polyline'
    }).addTo(this.map);

    this.polylines.push(polyline);

    return polyline;
  }

  /**
   * Limpiar marcadores de tareas
   */
  clearTaskMarkers() {
    this.taskMarkers.forEach(({ marker }) => {
      this.map.removeLayer(marker);
    });
    this.taskMarkers = [];

    this.polylines.forEach(polyline => {
      this.map.removeLayer(polyline);
    });
    this.polylines = [];
  }

  /**
   * Calcular distancia entre dos puntos
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  }

  /**
   * Obtener color según estado
   */
  getStatusColor(status) {
    const colors = {
      'pendiente': '#ff6b6b',
      'iniciada': '#ffd93d',
      'completada': '#6bcf7f'
    };
    return colors[status] || '#00d4ff';
  }

  /**
   * Ajustar vista para mostrar todos los marcadores
   */
  fitBounds() {
    if (this.taskMarkers.length === 0) return;

    const bounds = L.latLngBounds(
      this.taskMarkers.map(({ marker }) => marker.getLatLng())
    );

    if (this.userLocation) {
      bounds.extend(this.userLocation);
    }

    this.map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// Instancia global
window.mapManager = new MapManager();

// Estilos CSS para animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes markerPulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
  
  .leaflet-container {
    background: #0a0e27 !important;
  }
  
  .leaflet-control-zoom a {
    background: linear-gradient(135deg, #1a1e3a, #0a0e27) !important;
    color: #00d4ff !important;
    border: 2px solid #00d4ff !important;
    box-shadow: 0 0 15px rgba(0, 212, 255, 0.3) !important;
  }
  
  .leaflet-control-zoom a:hover {
    background: linear-gradient(135deg, #00d4ff, #00ffff) !important;
    color: #0a0e27 !important;
  }
  
  .task-polyline {
    filter: drop-shadow(0 0 5px currentColor);
  }
  
  .leaflet-popup-content-wrapper {
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  
  .leaflet-popup-tip {
    background: #00d4ff !important;
  }
`;
document.head.appendChild(style);
