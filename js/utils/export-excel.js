// js/utils/export-excel.js

export function exportToExcel(data) {
    // Mapeamos los datos para que el Excel quede limpio (sin IDs raros de Firebase)
    const cleanData = data.map(item => ({
        "Código": item.codigoInterno,
        "Equipo": item.equipoId,
        "Tipo": item.tipo,
        "Marca": item.marca,
        "Capacidad (GB)": item.capacidad,
        "Serie": item.serial,
        "Estado": item.estado,
        "Observaciones": item.observaciones
    }));

    const ws = XLSX.utils.json_to_sheet(cleanData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario Discos");
    XLSX.writeFile(wb, "Reporte_Discos.xlsx");
}