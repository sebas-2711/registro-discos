// js/ui/charts.js

let chartInstance = null; // Guardamos la instancia para poder destruirla y redibujar

// REFERENCIA AL CANVAS
const ctx = document.getElementById('mainChart').getContext('2d');

/**
 * Función Principal: Renderiza el gráfico según la configuración
 * @param {Array} data - Lista completa de discos (filtrados o total)
 * @param {String} groupBy - Campo por el cual agrupar ('marca', 'estado', 'tipo', 'equipoId')
 * @param {String} metric - Qué medir ('count' = cantidad, 'capacity' = suma de GB)
 * @param {String} chartType - Tipo de gráfico ('doughnut', 'bar', 'pie')
 */
export function renderDynamicChart(data, groupBy = 'marca', metric = 'count', chartType = 'doughnut') {
    
    // 1. PROCESAR DATOS
    // Convertimos la lista de objetos en un mapa de frecuencias o sumas
    const processedData = processData(data, groupBy, metric);
    
    // Extraer etiquetas (labels) y valores (data)
    const labels = Object.keys(processedData);
    const values = Object.values(processedData);

    // 2. CONFIGURAR COLORES (Paleta Neo-Brutalism)
    const colors = [
        '#9dff00', // Verde Neón
        '#a3d5ff', // Azul Pastel
        '#ff6b6b', // Rojo Coral
        '#ffdd57', // Amarillo
        '#d4d4d4', // Gris
        '#000000', // Negro
        '#ff9f43', // Naranja
        '#54a0ff'  // Azul Fuerte
    ];

    // 3. LIMPIEZA PREVIA
    // Si ya existe un gráfico, lo destruimos para liberar memoria y evitar superposiciones
    if (chartInstance) {
        chartInstance.destroy();
    }

    // 4. CREAR NUEVO GRÁFICO
    chartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: metric === 'capacity' ? 'Capacidad Total (GB)' : 'Cantidad de Unidades',
                data: values,
                backgroundColor: colors.slice(0, labels.length), // Asignamos colores cíclicamente
                borderColor: '#000', // Borde negro grueso (Estilo Neo)
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: { family: "'Space Grotesk', sans-serif", size: 12 },
                        color: '#000',
                        usePointStyle: true,
                        pointStyle: 'rectRounded'
                    }
                },
                title: {
                    display: true,
                    text: generateTitle(groupBy, metric),
                    font: { family: "'Space Grotesk', sans-serif", size: 16, weight: 'bold' },
                    color: '#000',
                    padding: { bottom: 20 }
                },
                tooltip: {
                    backgroundColor: '#000',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#fff',
                    borderWidth: 1,
                    cornerRadius: 0, // Bordes cuadrados (Brutalist)
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            let value = context.parsed;
                            if (chartType === 'bar') value = context.parsed.y; // En barras el valor es Y

                            if (metric === 'capacity') {
                                // Convertir a TB si es muy grande
                                if (value >= 1000) return `${label}: ${(value/1000).toFixed(2)} TB`;
                                return `${label}: ${value} GB`;
                            }
                            return `${label}: ${value} unds`;
                        }
                    }
                }
            },
            // Configuración específica si es gráfico de barras
            scales: chartType === 'bar' ? {
                y: {
                    beginAtZero: true,
                    grid: { color: '#e0e0e0', drawBorder: false },
                    ticks: { color: '#000', font: { family: "'Space Grotesk', sans-serif" } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#000', font: { family: "'Space Grotesk', sans-serif" } }
                }
            } : {
                // Si no es barras, ocultamos los ejes
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

// --- UTILIDADES INTERNAS ---

function processData(data, groupBy, metric) {
    const result = {};

    data.forEach(item => {
        // Obtenemos la clave (Ej: "Samsung", "Bueno", "SSD")
        // Si el campo está vacío, ponemos "Sin Datos"
        let key = item[groupBy];
        if (!key || key.trim() === '') key = 'Desconocido';
        
        // Normalizamos texto (para que "samsung" y "Samsung" sean lo mismo)
        key = String(key).toUpperCase(); 

        // Inicializamos si no existe
        if (!result[key]) result[key] = 0;

        // Sumamos
        if (metric === 'count') {
            result[key] += 1; // Contamos 1 por cada disco
        } else if (metric === 'capacity') {
            // Sumamos la capacidad (asegurando que sea número)
            result[key] += Number(item.capacidad) || 0;
        }
    });

    return result;
}

function generateTitle(groupBy, metric) {
    const metricText = metric === 'count' ? 'Cantidad de Discos' : 'Capacidad Total';
    const groupText = {
        'marca': 'por Marca',
        'estado': 'por Estado',
        'tipo': 'por Tipo',
        'equipoId': 'por Equipo'
    }[groupBy] || groupBy;

    return `${metricText} ${groupText}`;
}