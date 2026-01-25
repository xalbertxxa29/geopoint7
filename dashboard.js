/**
 * Dashboard de Estadísticas
 * Visualización de métricas y gráficos con Chart.js
 */

(() => {
    let statusChart, typeChart, timelineChart;

    // Protección de página
    window.firebaseAuth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Inicializar página
        document.getElementById('fecha').innerText = Helpers.formatDate();
        document.getElementById('user-name').innerText = user.displayName || user.email;
        document.getElementById('user-email').innerText = user.email;

        initMenu();
        initExportModal();
        await loadDashboardData(user.uid);
    });

    /**
     * Inicializar botones flotantes
     */
    function initFloatingButtons() {
        // Botón de volver
        const backBtn = document.getElementById('back-btn-float');
        backBtn?.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });

        // Botón de logout
        const logoutBtn = document.getElementById('logout-btn-float');
        logoutBtn?.addEventListener('click', async () => {
            if (confirm('¿Deseas cerrar sesión?')) {
                try {
                    await window.firebaseAuth.signOut();
                    if (window.offlineStorage) {
                        await window.offlineStorage.clearAll();
                    }
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Error al cerrar sesión:', error);
                }
            }
        });

        // Botón de exportar
        const exportBtn = document.getElementById('export-btn-float');
        exportBtn?.addEventListener('click', () => {
            document.getElementById('export-modal')?.classList.add('active');
        });
    }

    /**
     * Inicializar menú lateral
     */
    function initMenu() {
        initFloatingButtons();

        // Toggle idioma
        document.getElementById('lang-toggle')?.addEventListener('click', () => {
            const currentLang = window.i18n?.currentLanguage || 'es';
            const newLang = currentLang === 'es' ? 'en' : 'es';
            window.i18n?.setLanguage(newLang);
        });
    }

    /**
     * Inicializar modal de exportación
     */
    function initExportModal() {
        const exportBtn = document.getElementById('export-btn');
        const modal = document.getElementById('export-modal');
        const closeBtn = document.getElementById('close-export');

        exportBtn?.addEventListener('click', () => {
            modal.classList.add('active');
        });

        closeBtn?.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        // Opciones de exportación
        document.querySelectorAll('.export-option').forEach(btn => {
            btn.addEventListener('click', async () => {
                const format = btn.getAttribute('data-format');
                await exportData(format);
                modal.classList.remove('active');
            });
        });
    }

    /**
     * Cargar datos del dashboard
     */
    async function loadDashboardData(userId) {
        try {
            window.loadingSystem?.show('Cargando estadísticas...');

            // Obtener todas las tareas del usuario
            const tasksSnapshot = await window.firebaseDB
                .collection('tareas')
                .where('userId', '==', userId)
                .get();

            const tasks = [];
            tasksSnapshot.forEach(doc => {
                tasks.push({ id: doc.id, ...doc.data() });
            });

            // Calcular KPIs
            updateKPIs(tasks);

            // Crear gráficos
            createCharts(tasks);

            window.loadingSystem?.hide();
        } catch (error) {
            window.loadingSystem?.hide();
            window.logger?.error('Error cargando dashboard', error);
            window.notificationSystem?.error('Error al cargar estadísticas');
        }
    }

    /**
     * Actualizar KPIs
     */
    function updateKPIs(tasks) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.estado === 'completada').length;
        const pending = tasks.filter(t => t.estado === 'pendiente' || t.estado === 'iniciada').length;
        const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

        document.getElementById('total-tasks').textContent = total;
        document.getElementById('completed-tasks').textContent = completed;
        document.getElementById('pending-tasks').textContent = pending;
        document.getElementById('completion-rate').textContent = completionRate + '%';
    }

    /**
     * Crear gráficos
     */
    function createCharts(tasks) {
        createStatusChart(tasks);
        createTypeChart(tasks);
        createTimelineChart(tasks);
    }

    /**
     * Gráfico de tareas por estado
     */
    function createStatusChart(tasks) {
        const statusCounts = {
            'pendiente': 0,
            'iniciada': 0,
            'completada': 0
        };

        tasks.forEach(task => {
            if (statusCounts[task.estado] !== undefined) {
                statusCounts[task.estado]++;
            }
        });

        const ctx = document.getElementById('statusChart');
        if (statusChart) statusChart.destroy();

        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pendientes', 'Iniciadas', 'Completadas'],
                datasets: [{
                    data: [statusCounts.pendiente, statusCounts.iniciada, statusCounts.completada],
                    backgroundColor: ['#ff6b6b', '#ffd93d', '#6bcf7f'],
                    borderColor: '#0a0e27',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a0a0cc',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }

    /**
     * Gráfico de tareas por tipo
     */
    function createTypeChart(tasks) {
        const typeCounts = {};

        tasks.forEach(task => {
            const tipo = task.tipoTarea || 'Sin tipo';
            typeCounts[tipo] = (typeCounts[tipo] || 0) + 1;
        });

        const ctx = document.getElementById('typeChart');
        if (typeChart) typeChart.destroy();

        typeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    label: 'Cantidad',
                    data: Object.values(typeCounts),
                    backgroundColor: '#00d4ff',
                    borderColor: '#00ffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#a0a0cc' },
                        grid: { color: '#1a1e3a' }
                    },
                    x: {
                        ticks: { color: '#a0a0cc' },
                        grid: { color: '#1a1e3a' }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    /**
     * Gráfico de línea de tiempo
     */
    function createTimelineChart(tasks) {
        // Agrupar por fecha
        const dateGroups = {};

        tasks.forEach(task => {
            if (task.fechaCreacion) {
                const date = new Date(task.fechaCreacion.toDate());
                const dateStr = date.toLocaleDateString('es-ES');
                dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
            }
        });

        // Ordenar fechas
        const sortedDates = Object.keys(dateGroups).sort((a, b) => {
            return new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'));
        });

        const ctx = document.getElementById('timelineChart');
        if (timelineChart) timelineChart.destroy();

        timelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Tareas creadas',
                    data: sortedDates.map(date => dateGroups[date]),
                    borderColor: '#00ff64',
                    backgroundColor: 'rgba(0, 255, 100, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#a0a0cc' },
                        grid: { color: '#1a1e3a' }
                    },
                    x: {
                        ticks: { color: '#a0a0cc' },
                        grid: { color: '#1a1e3a' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#a0a0cc' }
                    }
                }
            }
        });
    }

    /**
     * Exportar datos
     */
    async function exportData(format) {
        try {
            window.loadingSystem?.show(`Exportando ${format.toUpperCase()}...`);

            const user = window.firebaseAuth.currentUser;
            if (!user) return;

            const tasksSnapshot = await window.firebaseDB
                .collection('tareas')
                .where('userId', '==', user.uid)
                .get();

            const tasks = [];
            tasksSnapshot.forEach(doc => {
                tasks.push({ id: doc.id, ...doc.data() });
            });

            if (window.exportManager) {
                await window.exportManager.export(tasks, format);
            }

            window.loadingSystem?.hide();
            window.notificationSystem?.success(`Reporte ${format.toUpperCase()} generado`);
        } catch (error) {
            window.loadingSystem?.hide();
            window.logger?.error('Error exportando datos', error);
            window.notificationSystem?.error('Error al exportar');
        }
    }
})();
