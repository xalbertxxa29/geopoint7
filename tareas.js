/**
 * tareas.js - Gestión de actividades dentro de una visita
 */

let currentTaskId = null;
let currentTaskData = null;
let currentActionType = '';
let currentActionIcon = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Obtener ID de tarea de la URL
    const urlParams = new URLSearchParams(window.location.search);
    currentTaskId = urlParams.get('taskId');

    if (!currentTaskId) {
        alert('Error: No se ha especificado una visita válida.');
        window.location.href = 'menu.html';
        return;
    }

    // Autenticación
    window.firebaseAuth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            document.getElementById('user-display').textContent = user.displayName || user.email;
            await loadTaskData();
            loadActivities();
        }
    });
});

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

function openActionModal(title, icon) {
    currentActionType = title;
    currentActionIcon = icon;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-notes').value = '';
    document.getElementById('action-modal').classList.add('active');
}

function closeActionModal() {
    document.getElementById('action-modal').classList.remove('active');
}

async function saveAction() {
    const notas = document.getElementById('modal-notes').value;

    if (window.loadingSystem) window.loadingSystem.show('Guardando actividad...');

    try {
        const actividad = {
            taskId: currentTaskId,
            tipo: currentActionType,
            icono: currentActionIcon,
            notas: notas,
            timestamp: new Date().toISOString(),
            fecha: new Date().toLocaleDateString('es-ES'),
            hora: new Date().toLocaleTimeString('es-ES')
        };

        // Guardar en subcolección 'actividades' dentro de la tarea
        await window.firebaseDB.collection('tareas').doc(currentTaskId).collection('actividades').add(actividad);

        closeActionModal();
        if (window.loadingSystem) window.loadingSystem.hide();

        // Recargar lista
        loadActivities();

    } catch (error) {
        console.error("Error guardando actividad:", error);
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

async function finalizarVisita() {
    if (!confirm('¿Estás seguro de finalizar esta visita?')) return;

    if (window.loadingSystem) window.loadingSystem.show('Finalizando visita...');

    try {
        await window.firebaseDB.collection('tareas').doc(currentTaskId).update({
            estado: 'COMPLETADA',
            horaFin: new Date().toISOString()
        });

        if (window.loadingSystem) window.loadingSystem.hide();
        alert('Visita finalizada exitosamente.');
        window.location.href = 'menu.html';

    } catch (error) {
        console.error("Error finalizando:", error);
        if (window.loadingSystem) window.loadingSystem.hide();
        alert("Error al finalizar: " + error.message);
    }
}
