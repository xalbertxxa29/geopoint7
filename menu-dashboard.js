
// ========== DASHBOARD FUNCTIONS ==========

let statusChart, typeChart, timelineChart;

/**
 * Cargar datos del dashboard
 */
async function loadDashboardData() {
    try {
        window.loadingSystem?.show('Cargando estadísticas...');

        const user = window.firebaseAuth.currentUser;
        if (!user) return;

        // Obtener todas las tareas del usuario
        const tasksSnapshot = await window.firebaseDB
            .collection('tareas')
            .where('userId', '==', user.uid)
            .get();

        const tasks = [];
        tasksSnapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });

        // Actualizar KPIs
        updateKPIs(tasks);

        // Crear gráficos
        createCharts(tasks);

        window.loadingSystem?.hide();
    } catch (error) {
        window.loadingSystem?.hide();
        console.error('Error cargando dashboard:', error);
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
    if (!ctx) return;

    if (statusChart) statusChart.destroy();

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'Iniciadas', 'Completadas'],
            datasets: [{
                data: [statusCounts.pendiente, statusCounts.iniciada, statusCounts.completada],
                backgroundColor: [
                    'rgba(255, 107, 107, 0.9)',  // Rojo vibrante
                    'rgba(255, 217, 61, 0.9)',   // Amarillo vibrante
                    'rgba(107, 207, 127, 0.9)'   // Verde vibrante
                ],
                borderColor: ['#ff6b6b', '#ffd93d', '#6bcf7f'],
                borderWidth: 3,
                hoverOffset: 15,
                hoverBorderWidth: 4,
                hoverBorderColor: '#00ffff'
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
                        font: {
                            size: 14,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 14, 39, 0.95)',
                    titleColor: '#00d4ff',
                    titleFont: { size: 16, weight: 'bold' },
                    bodyColor: '#ffffff',
                    bodyFont: { size: 14 },
                    borderColor: '#00d4ff',
                    borderWidth: 2,
                    padding: 15,
                    displayColors: true,
                    boxPadding: 8,
                    cornerRadius: 8
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeInOutQuart'
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
    if (!ctx) return;

    if (typeChart) typeChart.destroy();

    typeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                label: 'Cantidad de Tareas',
                data: Object.values(typeCounts),
                backgroundColor: 'rgba(0, 212, 255, 0.8)',
                borderColor: '#00ffff',
                borderWidth: 2,
                borderRadius: 10,
                hoverBackgroundColor: 'rgba(0, 255, 255, 0.9)',
                hoverBorderColor: '#00ffff',
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0a0cc',
                        font: { size: 13, weight: 'bold' },
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(0, 212, 255, 0.15)',
                        lineWidth: 1
                    },
                    border: {
                        color: 'rgba(0, 212, 255, 0.3)',
                        width: 2
                    }
                },
                x: {
                    ticks: {
                        color: '#a0a0cc',
                        font: { size: 12, weight: 'bold' }
                    },
                    grid: {
                        display: false
                    },
                    border: {
                        color: 'rgba(0, 212, 255, 0.3)',
                        width: 2
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#00d4ff',
                        font: { size: 13, weight: 'bold' },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 14, 39, 0.95)',
                    titleColor: '#00d4ff',
                    titleFont: { size: 15, weight: 'bold' },
                    bodyColor: '#ffffff',
                    bodyFont: { size: 13 },
                    borderColor: '#00d4ff',
                    borderWidth: 2,
                    padding: 15,
                    cornerRadius: 8
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
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
    if (!ctx) return;

    if (timelineChart) timelineChart.destroy();

    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Tareas Creadas',
                data: sortedDates.map(date => dateGroups[date]),
                borderColor: '#00ff64',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(0, 255, 100, 0.4)');
                    gradient.addColorStop(1, 'rgba(0, 255, 100, 0.05)');
                    return gradient;
                },
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 6,
                pointBackgroundColor: '#00ff64',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 3,
                pointHoverRadius: 9,
                pointHoverBackgroundColor: '#00ffff',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0a0cc',
                        font: { size: 13, weight: 'bold' },
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(0, 212, 255, 0.15)',
                        lineWidth: 1
                    },
                    border: {
                        color: 'rgba(0, 212, 255, 0.3)',
                        width: 2
                    }
                },
                x: {
                    ticks: {
                        color: '#a0a0cc',
                        font: { size: 11, weight: 'bold' },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: 'rgba(0, 212, 255, 0.1)',
                        lineWidth: 1
                    },
                    border: {
                        color: 'rgba(0, 212, 255, 0.3)',
                        width: 2
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#00ff64',
                        font: { size: 14, weight: 'bold' },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 14, 39, 0.95)',
                    titleColor: '#00d4ff',
                    titleFont: { size: 15, weight: 'bold' },
                    bodyColor: '#ffffff',
                    bodyFont: { size: 13 },
                    borderColor: '#00ff64',
                    borderWidth: 2,
                    padding: 15,
                    cornerRadius: 8
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    });
}
