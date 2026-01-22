/**
 * Google Maps Integration - Soporte offline y sincronización
 * Basado en la lógica de BBVA3
 */

class MapManager {
  constructor() {
    this.map = null;
    this.meMarker = null;
    this.watchId = null;
    this.DEFAULT_CENTER = { lat: -12.05, lng: -77.05 }; // Lima, Perú
    this.isReady = false;
  }

  /**
   * Inicializar el mapa
   */
  initMap(elementId = 'map') {
    try {
      const mapElement = document.getElementById(elementId);
      if (!mapElement) {
        console.warn('Elemento del mapa no encontrado');
        return;
      }

      this.map = new google.maps.Map(mapElement, {
        center: this.DEFAULT_CENTER,
        zoom: 13,
        styles: this.getMapStyles()
      });

      this.isReady = true;
      console.log('Mapa inicializado exitosamente');

      // Ajustar al redimensionar
      window.addEventListener('resize', () => {
        if (this.map) {
          google.maps.event.trigger(this.map, 'resize');
          this.map.setCenter(this.DEFAULT_CENTER);
        }
      });

      // Iniciar GPS con primer toque
      document.addEventListener('pointerdown', () => this.startGPS(), { once: true });

      return this.map;
    } catch (error) {
      console.error('Error al inicializar mapa:', error);
      return null;
    }
  }

  /**
   * Estilos personalizados del mapa (tema oscuro)
   */
  getMapStyles() {
    return [
      { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#263c3f' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6b9080' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#38414e' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#212a37' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9ca5b3' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#746855' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1f2835' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#f3751b' }]
      },
      {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#2f3948' }]
      },
      {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#17263c' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#515c6d' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#17263c' }]
      }
    ];
  }

  /**
   * Colocar marcador en la ubicación actual
   */
  placeMarker(pos, title = 'Tu ubicación') {
    if (!pos || !this.map) return;

    if (!this.meMarker) {
      this.meMarker = new google.maps.Marker({
        map: this.map,
        position: pos,
        title: title,
        icon: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
        animation: google.maps.Animation.DROP
      });
    } else {
      this.meMarker.setPosition(pos);
    }

    this.map.setCenter(pos);
    this.map.setZoom(15);
  }

  /**
   * Obtener ubicación una sola vez (intento único con timeout)
   */
  async getLocationOnce(highAccuracy = true, timeout = 8000) {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        return reject(new Error('Geolocation no disponible'));
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          resolve(pos);
        },
        (error) => reject(error),
        {
          enableHighAccuracy: highAccuracy,
          maximumAge: 0,
          timeout: timeout
        }
      );
    });
  }

  /**
   * Iniciar monitoreo de ubicación en tiempo real
   */
  async startGPS() {
    try {
      // Intento con alta precisión
      const pos = await this.getLocationOnce(true, 8000);
      this.placeMarker(pos);
      console.log('GPS: Ubicación obtenida (alta precisión)');
    } catch (err) {
      console.warn('GPS: Reintentando con baja precisión...');
      try {
        // Reintento con baja precisión
        const pos = await this.getLocationOnce(false, 8000);
        this.placeMarker(pos);
        console.log('GPS: Ubicación obtenida (baja precisión)');
      } catch (err2) {
        console.warn('GPS: No se pudo obtener ubicación', err2);
        this.placeMarker(this.DEFAULT_CENTER, 'Ubicación por defecto');
      }
    }

    // Activar monitoreo continuo si está disponible
    if ('geolocation' in navigator) {
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
      }

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.placeMarker({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.warn('Error en watchPosition:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 12000
        }
      );
    }
  }

  /**
   * Detener monitoreo de GPS
   */
  stopGPS() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('GPS desactivado');
    }
  }

  /**
   * Agregar marcador personalizado al mapa
   */
  addMarker(position, options = {}) {
    if (!this.map) return null;

    const markerOptions = {
      map: this.map,
      position: position,
      title: options.title || 'Marcador',
      ...options
    };

    return new google.maps.Marker(markerOptions);
  }

  /**
   * Agregar círculo al mapa (para mostrar área de cobertura)
   */
  addCircle(center, radius, options = {}) {
    if (!this.map) return null;

    const circleOptions = {
      map: this.map,
      center: center,
      radius: radius,
      fillColor: '#00d4ff',
      fillOpacity: 0.15,
      strokeColor: '#00d4ff',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      ...options
    };

    return new google.maps.Circle(circleOptions);
  }

  /**
   * Centrar mapa en una posición
   */
  centerAt(pos, zoom = 15) {
    if (!this.map) return;
    this.map.setCenter(pos);
    this.map.setZoom(zoom);
  }

  /**
   * Obtener instancia del mapa
   */
  getMap() {
    return this.map;
  }

  /**
   * Verificar si el mapa está listo
   */
  isReady() {
    return this.isReady && this.map !== null;
  }

  /**
   * Callback para Google Maps API
   */
  static initCallback() {
    if (window.mapManager) {
      window.mapManager.initMap();
    }
  }
}

// Crear instancia global
window.MapManager = MapManager;
window.mapManager = new MapManager();
