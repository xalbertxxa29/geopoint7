/**
 * tareas.js - Gestión de actividades dentro de una visita
 */

let currentTaskId = null;
let currentTaskData = null;
let currentActionType = '';
let currentActionIcon = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Obtener ID de tarea de la URL
    console.log("📌 URL Search:", window.location.search);
    const urlParams = new URLSearchParams(window.location.search);
    currentTaskId = urlParams.get('taskId');

    console.log("📌 ID de Visita capturado:", currentTaskId);

    if (!currentTaskId || currentTaskId === 'undefined' || currentTaskId === 'null') {
        console.error("❌ ID inválido detected");
        alert('Error: No se ha especificado una visita válida.');
        window.location.href = 'menu.html';
        return;
    }

    // Esperar a que Firebase Auth esté listo
    try {
        await waitForAuth();

        // Autenticación lista
        window.firebaseAuth.onAuthStateChanged(async (user) => {
            if (!user) {
                console.warn("⚠️ Usuario no autenticado, redirigiendo...");
                window.location.href = 'index.html';
            } else {
                console.log("👤 Usuario autenticado:", user.email);
                document.getElementById('user-display').textContent = user.displayName || user.email;
                await loadTaskData();
                loadActivities();
            }
        });
    } catch (error) {
        console.error("❌ Error esperando autenticación:", error);
        alert("Error de sistema: No se pudo inicializar la autenticación.");
    }
});

/**
 * Espera a que window.firebaseAuth esté definido
 */
function waitForAuth(timeout = 10000) {
    return new Promise((resolve, reject) => {
        if (window.firebaseAuth) {
            resolve();
            return;
        }

        console.log("⏳ Esperando a Firebase Auth...");
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (window.firebaseAuth) {
                clearInterval(interval);
                console.log("✅ Firebase Auth detectado");
                resolve();
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error("Timeout esperando a Firebase Auth"));
            }
        }, 100);
    });
}

async function loadTaskData() {
    try {
        const doc = await window.firebaseDB.collection('tareas').doc(currentTaskId).get();
        if (doc.exists) {
            currentTaskData = doc.data();
            document.getElementById('client-display').textContent = currentTaskData.cliente || 'N/A';
            document.getElementById('unit-display').textContent = currentTaskData.unidad || 'N/A';
        } else {
            alert('La visita no existe.');
            window.location.href = 'menu.html';
        }
    } catch (error) {
        console.error("Error cargando tarea:", error);
    }
}

// ========== MODAL DE ACCIONES ==========

// ========== MODAL DINÁMICO Y FORMULARIOS ==========

// Configuración de los tipos de actividad
const ACTIVITY_TYPES = {
    'supervision': { title: 'Visita de Supervisión', icon: '🛡️' },
    'entrega': { title: 'Entrega de Items', icon: '📦' },
    'capacitacion': { title: 'Capacitación y Charla', icon: '📋' },
    'reunion': { title: 'Reunión de Coordinación', icon: '🤝' }
};

let currentFormType = '';
let currentPhotoBlob = null; // Para guardar la foto temporalmente

// Preguntas para Supervisión
const SUPERVISION_QUESTIONS = [
    "El personal tiene en buen estado su Uniforme y EPP",
    "El personal cuenta con su CARNET SUCAMENT VIGENTE",
    "El personal cuenta con su LICENCIA DE ARMAS VIGENTE",
    "El personal cuenta con FOTOCHECK DIGITAL",
    "La Garita se mantiene ordenada y limpia",
    "Los equipos se encuentran en buen estado (RADIO/GARRET/LINTERNA)",
    "Se llenan correctamente los cuadernos de ocurrencia y asistencia",
    "La unidad cuenta con el folder Liderman Actualizado"
];

function openDynamicModal(type) {
    currentFormType = type;
    currentPhotoBlob = null;
    const config = ACTIVITY_TYPES[type];

    document.getElementById('dynamic-modal-title').textContent = `${config.icon} ${config.title}`;
    const container = document.getElementById('dynamic-form-container');
    container.innerHTML = ''; // Limpiar anterior

    // Generar HTML según el tipo
    let html = '';

    if (type === 'supervision') {
        html += `<div class="form-section-title">Checklist de Supervisión</div>`;
        SUPERVISION_QUESTIONS.forEach((q, index) => {
            html += `
                <div class="question-card">
                    <div class="question-text">${index + 1}. ${q}</div>
                    <select id="sup-q-${index}" class="form-control" style="padding:5px; font-size:0.9rem;">
                        <option value="Cumple" selected>✅ Cumple</option>
                        <option value="No Cumple">❌ No Cumple</option>
                        <option value="No Aplica">➖ No Aplica</option>
                    </select>
                </div>
            `;
        });

    } else if (type === 'entrega') {
        html += `
            <div class="form-group">
                <label>Comentario de Entrega</label>
                <textarea id="entrega-comentario" class="form-control" rows="4" placeholder="¿Qué items se entregaron?"></textarea>
            </div>
            ${renderPhotoSection()}
        `;

    } else if (type === 'capacitacion') {
        html += `
            <div class="form-group">
                <label>Tipo</label>
                <select id="cap-tipo" class="form-control">
                    <option value="CAPACITACION">Capacitación</option>
                    <option value="CHARLA">Charla</option>
                </select>
            </div>
            <div class="form-group">
                <label>Tema / Nombre</label>
                <input type="text" id="cap-tema" class="form-control" placeholder="Ej: Uso de Extintores">
            </div>
            <div class="form-group">
                <label>Cantidad de Participantes</label>
                <select id="cap-cantidad" class="form-control">
                    ${generateNumberOptions(1, 100)}
                </select>
            </div>
            <div class="form-group">
                <label>Comentarios Adicionales</label>
                <textarea id="cap-comentarios" class="form-control" rows="3"></textarea>
            </div>
            ${renderPhotoSection()}
        `;

    } else if (type === 'reunion') {
        html += `
            <div class="form-group">
                <label>Acuerdos de la Reunión</label>
                <textarea id="reunion-acuerdos" class="form-control" rows="5" placeholder="Detalle los puntos tratados..."></textarea>
            </div>
            ${renderPhotoSection()}
        `;
    }

    container.innerHTML = html;
    document.getElementById('dynamic-modal').classList.add('active');
}

function closeDynamicModal() {
    document.getElementById('dynamic-modal').classList.remove('active');
    currentPhotoBlob = null;
}

// Helpers de Renderizado
function renderPhotoSection() {
    return `
        <div class="form-group">
            <label>Evidencia Fotográfica (Opcional)</label>
            <div class="photo-buttons">
                <div class="btn-photo" onclick="triggerCamera()">
                    📷 Tomar Foto
                </div>
                <div class="btn-photo" onclick="triggerGallery()">
                    📁 Subir Archivo
                </div>
            </div>
            <img id="photo-preview-element" class="photo-preview">
        </div>
    `;
}

function generateNumberOptions(start, end) {
    let options = '';
    for (let i = start; i <= end; i++) {
        options += `<option value="${i}">${i}</option>`;
    }
    return options;
}

// ========== GESTIÓN DE FOTOS ==========

function triggerCamera() {
    document.getElementById('camera-input').click();
}

function triggerGallery() {
    document.getElementById('gallery-input').click();
}

function handlePhotoSelect(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        // Mostrar vista previa
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('photo-preview-element');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);

        // Guardar para subir
        currentPhotoBlob = file;
    }
    // Reiniciar input para permitir seleccionar la misma foto
    input.value = '';
}

// ========== GUARDADO DE DATOS ==========

async function saveDynamicAction() {
    if (window.loadingSystem) window.loadingSystem.show('Guardando registro...');

    try {
        const baseData = {
            taskId: currentTaskId,
            tipo: ACTIVITY_TYPES[currentFormType].title,
            tipoCode: currentFormType,
            icono: ACTIVITY_TYPES[currentFormType].icon,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(), // Formato Timestamp nativo
            fecha: new Date().toLocaleDateString('es-ES'),
            hora: new Date().toLocaleTimeString('es-ES'),
            estado: 'ACTIVO' // Campo solicitado
        };

        let specificData = {};

        // Recolectar datos específicos
        if (currentFormType === 'supervision') {
            const respuestas = [];
            SUPERVISION_QUESTIONS.forEach((q, index) => {
                const val = document.getElementById(`sup-q-${index}`).value;
                respuestas.push({ pregunta: q, respuesta: val });
            });
            specificData = { checklist: respuestas };

        } else if (currentFormType === 'entrega') {
            specificData = {
                comentario: document.getElementById('entrega-comentario').value
            };

        } else if (currentFormType === 'capacitacion') {
            specificData = {
                subTipo: document.getElementById('cap-tipo').value,
                tema: document.getElementById('cap-tema').value,
                cantidad: parseInt(document.getElementById('cap-cantidad').value),
                comentarios: document.getElementById('cap-comentarios').value
            };

        } else if (currentFormType === 'reunion') {
            specificData = {
                acuerdos: document.getElementById('reunion-acuerdos').value
            };
        }

        // Subir foto si existe
        let photoUrl = null;
        if (currentPhotoBlob) {
            const storageRef = window.firebaseStorage.ref();
            const fileName = `visitas/${currentTaskId}/${Date.now()}_${currentFormType}.jpg`;
            const imageRef = storageRef.child(fileName);

            if (window.loadingSystem) window.loadingSystem.show('Subiendo foto...');
            await imageRef.put(currentPhotoBlob);
            photoUrl = await imageRef.getDownloadURL();
        }

        // Construir objeto final
        const finalData = {
            ...baseData,
            ...specificData,
            fotoUrl: photoUrl
        };

        // Guardar en Firestore
        await window.firebaseDB.collection('tareas')
            .doc(currentTaskId)
            .collection('actividades')
            .add(finalData);

        if (window.loadingSystem) window.loadingSystem.hide();
        window.notificationSystem?.success('Actividad registrada correctamente');
        closeDynamicModal();

        // No es necesario llamar a loadActivities porque el onSnapshot lo detectará automáticamente

    } catch (error) {
        console.error("Error guardando:", error);
        if (window.loadingSystem) window.loadingSystem.hide();
        alert("Error al guardar: " + error.message);
    }
}


// ========== LISTA DE ACTIVIDADES ==========

function loadActivities() {
    const listContainer = document.getElementById('tasks-list');

    window.firebaseDB.collection('tareas').doc(currentTaskId).collection('actividades')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                listContainer.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No hay actividades registradas aún.</p>';
                return;
            }

            let html = '';
            snapshot.forEach((doc) => {
                const data = doc.data();
                html += `
                    <div class="task-card">
                        <div style="display:flex; align-items:center;">
                            <div class="task-icon">${data.icono || '📋'}</div>
                            <div class="task-details">
                                <h4>${data.tipo}</h4>
                                <p>${data.fecha} ${data.hora}</p>
                                ${data.notas ? `<p style="font-style:italic; opacity:0.8;">"${data.notas}"</p>` : ''}
                            </div>
                        </div>
                        <div class="task-status">Activo</div>
                    </div>
                `;
            });
            listContainer.innerHTML = html;
        });
}

// ========== FINALIZAR VISITA ==========

function closeWarningModal() {
    document.getElementById('warning-modal').classList.remove('active');
}

async function finalizarVisita() {
    if (!currentTaskData || !currentTaskData.ubicacion) {
        alert("Error: No hay datos de ubicación de la visita.");
        return;
    }

    if (window.loadingSystem) window.loadingSystem.show('Verificando ubicación...');

    // 1. Obtener ubicación actual
    navigator.geolocation.getCurrentPosition(async (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        const siteLat = currentTaskData.ubicacion.latitude;
        const siteLon = currentTaskData.ubicacion.longitude;

        // 2. Calcular distancia
        const distance = getDistanceFromLatLonInMeters(userLat, userLon, siteLat, siteLon);
        console.log(`📏 Distancia al objetivo: ${distance.toFixed(2)} metros`);

        if (distance > 50) {
            // Fuera de rango
            if (window.loadingSystem) window.loadingSystem.hide();
            document.getElementById('distance-display').textContent = `Distancia actual: ${distance.toFixed(0)} metros`;
            document.getElementById('warning-modal').classList.add('active');
            return;
        }

        // 3. Procesar Finalización (Dentro de rango)
        if (!confirm('📍 Estás dentro del rango. ¿Confirmar finalización?')) {
            if (window.loadingSystem) window.loadingSystem.hide();
            return;
        }

        if (window.loadingSystem) window.loadingSystem.show('Finalizando visita...');

        try {
            // Calcular Tiempo de Estadía
            const now = new Date();
            let tiempoEstadia = "Desconocido";

            if (currentTaskData.timestamp) {
                // Soportar tanto Timestamp de Firestore como Date strings
                let fechaInicio;
                if (currentTaskData.timestamp.toDate) {
                    fechaInicio = currentTaskData.timestamp.toDate();
                } else {
                    fechaInicio = new Date(currentTaskData.timestamp);
                }

                const diffMs = now - fechaInicio;
                const diffMins = Math.floor(diffMs / 60000);
                const hrs = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                tiempoEstadia = `${hrs}h ${mins}m`;
            }

            // Actualizar Firestore
            await window.firebaseDB.collection('tareas').doc(currentTaskId).update({
                estado: 'COMPLETADA',
                finalizacion: firebase.firestore.FieldValue.serverTimestamp(),
                finalizacionFecha: now.toLocaleDateString('es-ES'),
                finalizacionHora: now.toLocaleTimeString('es-ES'),
                tiempoEstadia: tiempoEstadia,
                finalizacionUbicacion: {
                    latitude: userLat,
                    longitude: userLon
                }
            });

            if (window.loadingSystem) window.loadingSystem.hide();
            alert(`✅ Visita Finalizada.\nTiempo de estadía: ${tiempoEstadia}`);
            window.location.href = 'menu.html';

        } catch (error) {
            console.error("Error finalizando:", error);
            if (window.loadingSystem) window.loadingSystem.hide();
            alert("Error al finalizar: " + error.message);
        }

    }, (error) => {
        if (window.loadingSystem) window.loadingSystem.hide();
        console.error("Error GPS:", error);
        alert("No se pudo obtener tu ubicación. Asegúrate de tener el GPS activado.");
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
}

// Haversine formula para metros
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la tierra en metros
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distancia en metros
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
