// js/ui/charts.js

let chartInstance = null;
const ctx = document.getElementById('brandChart').getContext('2d');

export function renderBrandChart(data) {
    // 1. Contar marcas
    const brandCounts = {};
    data.forEach(d => {
        // Normalizamos a mayúsculas para evitar duplicados (ej: Samsung vs samsung)
        const marca = d.marca.toUpperCase(); 
        brandCounts[marca] = (brandCounts[marca] || 0) + 1;
    });

    // 2. Si ya existe el gráfico, destruirlo para crear uno nuevo (evita bugs visuales)
    if (chartInstance) {
        chartInstance.destroy();
    }

    // 3. Crear nuevo gráfico
    chartInstance = new Chart(ctx, {
        type: 'doughnut', 
        data: {
            labels: Object.keys(brandCounts),
            datasets: [{
                label: 'Cantidad',
                data: Object.values(brandCounts),
                backgroundColor: [
                    '#9dff00', // Tu verde neón
                    '#a3d5ff', // Azul pastel
                    '#ff6b6b', // Rojo
                    '#ffdd57', // Amarillo
                    '#d4d4d4', // Gris
                    '#000000'  // Negro
                ],
                borderColor: '#000',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}