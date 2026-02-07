// js/utils/import-excel.js
import { addDisk } from "../services/inventory.js";

let importedDataCache = []; // Memoria temporal

// 1. LEER EL ARCHIVO EXCEL
export const handleFileSelect = (event, callback) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Leemos la primera hoja
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convertimos a JSON (array de objetos)
        const rawData = XLSX.utils.sheet_to_json(sheet);
        
        // --- MAPEO INTELIGENTE ---
        // Aquí "traducimos" tus columnas largas al formato del sistema
        importedDataCache = rawData.map((row, index) => {
            
            // 1. Detectar Marca y Capacidad (si vienen juntas o separadas)
            let marca = row['Marca'] || 'Genérico';
            let capacidad = row['Capacidad'] || 0;
            
            // Si existe la columna combinada "Marca y capacidad" (Tu caso)
            if (row['Marca y capacidad']) {
                const parsed = parseMarcaCapacidad(row['Marca y capacidad']);
                marca = parsed.marca;
                capacidad = parsed.capacidad;
            }

            // 2. Traducir Estado (Ej: "A" -> "Bueno")
            let estadoRaw = row['Estado del disco'] || row['Estado'] || 'Bueno';
            let estado = 'Bueno';
            if (estadoRaw === 'A') estado = 'Bueno';
            else if (estadoRaw === 'M') estado = 'Malo';
            else if (['R', 'P'].includes(estadoRaw)) estado = 'Por revisar';
            else estado = estadoRaw; // Si ya dice "Bueno", lo dejamos igual

            return {
                tempId: index, 
                // Buscamos la columna por su nombre exacto en TU Excel o por el nombre corto
                codigoInterno: row['D /Código interno de la aplicación'] || row['Codigo'] || row['Código'] || 'S/N',
                equipoId: row['ID del equipo donde se almacena físicamente las unidades de disco'] || row['Equipo'] || '',
                tipo: row['Tipo'] || 'HDD',
                marca: marca,
                capacidad: capacidad,
                serial: row['No. de Serie'] || row['Serie'] || row['Serial'] || 'S/N',
                estado: estado,
                observaciones: row['Observaciones'] || '',
                fechaCompra: new Date().toISOString().split('T')[0], // Fecha hoy
                fechaInstalacion: ''
            };
        });

        callback(importedDataCache);
    };
    
    reader.readAsArrayBuffer(file);
};

// --- FUNCIÓN AUXILIAR PARA SEPARAR "HGST 1TB" ---
function parseMarcaCapacidad(texto) {
    if (!texto) return { marca: 'Genérico', capacidad: 0 };
    
    // Convertir a texto por seguridad
    const str = String(texto).trim();
    
    // Buscamos patrones como "1TB", "500GB", "500 GB"
    // Regex: Busca dígitos seguidos opcionalmente de espacio y luego TB o GB
    const match = str.match(/(\d+)\s*(TB|GB|gb|tb)/i);
    
    if (match) {
        let num = parseInt(match[1]);
        let unidad = match[2].toUpperCase();
        
        // Calcular GBs
        let totalGB = (unidad === 'TB') ? num * 1000 : num;
        
        // La marca es todo lo que NO es la capacidad
        // Reemplazamos la parte de la capacidad por vacío y limpiamos espacios
        let marcaLimpia = str.replace(match[0], '').trim();
        if(marcaLimpia === '') marcaLimpia = 'Genérico'; // Por si solo decía "1TB"
        
        return { marca: marcaLimpia, capacidad: totalGB };
    }
    
    // Si no encontramos capacidad, devolvemos todo como marca
    return { marca: str, capacidad: 0 };
}

// 2. PREVISUALIZACIÓN (Igual que antes)
export const renderImportPreview = (data) => {
    const tbody = document.getElementById("import-table-body");
    tbody.innerHTML = "";

    data.forEach(disk => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="import-checkbox" data-id="${disk.tempId}" checked style="transform: scale(1.5); cursor: pointer;">
            </td>
            <td>${disk.codigoInterno}</td>
            <td>${disk.marca}</td>
            <td>${disk.serial}</td>
            <td>${disk.capacidad} GB</td>
        `;
        tbody.appendChild(tr);
    });

    updateSelectionCount();
};

// 3. GUARDAR (Igual que antes)
export const saveSelectedImport = async () => {
    const checkboxes = document.querySelectorAll(".import-checkbox:checked");
    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
    
    const disksToSave = importedDataCache.filter(d => selectedIds.includes(d.tempId));
    
    if (disksToSave.length === 0) {
        alert("No has seleccionado ningún disco.");
        return 0;
    }

    const promises = disksToSave.map(disk => {
        const { tempId, ...diskData } = disk;
        return addDisk(diskData);
    });

    await Promise.all(promises);
    return disksToSave.length;
};

export const updateSelectionCount = () => {
    const count = document.querySelectorAll(".import-checkbox:checked").length;
    const counter = document.getElementById("import-count");
    if (counter) counter.textContent = count;
};