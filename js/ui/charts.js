// js/ui/charts.js

/**
 * MOTOR DE GRÁFICOS DINÁMICOS - COMFAMILIAR RISARALDA
 * Adaptado a la paleta institucional y compatible con Modo Oscuro.
 */

let chartInstance = null;
const canvas = document.getElementById('mainChart');

/**
 * Renderiza o actualiza el gráfico principal
 * @param {Array} data - Datos filtrados del inventario
 * @param {String} groupBy - Campo de agrupación (marca, estado, tipo, equipoId)
 * @param {String} metric - Métrica a mostrar (count, capacity)
 * @param {String} chartType - Tipo de visualización (doughnut, bar, pie)
 */
export function renderDynamicChart(data, groupBy = 'estado', metric = 'count', chartType = 'doughnut') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 1. Obtener estilos actuales del sistema (para Modo Oscuro)
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-color').trim() || '#1e293b';
    const borderColor = style.getPropertyValue('--border-color').trim() || '#0f172a';
    const primaryColor = style.getPropertyValue('--primary').trim() || '#0056b3';

    // 2. Procesar la información
    const processed = processChartData(data, groupBy, metric);
    const labels = Object.keys(processed);
    const values = Object.values(processed);

    // 3. Paleta de Colores Institucional (Comfamiliar)
    // Combinación de Azules, Cian y Naranja corporativo
    const corporatePalette = [
        '#0056b3', // Azul Principal
        '#0ea5e9', // Cian Institucional
        '#0284c7', // Azul Medio
        '#f97316', // Naranja (Acento)
        '#7dd3fc', // Azul Cielo
        '#334155', // Gris Azulado
        '#0ea5e9', // Repetición Cian
        '#0c4a6e'  // Azul Muy Oscuro
    ];

    // 4. Limpiar gráfico anterior
    if (chartInstance) {
        chartInstance.destroy();
    }

    // 5. Configuración y Creación
    chartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: metric === 'capacity' ? 'Capacidad (GB)' : 'Unidades',
                data: values,
                backgroundColor: corporatePalette.slice(0, labels.length),
                borderColor: borderColor,
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeOutQuart' },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: { family: "'Space Grotesk', sans-serif", size: 11, weight: '500' },
                        padding: 20,
                        usePointStyle: true
                    }
                },
                title: {
                    display: true,
                    text: formatChartTitle(groupBy, metric),
                    color: textColor,
                    font: { family: "'Space Grotesk', sans-serif", size: 16, weight: 'bold' },
                    padding: { bottom: 10 }
                },
                tooltip: {
                    backgroundColor: borderColor, // El tooltip usa el color de los bordes (negro/blanco)
                    titleColor: style.getPropertyValue('--bg-color'),
                    bodyColor: style.getPropertyValue('--bg-color'),
                    padding: 12,
                    displayColors: true,
                    cornerRadius: 4,
                    callbacks: {
                        label: (context) => {
                            let val = context.raw;
                            if (metric === 'capacity') {
                                return ` ${val >= 1000 ? (val/1000).toFixed(2) + ' TB' : val + ' GB'}`;
                            }
                            return ` ${val} Unidades`;
                        }
                    }
                }
            },
            // Configuración de ejes (solo si es gráfico de barras)
            scales: chartType === 'bar' ? {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(100, 116, 139, 0.1)' },
                    ticks: { color: textColor, font: { family: "'Space Grotesk'" } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { family: "'Space Grotesk'" } }
                }
            } : {}
        }
    });
}

/**
 * Transforma los datos crudos en un objeto de frecuencias o sumas
 */
function processChartData(data, field, metric) {
    const counts = {};
    data.forEach(item => {
        let key = item[field] || 'No definido';
        
        // Normalización para visualización
        if (field === 'equipoId' && key === '') key = 'Sin Ubicación';
        
        if (!counts[key]) counts[key] = 0;

        if (metric === 'count') {
            counts[key] += 1;
        } else {
            counts[key] += Number(item.capacidad) || 0;
        }
    });
    return counts;
}

/**
 * Genera un título amigable para el gráfico
 */
function formatChartTitle(groupBy, metric) {
    const metricName = metric === 'count' ? 'Distribución' : 'Capacidad Total';
    const groupName = {
        'marca': 'por Fabricante',
        'estado': 'por Estado Operativo',
        'tipo': 'por Tecnología',
        'equipoId': 'por Ubicación Física'
    }[groupBy] || groupBy;

    return `${metricName} ${groupName}`;
}