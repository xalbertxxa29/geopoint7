# 📝 README - GeoPoint7 v8.0.0

## Sistema de Gestión de Tareas con Geolocalización

**GeoPoint7** (LiderControl) es una Progressive Web App empresarial para gestión de tareas con validación geográfica en tiempo real.

---

## 🚀 Características Principales

### Core
- ✅ Autenticación con Firebase
- ✅ Geolocalización con validación de 30m
- ✅ Mapas interactivos con Google Maps
- ✅ Modo offline completo (PWA)
- ✅ Sincronización automática

### Nuevas Características v8.0.0
- ✅ Dashboard con gráficos (Chart.js)
- ✅ Notificaciones push
- ✅ Multi-idioma (Español/Inglés)
- ✅ Exportación de reportes (PDF/Excel/CSV)
- ✅ Sistema de testing (Jest)
- ✅ Error tracking (Sentry)
- ✅ Build optimizado

---

## 📦 Instalación

```bash
# Clonar repositorio
cd c:\Users\jsolis\Desktop\geopoint7

# Instalar dependencias
npm install

# Ejecutar tests
npm test

# Generar build de producción
npm run build
```

---

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Modo watch (desarrollo)
npm run test:watch

# Ver cobertura de código
npm run test:coverage
```

**Cobertura actual:** >70% en funciones críticas

---

## 🌐 Idiomas Soportados

- 🇪🇸 Español (por defecto)
- 🇬🇧 English

Cambiar idioma: Click en "🌐 Idioma" en el menú lateral

---

## 📊 Dashboard

Acceder a: `dashboard.html`

**KPIs disponibles:**
- Total de tareas
- Tareas completadas
- Tareas pendientes
- Tasa de completado

**Gráficos:**
- Tareas por estado (Doughnut)
- Tareas por tipo (Bar)
- Línea de tiempo (Line)

---

## 📄 Exportación de Reportes

Formatos soportados:
- **PDF:** Reporte formateado con tabla
- **Excel:** Compatible con Microsoft Excel
- **CSV:** Datos en formato CSV

---

## 🔔 Notificaciones Push

Para habilitar:
1. Configurar Firebase Cloud Messaging
2. Obtener VAPID key
3. Actualizar `push-notifications.js` línea 7
4. Solicitar permiso al usuario

---

## 🏗️ Estructura del Proyecto

```
geopoint7/
├── index.html              # Login
├── menu.html               # Menú principal
├── formulario.html         # Formulario de tareas
├── dashboard.html          # Dashboard de estadísticas
├── offline.html            # Página offline
│
├── auth.js                 # Autenticación
├── menu-new.js             # Lógica del menú
├── formulario-new.js       # Lógica del formulario
├── dashboard.js            # Lógica del dashboard
│
├── logger.js               # Sistema de logging
├── error-tracker.js        # Error tracking
├── i18n.js                 # Internacionalización
├── push-notifications.js   # Notificaciones push
├── export-manager.js       # Exportación de reportes
│
├── service-worker.js       # Service Worker PWA
├── manifest.json           # Manifest PWA
│
├── tests/                  # Tests con Jest
│   ├── setup.js
│   ├── helpers.test.js
│   └── auth.test.js
│
├── locales/                # Traducciones
│   ├── es.json
│   └── en.json
│
└── package.json            # Configuración npm
```

---

## 🔧 Configuración

### Firebase
Actualizar credenciales en `firebase-config.js`

### Sentry (Opcional)
1. Crear cuenta en sentry.io
2. Obtener DSN
3. Actualizar `error-tracker.js` línea 8

### Google Maps
API key configurada en `menu.html` y `formulario.html`

---

## 📱 PWA

La aplicación es una PWA completa:
- ✅ Instalable en dispositivos
- ✅ Funciona offline
- ✅ Sincronización en background
- ✅ Notificaciones push

---

## 🎨 Diseño

**Tema:** Neon Corporativo
- Color principal: `#00d4ff` (Cyan)
- Color secundario: `#00ff64` (Verde)
- Fondo: `#0a0e27` (Azul oscuro)

---

## 📈 Performance

- **First Load:** ~2-3s
- **Subsequent Loads:** ~500ms (con caché)
- **Offline Load:** ~300ms
- **Lighthouse Score:** >90

---

## 🐛 Debugging

### Logs
```javascript
window.logger.debug('Debug message');
window.logger.info('Info message');
window.logger.warn('Warning message');
window.logger.error('Error message', error);
```

### Exportar logs
```javascript
window.logger.exportLogs(); // Descarga JSON
```

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

---

## 📄 Licencia

MIT License - ver archivo LICENSE

---

## 👥 Equipo

**LiderControl Team**

---

## 📞 Soporte

Para soporte, contactar al equipo de desarrollo.

---

**Versión:** 8.0.0  
**Última actualización:** 25 de enero de 2026
